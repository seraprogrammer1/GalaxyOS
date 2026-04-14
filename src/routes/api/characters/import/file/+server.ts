import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectDB } from '$lib/server/db';
import { Character } from '$lib/server/models/Character';
import { parseCharacterFromPng, parseCharacterFromJson } from '$lib/server/characterParser';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) throw error(401, 'Unauthorized');
	await connectDB();

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		throw error(400, 'Invalid multipart form data');
	}

	const file = formData.get('file') as File | null;
	if (!file || file.size === 0) throw error(400, 'No file provided');
	if (file.size > MAX_FILE_SIZE) throw error(413, 'File too large (max 10 MB)');

	const filename = file.name.toLowerCase();
	const isPng = filename.endsWith('.png');
	const isJson = filename.endsWith('.json');
	if (!isPng && !isJson) throw error(400, 'Only .png or .json character card files are supported');

	const bytes = await file.arrayBuffer();
	const buf = Buffer.from(bytes);

	let characterData: ReturnType<typeof parseCharacterFromJson>;
	let avatarUrl = '';

	try {
		if (isPng) {
			characterData = parseCharacterFromPng(buf);
			// Save the PNG as the character's avatar in static/avatars/
			const avatarsDir = join(process.cwd(), 'static', 'avatars');
			await mkdir(avatarsDir, { recursive: true });
			const avatarFilename = `${crypto.randomUUID()}.png`;
			await writeFile(join(avatarsDir, avatarFilename), buf);
			avatarUrl = `/avatars/${avatarFilename}`;
		} else {
			characterData = parseCharacterFromJson(buf.toString('utf-8'));
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to parse character file';
		throw error(400, msg);
	}

	if (!characterData.name) throw error(400, 'Character file has no name field');

	const character = await Character.create({
		owner: locals.session.user_id,
		name: characterData.name,
		nickname: characterData.nickname,
		description: characterData.description,
		personality: characterData.personality,
		scenario: characterData.scenario,
		example_dialogue: characterData.example_dialogue,
		first_message: characterData.first_message,
		alternate_greetings: characterData.alternate_greetings,
		system_prompt: characterData.system_prompt,
		post_history_instructions: characterData.post_history_instructions,
		creator_notes: characterData.creator_notes,
		tags: characterData.tags,
		avatar_url: avatarUrl,
		spec: characterData.spec,
		spec_version: characterData.spec_version,
		source: 'chub',
		visible: true
	});

	return json(character.toJSON(), { status: 201 });
};
