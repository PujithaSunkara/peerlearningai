import { Router, Response } from 'express';
import { User, ICompetencyItem } from '../models/User.js';
import { Competency } from '../models/Competency.js';
import { DoubtRequest } from '../models/DoubtRequest.js';
import { LearningRequest } from '../models/LearningRequest.js';
import { LearningSession } from '../models/LearningSession.js';
import { AssessmentTask } from '../models/AssessmentTask.js';
import { AssessmentAttempt } from '../models/AssessmentAttempt.js';
import { protect, AuthRequest } from '../middleware/auth.js';
import {
  generateCustomSkillAssessmentWithGemini,
  generateRoleRoadmapWithGemini,
} from '../services/geminiService.js';

const router = Router();

function inferCategoryForSkill(
  skill: string
): 'Programming' | 'Debugging' | 'Problem-solving' | 'Data analysis' | 'Communication' {
  const s = skill.toLowerCase();
  if (s.includes('debug') || s.includes('test')) return 'Debugging';
  if (s.includes('dsa') || s.includes('algorithm') || s.includes('problem')) return 'Problem-solving';
  if (s.includes('sql') || s.includes('data') || s.includes('pandas') || s.includes('ml'))
    return 'Data analysis';
  if (s.includes('comm') || s.includes('english')) return 'Communication';
  return 'Programming';
}

