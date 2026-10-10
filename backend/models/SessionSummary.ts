import mongoose, { Schema, Document } from 'mongoose';

export interface ISessionSummary extends Document {
  session: mongoose.Types.ObjectId;
  generatedBy: mongoose.Types.ObjectId;
  topic: string;
  rawNotes: string;
  summaryText: string;
  keyConceptsLearned: string[];
  topicsNeedingPractice: string[];
  recommendedNextTopics: string[];
  generatedSource: 'Gemini AI' | 'Structured Fallback';
  createdAt: Date;
}

const SessionSummarySchema = new Schema<ISessionSummary>(
  {
    session: { type: Schema.Types.ObjectId, ref: 'LearningSession', required: true, index: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: String, required: true },
    rawNotes: { type: String, required: true },
    summaryText: { type: String, required: true },
    keyConceptsLearned: [{ type: String }],
    topicsNeedingPractice: [{ type: String }],
    recommendedNextTopics: [{ type: String }],
    generatedSource: {
      type: String,
      enum: ['Gemini AI', 'Structured Fallback'],
      default: 'Gemini AI',
    },
  },
  { timestamps: true }
);

export const SessionSummary =
  mongoose.models.SessionSummary ||
  mongoose.model<ISessionSummary>('SessionSummary', SessionSummarySchema);
