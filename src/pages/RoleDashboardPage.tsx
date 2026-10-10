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
} from 'recharts';
import {
  Target,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Award,
  BookOpen,
  ArrowUpRight,
  LoaderCircle,
  CircleAlert,
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

const milestoneStyles: Record<string, string> = {
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'In Progress': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Upcoming: 'bg-amber-50 text-amber-700 ring-amber-200',
};

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  description: string;
  tone: 'indigo' | 'emerald' | 'violet';
}) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  };

  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-9 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
        {children}
      </p>
    </div>
  );
}

export function RoleDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [roadmap, setRoadmap] = useState<RoleRoadmap | null>(null);
  const [attempts, setAttempts] = useState<AssessmentAttemptDetail[]>([]);
  const [customTopic, setCustomTopic] = useState('');
  const [generatingAssessment, setGeneratingAssessment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [assessmentError, setAssessmentError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');

    api
      .get('/users/role-dashboard')
      .then((res) => {
        if (!active) return;
        setRoadmap(res.data.roadmap || null);
        setAttempts(res.data.attempts || []);
      })
      .catch(() => {
        if (active) setLoadError('We could not load your dashboard. Please refresh and try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleRequestRoleAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingAssessment(true);
    setAssessmentError('');

    try {
      const res = await api.post('/users/role-assessment', {
        customTopic: customTopic.trim(),
      });
      const taskId = res.data.taskId;
      if (!taskId) {
        setAssessmentError('The assessment was created, but no task ID was returned. Please try again.');
        return;
      }
      navigate(`/assessments/${taskId}/take`);
    } catch {
      setAssessmentError('Could not generate an assessment right now. Please try again.');
    } finally {
      setGeneratingAssessment(false);
    }
  };

  const chartData = [...attempts].reverse().map((attempt, index) => ({
    name: `Test ${index + 1}`,
    score: Number(attempt.percentageScore) || 0,
    topic: attempt.skillName,
  }));

  const verifiedSkillsCount = (user?.competencies || []).filter(
    (competency) => competency.isVerified,
  ).length;
  const totalSkillsCount = (user?.competencies || []).length;
  const readinessPercent =
    totalSkillsCount > 0
      ? Math.min(100, Math.round((verifiedSkillsCount / totalSkillsCount) * 100))
      : 0;
  const bestScore =
    attempts.length > 0
      ? Math.max(...attempts.map((attempt) => Number(attempt.percentageScore) || 0))
      : null;
  const roleName = user?.targetCareerRole || roadmap?.roleName || 'Your target role';

  return (
    <div className="min-h-full space-y-6 bg-slate-50/60 pb-8">
      {/* Page title */}
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
          <Sparkles className="h-3.5 w-3.5" />
          Personalized learning plan
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Role preparation dashboard
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
          Turn your career goal into clear milestones, practice assessments, and measurable progress.
        </p>
      </div>

      {/* Hero and assessment form */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-lg shadow-indigo-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative grid grid-cols-1 gap-7 xl:grid-cols-[1fr_380px] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100 ring-1 ring-white/15">
              <Target className="h-3.5 w-3.5" />
              Your career target
            </div>
            <h2 className="mt-4 max-w-2xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              Prepare for your next step as a{' '}
              <span className="text-violet-200">{roleName}</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100/80">
              {roadmap?.readinessSummary ||
                'Track your learning milestones and generate assessments tailored to the skills needed for your target role.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-indigo-100/90">
              <span className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
                {totalSkillsCount} skills listed
              </span>
              <span className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
                {verifiedSkillsCount} verified
              </span>
              <span className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
                {attempts.length} assessments completed
              </span>
            </div>
          </div>

          <form
            onSubmit={handleRequestRoleAssessment}
            className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <ClipboardCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Practice assessment</h3>
                <p className="mt-0.5 text-xs text-indigo-100/75">Personalized to your role</p>
              </div>
            </div>
            <label htmlFor="customTopic" className="mt-5 block text-xs font-semibold text-indigo-100">
              Focus topic <span className="font-normal text-indigo-200/70">(optional)</span>
            </label>
            <input
              id="customTopic"
              type="text"
              value={customTopic}
              onChange={(event) => setCustomTopic(event.target.value)}
              placeholder="e.g. React, SQL, data structures"
              className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/30 px-3.5 py-3 text-sm text-white outline-none placeholder:text-indigo-100/45 focus:border-violet-300 focus:ring-4 focus:ring-violet-300/15"
            />
            {assessmentError && (
              <p role="alert" className="mt-3 rounded-lg bg-rose-400/15 px-3 py-2 text-xs leading-5 text-rose-100">
                {assessmentError}
              </p>
            )}
            <button
              type="submit"
              disabled={generatingAssessment}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-800 shadow-sm transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generatingAssessment ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardCheck className="h-4 w-4" />
              )}
              {generatingAssessment ? 'Generating assessment...' : 'Start assessment'}
            </button>
            <p className="mt-3 text-center text-[11px] leading-5 text-indigo-100/65">
              Leave the topic blank for a role-focused assessment.
            </p>
          </form>
        </div>
      </section>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={Target}
          label="Skill verification"
          value={`${readinessPercent}%`}
          description={`${verifiedSkillsCount} of ${totalSkillsCount} listed skills verified by assessment.`}
          tone="indigo"
        />
        <MetricCard
          icon={ClipboardCheck}
          label="Assessments completed"
          value={attempts.length}
          description="Your recorded onboarding and role preparation tests."
          tone="violet"
        />
        <MetricCard
          icon={Award}
          label="Best assessment score"
          value={bestScore === null ? '—' : `${bestScore}%`}
          description="Your highest score across recorded assessments."
          tone="emerald"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
              <div className="h-5 w-44 rounded bg-slate-100" />
              <div className="mt-6 h-12 rounded-xl bg-slate-100" />
              <div className="mt-3 h-12 rounded-xl bg-slate-100" />
              <div className="mt-3 h-12 rounded-xl bg-slate-100" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 font-semibold underline underline-offset-2"
            >
              Refresh dashboard
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
          {/* Roadmap */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                    Learning roadmap
                  </h2>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Your milestones for {roleName}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {roadmap?.milestones?.length || 0} stages
              </span>
            </div>

            {roadmap?.milestones?.length ? (
              <div className="mt-6 space-y-4">
                {roadmap.milestones.map((milestone, index) => (
                  <div key={`${milestone.stage}-${milestone.title}-${index}`} className="relative pl-8">
                    {index !== roadmap.milestones.length - 1 && (
                      <span className="absolute bottom-0 left-[11px] top-7 w-px bg-slate-200" />
                    )}
                    <span
                      className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${
                        milestone.status === 'Completed'
                          ? 'bg-emerald-500 text-white'
                          : milestone.status === 'In Progress'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {milestone.status === 'Completed' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-[10px] font-bold">{index + 1}</span>
                      )}
                    </span>
                    <article className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-indigo-100 hover:bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                          {milestone.stage}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${milestoneStyles[milestone.status] || milestoneStyles.Upcoming}`}>
                          {milestone.status === 'Completed' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {milestone.status}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-slate-900">{milestone.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-slate-600">{milestone.description}</p>
                      {milestone.skillsRequired?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {milestone.skillsRequired.map((skill) => (
                            <span key={skill} className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState>
                  Your roadmap has not been generated yet. Add your target role and skills to get started.
                </EmptyState>
              </div>
            )}
          </section>

          {/* Score chart and history */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                    Assessment progress
                  </h2>
                </div>
                <p className="mt-2 text-sm text-slate-500">See how your scores change over time</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {attempts.length} tests
              </span>
            </div>

            {chartData.length > 0 ? (
              <div className="mt-5 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#eef2ff' }}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number | undefined) => [`${value ?? 0}%`, 'Score']}
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.topic
                          ? `${label} · ${payload[0].payload.topic}`
                          : label
                      }
                    />
                    <Bar dataKey="score" name="Score" fill="#6366f1" radius={[7, 7, 2, 2]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState>
                  No assessment scores to display yet. Start an assessment above and your progress chart will appear here.
                </EmptyState>
              </div>
            )}

            {attempts.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Recent assessments</h3>
                  <span className="text-xs text-slate-400">View results or retry</span>
                </div>
                <div className="space-y-2">
                  {attempts.map((attempt) => (
                    <div
                      key={attempt._id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-indigo-100 hover:bg-indigo-50/30"
                    >
                      <div className="min-w-0">
                        <Link
                          to={`/assessment-results/${attempt._id}`}
                          className="block truncate text-sm font-semibold text-slate-800 hover:text-indigo-700"
                        >
                          {attempt.taskTitle}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {attempt.skillName} · {new Date(attempt.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-extrabold tabular-nums text-indigo-700">
                          {attempt.percentageScore}%
                        </span>
                        <Link
                          to={`/assessments/${attempt.task}/take`}
                          aria-label={`Retry ${attempt.taskTitle}`}
                          title="Retry assessment"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-indigo-100 hover:text-indigo-700"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          to={`/assessment-results/${attempt._id}`}
                          aria-label={`View results for ${attempt.taskTitle}`}
                          title="View results"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
