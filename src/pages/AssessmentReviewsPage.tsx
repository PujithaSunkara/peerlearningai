import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AssessmentReviewItem } from '../types';

export function AssessmentReviewsPage() {
  const { user, loginWithToken } = useAuth();
  const [reviews, setReviews] = useState<AssessmentReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Reviewer decision state
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<'Reviewed' | 'Resolved'>(
    'Resolved'
  );
  const [updatedScorePercent, setUpdatedScorePercent] = useState<number>(80);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/assessments/reviews');
      setReviews(res.data.reviews || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews, user?._id]);

  const handleSwitchToReviewerDemo = async () => {
    try {
      const res = await api.post('/auth/login', {
        email: 'priya@peerconnect.edu',
        password: 'password123',
      });
      loginWithToken(res.data.token, res.data.user);
      setBanner({
        type: 'success',
        text: 'Switched to Authorized Reviewer account (Priya Nair). You can now inspect and resolve disputed assessment results.',
      });
    } catch {
      // ignore
    }
  };

  const handleSwitchToStudentDemo = async () => {
    try {
      const res = await api.post('/auth/login', {
        email: 'alex@peerconnect.edu',
        password: 'password123',
      });
      loginWithToken(res.data.token, res.data.user);
      setBanner({
        type: 'success',
        text: 'Switched back to Student account (Alex Rivera).',
      });
    } catch {
      // ignore
    }
  };

  const openReviewerPanel = (rev: AssessmentReviewItem) => {
    setActiveReviewId(rev._id);
    setUpdatedScorePercent(
      rev.updatedScorePercent ?? Math.min(100, rev.originalScorePercent + 15)
    );
    setReviewerNotes(
      rev.reviewerNotes ||
        'Inspected short-answer explanation and coding test cases. Awarded credit for valid useEffect cleanup / cancellation explanation.'
    );
    setDecisionStatus('Resolved');
  };

  const handleSubmitDecision = async (e: React.FormEvent, reviewId: string) => {
    e.preventDefault();
    setSubmitting(true);
    setBanner(null);

    try {
      await api.patch(`/assessments/reviews/${reviewId}/decide`, {
        status: decisionStatus,
        updatedScorePercent: Number(updatedScorePercent),
        reviewerNotes,
      });
      setActiveReviewId(null);
      await loadReviews();
      setBanner({
        type: 'success',
        text: 'Assessment review decision recorded and student competency profile updated!',
      });
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        text:
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to record review decision.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isReviewer = user?.role === 'reviewer';

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Assessment Review Requests & Audit Queue
          </h1>
          <p className="text-sm text-slate-600">
            {isReviewer
              ? 'Authorized Reviewer Mode: Inspect disputed student attempts, adjust scores, and resolve review requests'
              : 'Track the status of your disputed assessment results (Pending, Reviewed, Resolved)'}
          </p>
        </div>

        {/* Role Switcher Helper for easy testing of both Student and Authorized Reviewer perspectives */}
        <div className="flex items-center gap-2 self-start">
          {!isReviewer ? (
            <button
              type="button"
              onClick={handleSwitchToReviewerDemo}
              className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4" />
              Switch to Authorized Reviewer (Priya)
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSwitchToStudentDemo}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              Switch to Student View (Alex)
            </button>
          )}
        </div>
      </div>

      {banner && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            banner.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev._id}
              className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>Student: {rev.student?.name || 'Student'}</span>
                    <span aria-hidden="true">·</span>
                    <span>Assessment: {rev.task?.title}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Submitted:{' '}
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    Dispute Reason: {rev.reason}
                  </h2>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right text-xs">
                    <span className="text-slate-500 block">Status</span>
                    <strong
                      className={
                        rev.status === 'Resolved'
                          ? 'text-emerald-700'
                          : rev.status === 'Reviewed'
                          ? 'text-blue-700'
                          : 'text-amber-700'
                      }
                    >
                      {rev.status}
                    </strong>
                  </div>

                  <div className="text-right text-xs font-mono tabular-nums">
                    <span className="text-slate-500 block font-sans">
                      Score Outcome
                    </span>
                    <strong className="text-slate-900">
                      {rev.originalScorePercent}%
                      {rev.updatedScorePercent !== undefined &&
                        rev.updatedScorePercent !== rev.originalScorePercent &&
                        ` → ${rev.updatedScorePercent}%`}
                    </strong>
                  </div>

                  {rev.attempt?._id && (
                    <Link
                      to={`/assessment-results/${rev.attempt._id}`}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      Inspect Attempt
                    </Link>
                  )}

                  {isReviewer && (
                    <button
                      type="button"
                      onClick={() => openReviewerPanel(rev)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                    >
                      Review & Decide
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-slate-700 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <strong className="text-slate-900">Student Statement: </strong>
                  {rev.studentArgument}
                </p>

                {rev.reviewerNotes && (
                  <p className="text-emerald-950 bg-emerald-50/70 p-3.5 rounded-lg border border-emerald-200">
                    <strong>
                      Reviewer Decision ({rev.reviewer?.name || 'Reviewer'}):{' '}
                    </strong>
                    {rev.reviewerNotes}
                  </p>
                )}
              </div>

              {/* Reviewer Decision Form */}
              {isReviewer && activeReviewId === rev._id && (
                <form
                  onSubmit={(e) => handleSubmitDecision(e, rev._id)}
                  className="pt-4 border-t border-slate-200 bg-indigo-50/50 p-4 rounded-xl space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-900">
                    Authorized Reviewer Decision Panel
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="dec-status"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        New Review Status
                      </label>
                      <select
                        id="dec-status"
                        value={decisionStatus}
                        onChange={(e) =>
                          setDecisionStatus(
                            e.target.value as 'Reviewed' | 'Resolved'
                          )
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="Reviewed">Reviewed (Under Audit)</option>
                        <option value="Resolved">
                          Resolved (Final Outcome)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="dec-score"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Updated Score Percentage (Original:{' '}
                        {rev.originalScorePercent}%)
                      </label>
                      <input
                        id="dec-score"
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={updatedScorePercent}
                        onChange={(e) =>
                          setUpdatedScorePercent(Number(e.target.value))
                        }
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="dec-notes"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Official Reviewer Notes & Justification
                    </label>
                    <textarea
                      id="dec-notes"
                      rows={2}
                      required
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveReviewId(null)}
                      className="px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                    >
                      {submitting ? 'Saving Decision...' : 'Record Official Decision'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
          <Scale className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm text-slate-600">
            No assessment review requests found. Students can request a review from any Assessment Result page.
          </p>
        </div>
      )}
    </div>
  );
}
