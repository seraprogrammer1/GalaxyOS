import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const USER_ROLES = ['admin', 'user', 'temp_admin', 'guest', 'pending_pin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
	{
		username: { type: String, required: true, unique: true },
		password_hash: { type: String, required: true },
		role: { type: String, enum: USER_ROLES, default: 'user' },
		admin_pin_hash: { type: String },
		guest_pin_hash: { type: String }
	},
	{ timestamps: true }
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = mongoose.models.User || mongoose.model('User', userSchema);
