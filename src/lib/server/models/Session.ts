import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { USER_ROLES } from './User';

const sessionSchema = new Schema(
	{
		token: { type: String, required: true, unique: true },
		user_id: { type: Schema.Types.ObjectId, ref: 'User' },
		role: { type: String, enum: USER_ROLES, required: true },
		ip_type: { type: String, enum: ['local', 'external'], required: true },
		expires_at: { type: Date, required: true }
	},
	{ timestamps: true }
);

export type SessionDocument = InferSchemaType<typeof sessionSchema>;
export const Session =
	mongoose.models.Session || mongoose.model('Session', sessionSchema);
