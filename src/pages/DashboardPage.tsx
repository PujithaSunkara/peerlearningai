import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  MessageSquare,
  Video,
  ClipboardCheck,
  TrendingUp,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AssessmentAttemptDetail, LearningSessionItem } from '../types';

interface DashboardStats {
  doubtsCount: number;
  pendingIncomingRequests: number;
  activeSessions: LearningSessionItem[];
  recentAttempts: AssessmentAttemptDetail[];
  allPeersCount: number;
  verifiedCompetenciesCount: number;
  selfReportedCount: number;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get('/users/dashboard-stats')
      .then((res) => {
        if (mounted) setStats(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-slate-600">
            {user?.academicDetails?.major} · {user?.academicDetails?.yearOfStudy} ·{' '}
            {user?.academicDetails?.institution}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/submit-doubt"
            className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <HelpCircle className="w-4 h-4" />
            Submit a Doubt
          </Link>
          <Link
            to="/assessments"
            className="px-4 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <ClipboardCheck className="w-4 h-4" />
            Take Skill Assessment
          </Link>
        </div>
      </div>

      {/* 4-Column KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Verified Competencies</p>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {loading ? '—' : stats?.verifiedCompetenciesCount ?? 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            +{stats?.selfReportedCount ?? 0} self-reported skills
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Doubts Submitted</p>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {loading ? '—' : stats?.doubtsCount ?? 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Matched across {stats?.allPeersCount ?? 0} available peers
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Pending Mentor Requests</p>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {loading ? '—' : stats?.pendingIncomingRequests ?? 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            <Link to="/learning-requests" className="text-blue-600 hover:underline">
              Review incoming requests →
            </Link>
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Sessions Completed</p>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {(user?.stats?.sessionsMentored || 0) + (user?.stats?.sessionsLearned || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {user?.stats?.sessionsMentored || 0} mentored · {user?.stats?.sessionsLearned || 0} learned
          </p>
        </div>
      </div>

      {/* Active Mentoring Sessions & Recent Assessments Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active Learning Sessions (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">
                Active Peer Learning Sessions
              </h2>
              <p className="text-xs text-slate-500">
                Jump directly into real-time chat, video, or AI session summarization
              </p>
            </div>
            <Link
              to="/learning-requests"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              All Requests <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              <div className="h-14 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-14 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : stats?.activeSessions && stats.activeSessions.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {stats.activeSessions.map((sess) => {
                const isMentor = sess.mentor?._id === user?._id;
                const partner = isMentor ? sess.learner : sess.mentor;
                return (
                  <div
                    key={sess._id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{sess.topic}</p>
                      <p className="text-xs text-slate-500">
                        {isMentor ? 'Mentoring' : 'Learning from'}{' '}
                        <strong className="text-slate-700">{partner?.name || 'Peer'}</strong> ·
                        Channel: <code className="font-mono">{sess.channelName}</code>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/chat?sessionId=${sess._id}`}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat
                      </Link>
                      <Link
                        to={`/video-session?sessionId=${sess._id}`}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Video Room
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-slate-600">
                No active learning sessions yet. Submit a technical doubt to match with a peer mentor!
              </p>
              <Link
                to="/submit-doubt"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg"
              >
                Find a Peer Mentor
              </Link>
            </div>
          )}
        </div>

        {/* Recent Assessment Attempts & Competency Verification (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">
                Recent Assessment Attempts
              </h2>
              <p className="text-xs text-slate-500">
                Objective sandbox scores and retry history
              </p>
            </div>
            <Link
              to="/assessment-progress"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              Progress Chart <TrendingUp className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : stats?.recentAttempts && stats.recentAttempts.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {stats.recentAttempts.map((att) => (
                <div
                  key={att._id}
                  className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/assessment-results/${att._id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-blue-600 truncate block"
                    >
                      {att.taskTitle}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span>Attempt #{att.attemptNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>{att.skillName}</span>
                      {att.passed ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        </>
                      ) : (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-700 font-medium inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Retry Available
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <Link
                    to={`/assessment-results/${att._id}`}
                    className="text-sm font-bold font-mono tabular-nums text-slate-900 hover:text-blue-600 shrink-0"
                  >
                    {att.percentageScore}%
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center space-y-3">
              <Award className="w-8 h-8 text-indigo-600 mx-auto" />
              <p className="text-sm text-slate-600">
                Complete a skill assessment to earn verified competency evidence.
              </p>
              <Link
                to="/assessments"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg"
              >
                Browse Assessments
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
