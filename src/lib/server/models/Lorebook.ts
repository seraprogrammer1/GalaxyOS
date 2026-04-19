import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const loreEntrySchema = new Schema(
	{
		name: { type: String, default: '' },
		keywords: { type: [String], default: [] },
		content: { type: String, default: '' },
		enabled: { type: Boolean, default: true },
		constant: { type: Boolean, default: false },
		use_regex: { type: Boolean, default: false },
		position: { type: String, default: 'after_char' },
		priority: { type: Number, default: 0 },
		exclude_keys: { type: [String], default: [] },
		additional_keys: { type: [String], default: [] }
	},
	{ _id: false }
);

const lorebookSchema = new Schema(
	{
		owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		title: { type: String, required: true },
		description: { type: String, default: '' },
		entries: { type: [loreEntrySchema], default: [] },
		scan_depth: { type: Number, default: 2 },
		token_budget: { type: Number, default: 2048 },
		recursive_scanning: { type: Boolean, default: false }
	},
	{ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type LoreEntryDocument = InferSchemaType<typeof loreEntrySchema>;
export type LorebookDocument = InferSchemaType<typeof lorebookSchema>;
export const Lorebook = mongoose.models.Lorebook || mongoose.model('Lorebook', lorebookSchema);
export default Lorebook;
