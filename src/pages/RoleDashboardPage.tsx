import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Target,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AssessmentAttemptDetail } from '../types';

interface RoleRoadmap {
  roleName: string;
  readinessSummary: string;
  milestones: Array<{
    stage: string;
    title: string;
    skillsRequired: string[];
    status: 'Completed' | 'In Progress' | 'Upcoming';
    description: string;
  }>;
}

export function RoleDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [roadmap, setRoadmap] = useState<RoleRoadmap | null>(null);
  const [attempts, setAttempts] = useState<AssessmentAttemptDetail[]>([]);
  const [customTopic, setCustomTopic] = useState('');
  const [generatingAssessment, setGeneratingAssessment] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/users/role-dashboard')
      .then((res) => {
        setRoadmap(res.data.roadmap);
        setAttempts(res.data.attempts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRequestRoleAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingAssessment(true);
    try {
      const res = await api.post('/users/role-assessment', {
        customTopic: customTopic.trim(),
      });
      const taskId = res.data.taskId;
      navigate(`/assessments/${taskId}/take`);
    } catch {
      // ignore
    } finally {
      setGeneratingAssessment(false);
    }
  };

  const chartData = [...attempts]
    .reverse()
    .map((att, idx) => ({
      name: `Test #${idx + 1}`,
      score: att.percentageScore,
      topic: att.skillName,
    }));

  const verifiedSkillsCount = (user?.competencies || []).filter(
    (c) => c.isVerified
  ).length;
  const totalSkillsCount = (user?.competencies || []).length;
  const readinessPercent =
    totalSkillsCount > 0
      ? Math.min(100, Math.round((verifiedSkillsCount / totalSkillsCount) * 100))
      : 0;

  return (
    <div className="space-y-8">
      {/* Header & Role Assessment Generator */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <span className="text-xs font-semibold text-indigo-700">
            Target Role Learning Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display flex items-center gap-2.5">
            <Target className="w-7 h-7 text-indigo-600 shrink-0" />
            {user?.targetCareerRole || 'Full Stack Developer'} — Preparation & Progress
          </h1>
          <p className="text-sm text-slate-600">
            {roadmap?.readinessSummary ||
              'Track your learning milestones and generate on-demand skill assessments tailored to your target role.'}
          </p>
        </div>

        {/* Request Role-Based Assessment Form */}
        <form
          onSubmit={handleRequestRoleAssessment}
          className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 lg:w-96 shrink-0"
        >
          <p className="text-xs font-bold text-slate-900">
            Ask for Assessment Based on Preparing for {user?.targetCareerRole}
          </p>
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder={`Optional focus topic (or leave blank for ${
              user?.targetCareerRole || 'Role'
            } skills)`}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
          />
          <button
            type="submit"
            disabled={generatingAssessment}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4" />
            {generatingAssessment
              ? 'Generating Role Assessment Questions...'
              : `Start ${user?.targetCareerRole || 'Role'} Assessment Now`}
          </button>
        </form>
      </div>

      {/* Role KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">
            Role Skill Verification Readiness
          </p>
          <p className="text-2xl font-bold text-indigo-600 font-mono tabular-nums mt-1">
            {readinessPercent}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {verifiedSkillsCount} of {totalSkillsCount} stated skills verified by test
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">
            Assessments Completed
          </p>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {attempts.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Across onboarding & role preparation tests
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">
            Best Assessment Score
          </p>
          <p className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
            {attempts.length > 0
              ? `${Math.max(...attempts.map((a) => a.percentageScore))}%`
              : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Recorded on your student profile
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Role Learning Milestones (6 cols) */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-display">
              Learning Process Milestones for {user?.targetCareerRole}
            </h2>

            <div className="space-y-4">
              {(roadmap?.milestones || []).map((m, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-700">{m.stage}</span>
                    <span
                      className={`font-semibold inline-flex items-center gap-1 ${
                        m.status === 'Completed'
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {m.status === 'Completed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      {m.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{m.title}</h3>
                  <p className="text-xs text-slate-600">{m.description}</p>
                  <p className="text-xs text-slate-500">
                    <strong>Focus Skills:</strong> {m.skillsRequired.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Role Assessment Score Chart & History (6 cols) */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-base font-bold text-slate-900 font-display">
              Role Assessment Score Progression
            </h2>

            {chartData.length > 0 ? (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                      dataKey="score"
                      name="Assessment Score (%)"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">
                No role assessments taken yet. Click “Start Assessment Now” above to test your skills!
              </p>
            )}

            {attempts.length > 0 && (
              <div className="divide-y divide-slate-200 pt-2">
                {attempts.map((att) => (
                  <div
                    key={att._id}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <Link
                        to={`/assessment-results/${att._id}`}
                        className="font-bold text-slate-900 hover:text-blue-600"
                      >
                        {att.taskTitle}
                      </Link>
                      <p className="text-slate-500">
                        Skills: {att.skillName} ·{' '}
                        {new Date(att.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {att.percentageScore}%
                      </span>
                      <Link
                        to={`/assessments/${att.task}/take`}
                        className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Retry
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
