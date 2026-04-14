/**
 * Character card parser — Phase 3
 *
 * Supports:
 *   - V1  (flat JSON: name, description, personality, …)
 *   - V2  (spec: "chara_card_v2", data nested under `data` key)
 *   - V3  (spec: "chara_card_v3", superset of V2)
 *   - PNG  (tEXt chunk with keyword "ccv3" (V3) or "chara" (V2))
 */

export type ParsedCharacter = {
	name: string;
	nickname: string;
	description: string;
	personality: string;
	scenario: string;
	example_dialogue: string;
	first_message: string;
	alternate_greetings: string[];
	system_prompt: string;
	post_history_instructions: string;
	creator_notes: string;
	tags: string[];
	spec: string;
	spec_version: string;
};

// ── PNG parsing ─────────────────────────────────────────────────────────────

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function extractPngTextChunks(buf: Buffer): Map<string, string> {
	const map = new Map<string, string>();

	if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
		throw new Error('Not a valid PNG file');
	}

	let offset = 8;
	while (offset + 12 <= buf.length) {
		const dataLen = buf.readUInt32BE(offset);
		const chunkType = buf.subarray(offset + 4, offset + 8).toString('ascii');
		const chunkData = buf.subarray(offset + 8, offset + 8 + dataLen);
		offset += 12 + dataLen; // 4 len + 4 type + data + 4 CRC

		if (chunkType === 'tEXt') {
			const nullAt = chunkData.indexOf(0);
			if (nullAt !== -1) {
				const keyword = chunkData.subarray(0, nullAt).toString('latin1');
				const text = chunkData.subarray(nullAt + 1).toString('latin1');
				map.set(keyword, text);
			}
		}

		if (chunkType === 'IEND') break;
	}

	return map;
}

// ── Normalization ────────────────────────────────────────────────────────────

function toStr(v: unknown, fallback = ''): string {
	return typeof v === 'string' ? v.trim() : fallback;
}

function toStrArr(v: unknown): string[] {
	if (!Array.isArray(v)) return [];
	return v.filter((x) => typeof x === 'string') as string[];
}

function normalizeCard(raw: unknown): ParsedCharacter {
	const obj = (raw ?? {}) as Record<string, unknown>;
	const spec = toStr(obj.spec);
	const isV2 = spec === 'chara_card_v2';
	const isV3 = spec === 'chara_card_v3';

	// V2/V3 nest their character fields inside `data`
	const d = (isV2 || isV3) ? ((obj.data as Record<string, unknown>) ?? obj) : obj;

	// Strip decorator tags (@@…) from fields that commonly contain them
	const clean = (s: string) => s.replace(/^@@[^\n]*/gm, '').trim();

	return {
		name: toStr(d.name),
		nickname: toStr(d.nickname),
		description: clean(toStr(d.description)),
		personality: clean(toStr(d.personality)),
		scenario: clean(toStr(d.scenario)),
		// V1/V2 use `mes_example`, V3+ may use `example_dialogue`
		example_dialogue: clean(toStr(d.mes_example) || toStr(d.example_dialogue)),
		// V1/V2 use `first_mes`, V3+ may use `first_message`
		first_message: toStr(d.first_mes) || toStr(d.first_message),
		alternate_greetings: toStrArr(d.alternate_greetings),
		system_prompt: toStr(d.system_prompt),
		post_history_instructions: toStr(d.post_history_instructions),
		creator_notes: toStr(d.creator_notes),
		tags: toStrArr(d.tags),
		spec: isV3 ? 'chara_card_v3' : isV2 ? 'chara_card_v2' : 'custom',
		spec_version: toStr(obj.spec_version, '1.0')
	};
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract character data embedded in a PNG tEXt chunk.
 *
 * Priority: ccv3 (V3) > chara (V2).
 * Returns the normalised character data AND the original buffer (for avatar saving).
 */
export function parseCharacterFromPng(buf: Buffer): ParsedCharacter {
	const chunks = extractPngTextChunks(buf);

	// Prioritise V3 chunk over V2
	const raw64 = chunks.get('ccv3') ?? chunks.get('chara');
	if (!raw64) {
		throw new Error(
			'No character data found in PNG — missing tEXt[chara] or tEXt[ccv3] chunk'
		);
	}

	const jsonStr = Buffer.from(raw64, 'base64').toString('utf-8');

	// Strip stray control characters before parsing
	const sanitised = jsonStr.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
	const parsed = JSON.parse(sanitised) as unknown;
	return normalizeCard(parsed);
}

/**
 * Extract character data from a raw JSON string (plain file or pre-extracted payload).
 */
export function parseCharacterFromJson(jsonStr: string): ParsedCharacter {
	const sanitised = jsonStr.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
	const parsed = JSON.parse(sanitised) as unknown;
	return normalizeCard(parsed);
}
