import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { OtpRecord } from '../models/OtpRecord.js';
import { protect, signToken, AuthRequest } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// POST /api/auth/send-otp — Generate and send 6-digit OTP for email verification during registration
router.post('/send-otp', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !String(email).includes('@')) {
      res.status(400).json({ message: 'Please provide a valid email address.' });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409).json({
        message: 'An account with this email is already registered. Please sign in.',
      });
      return;
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OtpRecord.deleteMany({ email: normalizedEmail });
    await OtpRecord.create({
      email: normalizedEmail,
      otpCode,
      expiresAt,
      verified: false,
    });

    console.log(`[Email OTP Dispatch] Verification OTP for ${normalizedEmail}: ${otpCode}`);

    res.json({
      message: `Verification OTP generated for ${normalizedEmail}.`,
      otpPreview: otpCode, // Returned so user in preview environment can immediately verify without external SMTP
      expiresInMinutes: 10,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/auth/register — Verify OTP, confirm password, and create student account starting at onboardingStep: 'details'
router.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { username, email, password, confirmPassword, otp } = req.body;

    if (!username || !email || !password || !confirmPassword || !otp) {
      res.status(400).json({
        message:
          'Username, email, password, confirmation password, and verification OTP are all required.',
      });
      return;
    }

    if (String(password) !== String(confirmPassword)) {
      res.status(400).json({
        message: 'Password and confirmation password do not match.',
      });
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({
        message: 'Password must be at least 6 characters long.',
      });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }

    const otpRecord = await OtpRecord.findOne({
      email: normalizedEmail,
      otpCode: String(otp).trim(),
    });

    if (!otpRecord) {
      res.status(400).json({
        message: 'Invalid OTP code. Please check the 6-digit OTP sent to your email.',
      });
      return;
    }

    if (otpRecord.expiresAt.getTime() < Date.now()) {
      res.status(400).json({
        message: 'OTP has expired. Please request a new OTP.',
      });
      return;
    }

    otpRecord.verified = true;
    await otpRecord.save();

    const passwordHash = await bcrypt.hash(String(password), 10);
    const cleanUsername = String(username).trim();

    const user = await User.create({
      name: cleanUsername,
      username: cleanUsername,
      email: normalizedEmail,
      passwordHash,
      emailVerified: true,
      onboardingStep: 'details',
      role: 'student',
      targetCareerRole: 'Full Stack Developer',
      academicDetails: {
        institution: "Vignan's Institute of Information Technology",
        major: 'Computer Science & Engineering (CSE)',
        yearOfStudy: '3rd Year',
      },
      bio: '',
      availability: {
        status: 'Available',
        preferredHours: 'Available Now',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      },
      competencies: [],
      peerReviews: [],
    });

    await OtpRecord.deleteMany({ email: normalizedEmail });

    const token = signToken(user._id.toString(), user.role);
    const userObj = user.toObject();
    delete (userObj as Record<string, unknown>).passwordHash;

    res.status(201).json({
      token,
      user: userObj,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/auth/login — Authenticate with email & password
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(String(password), user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const token = signToken(user._id.toString(), user.role);
    const userObj = user.toObject();
    delete (userObj as Record<string, unknown>).passwordHash;

    res.json({
      token,
      user: userObj,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
