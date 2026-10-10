import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  MessageSquare,
  Video,
  Target,
  UserCircle,
  CheckCircle2,
  ArrowRight,
  Code2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HERO_IMAGE_PATH = '/src/assets/images/hero_peer_collaborative_coding_1791615975186.jpg';

export function HomePage() {
  const { user } = useAuth();
  const [heroImgError, setHeroImgError] = useState(false);

  return (
    <div className="space-y-12">
      {/* Hero Banner — Project Details & Quick Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold text-blue-700">
                Project Overview · Vignan’s Institute of Information Technology
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display leading-tight">
                PeerConnect AI — Intelligent Peer-to-Peer Learning & Role Preparation Platform
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Welcome{user ? `, ${user.username || user.name}` : ''}! PeerConnect AI connects students who have a subject or technical doubt with available peers whose verified skills match the topic. Collaborate through 1-on-1 video calls and real-time chat, generate AI post-session summaries, rate your peer mentors, and track your career role readiness.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/ai-agent"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Bot className="w-4 h-4" />
                Ask AI Agent & Match Peers
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/chats"
                className="px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Video className="w-4 h-4 text-blue-600" />
                Open Chats & 1-on-1 Video
              </Link>
              <Link
                to="/role-dashboard"
                className="px-4 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Target className="w-4 h-4" />
                {user?.targetCareerRole || 'Role'} Dashboard
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            {!heroImgError ? (
              <div className="relative h-full min-h-[260px] rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                <img
                  src={HERO_IMAGE_PATH}
                  alt="Peer students collaborating on technical problem"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent flex flex-col justify-end p-5 text-white">
                  <p className="text-xs text-blue-200 font-medium">
                    1-on-1 Peer Interaction Workflow
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    Doubt Submission → Skill & Availability Matching → Live Video & Chat → AI Session Summary & Peer Review
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[260px] rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col justify-between">
                <Code2 className="w-8 h-8 text-blue-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    End-to-End Student Collaboration
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Built with React, Node.js, Express, MongoDB, Gemini AI, Socket.IO, and WebRTC.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Architecture & Core Modules Breakdown */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">
            Our Project Modules & Workflow
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Explore how each module in PeerConnect AI supports collaborative student learning
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                1. OTP Registration, Student Details & Skill Test
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Students register with 6-digit Email OTP verification, complete their academic profile (College default: Vignan’s Institute of Information Technology, Branch, Year, Skills, and Target Role), and take a tailored skill assessment test.
              </p>
            </div>
            <Link
              to="/profile"
              className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 pt-2"
            >
              View Your Complete Profile <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <Bot className="w-6 h-6 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                2. AI Agent Doubt Analysis & Available Peer Matching
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ask any subject or coding doubt to the AI Agent. Gemini extracts the required skills and matches you with suitable peers whose skills align and who are available right now so you can send a 1-on-1 request.
              </p>
            </div>
            <Link
              to="/ai-agent"
              className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 pt-2"
            >
              Open AI Agent <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                3. 1-on-1 Video Call, Real-Time Chat & AI Summary
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Once a peer accepts your request, communicate via live 1-on-1 video session and chat. After the video session, generate an AI Session Summary, ask follow-up doubts in chat, and submit ratings and reviews for the explaining peer.
              </p>
            </div>
            <Link
              to="/chats"
              className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 pt-2"
            >
              Go to Chats & Video Sessions <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <Target className="w-6 h-6 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                4. Target Role Learning Dashboard & Assessments
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Track your learning progress for your chosen career role ({user?.targetCareerRole || 'Full Stack Developer'}), view score progression charts across attempts, and generate on-demand assessments to prepare for your role.
              </p>
            </div>
            <Link
              to="/role-dashboard"
              className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 pt-2"
            >
              Open Role Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <UserCircle className="w-6 h-6 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                5. Comprehensive Student Profile & Peer Reviews
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inspect all data provided during registration, the student details form, skill assessment test scores, verified competencies, and ratings/reviews given by peers you have helped.
              </p>
            </div>
            <Link
              to="/profile"
              className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 pt-2"
            >
              Inspect Student Profile <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
