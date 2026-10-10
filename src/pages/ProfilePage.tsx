import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Star,
  ClipboardCheck,
  Target,
  MailCheck,
  Edit3,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AssessmentAttemptDetail } from '../types';
import { UserAvatar } from '../components/UserAvatar';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [attempts, setAttempts] = useState<AssessmentAttemptDetail[]>([]);
  const [editing, setEditing] = useState(false);

  const [college, setCollege] = useState(
    user?.academicDetails?.institution ||
      "Vignan's Institute of Information Technology"
  );
  const [branch, setBranch] = useState(user?.academicDetails?.major || '');
  const [year, setYear] = useState(user?.academicDetails?.yearOfStudy || '');
  const [targetRole, setTargetRole] = useState(user?.targetCareerRole || '');
  const [availabilityStatus, setAvailabilityStatus] = useState<
    'Available' | 'Busy' | 'Offline'
  >(user?.availability?.status || 'Available');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/users/dashboard-stats')
      .then((res) => setAttempts(res.data.recentAttempts || []))
      .catch(() => {});
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
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
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const reviews = user?.peerReviews || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Complete Student Profile & Portfolio
          </h1>
          <p className="text-sm text-slate-600">
            All data from your OTP Registration, Student Details Form, Skill Assessment Tests, and Peer Reviews
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((prev) => !prev)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {editing ? 'Cancel Editing' : 'Update Details'}
          </button>
          <Link
            to="/onboarding/details"
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            Retake Skills Form & Test
          </Link>
        </div>
      </div>

      {editing && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900">
            Update Student Details & Availability
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                College
              </label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Year
              </label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Role
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">Availability:</span>
              <select
                value={availabilityStatus}
                onChange={(e) =>
                  setAvailabilityStatus(
                    e.target.value as 'Available' | 'Busy' | 'Offline'
                  )
                }
                className="px-3 py-1.5 rounded-md border border-slate-300 bg-white"
              >
                <option value="Available">Available Right Now</option>
                <option value="Busy">Busy</option>
                <option value="Offline">Offline</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* 1. Registration & Student Details Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <UserAvatar name={user?.name || 'Student'} size="lg" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {user?.username || user?.name}
                </h2>
                <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                  <MailCheck className="w-3.5 h-3.5" />
                  OTP Verified Email
                </span>
              </div>
              <p className="text-xs text-slate-600">{user?.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <div>
              <span className="text-slate-500 block">Target Career Role</span>
              <strong className="text-sm text-indigo-700 flex items-center gap-1 mt-0.5">
                <Target className="w-3.5 h-3.5" />
                {user?.targetCareerRole || 'Full Stack Developer'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Peer Rating</span>
              <strong className="text-sm text-slate-900 font-mono tabular-nums flex items-center gap-1 mt-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                {user?.stats?.ratingCount
                  ? `${user.stats.averageRating.toFixed(1)} (${
                      user.stats.ratingCount
                    } reviews)`
                  : 'No reviews yet'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Live Status</span>
              <strong className="text-sm text-emerald-700 mt-0.5 block">
                {user?.availability?.status || 'Available'}
              </strong>
            </div>
          </div>
        </div>

        {/* Academic Form Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-xs">
          <div>
            <span className="text-slate-500 block">
              College (Provided in Student Form)
            </span>
            <p className="text-sm font-bold text-slate-900 mt-1">
              {user?.academicDetails?.institution ||
                "Vignan's Institute of Information Technology"}
            </p>
          </div>
          <div>
            <span className="text-slate-500 block">Branch / Department</span>
            <p className="text-sm font-bold text-slate-900 mt-1">
              {user?.academicDetails?.major ||
                'Computer Science & Engineering (CSE)'}
            </p>
          </div>
          <div>
            <span className="text-slate-500 block">Year of Study</span>
            <p className="text-sm font-bold text-slate-900 mt-1">
              {user?.academicDetails?.yearOfStudy || '3rd Year'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Skills Known & Assessment Verification Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-display">
              Skills Provided & Verification Status (
              {user?.competencies?.length || 0})
            </h2>
            <Link
              to="/role-dashboard"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Role Dashboard →
            </Link>
          </div>

          {user?.competencies && user.competencies.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {user.competencies.map((c) => (
                <div
                  key={c.skillName}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {c.skillName}
                    </p>
                    <p className="text-slate-500">
                      {c.category} · Level: {c.proficiencyLevel}
                    </p>
                  </div>

                  {c.isVerified ? (
                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-1 font-mono tabular-nums">
                      <CheckCircle2 className="w-4 h-4" />
                      Verified ({c.verifiedScore || 80}%)
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Tested / Self-Reported
                      {c.verifiedScore !== undefined
                        ? ` (${c.verifiedScore}%)`
                        : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No skills recorded yet.</p>
          )}
        </div>

        {/* 3. Assessment Test History */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-display">
            Skill Assessment Test Results ({attempts.length})
          </h2>

          {attempts.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {attempts.map((att) => (
                <div
                  key={att._id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <Link
                      to={`/assessment-results/${att._id}`}
                      className="text-sm font-bold text-slate-900 hover:text-blue-600"
                    >
                      {att.taskTitle}
                    </Link>
                    <p className="text-slate-500">
                      Skills Tested: {att.skillName} · Attempt #
                      {att.attemptNumber} ·{' '}
                      {new Date(att.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={`/assessment-results/${att._id}`}
                    className="text-base font-bold font-mono tabular-nums text-blue-600"
                  >
                    {att.percentageScore}%
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              No assessment attempts recorded yet.
            </p>
          )}
        </div>
      </div>

      {/* 4. Peer Reviews & Ratings Received from Connected Listeners */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 font-display">
          Reviews & Ratings Received from Peers ({reviews.length})
        </h2>

        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    Listener: {rev.reviewerName}
                  </span>
                  <span className="font-mono font-bold text-amber-700 inline-flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    {rev.rating} / 5
                  </span>
                </div>
                <p className="text-slate-500">Session Topic: {rev.topic}</p>
                <p className="text-slate-800">“{rev.comment}”</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No peer reviews received yet. When you accept a peer’s doubt request and explain a topic in a 1-on-1 video/chat session, their rating and review will appear here.
          </p>
        )}
      </div>
    </div>
  );
}
