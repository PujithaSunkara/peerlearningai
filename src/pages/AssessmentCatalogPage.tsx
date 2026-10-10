import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { AssessmentTaskSummary } from '../types';

export function AssessmentCatalogPage() {
  const [tasks, setTasks] = useState<AssessmentTaskSummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/assessments/tasks')
      .then((res) => setTasks(res.data.tasks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    'All',
    'Programming',
    'Debugging',
    'Problem-solving',
  ];

  const filteredTasks = tasks.filter(
    (t) => selectedCategory === 'All' || t.competencyCategory === selectedCategory
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Mini Skill Assessment Catalog
          </h1>
          <p className="text-sm text-slate-600">
            Verify your competencies through multiple-choice, short-answer, and isolated coding test-case evaluations
          </p>
        </div>

        <Link
          to="/assessment-progress"
          className="px-4 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-2 self-start whitespace-nowrap shrink-0"
        >
          <TrendingUp className="w-4 h-4" />
          View Progress & Retry History
        </Link>
      </div>

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
          <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTasks.map((task) => {
            const isVerified =
              task.bestScore !== null && task.bestScore >= task.passingScorePercent;

            return (
              <div
                key={task._id}
                className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {task.competencyCategory} · {task.skillName} · {task.difficulty}
                    </span>
                    <span className="font-mono tabular-nums">
                      {task.durationMinutes} min · {task.questionCount} questions
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 font-display">
                    {task.title}
                  </h2>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {task.description}
                  </p>

                  {/* Rubric Summary */}
                  <div className="pt-2 space-y-1">
                    <p className="text-xs font-semibold text-slate-800">
                      Scoring Rubric (Pass threshold: {task.passingScorePercent}%):
                    </p>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                      {task.rubric.map((r) => (
                        <span key={r.criterion}>
                          {r.criterion}:{' '}
                          <strong className="font-mono text-slate-700">
                            {r.weightPercent}%
                          </strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
                  <div className="text-xs">
                    {task.attemptsCount > 0 ? (
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-900 flex items-center gap-1.5">
                          {isVerified ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          )}
                          Best Score:{' '}
                          <span className="font-mono font-bold tabular-nums">
                            {task.bestScore}%
                          </span>{' '}
                          ({task.attemptsCount}{' '}
                          {task.attemptsCount === 1 ? 'attempt' : 'attempts'})
                        </p>
                        <p className="text-slate-500">
                          Latest Attempt: {task.latestScore}%
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-500">No attempts yet</span>
                    )}
                  </div>

                  <Link
                    to={`/assessments/${task._id}/take`}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    {task.attemptsCount > 0 ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retry Assessment (#{task.attemptsCount + 1})
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Start Assessment
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
