import mongoose, { Schema, Document } from 'mongoose';

export interface ILearningSession extends Document {
  learningRequest: mongoose.Types.ObjectId;
  learner: mongoose.Types.ObjectId;
  mentor: mongoose.Types.ObjectId;
  topic: string;
  channelName: string;
  status: 'Active' | 'Completed';
  sharedNotes: string;
  startedAt: Date;
  endedAt?: Date;
  learnerRating?: number;
  learnerFeedback?: string;
}

const LearningSessionSchema = new Schema<ILearningSession>(
  {
    learningRequest: { type: Schema.Types.ObjectId, ref: 'LearningRequest', required: true },
    learner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mentor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: String, required: true },
    channelName: { type: String, required: true, unique: true },
    status: { type: String, enum: ['Active', 'Completed'], default: 'Active', index: true },
    sharedNotes: { type: String, default: '' },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    learnerRating: { type: Number, min: 1, max: 5 },
    learnerFeedback: { type: String },
  },
  { timestamps: true }
);

export const LearningSession =
  mongoose.models.LearningSession ||
  mongoose.model<ILearningSession>('LearningSession', LearningSessionSchema);
