import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const GEMINI_MODELS = [
	'gemini-2.5-pro',
	'gemini-2.5-flash',
	'gemini-2.5-flash-lite',
	'gemini-3-flash-preview',
	'gemini-3.1-flash-lite-preview',
	'gemini-3.1-pro-preview'
] as const;

const CHUB_MODELS = ['mythomax', 'mixtral', 'asha', 'gemma'] as const;

export { GEMINI_MODELS, CHUB_MODELS };

const userSettingsSchema = new Schema(
	{
		user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
		auto_delete: { type: Boolean, default: false },
		dashboard_layout: {
			type: String,
			enum: ['bento', 'sidebar', 'columns'],
			default: 'bento'
		},
		budget_variant: {
			type: String,
			enum: ['standard', 'minimal'],
			default: 'standard'
		},
		default_provider: {
			type: String,
			enum: ['gemini', 'chub'],
			default: 'gemini'
		},
		gemini_model: {
			type: String,
			enum: [...GEMINI_MODELS],
			default: 'gemini-2.5-flash'
		},
		chub_model: {
			type: String,
			enum: [...CHUB_MODELS],
			default: 'mythomax'
		}
	},
	{ timestamps: true }
);

export type UserSettingsDocument = InferSchemaType<typeof userSettingsSchema>;
export const UserSettings =
	mongoose.models.UserSettings || mongoose.model('UserSettings', userSettingsSchema);
export default UserSettings;
