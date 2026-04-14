export interface LoreEntry {
	name: string;
	keywords: string[];
	content: string;
	enabled: boolean;
	constant: boolean;
	use_regex: boolean;
	position: string;
	priority: number;
	exclude_keys: string[];
	additional_keys: string[];
}

export interface LorebookConfig {
	scan_depth: number;
	token_budget: number;
	recursive_scanning: boolean;
	entries: LoreEntry[];
}

/** Rough token estimate: 1 token ≈ 4 chars */
function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

function entryMatchesTexts(entry: LoreEntry, texts: string[]): boolean {
	if (!entry.keywords?.length && !entry.additional_keys?.length) return false;

	const allKeywords = [...(entry.keywords ?? []), ...(entry.additional_keys ?? [])];
	const excludeKeys = entry.exclude_keys ?? [];

	for (const text of texts) {
		// Check exclude_keys — if any exclude key matches, skip this entry entirely
		if (excludeKeys.length) {
			const hasExclude = excludeKeys.some((k) => {
				if (!k) return false;
				if (entry.use_regex) {
					try { return new RegExp(k, 'i').test(text); } catch { return false; }
				}
				return text.toLowerCase().includes(k.toLowerCase());
			});
			if (hasExclude) return false;
		}

		// Match any keyword
		for (const kw of allKeywords) {
			if (!kw) continue;
			if (entry.use_regex) {
				try {
					if (new RegExp(kw, 'i').test(text)) return true;
				} catch { /* invalid regex — fall through */ }
			} else {
				if (text.toLowerCase().includes(kw.toLowerCase())) return true;
			}
		}
	}
	return false;
}

/**
 * Scans recent messages against lorebook entries.
 * Returns matched entry content strings, sorted by priority (high → low),
 * bounded by token_budget.
 */
export function runLorebookEngine(
	config: LorebookConfig,
	messages: Array<{ role: string; content: string }>
): string[] {
	const depth = config.scan_depth ?? 2;
	const budget = config.token_budget ?? 2048;

	// Scan window: last `depth` non-system messages
	const scanTexts = messages
		.filter((m) => m.role !== 'system')
		.slice(-depth)
		.map((m) => m.content);

	const matched: LoreEntry[] = [];
	const matchedSet = new Set<LoreEntry>();

	for (const entry of config.entries ?? []) {
		if (!entry.enabled) continue;
		if (entry.constant || entryMatchesTexts(entry, scanTexts)) {
			matched.push(entry);
			matchedSet.add(entry);
		}
	}

	// One round of recursive scanning: re-scan with matched entry contents added
	if (config.recursive_scanning && matched.length > 0) {
		const expandedTexts = [...scanTexts, ...matched.map((e) => e.content)];
		for (const entry of config.entries ?? []) {
			if (!entry.enabled || matchedSet.has(entry)) continue;
			if (entry.constant || entryMatchesTexts(entry, expandedTexts)) {
				matched.push(entry);
				matchedSet.add(entry);
			}
		}
	}

	// Sort by priority descending (higher priority = earlier in context)
	matched.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

	// Apply token budget
	const result: string[] = [];
	let usedTokens = 0;
	for (const entry of matched) {
		const tokens = estimateTokens(entry.content);
		if (usedTokens + tokens > budget) break;
		result.push(entry.content);
		usedTokens += tokens;
	}

	return result;
}
