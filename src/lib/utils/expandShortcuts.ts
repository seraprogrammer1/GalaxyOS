/**
 * Shared @c / @u shortcut expansion utility.
 * Expands @c → {{char}} and @u → {{user}} when triggered by space, `"`, or `*`.
 * Called from all text input contexts: chat input, edit bubble, character create/edit fields.
 */

/**
 * Real-time keydown expansion.
 *
 * If `content` ends with `@c` or `@u` and `key` is a trigger character
 * (space, `"`, or `*`), returns `{ newContent, insert }` so the caller can:
 *   e.preventDefault(); field = result.newContent + result.insert;
 *
 * Returns null when no expansion should occur.
 */
export function expandAtShortcut(
	content: string,
	key: string
): { newContent: string; insert: string } | null {
	if (key !== ' ' && key !== '"' && key !== '*') return null;
	const match = /(^|\s)(@c|@u)$/.exec(content);
	if (!match) return null;
	const token = match[2] === '@c' ? '{{char}}' : '{{user}}';
	const newContent = content.slice(0, content.length - match[2].length) + token;
	return { newContent, insert: key };
}

/**
 * Pre-send / pre-save full-text expansion.
 * Replaces all word-boundary occurrences of @c and @u that weren't caught in real time
 * (e.g. when the user ends the message with @c without typing a trigger key).
 */
export function expandAllShortcuts(text: string): string {
	return text
		.replace(/(^|(?<=\s))@c(?=\s|$)/g, '$1{{char}}')
		.replace(/(^|(?<=\s))@u(?=\s|$)/g, '$1{{user}}');
}
