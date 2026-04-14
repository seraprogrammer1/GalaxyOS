import mongoose, { Schema, type InferSchemaType } from 'mongoose';

// Forward-declare messageSchema so variantSchema can reference it
const messageSchema: Schema = new Schema({}, { _id: false });

// A single variant of an assistant message, plus the tail of the conversation
// that was active when this variant was last in use.
const variantSchema = new Schema(
	{
		content: { type: String, required: true },
		tail: { type: [messageSchema], default: [] }
	},
	{ _id: false }
);

// Redefine messageSchema with all fields now that variantSchema exists
messageSchema.add({
	role: {
		type: String,
		enum: ['user', 'assistant', 'system'],
		required: true
	},
	content: { type: String, required: true },
	// Only populated on assistant messages — holds all variants + their branch tails
	variants: { type: [variantSchema], default: [] },
	activeVariant: { type: Number, default: 0 }
});

const chatSchema = new Schema(
	{
		title: { type: String, required: true, default: 'New Chat' },
		owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		messages: { type: [messageSchema], default: [] },
		character_id: { type: Schema.Types.ObjectId, ref: 'Character', default: null },
		lorebook_id: { type: Schema.Types.ObjectId, ref: 'Lorebook', default: null },
		system_prompt: { type: String, default: '' },
		post_history_instructions: { type: String, default: '' },
		assistant_prefill: { type: String, default: '' },
		context_size: { type: Number, default: null }
	},
	{
		timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
	}
);

export type ChatDocument = InferSchemaType<typeof chatSchema>;
export const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
export default Chat;