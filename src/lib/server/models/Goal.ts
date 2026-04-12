import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const goalSchema = new Schema(
        {
                title: { type: String, required: true },
                note: { type: String, default: '' },
                category: { type: String, default: '' },
                completed: { type: Boolean, default: false },
                target_value: { type: Number, default: 1 },
                current_value: { type: Number, default: 0 },
                start_date: { type: Date },
                due_date: { type: Date },
                owner: { type: Schema.Types.ObjectId, ref: 'User', required: true }
        },
        { timestamps: true }
);

export type GoalDocument = InferSchemaType<typeof goalSchema>;
export const Goal = mongoose.models.Goal || mongoose.model('Goal', goalSchema);
export default Goal;
