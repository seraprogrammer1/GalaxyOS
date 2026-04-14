import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const characterSchema = new Schema(
	{
		owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		name: { type: String, required: true },
		nickname: { type: String, default: '' },
		description: { type: String, default: '' },
		personality: { type: String, default: '' },
		scenario: { type: String, default: '' },
		example_dialogue: { type: String, default: '' },
		first_message: { type: String, default: '' },
		alternate_greetings: { type: [String], default: [] },
		system_prompt: { type: String, default: '' },
		post_history_instructions: { type: String, default: '' },
		creator_notes: { type: String, default: '' },
		tags: { type: [String], default: [] },
		avatar_url: { type: String, default: '' },
		linked_lorebook_id: { type: Schema.Types.ObjectId, ref: 'Lorebook', default: null },
		extensions: { type: Schema.Types.Mixed, default: {} },
		spec: { type: String, default: 'custom' },
		spec_version: { type: String, default: '1.0' },
		source: { type: String, default: 'manual' },
		source_id: { type: String, default: '' },
		visible: { type: Boolean, default: true }
	},
	{ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type CharacterDocument = InferSchemaType<typeof characterSchema>;
export const Character =
	mongoose.models.Character || mongoose.model('Character', characterSchema);
export default Character;
