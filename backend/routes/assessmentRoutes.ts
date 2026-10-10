import { Router, Response } from 'express';
import { AssessmentTask, IAssessmentQuestion } from '../models/AssessmentTask.js';
import { AssessmentAttempt, IQuestionEvaluation } from '../models/AssessmentAttempt.js';
import { AssessmentReview } from '../models/AssessmentReview.js';
import { User, ICompetencyItem } from '../models/User.js';
import { protect, requireReviewer, AuthRequest } from '../middleware/auth.js';
import { evaluateQuestionSubmission } from '../services/codeSandboxService.js';
import { generateAssessmentCoachingWithGemini } from '../services/geminiService.js';

const router = Router();

// GET /api/assessments/tasks — List all available skill assessments (without exposing MCQ answer keys)
router.get('/tasks', protect, async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await AssessmentTask.find().sort({ competencyCategory: 1, title: 1 });
    const userAttempts = await AssessmentAttempt.find({ user: req.user!._id }).sort({
      attemptNumber: 1,
    });

    const sanitizedTasks = tasks.map((task) => {
      const taskAttempts = userAttempts.filter(
        (a) => a.task.toString() === task._id.toString()
      );
      const bestScore =
        taskAttempts.length > 0
          ? Math.max(...taskAttempts.map((a) => a.percentageScore))
          : null;
      const latestScore =
        taskAttempts.length > 0
          ? taskAttempts[taskAttempts.length - 1].percentageScore
          : null;

      return {
        _id: task._id,
        title: task.title,
        slug: task.slug,
        competencyCategory: task.competencyCategory,
        skillName: task.skillName,
        difficulty: task.difficulty,
        durationMinutes: task.durationMinutes,
        description: task.description,
        maxScore: task.maxScore,
        passingScorePercent: task.passingScorePercent,
        rubric: task.rubric,
        questionCount: task.questions.length,
        attemptsCount: taskAttempts.length,
        bestScore,
        latestScore,
      };
    });

    res.json({ tasks: sanitizedTasks });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/assessments/tasks/:id — Get single task for taking assessment (hide correctAnswer)
router.get('/tasks/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const task = await AssessmentTask.findById(req.params.id);
    if (!task) {
      res.status(404).json({ message: 'Assessment task not found.' });
      return;
    }

    const previousAttemptsCount = await AssessmentAttempt.countDocuments({
      user: req.user!._id,
      task: task._id,
    });

    const safeQuestions = task.questions.map((q: IAssessmentQuestion) => ({
      questionId: q.questionId,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      starterCode: q.starterCode,
      language: q.language,
      functionName: q.functionName,
      testCases: q.testCases?.map((tc: { description: string; inputJson: string; expectedOutputJson: string }) => ({
        description: tc.description,
        inputJson: tc.inputJson,
        expectedOutputJson: tc.expectedOutputJson,
      })),
      points: q.points,
    }));

    res.json({
      task: {
        _id: task._id,
        title: task.title,
        slug: task.slug,
        competencyCategory: task.competencyCategory,
        skillName: task.skillName,
        difficulty: task.difficulty,
        durationMinutes: task.durationMinutes,
        description: task.description,
        maxScore: task.maxScore,
        passingScorePercent: task.passingScorePercent,
        rubric: task.rubric,
        questions: safeQuestions,
        nextAttemptNumber: previousAttemptsCount + 1,
      },
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/assessments/tasks/:id/submit — Evaluate attempt objectively on backend & preserve full attempt history
router.post('/tasks/:id/submit', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { answers } = req.body; // Record<questionId, string>
    if (!answers || typeof answers !== 'object') {
      res.status(400).json({ message: 'Answers payload is required.' });
      return;
    }

    const task = await AssessmentTask.findById(req.params.id);
    if (!task) {
      res.status(404).json({ message: 'Assessment task not found.' });
      return;
    }

    const previousAttempts = await AssessmentAttempt.find({
      user: req.user!._id,
      task: task._id,
    }).sort({ attemptNumber: 1 });

    const attemptNumber = previousAttempts.length + 1;
    const evaluations: IQuestionEvaluation[] = [];
    let earnedScore = 0;

    for (const question of task.questions) {
      const submitted = String(answers[question.questionId] ?? '');
      const evalResult = await evaluateQuestionSubmission(question, submitted);
      evaluations.push(evalResult);
      earnedScore += evalResult.earnedPoints;
    }

    const percentageScore = Math.round((earnedScore / task.maxScore) * 100);
    const passed = percentageScore >= task.passingScorePercent;

    const firstAttemptScore =
      previousAttempts.length > 0 ? previousAttempts[0].percentageScore : percentageScore;
    const deltaFromFirst = percentageScore - firstAttemptScore;

    const overallFeedback =
      attemptNumber > 1
        ? `Attempt #${attemptNumber} scored ${percentageScore}% (${
            deltaFromFirst >= 0 ? `+${deltaFromFirst}` : deltaFromFirst
          } percentage points compared to your first attempt of ${firstAttemptScore}%). ${
            passed
              ? 'Passed verification threshold! Your competency profile is now supported by assessment evidence.'
              : `Below the ${task.passingScorePercent}% threshold. Review the rubric breakdown and retry.`
          }`
        : `Attempt #1 scored ${percentageScore}%. ${
            passed
              ? 'Passed verification threshold! Your competency profile is now supported by assessment evidence.'
              : `Below the ${task.passingScorePercent}% threshold. Review the question feedback and retry to improve your score.`
          }`;

    const summaryForAi = evaluations
      .map(
        (e) =>
          `Question ${e.questionId} (${e.questionType}): ${e.earnedPoints}/${e.maxPoints} pts - ${e.feedback}`
      )
      .join('\n');

    const aiCoachingSummary = await generateAssessmentCoachingWithGemini(
      task.title,
      task.skillName,
      percentageScore,
      summaryForAi
    );

    // Always create a NEW attempt record (never overwrite previous attempts)
    const attemptDoc = await AssessmentAttempt.create({
      user: req.user!._id,
      task: task._id,
      taskTitle: task.title,
      competencyCategory: task.competencyCategory,
      skillName: task.skillName,
      attemptNumber,
      earnedScore,
      maxScore: task.maxScore,
      percentageScore,
      passed,
      overallFeedback,
      aiCoachingSummary,
      evaluations,
      reviewStatus: 'None',
      completedAt: new Date(),
    });

    // Mark user onboardingStep = 'completed' and update competency verification for all skills tested
    const user = await User.findById(req.user!._id);
    if (user) {
      if (user.onboardingStep !== 'completed') {
        user.onboardingStep = 'completed';
      }

      const testedSkills = task.skillName
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);

      for (const sName of testedSkills) {
        const existingIdx = user.competencies.findIndex(
          (c: ICompetencyItem) => c.skillName.toLowerCase() === sName.toLowerCase()
        );
        const derivedLevel =
          percentageScore >= 80
            ? 'Advanced'
            : percentageScore >= 60
            ? 'Intermediate'
            : 'Beginner';

        if (existingIdx >= 0) {
          if (passed) {
            user.competencies[existingIdx].isVerified = true;
          }
          user.competencies[existingIdx].verifiedScore = Math.max(
            user.competencies[existingIdx].verifiedScore || 0,
            percentageScore
          );
          user.competencies[existingIdx].verifiedTaskId = task._id;
          user.competencies[existingIdx].proficiencyLevel = derivedLevel;
          user.competencies[existingIdx].updatedAt = new Date();
        } else if (passed) {
          user.competencies.push({
            category: task.competencyCategory,
            skillName: sName,
            proficiencyLevel: derivedLevel,
            isVerified: true,
            verifiedScore: percentageScore,
            verifiedTaskId: task._id,
            updatedAt: new Date(),
          });
        }
      }
      await user.save();
    }

    res.status(201).json({ attempt: attemptDoc });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/assessments/attempts/:id — Get detailed attempt result & rubric breakdown
router.get('/attempts/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const attempt = await AssessmentAttempt.findById(req.params.id).populate(
      'user',
      'name email academicDetails'
    );
    if (!attempt) {
      res.status(404).json({ message: 'Assessment attempt not found.' });
      return;
    }

    // Allow the student who took it OR an authorized reviewer
    if (
      attempt.user._id.toString() !== req.user!._id.toString() &&
      req.user!.role !== 'reviewer'
    ) {
      res.status(403).json({ message: 'Unauthorized to view this assessment attempt.' });
      return;
    }

    const allTaskAttempts = await AssessmentAttempt.find({
      user: attempt.user._id,
      task: attempt.task,
    }).sort({ attemptNumber: 1 });

    const review = await AssessmentReview.findOne({ attempt: attempt._id }).populate(
      'reviewer',
      'name email'
    );

    res.json({
      attempt,
      allTaskAttempts,
      review,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/assessments/progress — Full assessment history & progress metrics per task and overall
router.get('/progress', protect, async (req: AuthRequest, res: Response) => {
  try {
    const attempts = await AssessmentAttempt.find({ user: req.user!._id }).sort({
      completedAt: 1,
    });

    // Group by task to calculate First Attempt, Latest Attempt, Best Score, and Improvement Delta
    const byTaskMap = new Map<
      string,
      {
        taskId: string;
        taskTitle: string;
        skillName: string;
        competencyCategory: string;
        attemptsCount: number;
        firstAttemptScore: number;
        latestScore: number;
        bestScore: number;
        improvementPercentagePoints: number;
        attempts: Array<{
          attemptId: string;
          attemptNumber: number;
          percentageScore: number;
          completedAt: Date;
          passed: boolean;
          reviewStatus: string;
        }>;
      }
    >();

    for (const att of attempts) {
      const key = att.task.toString();
      if (!byTaskMap.has(key)) {
        byTaskMap.set(key, {
          taskId: key,
          taskTitle: att.taskTitle,
          skillName: att.skillName,
          competencyCategory: att.competencyCategory,
          attemptsCount: 0,
          firstAttemptScore: att.percentageScore,
          latestScore: att.percentageScore,
          bestScore: att.percentageScore,
          improvementPercentagePoints: 0,
          attempts: [],
        });
      }

      const group = byTaskMap.get(key)!;
      group.attemptsCount += 1;
      group.latestScore = att.percentageScore;
      group.bestScore = Math.max(group.bestScore, att.percentageScore);
      group.improvementPercentagePoints = group.bestScore - group.firstAttemptScore;
      group.attempts.push({
        attemptId: att._id.toString(),
        attemptNumber: att.attemptNumber,
        percentageScore: att.percentageScore,
        completedAt: att.completedAt,
        passed: att.passed,
        reviewStatus: att.reviewStatus,
      });
    }

    res.json({
      attempts: [...attempts].reverse(),
      taskProgress: Array.from(byTaskMap.values()),
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/assessments/reviews — Student requests a formal review of a disputed assessment result
router.post('/reviews', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId, reason, studentArgument } = req.body;
    if (!attemptId || !reason || !studentArgument) {
      res.status(400).json({
        message: 'Attempt ID, review reason, and detailed explanation are required.',
      });
      return;
    }

    const attempt = await AssessmentAttempt.findById(attemptId);
    if (!attempt) {
      res.status(404).json({ message: 'Assessment attempt not found.' });
      return;
    }

    if (attempt.user.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'You can only request a review for your own attempt.' });
      return;
    }

    const existing = await AssessmentReview.findOne({ attempt: attempt._id });
    if (existing) {
      res.status(409).json({ message: 'A review request already exists for this attempt.' });
      return;
    }

    const review = await AssessmentReview.create({
      attempt: attempt._id,
      student: req.user!._id,
      task: attempt.task,
      reason: String(reason).trim(),
      studentArgument: String(studentArgument).trim(),
      status: 'Pending',
      originalScorePercent: attempt.percentageScore,
    });

    attempt.reviewStatus = 'Pending';
    await attempt.save();

    res.status(201).json({ review });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/assessments/reviews — List review requests (students see their own; authorized reviewers see all)
router.get('/reviews', protect, async (req: AuthRequest, res: Response) => {
  try {
    const filter =
      req.user!.role === 'reviewer' ? {} : { student: req.user!._id };

    const reviews = await AssessmentReview.find(filter)
      .populate('student', 'name email academicDetails')
      .populate('reviewer', 'name email')
      .populate('task', 'title skillName competencyCategory passingScorePercent')
      .populate('attempt')
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// PATCH /api/assessments/reviews/:id/decide — Authorized reviewer inspects and updates/resolves disputed result
router.patch(
  '/reviews/:id/decide',
  protect,
  requireReviewer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { status, updatedScorePercent, reviewerNotes } = req.body;
      if (!['Reviewed', 'Resolved'].includes(status)) {
        res.status(400).json({ message: 'Review status must be Reviewed or Resolved.' });
        return;
      }

      const review = await AssessmentReview.findById(req.params.id);
      if (!review) {
        res.status(404).json({ message: 'Review request not found.' });
        return;
      }

      const attempt = await AssessmentAttempt.findById(review.attempt);
      if (!attempt) {
        res.status(404).json({ message: 'Associated assessment attempt not found.' });
        return;
      }

      review.status = status;
      review.reviewer = req.user!._id;
      review.reviewerNotes = reviewerNotes ? String(reviewerNotes).trim() : '';
      review.resolvedAt = new Date();

      if (
        typeof updatedScorePercent === 'number' &&
        updatedScorePercent >= 0 &&
        updatedScorePercent <= 100
      ) {
        review.updatedScorePercent = Math.round(updatedScorePercent);
        attempt.percentageScore = Math.round(updatedScorePercent);
        attempt.earnedScore = Math.round((updatedScorePercent / 100) * attempt.maxScore);
        attempt.passed = attempt.percentageScore >= 70;
        attempt.overallFeedback = `${attempt.overallFeedback} [Reviewer Adjustment: Score updated to ${attempt.percentageScore}% by ${req.user!.name}]`;

        if (attempt.passed) {
          const studentUser = await User.findById(attempt.user);
          if (studentUser) {
            const compIdx = studentUser.competencies.findIndex(
              (c: ICompetencyItem) => c.skillName.toLowerCase() === attempt.skillName.toLowerCase()
            );
            if (compIdx >= 0) {
              studentUser.competencies[compIdx].isVerified = true;
              studentUser.competencies[compIdx].verifiedScore = Math.max(
                studentUser.competencies[compIdx].verifiedScore || 0,
                attempt.percentageScore
              );
              studentUser.competencies[compIdx].verifiedTaskId = attempt.task;
            } else {
              studentUser.competencies.push({
                category: attempt.competencyCategory as
                  | 'Programming'
                  | 'Debugging'
                  | 'Problem-solving'
                  | 'Data analysis'
                  | 'Communication',
                skillName: attempt.skillName,
                proficiencyLevel: attempt.percentageScore >= 85 ? 'Advanced' : 'Intermediate',
                isVerified: true,
                verifiedScore: attempt.percentageScore,
                verifiedTaskId: attempt.task,
                updatedAt: new Date(),
              });
            }
            await studentUser.save();
          }
        }
      } else {
        review.updatedScorePercent = attempt.percentageScore;
      }

      attempt.reviewStatus = status;
      await Promise.all([review.save(), attempt.save()]);

      const populated = await AssessmentReview.findById(review._id)
        .populate('student', 'name email academicDetails')
        .populate('reviewer', 'name email')
        .populate('task', 'title skillName competencyCategory')
        .populate('attempt');

      res.json({ review: populated });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  }
);

export default router;
