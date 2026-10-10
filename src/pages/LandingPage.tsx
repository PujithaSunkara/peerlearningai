import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Code2,
  Users,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const HERO_IMAGE_PATH = '/src/assets/images/hero_peer_collaborative_coding_1791615975186.jpg';

export function LandingPage() {
  const { user, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [heroImgError, setHeroImgError] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const handleQuickDemoLogin = async (email: string, roleLabel: string) => {
    try {
      setDemoLoading(roleLabel);
      const res = await api.post('/auth/login', {
        email,
        password: 'password123',
      });
      loginWithToken(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch {
      navigate('/login');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Top Bar Contract: Zone 1 Brand | Zone 2 4 Nav Links | Zone 3 1 Primary CTA */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 border-b border-slate-200 bg-white sticky top-0 z-30">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-blue-700 font-display whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <GraduationCap className="w-5 h-5 text-blue-600 shrink-0" />
          PeerConnect AI
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#how-it-works"
            className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            Peer Matching
          </a>
          <a
            href="#assessments"
            className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            Assessments
          </a>
          <a
            href="#sessions"
            className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            Live Sessions
          </a>
          <Link
            to="/login"
            className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            Sign In
          </Link>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Open Workspace
            </Link>
          ) : (
            <Link
              to="/register"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Join as Student
            </Link>
          )}
        </div>
      </header>

      {/* Hero Split Section */}
      <section className="max-w-7xl mx-auto w-full px-6 lg:px-12 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-medium text-blue-700">
                University Peer-to-Peer Learning Network · Gemini AI + Deterministic Ranking
              </p>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 font-display leading-tight">
                Master complex concepts with verified student mentors.
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                Submit technical doubts in Python, Django, JavaScript, or algorithms. PeerConnect AI extracts core competencies, ranks available student mentors with verified skill evidence, and connects you over real-time code chat and video.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={user ? '/dashboard' : '/register'}
                  className="px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  {user ? 'Go to Student Dashboard' : 'Start Learning Free'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {!user && (
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('alex@peerconnect.edu', 'student')}
                    disabled={demoLoading !== null}
                    className="px-4 py-3 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {demoLoading === 'student'
                      ? 'Signing in...'
                      : 'Instant Demo (Student: Alex)'}
                  </button>
                )}
                {!user && (
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('priya@peerconnect.edu', 'reviewer')}
                    disabled={demoLoading !== null}
                    className="px-4 py-3 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {demoLoading === 'reviewer'
                      ? 'Signing in...'
                      : 'Instant Demo (Reviewer: Priya)'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>Isolated Code Sandbox</span>
                <span aria-hidden="true">·</span>
                <span>Rubric-Based Assessments</span>
                <span aria-hidden="true">·</span>
                <span>Socket.IO + Agora Video</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            {!heroImgError ? (
              <div className="relative h-full min-h-[320px] rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                <img
                  src={HERO_IMAGE_PATH}
                  alt="Two university students collaborating on code in a modern campus library"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-6 text-white">
                  <p className="text-xs text-blue-200">
                    Live Match Example · 96% Competency Alignment
                  </p>
                  <p className="text-sm font-medium mt-1">
                    “I need help implementing JWT authentication and refresh tokens in Django.”
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    Matched with Elena Rostova · Python (95% Verified) · Django & REST APIs (92% Verified)
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[320px] rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8 flex flex-col justify-between">
                <Code2 className="w-10 h-10 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Intelligent Peer Matching + Verified Skill Evidence
                  </h2>
                  <p className="text-sm text-slate-600 mt-2">
                    Every mentor recommendation combines Gemini topic analysis with deterministic multi-factor scoring across verified assessments, availability, and session ratings.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full-Width 4-Column Quantitative Proof Row */}
        <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">5-Factor</p>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic peer ranking (skill, topic, proficiency, availability, rating)
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">100% Isolated</p>
            <p className="text-xs text-slate-500 mt-1">
              Sandboxed Python & JavaScript test-case execution with 3-part rubric grading
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">+30 pts</p>
            <p className="text-xs text-slate-500 mt-1">
              Tracked score improvement across first attempt, retries, and reviewer audits
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums">Real-Time</p>
            <p className="text-xs text-slate-500 mt-1">
              Socket.IO code snippet chat, Agora video sessions, and Gemini summaries
            </p>
          </div>
        </div>
      </section>

      {/* Core Mechanisms Section */}
      <section id="how-it-works" className="bg-slate-50 border-y border-slate-200 py-16 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
              01. End-to-End Peer Learning & Competency Architecture
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Every module is designed to connect students who have specific technical roadblocks with peers whose skills are backed by objective assessment evidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
              <Users className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                AI Topic Extraction & Deterministic Matching
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Submit a natural-language doubt or code snippet. Gemini extracts key technical topics and competencies, while our backend algorithm ranks peers transparently across 5 weighted dimensions.
              </p>
            </div>

            <div id="assessments" className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
              <CheckCircle2 className="w-6 h-6 text-indigo-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Verified vs. Self-Reported Competencies
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Self-reported skills are clearly distinguished from competencies verified through our Mini Skill Assessment sandbox. Students can request formal reviewer audits and retry assessments to track growth.
              </p>
            </div>

            <div id="sessions" className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Live Mentoring & AI Session Summaries
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Collaborate via persistent Socket.IO chat with syntax-formatted code snippets and Agora WebRTC video calls. Generate structured post-session takeaways and practice roadmaps with Gemini.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-auto py-8 px-6 lg:px-12 border-t border-slate-200 bg-white text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 PeerConnect AI · Peer-to-Peer Educational Platform</p>
        <div className="flex items-center gap-6">
          <Link to="/login" className="hover:text-slate-900">
            Student Login
          </Link>
          <Link to="/register" className="hover:text-slate-900">
            Create Account
          </Link>
        </div>
      </footer>
    </div>
  );
}
