import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const appSettingsSchema = new Schema(
	{
		registration_enabled: { type: Boolean, default: false },
		default_theme: { type: String, default: 'dark' }
	},
	{ timestamps: true }
);

export type AppSettingsDocument = InferSchemaType<typeof appSettingsSchema>;
export const AppSettings =
	mongoose.models.AppSettings || mongoose.model('AppSettings', appSettingsSchema);
