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
		messages: { type: [messageSchema], default: [] }
	},
	{
		timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
	}
);

export type ChatDocument = InferSchemaType<typeof chatSchema>;
export const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
export default Chat;