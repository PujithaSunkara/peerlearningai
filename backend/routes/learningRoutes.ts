import { Router, Response } from 'express';
import { LearningRequest } from '../models/LearningRequest.js';
import { LearningSession } from '../models/LearningSession.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { SessionSummary } from '../models/SessionSummary.js';
import { User } from '../models/User.js';
import { protect, AuthRequest } from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimit.js';
import { generateSessionSummaryWithGemini } from '../services/geminiService.js';

const router = Router();

// POST /api/learning/requests — Send a peer learning request
router.post('/requests', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { mentorId, doubtRequestId, topic, message, proposedTime, roleMode } = req.body;

    if (!mentorId || !topic || !message) {
      res.status(400).json({ message: 'Mentor, topic, and introductory message are required.' });
      return;
    }

    if (String(mentorId) === req.user!._id.toString()) {
      res.status(400).json({ message: 'You cannot send a learning request to yourself.' });
      return;
    }

    const mentor = await User.findById(mentorId);
    if (!mentor) {
      res.status(404).json({ message: 'Selected peer mentor not found.' });
      return;
    }

    const learningReq = await LearningRequest.create({
      learner: req.user!._id,
      mentor: mentor._id,
      doubtRequest: doubtRequestId || undefined,
      topic: String(topic).trim(),
      message: String(message).trim(),
      proposedTime: proposedTime ? String(proposedTime).trim() : 'Flexible / Today',
      roleMode: roleMode === 'peer-collab' ? 'peer-collab' : 'learner-to-mentor',
      status: 'Pending',
    });

    const populated = await LearningRequest.findById(learningReq._id)
      .populate('learner', 'name email academicDetails competencies avatarUrl')
      .populate('mentor', 'name email academicDetails competencies avatarUrl');

    res.status(201).json({ request: populated });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/learning/requests — View incoming (as mentor) and outgoing (as learner) requests
router.get('/requests', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const [incoming, outgoing] = await Promise.all([
      LearningRequest.find({ mentor: userId })
        .populate('learner', 'name email academicDetails competencies availability avatarUrl stats')
        .populate('mentor', 'name email academicDetails competencies availability avatarUrl stats')
        .sort({ createdAt: -1 }),
      LearningRequest.find({ learner: userId })
        .populate('learner', 'name email academicDetails competencies availability avatarUrl stats')
        .populate('mentor', 'name email academicDetails competencies availability avatarUrl stats')
        .sort({ createdAt: -1 }),
    ]);

    res.json({ incoming, outgoing });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// PATCH /api/learning/requests/:id/respond — Accept or Reject a learning request
router.patch('/requests/:id/respond', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { decision } = req.body; // 'Accepted' | 'Rejected'
    if (!['Accepted', 'Rejected'].includes(decision)) {
      res.status(400).json({ message: 'Decision must be Accepted or Rejected.' });
      return;
    }

    const learningReq = await LearningRequest.findById(req.params.id);
    if (!learningReq) {
      res.status(404).json({ message: 'Learning request not found.' });
      return;
    }

    if (learningReq.mentor.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Only the recipient mentor can accept or reject this request.' });
      return;
    }

    learningReq.status = decision;

    let session = null;
    if (decision === 'Accepted') {
      const existingSession = await LearningSession.findOne({ learningRequest: learningReq._id });
      if (existingSession) {
        session = existingSession;
      } else {
        session = await LearningSession.create({
          learningRequest: learningReq._id,
          learner: learningReq.learner,
          mentor: learningReq.mentor,
          topic: learningReq.topic,
          channelName: `peerconnect-session-${learningReq._id.toString().slice(-8)}`,
          status: 'Active',
          sharedNotes: `# Collaborative Notes: ${learningReq.topic}\n\n- Goal: Resolve core questions and test edge cases.\n`,
        });

        await ChatMessage.create({
          session: session._id,
          sender: req.user!._id,
          senderName: req.user!.name,
          messageType: 'text',
          content: `Accepted your learning request on "${learningReq.topic}". Let's collaborate here or launch a live video session!`,
        });
      }
      learningReq.sessionId = session._id;
    }

    await learningReq.save();

    const populated = await LearningRequest.findById(learningReq._id)
      .populate('learner', 'name email academicDetails competencies avatarUrl')
      .populate('mentor', 'name email academicDetails competencies avatarUrl');

    res.json({ request: populated, session });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/learning/sessions — List active and completed sessions for current user
router.get('/sessions', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const sessions = await LearningSession.find({
      $or: [{ learner: userId }, { mentor: userId }],
    })
      .populate('learner', 'name email academicDetails competencies avatarUrl')
      .populate('mentor', 'name email academicDetails competencies avatarUrl')
      .sort({ updatedAt: -1 });

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/learning/sessions/:id — Get single session details + chat history + Agora config status
router.get('/sessions/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const session = await LearningSession.findById(req.params.id)
      .populate('learner', 'name email academicDetails competencies avatarUrl')
      .populate('mentor', 'name email academicDetails competencies avatarUrl');

    if (!session) {
      res.status(404).json({ message: 'Learning session not found.' });
      return;
    }

    const userIdStr = req.user!._id.toString();
    if (
      session.learner._id.toString() !== userIdStr &&
      session.mentor._id.toString() !== userIdStr
    ) {
      res.status(403).json({ message: 'You are not a participant in this session.' });
      return;
    }

    const messages = await ChatMessage.find({ session: session._id }).sort({ createdAt: 1 });
    const summaries = await SessionSummary.find({ session: session._id }).sort({ createdAt: -1 });

    res.json({ session, messages, summaries });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/learning/sessions/:id/video-credentials — Securely provide Agora session configuration
router.get('/sessions/:id/video-credentials', protect, async (req: AuthRequest, res: Response) => {
  try {
    const session = await LearningSession.findById(req.params.id);
    if (!session) {
      res.status(404).json({ message: 'Learning session not found.' });
      return;
    }

    const userIdStr = req.user!._id.toString();
    if (
      session.learner.toString() !== userIdStr &&
      session.mentor.toString() !== userIdStr
    ) {
      res.status(403).json({ message: 'Unauthorized for this video channel.' });
      return;
    }

    const agoraAppId = (process.env.AGORA_APP_ID || process.env.VITE_AGORA_APP_ID || '').trim();
    const isConfigured = Boolean(agoraAppId && agoraAppId.length > 5);

    res.json({
      configured: isConfigured,
      appId: isConfigured ? agoraAppId : null,
      channelName: session.channelName,
      uid: Math.abs(
        userIdStr.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
      ) % 1000000,
      token: null, // Uses App ID testing mode or token if certificate is provided
      statusMessage: isConfigured
        ? 'Agora WebRTC credentials verified.'
        : 'AGORA_APP_ID is not set in server environment variables. Local camera/microphone preview and collaborative workspace remain available.',
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/learning/sessions/:id/messages — Fallback HTTP endpoint to send message & save to MongoDB
router.post('/sessions/:id/messages', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { content, messageType, codeLanguage } = req.body;
    if (!content || !String(content).trim()) {
      res.status(400).json({ message: 'Message content cannot be empty.' });
      return;
    }

    const session = await LearningSession.findById(req.params.id);
    if (!session) {
      res.status(404).json({ message: 'Session not found.' });
      return;
    }

    const userIdStr = req.user!._id.toString();
    if (
      session.learner.toString() !== userIdStr &&
      session.mentor.toString() !== userIdStr
    ) {
      res.status(403).json({ message: 'Not authorized in this session.' });
      return;
    }

    const msg = await ChatMessage.create({
      session: session._id,
      sender: req.user!._id,
      senderName: req.user!.name,
      messageType: messageType === 'code' ? 'code' : 'text',
      content: String(content),
      codeLanguage: codeLanguage || 'javascript',
    });

    res.status(201).json({ message: msg });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// PATCH /api/learning/sessions/:id/notes — Save shared session notes
router.patch('/sessions/:id/notes', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { sharedNotes } = req.body;
    const session = await LearningSession.findById(req.params.id);
    if (!session) {
      res.status(404).json({ message: 'Session not found.' });
      return;
    }

    session.sharedNotes = typeof sharedNotes === 'string' ? sharedNotes : session.sharedNotes;
    await session.save();
    res.json({ session });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// PATCH /api/learning/sessions/:id/complete — Mark session completed, save listener's rating & review on the explained peer's profile, and optionally generate AI summary
router.patch('/sessions/:id/complete', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { rating, feedback, rawNotes, generateSummary } = req.body;
    const session = await LearningSession.findById(req.params.id);
    if (!session) {
      res.status(404).json({ message: 'Session not found.' });
      return;
    }

    const wasActive = session.status === 'Active';
    session.status = 'Completed';
    session.endedAt = new Date();

    const numericRating =
      rating && Number(rating) >= 1 && Number(rating) <= 5 ? Number(rating) : undefined;
    if (numericRating) {
      session.learnerRating = numericRating;
    }
    if (feedback) {
      session.learnerFeedback = String(feedback).trim();
    }
    if (rawNotes && String(rawNotes).trim()) {
      session.sharedNotes = String(rawNotes).trim();
    }
    await session.save();

    // Determine who the explained peer (mentor/partner) is relative to the listener submitting the review
    const currentUserId = req.user!._id.toString();
    const explainedPeerId =
      session.mentor.toString() === currentUserId ? session.learner : session.mentor;

    if (numericRating || feedback) {
      const explainedPeer = await User.findById(explainedPeerId);
      if (explainedPeer) {
        explainedPeer.peerReviews = explainedPeer.peerReviews || [];
        explainedPeer.peerReviews.unshift({
          reviewerId: req.user!._id,
          reviewerName: req.user!.name,
          sessionId: session._id,
          topic: session.topic,
          rating: numericRating || 5,
          comment: feedback ? String(feedback).trim() : 'Helpful 1-on-1 peer explanation session.',
          createdAt: new Date(),
        });

        const totalReviews = explainedPeer.peerReviews.length;
        const sumRatings = explainedPeer.peerReviews.reduce(
          (acc: number, r: { rating: number }) => acc + r.rating,
          0
        );
        explainedPeer.stats.ratingCount = totalReviews;
        explainedPeer.stats.averageRating = Math.round((sumRatings / totalReviews) * 10) / 10;
        if (wasActive) {
          explainedPeer.stats.sessionsMentored = (explainedPeer.stats.sessionsMentored || 0) + 1;
        }
        await explainedPeer.save();
      }
    } else if (wasActive) {
      await User.findByIdAndUpdate(explainedPeerId, { $inc: { 'stats.sessionsMentored': 1 } });
    }

    if (wasActive) {
      await LearningRequest.findByIdAndUpdate(session.learningRequest, { status: 'Completed' });
      await User.findByIdAndUpdate(req.user!._id, { $inc: { 'stats.sessionsLearned': 1 } });
    }

    let summaryDoc = null;
    if (generateSummary !== false) {
      const messages = await ChatMessage.find({ session: session._id })
        .sort({ createdAt: 1 })
        .limit(30);
      const chatTranscript = messages
        .map((m) => `${m.senderName} (${m.messageType}): ${m.content}`)
        .join('\n');

      const notesToUse =
        session.sharedNotes ||
        `1-on-1 video and chat session on ${session.topic}. Feedback: ${feedback || 'Resolved doubt.'}`;

      const aiSummary = await generateSessionSummaryWithGemini(
        session.topic,
        notesToUse,
        chatTranscript
      );

      summaryDoc = await SessionSummary.create({
        session: session._id,
        generatedBy: req.user!._id,
        topic: session.topic,
        rawNotes: notesToUse,
        summaryText: aiSummary.summaryText,
        keyConceptsLearned: aiSummary.keyConceptsLearned,
        topicsNeedingPractice: aiSummary.topicsNeedingPractice,
        recommendedNextTopics: aiSummary.recommendedNextTopics,
        generatedSource: aiSummary.generatedSource,
      });
    }

    res.json({ session, summary: summaryDoc });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/learning/sessions/:id/summarize — Generate AI session summary from notes & chat transcript
router.post(
  '/sessions/:id/summarize',
  protect,
  aiRateLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { rawNotes } = req.body;
      const session = await LearningSession.findById(req.params.id);
      if (!session) {
        res.status(404).json({ message: 'Session not found.' });
        return;
      }

      const notesToUse =
        rawNotes && String(rawNotes).trim().length > 0
          ? String(rawNotes).trim()
          : session.sharedNotes || `Peer mentoring session on ${session.topic}`;

      session.sharedNotes = notesToUse;
      await session.save();

      const messages = await ChatMessage.find({ session: session._id })
        .sort({ createdAt: 1 })
        .limit(30);
      const chatTranscript = messages
        .map((m) => `${m.senderName} (${m.messageType}): ${m.content}`)
        .join('\n');

      const aiSummary = await generateSessionSummaryWithGemini(
        session.topic,
        notesToUse,
        chatTranscript
      );

      const summaryDoc = await SessionSummary.create({
        session: session._id,
        generatedBy: req.user!._id,
        topic: session.topic,
        rawNotes: notesToUse,
        summaryText: aiSummary.summaryText,
        keyConceptsLearned: aiSummary.keyConceptsLearned,
        topicsNeedingPractice: aiSummary.topicsNeedingPractice,
        recommendedNextTopics: aiSummary.recommendedNextTopics,
        generatedSource: aiSummary.generatedSource,
      });

      res.status(201).json({ summary: summaryDoc });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  }
);

// GET /api/learning/summaries — Get all session summaries for current user's sessions
router.get('/summaries', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const userSessions = await LearningSession.find({
      $or: [{ learner: userId }, { mentor: userId }],
    }).select('_id');

    const sessionIds = userSessions.map((s) => s._id);
    const summaries = await SessionSummary.find({ session: { $in: sessionIds } })
      .populate({
        path: 'session',
        populate: [
          { path: 'learner', select: 'name email' },
          { path: 'mentor', select: 'name email' },
        ],
      })
      .sort({ createdAt: -1 });

    res.json({ summaries });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
