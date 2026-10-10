import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessmentReview extends Document {
  attempt: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  task: mongoose.Types.ObjectId;
  reason: string;
  studentArgument: string;
  status: 'Pending' | 'Reviewed' | 'Resolved';
  originalScorePercent: number;
  updatedScorePercent?: number;
  reviewer?: mongoose.Types.ObjectId;
  reviewerNotes?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

const AssessmentReviewSchema = new Schema<IAssessmentReview>(
  {
    attempt: { type: Schema.Types.ObjectId, ref: 'AssessmentAttempt', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    task: { type: Schema.Types.ObjectId, ref: 'AssessmentTask', required: true },
    reason: { type: String, required: true },
    studentArgument: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Reviewed', 'Resolved'],
      default: 'Pending',
      index: true,
    },
    originalScorePercent: { type: Number, required: true },
    updatedScorePercent: { type: Number },
    reviewer: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewerNotes: { type: String, default: '' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export const AssessmentReview =
  mongoose.models.AssessmentReview ||
  mongoose.model<IAssessmentReview>('AssessmentReview', AssessmentReviewSchema);
