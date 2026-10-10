import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionEvaluation {
  questionId: string;
  questionType: 'mcq' | 'short_answer' | 'coding';
  submittedAnswer: string;
  earnedPoints: number;
  maxPoints: number;
  isCorrect: boolean;
  rubricBreakdown?: {
    correctness: number;
    logicAndApproach: number;
    codeQualityOrExplanation: number;
  };
  testResults?: Array<{
    description: string;
    passed: boolean;
    actualOutput: string;
    expectedOutput: string;
  }>;
  feedback: string;
}

export interface IAssessmentAttempt extends Document {
  user: mongoose.Types.ObjectId;
  task: mongoose.Types.ObjectId;
  taskTitle: string;
  competencyCategory: string;
  skillName: string;
  attemptNumber: number;
  earnedScore: number;
  maxScore: number;
  percentageScore: number;
  passed: boolean;
  overallFeedback: string;
  aiCoachingSummary: string;
  evaluations: IQuestionEvaluation[];
  reviewStatus: 'None' | 'Pending' | 'Reviewed' | 'Resolved';
  completedAt: Date;
}

const QuestionEvaluationSchema = new Schema<IQuestionEvaluation>({
  questionId: { type: String, required: true },
  questionType: { type: String, enum: ['mcq', 'short_answer', 'coding'], required: true },
  submittedAnswer: { type: String, default: '' },
  earnedPoints: { type: Number, required: true },
  maxPoints: { type: Number, required: true },
  isCorrect: { type: Boolean, required: true },
  rubricBreakdown: {
    correctness: { type: Number },
    logicAndApproach: { type: Number },
    codeQualityOrExplanation: { type: Number },
  },
  testResults: [
    {
      description: { type: String },
      passed: { type: Boolean },
      actualOutput: { type: String },
      expectedOutput: { type: String },
    },
  ],
  feedback: { type: String, required: true },
});

const AssessmentAttemptSchema = new Schema<IAssessmentAttempt>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    task: { type: Schema.Types.ObjectId, ref: 'AssessmentTask', required: true, index: true },
    taskTitle: { type: String, required: true },
    competencyCategory: { type: String, required: true },
    skillName: { type: String, required: true },
    attemptNumber: { type: Number, required: true },
    earnedScore: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    percentageScore: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    overallFeedback: { type: String, required: true },
    aiCoachingSummary: { type: String, default: '' },
    evaluations: [QuestionEvaluationSchema],
    reviewStatus: {
      type: String,
      enum: ['None', 'Pending', 'Reviewed', 'Resolved'],
      default: 'None',
    },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AssessmentAttemptSchema.index({ user: 1, task: 1, attemptNumber: 1 });

export const AssessmentAttempt =
  mongoose.models.AssessmentAttempt ||
  mongoose.model<IAssessmentAttempt>('AssessmentAttempt', AssessmentAttemptSchema);
