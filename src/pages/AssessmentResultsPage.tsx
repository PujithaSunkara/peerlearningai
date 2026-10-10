import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Scale,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { AssessmentAttemptDetail, AssessmentReviewItem } from '../types';
import { useAuth } from '../context/AuthContext';

export function AssessmentResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { refreshUser } = useAuth();

  const [attempt, setAttempt] = useState<AssessmentAttemptDetail | null>(null);
  const [allTaskAttempts, setAllTaskAttempts] = useState<
    AssessmentAttemptDetail[]
  >([]);
  const [review, setReview] = useState<AssessmentReviewItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Request Review Form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reason, setReason] = useState(
    'Short-answer keyword or coding rubric evaluation'
  );
  const [studentArgument, setStudentArgument] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewBanner, setReviewBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    setLoading(true);
    api
      .get(`/assessments/attempts/${attemptId}`)
      .then((res) => {
        setAttempt(res.data.attempt);
        setAllTaskAttempts(res.data.allTaskAttempts || []);
        setReview(res.data.review || null);
        refreshUser();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [attemptId, refreshUser]);

  const handleRequestReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attempt) return;
    setSubmittingReview(true);
    setReviewBanner(null);

    try {
      const res = await api.post('/assessments/reviews', {
        attemptId: attempt._id,
        reason,
        studentArgument,
      });
      setReview(res.data.review);
      setAttempt({ ...attempt, reviewStatus: 'Pending' });
      setShowReviewForm(false);
      setReviewBanner({
        type: 'success',
        text: 'Review request submitted! An authorized assessment reviewer can now inspect your attempt.',
      });
    } catch (err: unknown) {
      setReviewBanner({
        type: 'error',
        text:
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Could not submit review request.',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-36 bg-white rounded-xl border border-slate-200 animate-pulse" />
        <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-600">Assessment result not found.</p>
      </div>
    );
  }

  const firstScore =
    allTaskAttempts.length > 0
      ? allTaskAttempts[0].percentageScore
      : attempt.percentageScore;
  const improvementPts = attempt.percentageScore - firstScore;

  return (
    <div className="space-y-8">
      {/* Header Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Task: {attempt.taskTitle}</span>
              <span aria-hidden="true">·</span>
              <span>
                Competency: <strong>{attempt.skillName}</strong> (
                {attempt.competencyCategory})
              </span>
              <span aria-hidden="true">·</span>
              <span>Attempt #{attempt.attemptNumber}</span>
              <span aria-hidden="true">·</span>
              <span>
                Date: {new Date(attempt.completedAt).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2.5">
              {attempt.passed ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
              )}
              <span>
                Score: {attempt.percentageScore}% ({attempt.earnedScore}/
                {attempt.maxScore} pts)
              </span>
            </h1>

            <p className="text-sm text-slate-700 leading-relaxed max-w-3xl">
              {attempt.overallFeedback}
            </p>
          </div>

          {/* Action Buttons: Continue to Home, Role Dashboard, Retry, Request Review */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              to="/home"
              className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              Continue to Home →
            </Link>

            <Link
              to="/role-dashboard"
              className="px-4 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Role Dashboard
            </Link>

            <Link
              to={`/assessments/${attempt.task}/take`}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Test
            </Link>

            {attempt.reviewStatus === 'None' && !review && (
              <button
                type="button"
                onClick={() => setShowReviewForm((prev) => !prev)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Scale className="w-3.5 h-3.5" />
                Request Score Review
              </button>
            )}
          </div>
        </div>

        {/* Improvement Delta Strip across attempts */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">First Attempt Score</span>
            <span className="text-base font-bold font-mono tabular-nums text-slate-900">
              {firstScore}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">This Attempt (#{attempt.attemptNumber})</span>
            <span className="text-base font-bold font-mono tabular-nums text-slate-900">
              {attempt.percentageScore}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Score Improvement</span>
            <span
              className={`text-base font-bold font-mono tabular-nums ${
                improvementPts > 0
                  ? 'text-emerald-700'
                  : improvementPts < 0
                  ? 'text-amber-700'
                  : 'text-slate-700'
              }`}
            >
              {improvementPts >= 0 ? `+${improvementPts}` : improvementPts}{' '}
              percentage points
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Review Status</span>
            <span className="text-base font-bold text-slate-900">
              {review ? review.status : attempt.reviewStatus}
            </span>
          </div>
        </div>

        {/* AI Coaching Note */}
        {attempt.aiCoachingSummary && (
          <div className="p-4 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 space-y-1">
            <p className="font-bold">AI Personalized Learning Recommendation:</p>
            <p className="leading-relaxed">{attempt.aiCoachingSummary}</p>
          </div>
        )}
      </div>

      {reviewBanner && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            reviewBanner.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{reviewBanner.text}</span>
        </div>
      )}

      {/* Request Review Drawer */}
      {showReviewForm && (
        <form
          onSubmit={handleRequestReview}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-display">
              Request Formal Assessment Review
            </h2>
            <button
              type="button"
              onClick={() => setShowReviewForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-slate-600">
            Disagree with an automated keyword match or coding rubric calculation? Submit an explanation below for an authorized reviewer to inspect.
          </p>

          <div>
            <label
              htmlFor="rev-reason"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Dispute Category
            </label>
            <input
              id="rev-reason"
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300"
            />
          </div>

          <div>
            <label
              htmlFor="rev-arg"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Why should your solution or explanation receive credit?
            </label>
            <textarea
              id="rev-arg"
              rows={3}
              required
              value={studentArgument}
              onChange={(e) => setStudentArgument(e.target.value)}
              placeholder="Explain your logic, edge-case handling, or conceptual answer..."
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingReview}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              {submittingReview ? 'Submitting...' : 'Submit Review Request'}
            </button>
          </div>
        </form>
      )}

      {/* Existing Review Status Card */}
      {review && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Assessment Review Status: {review.status}
            </h2>
            <Link
              to="/assessment-reviews"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Open Review Queue →
            </Link>
          </div>
          <p className="text-xs text-slate-600">
            <strong>Your Argument:</strong> {review.studentArgument}
          </p>
          {review.reviewerNotes && (
            <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong>Reviewer Decision Notes:</strong> {review.reviewerNotes}
            </p>
          )}
        </div>
      )}

      {/* Question-by-Question Evaluation & Rubric Breakdown */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 font-display">
          Detailed Question & Rubric Breakdown
        </h2>

        {attempt.evaluations && attempt.evaluations.length > 0 ? (
          attempt.evaluations.map((ev, idx) => (
            <div
              key={ev.questionId || idx}
              className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  {ev.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-amber-600" />
                  )}
                  Question {idx + 1} ({ev.questionType.toUpperCase()})
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                  {ev.earnedPoints} / {ev.maxPoints} pts
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500">
                  Submitted Answer:
                </p>
                <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto">
                  <code>{ev.submittedAnswer || '(No answer submitted)'}</code>
                </pre>
              </div>

              {ev.rubricBreakdown && (
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono tabular-nums">
                  <div>
                    <span className="text-slate-500 block font-sans">
                      Correctness (60%)
                    </span>
                    <strong className="text-slate-900">
                      {ev.rubricBreakdown.correctness} pts
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-sans">
                      Logic & Approach (20%)
                    </span>
                    <strong className="text-slate-900">
                      {ev.rubricBreakdown.logicAndApproach} pts
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-sans">
                      Code Quality (20%)
                    </span>
                    <strong className="text-slate-900">
                      {ev.rubricBreakdown.codeQualityOrExplanation} pts
                    </strong>
                  </div>
                </div>
              )}

              {ev.testResults && ev.testResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Isolated Test Case Results:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {ev.testResults.map((tr, tIdx) => (
                      <div
                        key={tIdx}
                        className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                          tr.passed
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                            : 'bg-red-50/60 border-red-200 text-red-950'
                        }`}
                      >
                        <p className="font-sans font-semibold flex items-center gap-1.5">
                          {tr.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          )}
                          {tr.description}
                        </p>
                        <p>Actual: {tr.actualOutput}</p>
                        <p>Expected: {tr.expectedOutput}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <strong>Feedback & Explanation: </strong>
                {ev.feedback}
              </p>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-xs text-slate-600">
            Summary attempt record loaded. Click "Retry Assessment" above to run a fresh interactive evaluation.
          </div>
        )}
      </div>
    </div>
  );
}
