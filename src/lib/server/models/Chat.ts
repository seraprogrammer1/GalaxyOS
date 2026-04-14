import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const messageSchema = new Schema(
	{
		role: {
			type: String,
			enum: ['user', 'assistant', 'system'],
			required: true
		},
		content: { type: String, required: true }
	},
	{ _id: false }
);

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