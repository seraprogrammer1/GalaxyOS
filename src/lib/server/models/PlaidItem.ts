import mongoose, { Schema, model, type Document } from 'mongoose';

export interface IPlaidItem extends Document {
	owner: mongoose.Types.ObjectId;
	access_token: string; // Fernet-encrypted
	item_id: string;
	institution_name: string;
	institution_id: string;
	cursor?: string | null;
	products: string[];
}

const PlaidItemSchema = new Schema<IPlaidItem>(
	{
		owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		access_token: { type: String, required: true },
		item_id: { type: String, required: true, index: true },
		institution_name: { type: String, required: true },
		institution_id: { type: String, required: true },
		cursor: { type: String, default: null },
		products: { type: [String], default: [] }
	},
	{ collection: 'plaid_items', timestamps: true }
);

export const PlaidItem =
	(mongoose.models.PlaidItem as mongoose.Model<IPlaidItem>) ??
	model<IPlaidItem>('PlaidItem', PlaidItemSchema);
