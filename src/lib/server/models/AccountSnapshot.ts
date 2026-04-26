import mongoose, { Schema, model, type Document } from 'mongoose';

export interface IAccountSnapshot extends Document {
	item_id: string;
	owner: mongoose.Types.ObjectId;
	accounts: unknown[];
	last_synced_at: Date;
}

const AccountSnapshotSchema = new Schema<IAccountSnapshot>(
	{
		item_id: { type: String, required: true, index: true },
		owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		accounts: { type: [Schema.Types.Mixed], default: [] },
		last_synced_at: { type: Date, required: true }
	},
	{ collection: 'account_snapshots' }
);

export const AccountSnapshot =
	(mongoose.models.AccountSnapshot as mongoose.Model<IAccountSnapshot>) ??
	model<IAccountSnapshot>('AccountSnapshot', AccountSnapshotSchema);