// POST /api/users/onboarding-details
// Saves Student Details (College, Branch, Year, Skills known, Target Career Role)
// and dynamically generates the Skill Assessment Test based on those exact skills!
router.post('/onboarding-details', protect, async (req: AuthRequest, res: Response) => {
  try {
    const {
      college,
      branch,
      year,
      skills,
      targetCareerRole,
      bio,
      availabilityStatus,
    } = req.body;

    const parsedSkills: string[] = Array.isArray(skills)
      ? skills.map((s) => String(s).trim()).filter(Boolean)
      : String(skills || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    if (parsedSkills.length === 0) {
      res.status(400).json({
        message: 'Please enter at least one skill you know so we can generate your assessment test.',
      });
      return;
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const cleanCollege =
      college && String(college).trim()
        ? String(college).trim()
        : "Vignan's Institute of Information Technology";
    const cleanBranch =
      branch && String(branch).trim()
        ? String(branch).trim()
        : 'Computer Science & Engineering (CSE)';
    const cleanYear =
      year && String(year).trim() ? String(year).trim() : '3rd Year';
    const cleanRole =
      targetCareerRole && String(targetCareerRole).trim()
        ? String(targetCareerRole).trim()
        : 'Full Stack Developer';

    user.academicDetails = {
      institution: cleanCollege,
      major: cleanBranch,
      yearOfStudy: cleanYear,
    };
    user.targetCareerRole = cleanRole;
    user.bio =
      bio && String(bio).trim()
        ? String(bio).trim()
        : `${cleanYear} ${cleanBranch} student at ${cleanCollege} preparing for ${cleanRole}. Skilled in ${parsedSkills.join(', ')}.`;

    user.availability = {
      status:
        availabilityStatus === 'Busy' || availabilityStatus === 'Offline'
          ? availabilityStatus
          : 'Available',
      preferredHours: 'Available Now',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    };

    user.competencies = parsedSkills.map((skillName) => ({
      category: inferCategoryForSkill(skillName),
      skillName,
      proficiencyLevel: 'Intermediate',
      isVerified: false,
      updatedAt: new Date(),
    }));

    user.onboardingStep = 'assessment';
    await user.save();

    // Generate custom assessment task tailored to the student's mentioned skills
    const customQuestions = await generateCustomSkillAssessmentWithGemini(
      parsedSkills,
      cleanRole
    );

    const slug = `onboarding-skill-test-${user._id.toString()}-${Date.now()}`;
    const customTask = await AssessmentTask.create({
      title: `Skill Verification Test: ${parsedSkills.slice(0, 3).join(', ')}`,
      slug,
      competencyCategory: 'Programming',
      skillName: parsedSkills.join(', '),
      difficulty: 'Intermediate',
      durationMinutes: 15,
      description: `Personalized skill assessment generated from your Student Details form (${parsedSkills.join(
        ', '
      )}) for your target role as ${cleanRole}.`,
      maxScore: 100,
      passingScorePercent: 60,
      rubric: [
        {
          criterion: 'Technical Accuracy',
          weightPercent: 70,
          description: 'Correctness on questions covering your stated skills.',
        },
        {
          criterion: 'Role Readiness',
          weightPercent: 30,
          description: `Practical engineering application for ${cleanRole}.`,
        },
      ],
      questions: customQuestions,
    });

    const updatedUser = await User.findById(user._id).select('-passwordHash');
    res.json({
      user: updatedUser,
      assessmentTaskId: customTask._id,
      message: 'Student details saved! Proceeding to your personalized skill assessment test.',
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/users/complete-onboarding — Mark onboarding completed
router.post('/complete-onboarding', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { onboardingStep: 'completed' },
      { new: true }
    ).select('-passwordHash');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/users/role-dashboard — Get learning roadmap, readiness stats, and role assessments
router.get('/role-dashboard', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!._id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const attempts = await AssessmentAttempt.find({ user: user._id }).sort({
      completedAt: -1,
    });

    const roadmap = await generateRoleRoadmapWithGemini(
      user.targetCareerRole || 'Full Stack Developer',
      (user.competencies || []).map((c: ICompetencyItem) => ({
        skillName: c.skillName,
        isVerified: c.isVerified,
        verifiedScore: c.verifiedScore,
      }))
    );

    res.json({
      user,
      roadmap,
      attempts,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/users/role-assessment — Generate a new assessment specifically for preparing for the student's target role
router.post('/role-assessment', protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const { customTopic } = req.body;
    const roleName = user.targetCareerRole || 'Full Stack Developer';
    const userSkillList = (user.competencies || []).map(
      (c: ICompetencyItem) => c.skillName
    );
    const focusSkills =
      customTopic && String(customTopic).trim()
        ? [String(customTopic).trim(), ...userSkillList.slice(0, 3)]
        : userSkillList.length > 0
        ? userSkillList
        : [roleName];

    const questions = await generateCustomSkillAssessmentWithGemini(
      focusSkills,
      roleName
    );

    const task = await AssessmentTask.create({
      title: `${roleName} Preparation Assessment (${focusSkills.slice(0, 2).join(' & ')})`,
      slug: `role-prep-${user._id.toString()}-${Date.now()}`,
      competencyCategory: 'Programming',
      skillName: focusSkills.join(', '),
      difficulty: 'Intermediate',
      durationMinutes: 15,
      description: `Targeted role preparation assessment for ${roleName} focusing on ${focusSkills.join(
        ', '
      )}.`,
      maxScore: 100,
      passingScorePercent: 60,
      rubric: [
        {
          criterion: 'Role Competency',
          weightPercent: 70,
          description: `Mastery of ${focusSkills.join(', ')} concepts.`,
        },
        {
          criterion: 'Problem Solving',
          weightPercent: 30,
          description: 'Applied scenario evaluation.',
        },
      ],
      questions,
    });

    res.status(201).json({ taskId: task._id, task });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/users/dashboard-stats
router.get('/dashboard-stats', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    const [
      doubtsCount,
      pendingIncomingRequests,
      activeSessions,
      recentAttempts,
      allPeersCount,
    ] = await Promise.all([
      DoubtRequest.countDocuments({ student: userId }),
      LearningRequest.countDocuments({ mentor: userId, status: 'Pending' }),
      LearningSession.find({
        $or: [{ learner: userId }, { mentor: userId }],
        status: 'Active',
      })
        .populate('learner', 'name username email academicDetails avatarUrl targetCareerRole')
        .populate('mentor', 'name username email academicDetails avatarUrl targetCareerRole')
        .sort({ updatedAt: -1 })
        .limit(5),
      AssessmentAttempt.find({ user: userId }).sort({ completedAt: -1 }).limit(10),
      User.countDocuments({ _id: { $ne: userId } }),
    ]);

    const verifiedCompetenciesCount = (req.user!.competencies || []).filter(
      (c: ICompetencyItem) => c.isVerified
    ).length;
    const selfReportedCount = (req.user!.competencies || []).filter(
      (c: ICompetencyItem) => !c.isVerified
    ).length;

    res.json({
      doubtsCount,
      pendingIncomingRequests,
      activeSessions,
      recentAttempts,
      allPeersCount,
      verifiedCompetenciesCount,
      selfReportedCount,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/users/competency-catalog
router.get('/competency-catalog', protect, async (_req: AuthRequest, res: Response) => {
  try {
    const catalog = await Competency.find().sort({ category: 1, name: 1 });
    res.json({ catalog });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// PUT /api/users/profile
router.put('/profile', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { name, bio, academicDetails, availability, targetCareerRole } = req.body;
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (name && String(name).trim().length >= 2) {
      user.name = String(name).trim();
    }
    if (typeof bio === 'string') {
      user.bio = bio.trim();
    }
    if (targetCareerRole && String(targetCareerRole).trim()) {
      user.targetCareerRole = String(targetCareerRole).trim();
    }
    if (academicDetails) {
      user.academicDetails = {
        institution: academicDetails.institution || user.academicDetails.institution,
        major: academicDetails.major || user.academicDetails.major,
        yearOfStudy: academicDetails.yearOfStudy || user.academicDetails.yearOfStudy,
      };
    }
    if (availability) {
      const validStatuses = ['Available', 'Busy', 'Offline'] as const;
      user.availability = {
        status: validStatuses.includes(availability.status)
          ? availability.status
          : user.availability.status,
        preferredHours: availability.preferredHours ?? user.availability.preferredHours,
        days: Array.isArray(availability.days) ? availability.days : user.availability.days,
      };
    }

    await user.save();
    const updated = await User.findById(user._id).select('-passwordHash');
    res.json({ user: updated, message: 'Profile updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/users/competencies
router.post('/competencies', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { category, skillName, proficiencyLevel } = req.body;
    const validCategories = [
      'Programming',
      'Debugging',
      'Problem-solving',
      'Data analysis',
      'Communication',
    ] as const;
    const validLevels = ['Beginner', 'Intermediate', 'Advanced'] as const;

    if (!validCategories.includes(category)) {
      res.status(400).json({ message: 'Invalid competency category.' });
      return;
    }
    if (!skillName || String(skillName).trim().length < 1) {
      res.status(400).json({ message: 'Skill name is required.' });
      return;
    }
    if (!validLevels.includes(proficiencyLevel)) {
      res.status(400).json({
        message: 'Proficiency level must be Beginner, Intermediate, or Advanced.',
      });
      return;
    }

    const cleanSkill = String(skillName).trim();
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const existingIdx = user.competencies.findIndex(
      (c: ICompetencyItem) => c.skillName.toLowerCase() === cleanSkill.toLowerCase()
    );

    if (existingIdx >= 0) {
      user.competencies[existingIdx].category = category;
      user.competencies[existingIdx].proficiencyLevel = proficiencyLevel;
      user.competencies[existingIdx].updatedAt = new Date();
    } else {
      user.competencies.push({
        category,
        skillName: cleanSkill,
        proficiencyLevel,
        isVerified: false,
        updatedAt: new Date(),
      });
    }

    await user.save();
    const updated = await User.findById(user._id).select('-passwordHash');
    res.json({
      user: updated,
      message: `Saved "${cleanSkill}" to your skills profile.`,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// DELETE /api/users/competencies/:skillName
router.delete('/competencies/:skillName', protect, async (req: AuthRequest, res: Response) => {
  try {
    const targetSkill = decodeURIComponent(req.params.skillName).toLowerCase();
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    user.competencies = user.competencies.filter(
      (c: ICompetencyItem) => c.skillName.toLowerCase() !== targetSkill
    );
    await user.save();

    const updated = await User.findById(user._id).select('-passwordHash');
    res.json({ user: updated, message: 'Skill removed from profile.' });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/users/peers
router.get('/peers', protect, async (req: AuthRequest, res: Response) => {
  try {
    const peers = await User.find({ _id: { $ne: req.user!._id } })
      .select('-passwordHash')
      .sort({ 'availability.status': 1, 'stats.averageRating': -1 });
    res.json({ peers });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
