import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  GraduationCap,
  MailCheck,
  Pencil,
  Save,
  Sparkles,
  Star,
  Target,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AssessmentAttemptDetail } from '../types';
import { UserAvatar } from '../components/UserAvatar';

const availabilityStyles: Record<string, string> = {
  Available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Busy: 'bg-amber-50 text-amber-700 ring-amber-200',
  Offline: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const inputClassName =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  count,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  count?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {count !== undefined && (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {count}
        </span>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [attempts, setAttempts] = useState<AssessmentAttemptDetail[]>([]);
  const [editing, setEditing] = useState(false);
  const [college, setCollege] = useState(
    user?.academicDetails?.institution ||
      "Vignan's Institute of Information Technology",
  );
  const [branch, setBranch] = useState(user?.academicDetails?.major || '');
  const [year, setYear] = useState(user?.academicDetails?.yearOfStudy || '');
  const [targetRole, setTargetRole] = useState(user?.targetCareerRole || '');
  const [availabilityStatus, setAvailabilityStatus] = useState<
    'Available' | 'Busy' | 'Offline'
  >(user?.availability?.status || 'Available');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    api
      .get('/users/dashboard-stats')
      .then((res) => setAttempts(res.data.recentAttempts || []))
      .catch(() => setAttempts([]));
  }, []);

  useEffect(() => {
    setCollege(
      user?.academicDetails?.institution ||
        "Vignan's Institute of Information Technology",
    );
    setBranch(user?.academicDetails?.major || '');
    setYear(user?.academicDetails?.yearOfStudy || '');
    setTargetRole(user?.targetCareerRole || '');
    setAvailabilityStatus(user?.availability?.status || 'Available');
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');

    try {
      await api.put('/users/profile', {
        name: user?.name,
        targetCareerRole: targetRole,
        academicDetails: {
          institution: college,
          major: branch,
          yearOfStudy: year,
        },
        availability: {
          status: availabilityStatus,
          preferredHours: 'Available Now',
          days: user?.availability?.days || [],
        },
      });
      await refreshUser();
      setEditing(false);
    } catch {
      setSaveError('Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const reviews = user?.peerReviews || [];
  const skills = user?.competencies || [];
  const averageRating = user?.stats?.averageRating;
  const ratingCount = user?.stats?.ratingCount || 0;
  const status = user?.availability?.status || 'Available';

  return (
    <div className="min-h-full space-y-6 bg-slate-50/60 pb-8">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
            <Sparkles className="h-3.5 w-3.5" />
            Student portfolio
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Your profile
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
            Showcase your skills, track your progress, and build credibility with your peers.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSaveError('');
              setEditing((prev) => !prev);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
          >
            {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {editing ? 'Cancel' : 'Edit profile'}
          </button>
          <Link
            to="/onboarding/details"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
          >
            <ClipboardCheck className="h-4 w-4" />
            Retake skills test
          </Link>
        </div>
      </div>

      {/* Profile hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-lg shadow-indigo-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="rounded-2xl bg-white/10 p-1.5 ring-1 ring-white/20 backdrop-blur">
              <UserAvatar name={user?.name || 'Student'} size="lg" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {user?.username || user?.name || 'Student'}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-300/25">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Email verified
                </span>
              </div>
              <p className="mt-1.5 break-all text-sm text-indigo-100/80">
                {user?.email || 'Email not available'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/10">
                  <BriefcaseBusiness className="h-3.5 w-3.5 text-indigo-200" />
                  {user?.targetCareerRole || 'Add your target role'}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ${
                    status === 'Available'
                      ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/25'
                      : status === 'Busy'
                        ? 'bg-amber-400/15 text-amber-200 ring-amber-300/25'
                        : 'bg-white/10 text-slate-200 ring-white/15'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-64">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-indigo-100/80">
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                <span className="text-xs font-medium">Peer rating</span>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {ratingCount ? Number(averageRating || 0).toFixed(1) : '—'}
                <span className="ml-1 text-sm font-medium text-indigo-100/70">/ 5</span>
              </p>
              <p className="mt-1 text-xs text-indigo-100/70">
                {ratingCount} {ratingCount === 1 ? 'review' : 'reviews'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-indigo-100/80">
                <Award className="h-4 w-4" />
                <span className="text-xs font-medium">Skills listed</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{skills.length}</p>
              <p className="mt-1 text-xs text-indigo-100/70">In your portfolio</p>
            </div>
          </div>
        </div>
      </section>

      {/* Edit profile form */}
      {editing && (
        <form
          onSubmit={handleSaveProfile}
          className="space-y-5 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Update your details</h2>
              <p className="mt-1 text-sm text-slate-500">
                Keep your academic information and availability up to date.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              College / Institution
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className={inputClassName}
                placeholder="Enter your college"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Branch / Department
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className={inputClassName}
                placeholder="e.g. Computer Science"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Year of study
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={inputClassName}
                placeholder="e.g. 3rd Year"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Target career role
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className={inputClassName}
                placeholder="e.g. Full Stack Developer"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            Availability
            <select
              value={availabilityStatus}
              onChange={(e) =>
                setAvailabilityStatus(
                  e.target.value as 'Available' | 'Busy' | 'Offline',
                )
              }
              className={inputClassName}
            >
              <option value="Available">Available right now</option>
              <option value="Busy">Busy</option>
              <option value="Offline">Offline</option>
            </select>
          </label>

          {saveError && (
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {saveError}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setSaveError('');
              }}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving changes...' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {/* Academic details */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading
          icon={GraduationCap}
          title="Academic details"
          subtitle="Your education and career direction"
        />
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Institution</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
              {user?.academicDetails?.institution ||
                "Vignan's Institute of Information Technology"}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Branch / department</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
              {user?.academicDetails?.major || 'Computer Science & Engineering (CSE)'}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Year of study</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
              {user?.academicDetails?.yearOfStudy || '3rd Year'}
            </p>
          </div>
        </div>
      </section>

      {/* Skills and assessment results */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            icon={Target}
            title="Skills & verification"
            subtitle="Your skills and their verification status"
            count={skills.length}
          />
          {skills.length > 0 ? (
            <div className="mt-5 space-y-3">
              {skills.map((skill) => {
                const score = Math.max(
                  0,
                  Math.min(100, Number(skill.verifiedScore ?? (skill.isVerified ? 80 : 0))),
                );
                return (
                  <div
                    key={skill.skillName}
                    className="rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-indigo-100 hover:bg-indigo-50/30"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900">{skill.skillName}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {skill.category} <span className="mx-1">·</span> {skill.proficiencyLevel}
                        </p>
                      </div>
                      <span
                        className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          skill.isVerified
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                            : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                        }`}
                      >
                        {skill.isVerified ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        {skill.isVerified ? 'Verified' : 'Self-reported'}
                      </span>
                    </div>
                    {skill.verifiedScore !== undefined && (
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-500">Assessment score</span>
                          <span className="font-bold text-slate-700">{score}%</span>
                        </div>
                        <div
                          className="h-2 overflow-hidden rounded-full bg-slate-100"
                          role="progressbar"
                          aria-valuenow={score}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${skill.skillName} assessment score`}
                        >
                          <div
                            className={`h-full rounded-full transition-all ${
                              skill.isVerified ? 'bg-emerald-500' : 'bg-amber-400'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState message="No skills recorded yet. Complete your skills form to start building your portfolio." />
            </div>
          )}
          <Link
            to="/role-dashboard"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800"
          >
            Explore role dashboard <span aria-hidden="true">→</span>
          </Link>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            icon={Activity}
            title="Assessment history"
            subtitle="Review your completed skill tests"
            count={attempts.length}
          />
          {attempts.length > 0 ? (
            <div className="mt-5 space-y-3">
              {attempts.map((attempt) => {
                const score = Math.max(0, Math.min(100, Number(attempt.percentageScore) || 0));
                return (
                  <Link
                    key={attempt._id}
                    to={`/assessment-results/${attempt._id}`}
                    className="group block rounded-2xl border border-slate-100 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 transition group-hover:text-indigo-700">
                          {attempt.taskTitle}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {attempt.skillName} <span className="mx-1">·</span> Attempt #{attempt.attemptNumber}
                        </p>
                        <p className="mt-1.5 text-xs text-slate-400">
                          {new Date(attempt.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-2xl font-extrabold tracking-tight text-indigo-600">{score}%</span>
                        <p className="text-[11px] font-medium text-slate-400">Score</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState message="No assessment attempts yet. Take a skill test to see your results here." />
            </div>
          )}
        </section>
      </div>

      {/* Peer reviews */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading
          icon={BookOpen}
          title="Peer reviews"
          subtitle="Feedback from people you've learned with"
          count={reviews.length}
        />
        {reviews.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {reviews.map((review, index) => (
              <article
                key={`${review.reviewerName}-${review.topic}-${index}`}
                className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5 transition hover:border-indigo-100 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-700">
                      {(review.reviewerName || 'P').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-900">
                        {review.reviewerName || 'Peer'}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">Peer reviewer</p>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                    {review.rating} / 5
                  </span>
                </div>
                <div className="mt-4 rounded-xl bg-white p-3 ring-1 ring-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Session topic
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{review.topic}</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  “{review.comment}”
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState message="No peer reviews yet. Reviews from your peer learning sessions will appear here." />
          </div>
        )}
      </section>
    </div>
  );
}
