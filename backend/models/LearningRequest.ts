import mongoose, { Schema, Document } from 'mongoose';

export interface ILearningRequest extends Document {
  learner: mongoose.Types.ObjectId;
  mentor: mongoose.Types.ObjectId;
  doubtRequest?: mongoose.Types.ObjectId;
  topic: string;
  message: string;
  proposedTime: string;
  roleMode: 'learner-to-mentor' | 'peer-collab';
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Completed';
  sessionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LearningRequestSchema = new Schema<ILearningRequest>(
  {
    learner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mentor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doubtRequest: { type: Schema.Types.ObjectId, ref: 'DoubtRequest' },
    topic: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    proposedTime: { type: String, default: 'Flexible / Now' },
    roleMode: {
      type: String,
      enum: ['learner-to-mentor', 'peer-collab'],
      default: 'learner-to-mentor',
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Completed'],
      default: 'Pending',
      index: true,
    },
    sessionId: { type: Schema.Types.ObjectId, ref: 'LearningSession' },
  },
  { timestamps: true }
);

export const LearningRequest =
  mongoose.models.LearningRequest ||
  mongoose.model<ILearningRequest>('LearningRequest', LearningRequestSchema);
