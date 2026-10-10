import mongoose, { Schema, Document } from 'mongoose';

export interface IDoubtRequest extends Document {
  student: mongoose.Types.ObjectId;
  title: string;
  description: string;
  codeSnippet?: string;
  urgency: 'Low' | 'Medium' | 'High';
  extractedTopics: string[];
  extractedCompetencies: string[];
  recommendedProficiency: 'Beginner' | 'Intermediate' | 'Advanced';
  aiAnalysisSummary: string;
  aiConfidence: string;
  matchedPeers: Array<{
    peer: mongoose.Types.ObjectId;
    matchScore: number;
    scoreBreakdown: {
      skillRelevance: number;
      topicSimilarity: number;
      competencyLevel: number;
      availabilityScore: number;
      experienceAndRating: number;
    };
    explanation: string;
  }>;
  status: 'Open' | 'Matched' | 'Resolved';
  createdAt: Date;
}

const DoubtRequestSchema = new Schema<IDoubtRequest>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    codeSnippet: { type: String, default: '' },
    urgency: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    extractedTopics: [{ type: String }],
    extractedCompetencies: [{ type: String }],
    recommendedProficiency: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate',
    },
    aiAnalysisSummary: { type: String, default: '' },
    aiConfidence: { type: String, default: 'Deterministic + Gemini' },
    matchedPeers: [
      {
        peer: { type: Schema.Types.ObjectId, ref: 'User' },
        matchScore: { type: Number },
        scoreBreakdown: {
          skillRelevance: { type: Number },
          topicSimilarity: { type: Number },
          competencyLevel: { type: Number },
          availabilityScore: { type: Number },
          experienceAndRating: { type: Number },
        },
        explanation: { type: String },
      },
    ],
    status: { type: String, enum: ['Open', 'Matched', 'Resolved'], default: 'Open', index: true },
  },
  { timestamps: true }
);

export const DoubtRequest =
  mongoose.models.DoubtRequest || mongoose.model<IDoubtRequest>('DoubtRequest', DoubtRequestSchema);
