import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessmentQuestion {
  questionId: string;
  type: 'mcq' | 'short_answer' | 'coding';
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  acceptableKeywords?: string[];
  starterCode?: string;
  language?: 'javascript' | 'python';
  functionName?: string;
  testCases?: Array<{
    inputJson: string;
    expectedOutputJson: string;
    description: string;
  }>;
  points: number;
  explanation: string;
}

export interface IAssessmentTask extends Document {
  title: string;
  slug: string;
  competencyCategory: 'Programming' | 'Debugging' | 'Problem-solving' | 'Data analysis' | 'Communication';
  skillName: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  durationMinutes: number;
  description: string;
  maxScore: number;
  passingScorePercent: number;
  rubric: Array<{
    criterion: string;
    weightPercent: number;
    description: string;
  }>;
  questions: IAssessmentQuestion[];
  createdAt: Date;
}

const AssessmentQuestionSchema = new Schema<IAssessmentQuestion>({
  questionId: { type: String, required: true },
  type: { type: String, enum: ['mcq', 'short_answer', 'coding'], required: true },
  prompt: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: String },
  acceptableKeywords: [{ type: String }],
  starterCode: { type: String },
  language: { type: String, enum: ['javascript', 'python'] },
  functionName: { type: String },
  testCases: [
    {
      inputJson: { type: String },
      expectedOutputJson: { type: String },
      description: { type: String },
    },
  ],
  points: { type: Number, required: true },
  explanation: { type: String, required: true },
});

const AssessmentTaskSchema = new Schema<IAssessmentTask>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    competencyCategory: {
      type: String,
      enum: ['Programming', 'Debugging', 'Problem-solving', 'Data analysis', 'Communication'],
      required: true,
      index: true,
    },
    skillName: { type: String, required: true, index: true },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      required: true,
    },
    durationMinutes: { type: Number, default: 20 },
    description: { type: String, required: true },
    maxScore: { type: Number, required: true },
    passingScorePercent: { type: Number, default: 70 },
    rubric: [
      {
        criterion: { type: String, required: true },
        weightPercent: { type: Number, required: true },
        description: { type: String, required: true },
      },
    ],
    questions: [AssessmentQuestionSchema],
  },
  { timestamps: true }
);

export const AssessmentTask =
  mongoose.models.AssessmentTask ||
  mongoose.model<IAssessmentTask>('AssessmentTask', AssessmentTaskSchema);
