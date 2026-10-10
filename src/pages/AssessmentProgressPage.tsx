import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  ClipboardCheck,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import { AssessmentAttemptDetail } from '../types';

interface TaskProgressItem {
  taskId: string;
  taskTitle: string;
  skillName: string;
  competencyCategory: string;
  attemptsCount: number;
  firstAttemptScore: number;
  latestScore: number;
  bestScore: number;
  improvementPercentagePoints: number;
  attempts: Array<{
    attemptId: string;
    attemptNumber: number;
    percentageScore: number;
    completedAt: string;
    passed: boolean;
    reviewStatus: string;
  }>;
}

export function AssessmentProgressPage() {
  const [attempts, setAttempts] = useState<AssessmentAttemptDetail[]>([]);
  const [taskProgress, setTaskProgress] = useState<TaskProgressItem[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/assessments/progress')
      .then((res) => {
        setAttempts(res.data.attempts || []);
        setTaskProgress(res.data.taskProgress || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const topImprovement =
    taskProgress.length > 0
      ? Math.max(...taskProgress.map((t) => t.improvementPercentagePoints))
      : 0;

  const overallBestAvg =
    taskProgress.length > 0
      ? Math.round(
          taskProgress.reduce((acc, t) => acc + t.bestScore, 0) /
            taskProgress.length
        )
      : 0;

  // Bar Chart data comparing First Attempt, Latest Score, and Best Score per Skill
  const comparisonChartData = taskProgress.map((tp) => ({
    skill: tp.skillName,
    firstAttempt: tp.firstAttemptScore,
    latestAttempt: tp.latestScore,
    bestScore: tp.bestScore,
    improvement: tp.improvementPercentagePoints,
  }));

  // Chronological attempt trajectory
  const chronologicalData = [...attempts]
    .reverse()
    .filter(
      (a) => selectedSkill === 'All' || a.skillName === selectedSkill
    )
    .map((a) => ({
      label: `${a.skillName} #${a.attemptNumber}`,
      score: a.percentageScore,
      skill: a.skillName,
    }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Assessment Progress & Retry Analytics Dashboard
          </h1>
          <p className="text-sm text-slate-600">
            Track first-attempt scores, latest scores, best scores, and percentage-point improvements across every retry
          </p>
        </div>

        <Link
          to="/assessments"
          className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 self-start whitespace-nowrap shrink-0"
        >
          <ClipboardCheck className="w-4 h-4" />
          Take or Retry Assessment
        </Link>
      </div>

      {/* 4-Column KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">
            Total Recorded Attempts
          </p>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {attempts.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Full history preserved without overwrites
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">
            Skills Assessed
          </p>
          <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {taskProgress.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Across Programming, Debugging & Problem-solving
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">
            Highest Retry Improvement
          </p>
          <p className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
            +{topImprovement} pts
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Percentage points gained from first to best attempt
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">
            Average Best Score
          </p>
          <p className="text-2xl font-bold text-blue-600 font-mono tabular-nums mt-1">
            {overallBestAvg}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            70% threshold required for verified badge
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-80 bg-white rounded-xl border border-slate-200 animate-pulse" />
      ) : taskProgress.length > 0 ? (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bar Chart: First Attempt vs Latest vs Best Score (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-display">
                  First Attempt vs. Latest & Best Score by Competency
                </h2>
                <p className="text-xs text-slate-500">
                  Visualizing percentage-point gains achieved through practice and retries
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonChartData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="skill" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                      dataKey="firstAttempt"
                      name="First Attempt (%)"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="latestAttempt"
                      name="Latest Score (%)"
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="bestScore"
                      name="Best Score (%)"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Line Chart: Attempt Trajectory Over Time (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-display">
                    Attempt Progression Curve
                  </h2>
                  <p className="text-xs text-slate-500">
                    Score trajectory across sequential attempts
                  </p>
                </div>

                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-md border border-slate-300 bg-white"
                >
                  <option value="All">All Skills</option>
                  {taskProgress.map((tp) => (
                    <option key={tp.taskId} value={tp.skillName}>
                      {tp.skillName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chronologicalData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Attempt Score (%)"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: '#2563eb' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Per-Task Improvement Breakdown Cards */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-display">
              Skill-by-Skill Improvement Summary
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-3 pr-4 font-semibold">Assessment Task</th>
                    <th className="py-3 px-4 font-semibold">Competency</th>
                    <th className="py-3 px-4 font-semibold text-right">Attempts</th>
                    <th className="py-3 px-4 font-semibold text-right">
                      First Score
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Latest Score
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Best Score
                    </th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Improvement
                    </th>
                    <th className="py-3 pl-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {taskProgress.map((tp) => (
                    <tr key={tp.taskId} className="hover:bg-slate-50">
                      <td className="py-3.5 pr-4 font-semibold text-slate-900">
                        {tp.taskTitle}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {tp.skillName} ({tp.competencyCategory})
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {tp.attemptsCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {tp.firstAttemptScore}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {tp.latestScore}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {tp.bestScore}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums">
                        <span
                          className={
                            tp.improvementPercentagePoints > 0
                              ? 'text-emerald-700'
                              : 'text-slate-600'
                          }
                        >
                          +{tp.improvementPercentagePoints} percentage points
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <Link
                          to={`/assessments/${tp.taskId}/take`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold whitespace-nowrap"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Retry
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Complete Attempt History Log */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-display">
              Complete Preserved Assessment Attempt History ({attempts.length})
            </h2>

            <div className="divide-y divide-slate-200">
              {attempts.map((att) => (
                <div
                  key={att._id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/assessment-results/${att._id}`}
                        className="text-sm font-bold text-slate-900 hover:text-blue-600"
                      >
                        {att.taskTitle} — Attempt #{att.attemptNumber}
                      </Link>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      {att.passed ? (
                        <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Passed & Verified
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 font-medium inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Below Threshold
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Completed on {new Date(att.completedAt).toLocaleString()} ·
                      Review Status: {att.reviewStatus}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                      {att.percentageScore}%
                    </span>
                    <Link
                      to={`/assessment-results/${att._id}`}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      View Result & Rubric
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
          <TrendingUp className="w-8 h-8 text-blue-600 mx-auto" />
          <p className="text-sm text-slate-600">
            No assessment attempts recorded yet. Take a skill assessment to start tracking your progress!
          </p>
          <Link
            to="/assessments"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg"
          >
            Browse Assessment Catalog
          </Link>
        </div>
      )}
    </div>
  );
}
