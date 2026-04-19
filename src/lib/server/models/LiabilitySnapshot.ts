import mongoose, { Schema, model, type Document } from 'mongoose';

export interface ILiabilitySnapshot extends Document {
	item_id: string;
	owner: mongoose.Types.ObjectId;
	credit_cards: unknown[];
	student_loans: unknown[];
	mortgages: unknown[];
	total_debt: number;
	last_synced_at: Date;
}

const LiabilitySnapshotSchema = new Schema<ILiabilitySnapshot>(
	{
		item_id: { type: String, required: true, index: true },
		owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		credit_cards: { type: [Schema.Types.Mixed], default: [] },
		student_loans: { type: [Schema.Types.Mixed], default: [] },
		mortgages: { type: [Schema.Types.Mixed], default: [] },
		total_debt: { type: Number, default: 0 },
		last_synced_at: { type: Date, required: true }
	},
	{ collection: 'liability_snapshots' }
);

export const LiabilitySnapshot =
	(mongoose.models.LiabilitySnapshot as mongoose.Model<ILiabilitySnapshot>) ??
	model<ILiabilitySnapshot>('LiabilitySnapshot', LiabilitySnapshotSchema);
