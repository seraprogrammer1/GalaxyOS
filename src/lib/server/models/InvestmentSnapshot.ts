import mongoose, { Schema, model, type Document } from 'mongoose';

export interface IInvestmentSnapshot extends Document {
	item_id: string;
	owner: mongoose.Types.ObjectId;
	holdings: unknown[];
	total_value: number;
	last_synced_at: Date;
}

const InvestmentSnapshotSchema = new Schema<IInvestmentSnapshot>(
	{
		item_id: { type: String, required: true, index: true },
		owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		holdings: { type: [Schema.Types.Mixed], default: [] },
		total_value: { type: Number, default: 0 },
		last_synced_at: { type: Date, required: true }
	},
	{ collection: 'investment_snapshots' }
);

export const InvestmentSnapshot =
	(mongoose.models.InvestmentSnapshot as mongoose.Model<IInvestmentSnapshot>) ??
	model<IInvestmentSnapshot>('InvestmentSnapshot', InvestmentSnapshotSchema);
