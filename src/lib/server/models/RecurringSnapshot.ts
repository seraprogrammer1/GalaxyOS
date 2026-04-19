import mongoose, { Schema, model, type Document } from 'mongoose';

export interface IRecurringSnapshot extends Document {
	item_id: string;
	owner: mongoose.Types.ObjectId;
	inflow_streams: unknown[];
	outflow_streams: unknown[];
	last_synced_at: Date;
}

const RecurringSnapshotSchema = new Schema<IRecurringSnapshot>(
	{
		item_id: { type: String, required: true, index: true },
		owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		inflow_streams: { type: [Schema.Types.Mixed], default: [] },
		outflow_streams: { type: [Schema.Types.Mixed], default: [] },
		last_synced_at: { type: Date, required: true }
	},
	{ collection: 'recurring_snapshots' }
);

export const RecurringSnapshot =
	(mongoose.models.RecurringSnapshot as mongoose.Model<IRecurringSnapshot>) ??
	model<IRecurringSnapshot>('RecurringSnapshot', RecurringSnapshotSchema);
