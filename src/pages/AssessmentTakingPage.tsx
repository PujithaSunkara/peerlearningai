import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Code2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { AssessmentQuestionClient } from '../types';

interface TaskTakeDetail {
  _id: string;
  title: string;
  competencyCategory: string;
  skillName: string;
  difficulty: string;
  durationMinutes: number;
  description: string;
  maxScore: number;
  passingScorePercent: number;
  rubric: Array<{
    criterion: string;
    weightPercent: number;
    description: string;
  }>;
  questions: AssessmentQuestionClient[];
  nextAttemptNumber: number;
}

export function AssessmentTakingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<TaskTakeDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/assessments/tasks/${id}`)
      .then((res) => {
        const loadedTask: TaskTakeDetail = res.data.task;
        setTask(loadedTask);

        // Pre-populate starter code for coding questions
        const initialAnswers: Record<string, string> = {};
        for (const q of loadedTask.questions) {
          if (q.type === 'coding' && q.starterCode) {
            initialAnswers[q.questionId] = q.starterCode;
          } else {
            initialAnswers[q.questionId] = '';
          }
        }
        setAnswers(initialAnswers);
      })
      .catch(() => setError('Could not load assessment task.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await api.post(`/assessments/tasks/${task._id}/submit`, {
        answers,
      });
      const attemptId = res.data.attempt?._id;
      navigate(`/assessment-results/${attemptId}`);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Submission failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
        <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-600">Assessment task not found.</p>
        <Link
          to="/assessments"
          className="inline-block mt-4 text-xs font-semibold text-blue-600"
        >
          ← Back to Assessment Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/assessments"
            className="text-xs font-medium text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Assessment Catalog
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            {task.title}
          </h1>
          <p className="text-xs text-slate-600">
            Competency: <strong>{task.skillName}</strong> ({task.competencyCategory}) ·
            Recording as <strong>Attempt #{task.nextAttemptNumber}</strong> · Passing
            Threshold: <strong className="font-mono">{task.passingScorePercent}%</strong>
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmitAssessment} className="space-y-6">
        {task.questions.map((q, index) => (
          <div
            key={q.questionId}
            className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-blue-700">
                Question {index + 1} ·{' '}
                {q.type === 'mcq'
                  ? 'Multiple Choice'
                  : q.type === 'short_answer'
                  ? 'Conceptual Short Answer'
                  : `Isolated Coding Challenge (${q.language})`}
              </span>
              <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
                {q.points} Points
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-900 leading-relaxed">
              {q.prompt}
            </p>

            {/* Multiple Choice Options */}
            {q.type === 'mcq' && q.options && (
              <div className="space-y-2 pt-1">
                {q.options.map((opt) => {
                  const selected = answers[q.questionId] === opt;
                  return (
                    <label
                      key={opt}
                      className={`flex items-start gap-3 p-3.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        selected
                          ? 'bg-blue-50 border-blue-600 text-slate-900 font-medium'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.questionId}
                        value={opt}
                        checked={selected}
                        onChange={() => handleAnswerChange(q.questionId, opt)}
                        className="mt-0.5"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Short Answer Input */}
            {q.type === 'short_answer' && (
              <div>
                <textarea
                  rows={3}
                  required
                  value={answers[q.questionId] || ''}
                  onChange={(e) =>
                    handleAnswerChange(q.questionId, e.target.value)
                  }
                  placeholder="Write a concise technical explanation (1-3 sentences)..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                />
              </div>
            )}

            {/* Coding Challenge Input & Visible Predefined Test Cases */}
            {q.type === 'coding' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-mono text-slate-700">
                    <Code2 className="w-4 h-4 text-blue-600" />
                    Function signature: <strong>{q.functionName}</strong> (
                    {q.language})
                  </span>
                  <span>
                    Evaluated in isolated {q.language === 'python' ? 'Python subprocess' : 'Node VM'} sandbox
                  </span>
                </div>

                <textarea
                  rows={9}
                  required
                  value={answers[q.questionId] || ''}
                  onChange={(e) =>
                    handleAnswerChange(q.questionId, e.target.value)
                  }
                  className="w-full p-4 text-xs font-mono bg-slate-900 text-slate-100 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none leading-relaxed"
                />

                {q.testCases && q.testCases.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-800">
                      Predefined Test Cases & Rubric Criteria (Correctness 60% · Logic 20% · Code Quality 20%):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {q.testCases.map((tc, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-white rounded border border-slate-200 text-xs font-mono space-y-1"
                        >
                          <p className="font-sans font-semibold text-slate-700">
                            {tc.description}
                          </p>
                          <p className="text-slate-500 truncate">
                            Args: {tc.inputJson}
                          </p>
                          <p className="text-slate-800">
                            Expected: {tc.expectedOutputJson}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            Submitting this assessment creates a permanent record for{' '}
            <strong>Attempt #{task.nextAttemptNumber}</strong> without overwriting earlier attempts.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting
              ? 'Running Sandbox Test Cases & Rubric Grading...'
              : `Submit Attempt #${task.nextAttemptNumber}`}
          </button>
        </div>
      </form>
    </div>
  );
}
