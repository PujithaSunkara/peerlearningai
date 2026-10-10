import mongoose, { Schema, Document } from 'mongoose';

export interface ICompetencyItem {
  category: 'Programming' | 'Debugging' | 'Problem-solving' | 'Data analysis' | 'Communication';
  skillName: string;
  proficiencyLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  isVerified: boolean;
  verifiedScore?: number;
  verifiedTaskId?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

export interface IPeerReviewItem {
  reviewerId: mongoose.Types.ObjectId;
  reviewerName: string;
  sessionId?: mongoose.Types.ObjectId;
  topic: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  onboardingStep: 'details' | 'assessment' | 'completed';
  role: 'student' | 'reviewer';
  targetCareerRole: string;
  academicDetails: {
    institution: string; // College (Default: Vignan's Institute of Information Technology)
    major: string; // Branch
    yearOfStudy: string; // Year
  };
  bio: string;
  avatarUrl?: string;
  availability: {
    status: 'Available' | 'Busy' | 'Offline';
    preferredHours: string;
    days: string[];
  };
  competencies: ICompetencyItem[];
  peerReviews: IPeerReviewItem[];
  stats: {
    sessionsMentored: number;
    sessionsLearned: number;
    averageRating: number;
    ratingCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CompetencyItemSchema = new Schema<ICompetencyItem>({
  category: {
    type: String,
    enum: ['Programming', 'Debugging', 'Problem-solving', 'Data analysis', 'Communication'],
    default: 'Programming',
  },
  skillName: { type: String, required: true, trim: true },
  proficiencyLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Intermediate',
  },
  isVerified: { type: Boolean, default: false },
  verifiedScore: { type: Number },
  verifiedTaskId: { type: Schema.Types.ObjectId, ref: 'AssessmentTask' },
  updatedAt: { type: Date, default: Date.now },
});

const PeerReviewItemSchema = new Schema<IPeerReviewItem>({
  reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reviewerName: { type: String, required: true },
  sessionId: { type: Schema.Types.ObjectId, ref: 'LearningSession' },
  topic: { type: String, default: 'Peer Mentoring Session' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    emailVerified: { type: Boolean, default: true },
    onboardingStep: {
      type: String,
      enum: ['details', 'assessment', 'completed'],
      default: 'details',
    },
    role: { type: String, enum: ['student', 'reviewer'], default: 'student', index: true },
    targetCareerRole: { type: String, default: 'Full Stack Developer' },
    academicDetails: {
      institution: {
        type: String,
        default: "Vignan's Institute of Information Technology",
      },
      major: { type: String, default: 'Computer Science & Engineering (CSE)' },
      yearOfStudy: { type: String, default: '3rd Year' },
    },
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    availability: {
      status: { type: String, enum: ['Available', 'Busy', 'Offline'], default: 'Available' },
      preferredHours: { type: String, default: 'Available Now' },
      days: [{ type: String }],
    },
    competencies: [CompetencyItemSchema],
    peerReviews: [PeerReviewItemSchema],
    stats: {
      sessionsMentored: { type: Number, default: 0 },
      sessionsLearned: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

UserSchema.index({ 'competencies.skillName': 1 });
UserSchema.index({ 'availability.status': 1 });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
