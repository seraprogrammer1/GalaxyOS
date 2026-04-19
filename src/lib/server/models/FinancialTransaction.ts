import mongoose, { Schema, model, type Document } from 'mongoose';

export interface IFinancialTransaction extends Document {
	transaction_id: string;
	item_id: string;
	account_id: string;
	owner: mongoose.Types.ObjectId;
	amount: number;
	date: string; // YYYY-MM-DD
	name: string;
	merchant_name?: string | null;
	pending: boolean;
	category_primary: string;
	category_detailed: string;
	institution_name: string;
}

const FinancialTransactionSchema = new Schema<IFinancialTransaction>(
	{
		transaction_id: { type: String, required: true, unique: true },
		item_id: { type: String, required: true, index: true },
		account_id: { type: String, required: true },
		owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		amount: { type: Number, required: true },
		date: { type: String, required: true },
		name: { type: String, required: true },
		merchant_name: { type: String, default: null },
		pending: { type: Boolean, required: true },
		category_primary: { type: String, default: '' },
		category_detailed: { type: String, default: '' },
		institution_name: { type: String, default: '' }
	},
	{ collection: 'transactions' }
);

// Compound index for owner+date (descending), matching Python index
FinancialTransactionSchema.index({ owner: 1, date: -1 });

export const FinancialTransaction =
	(mongoose.models.FinancialTransaction as mongoose.Model<IFinancialTransaction>) ??
	model<IFinancialTransaction>('FinancialTransaction', FinancialTransactionSchema);
