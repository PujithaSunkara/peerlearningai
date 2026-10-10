import { Router, Response } from 'express';
import { DoubtRequest } from '../models/DoubtRequest.js';
import { User } from '../models/User.js';
import { protect, AuthRequest } from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimit.js';
import { analyzeDoubtWithGemini } from '../services/geminiService.js';
import { rankPeersDeterministically } from '../services/matchingService.js';

const router = Router();

// POST /api/doubts — Submit a doubt, analyze with Gemini, and run deterministic peer ranking
router.post('/', protect, aiRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, codeSnippet, urgency } = req.body;
    if (!title || !description) {
      res.status(400).json({ message: 'Please provide both a doubt title and detailed description.' });
      return;
    }

    const aiResult = await analyzeDoubtWithGemini(
      String(title).trim(),
      String(description).trim(),
      codeSnippet ? String(codeSnippet) : undefined
    );

    const candidatePeers = await User.find({ _id: { $ne: req.user!._id } }).select('-passwordHash');

    const rankedMatches = rankPeersDeterministically(
      candidatePeers,
      aiResult.extractedTopics,
      aiResult.extractedCompetencies,
      aiResult.recommendedProficiency,
      `${title} ${description} ${codeSnippet || ''}`
    );

    const doubtDoc = await DoubtRequest.create({
      student: req.user!._id,
      title: String(title).trim(),
      description: String(description).trim(),
      codeSnippet: codeSnippet ? String(codeSnippet) : '',
      urgency: ['Low', 'Medium', 'High'].includes(urgency) ? urgency : 'Medium',
      extractedTopics: aiResult.extractedTopics,
      extractedCompetencies: aiResult.extractedCompetencies,
      recommendedProficiency: aiResult.recommendedProficiency,
      aiAnalysisSummary: aiResult.aiAnalysisSummary,
      aiConfidence: aiResult.aiConfidence,
      matchedPeers: rankedMatches.map((m) => ({
        peer: m.peer._id,
        matchScore: m.matchScore,
        scoreBreakdown: m.scoreBreakdown,
        explanation: m.explanation,
      })),
      status: 'Matched',
    });

    const populated = await DoubtRequest.findById(doubtDoc._id).populate(
      'matchedPeers.peer',
      '-passwordHash'
    );

    res.status(201).json({
      doubt: populated,
      rankedMatches,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/doubts — List student's submitted doubts with matched peers
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const doubts = await DoubtRequest.find({ student: req.user!._id })
      .populate('matchedPeers.peer', '-passwordHash')
      .sort({ createdAt: -1 });
    res.json({ doubts });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/doubts/:id — Get a single doubt with full peer match details
router.get('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const doubt = await DoubtRequest.findById(req.params.id).populate(
      'matchedPeers.peer',
      '-passwordHash'
    );
    if (!doubt) {
      res.status(404).json({ message: 'Doubt request not found.' });
      return;
    }
    res.json({ doubt });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
