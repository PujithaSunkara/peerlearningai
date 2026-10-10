export interface CompetencyItem {
  category: 'Programming' | 'Debugging' | 'Problem-solving' | 'Data analysis' | 'Communication';
  skillName: string;
  proficiencyLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  isVerified: boolean;
  verifiedScore?: number;
  verifiedTaskId?: string;
  updatedAt?: string;
}

export interface PeerReviewItem {
  reviewerId: string;
  reviewerName: string;
  sessionId?: string;
  topic: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  onboardingStep: 'details' | 'assessment' | 'completed';
  role: 'student' | 'reviewer';
  targetCareerRole: string;
  academicDetails: {
    institution: string;
    major: string;
    yearOfStudy: string;
  };
  bio: string;
  avatarUrl?: string;
  availability: {
    status: 'Available' | 'Busy' | 'Offline';
    preferredHours: string;
    days: string[];
  };
  competencies: CompetencyItem[];
  peerReviews?: PeerReviewItem[];
  stats: {
    sessionsMentored: number;
    sessionsLearned: number;
    averageRating: number;
    ratingCount: number;
  };
  createdAt?: string;
}

export interface DoubtMatchItem {
  peer: UserProfile;
  matchScore: number;
  scoreBreakdown: {
    skillRelevance: number;
    topicSimilarity: number;
    competencyLevel: number;
    availabilityScore: number;
    experienceAndRating: number;
  };
  explanation: string;
}

export interface DoubtRequestItem {
  _id: string;
  student: string;
  title: string;
  description: string;
  codeSnippet?: string;
  urgency: 'Low' | 'Medium' | 'High';
  extractedTopics: string[];
  extractedCompetencies: string[];
  recommendedProficiency: 'Beginner' | 'Intermediate' | 'Advanced';
  aiAnalysisSummary: string;
  aiConfidence: string;
  matchedPeers: DoubtMatchItem[];
  status: 'Open' | 'Matched' | 'Resolved';
  createdAt: string;
}

export interface LearningRequestItem {
  _id: string;
  learner: UserProfile;
  mentor: UserProfile;
  doubtRequest?: string;
  topic: string;
  message: string;
  proposedTime: string;
  roleMode: 'learner-to-mentor' | 'peer-collab';
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Completed';
  sessionId?: string;
  createdAt: string;
}

export interface LearningSessionItem {
  _id: string;
  learningRequest: string;
  learner: UserProfile;
  mentor: UserProfile;
  topic: string;
  channelName: string;
  status: 'Active' | 'Completed';
  sharedNotes: string;
  startedAt: string;
  endedAt?: string;
  learnerRating?: number;
  learnerFeedback?: string;
}

export interface ChatMessageItem {
  _id: string;
  session: string;
  sender: string;
  senderName: string;
  messageType: 'text' | 'code';
  content: string;
  codeLanguage?: string;
  createdAt: string;
}

export interface SessionSummaryItem {
  _id: string;
  session: LearningSessionItem | string;
  generatedBy: string;
  topic: string;
  rawNotes: string;
  summaryText: string;
  keyConceptsLearned: string[];
  topicsNeedingPractice: string[];
  recommendedNextTopics: string[];
  generatedSource: 'Gemini AI' | 'Structured Fallback';
  createdAt: string;
}

export interface AssessmentTaskSummary {
  _id: string;
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
  questionCount: number;
  attemptsCount: number;
  bestScore: number | null;
  latestScore: number | null;
}

export interface AssessmentQuestionClient {
  questionId: string;
  type: 'mcq' | 'short_answer' | 'coding';
  prompt: string;
  options?: string[];
  starterCode?: string;
  language?: 'javascript' | 'python';
  functionName?: string;
  testCases?: Array<{
    description: string;
    inputJson: string;
    expectedOutputJson: string;
  }>;
  points: number;
}

export interface AssessmentAttemptDetail {
  _id: string;
  user: UserProfile | string;
  task: string;
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
  evaluations: Array<{
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
  }>;
  reviewStatus: 'None' | 'Pending' | 'Reviewed' | 'Resolved';
  completedAt: string;
}

export interface AssessmentReviewItem {
  _id: string;
  attempt: AssessmentAttemptDetail;
  student: UserProfile;
  task: {
    _id: string;
    title: string;
    skillName: string;
    competencyCategory: string;
    passingScorePercent: number;
  };
  reason: string;
  studentArgument: string;
  status: 'Pending' | 'Reviewed' | 'Resolved';
  originalScorePercent: number;
  updatedScorePercent?: number;
  reviewer?: {
    _id: string;
    name: string;
    email: string;
  };
  reviewerNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}
