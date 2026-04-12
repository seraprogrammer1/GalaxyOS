import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const userSettingsSchema = new Schema(
	{
		user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
		auto_delete: { type: Boolean, default: false }
	},
	{ timestamps: true }
);

export type UserSettingsDocument = InferSchemaType<typeof userSettingsSchema>;
export const UserSettings =
	mongoose.models.UserSettings || mongoose.model('UserSettings', userSettingsSchema);
export default UserSettings;
