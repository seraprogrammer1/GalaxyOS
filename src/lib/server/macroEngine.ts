export interface MacroContext {
	/** Character name or nickname — replaces {{char}} */
	char?: string;
	/** User's display name — replaces {{user}} */
	user?: string;
	/** Character personality field — replaces {{personality}} */
	personality?: string;
	/** Scenario field — replaces {{scenario}} */
	scenario?: string;
	/** Description field — replaces {{description}} */
	description?: string;
	/** Example dialogue field — replaces {{example_dialogue}} */
	example_dialogue?: string;
}

const MACRO_MAP: Array<[key: keyof MacroContext, variants: string[]]> = [
	['char',             ['{{char}}', '<char>']],
	['user',             ['{{user}}', '<user>']],
	['personality',      ['{{personality}}', '<personality>']],
	['scenario',         ['{{scenario}}', '<scenario>']],
	['description',      ['{{description}}', '<description>']],
	['example_dialogue', ['{{example_dialogue}}', '<example_dialogue>']],
];

/**
 * Replaces all known macro tokens in `text` with values from `ctx`.
 * Missing keys are left unchanged.
 */
export function applyMacros(text: string, ctx: MacroContext): string {
	let result = text;
	for (const [key, variants] of MACRO_MAP) {
		const value = ctx[key];
		if (value === undefined || value === null) continue;
		for (const token of variants) {
			// Use split+join to avoid regex escaping issues with special chars in value
			result = result.split(token).join(value);
		}
	}
	return result;
}
