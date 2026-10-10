import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { LearningSessionItem, SessionSummaryItem } from '../types';

export function SessionSummariesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');

  const [sessions, setSessions] = useState<LearningSessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState(
    sessionIdParam || ''
  );
  const [rawNotes, setRawNotes] = useState('');
  const [summaries, setSummaries] = useState<SessionSummaryItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [sessRes, sumRes] = await Promise.all([
        api.get('/learning/sessions'),
        api.get('/learning/summaries'),
      ]);
      const sessList: LearningSessionItem[] = sessRes.data.sessions || [];
      setSessions(sessList);
      setSummaries(sumRes.data.summaries || []);

      const activeId = sessionIdParam || sessList[0]?._id || '';
      setSelectedSessionId(activeId);
      const found = sessList.find((s) => s._id === activeId);
      if (found) {
        setRawNotes(found.sharedNotes || '');
      }
    } catch {
      // ignore
    }
  }, [sessionIdParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSessionChange = (newId: string) => {
    setSelectedSessionId(newId);
    setSearchParams({ sessionId: newId });
    const found = sessions.find((s) => s._id === newId);
    if (found) {
      setRawNotes(found.sharedNotes || '');
    }
  };

  const handleGenerateSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) return;
    setGenerating(true);
    setBanner(null);

    try {
      await api.post(`/learning/sessions/${selectedSessionId}/summarize`, {
        rawNotes,
      });
      await loadData();
      setBanner({
        type: 'success',
        text: 'AI session summary generated from your session notes and chat history!',
      });
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        text:
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to generate summary.',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">
          AI-Generated Session Summaries & Learning History
        </h1>
        <p className="text-sm text-slate-600">
          Submit or refine session notes to synthesize key concepts learned, practice areas, and recommended next topics with Gemini
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Note Submission & Synthesis Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900 font-display">
            Generate Post-Session Summary
          </h2>

          {banner && (
            <div
              className={`p-3.5 rounded-lg text-xs flex items-start gap-2 ${
                banner.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {banner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{banner.text}</span>
            </div>
          )}

          <form onSubmit={handleGenerateSummary} className="space-y-4">
            <div>
              <label
                htmlFor="sum-session"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Select Peer Learning Session
              </label>
              <select
                id="sum-session"
                value={selectedSessionId}
                onChange={(e) => handleSessionChange(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white"
              >
                {sessions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.topic} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="sum-notes"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Session Notes & Takeaways (Combined with Saved Chat Transcript)
              </label>
              <textarea
                id="sum-notes"
                rows={7}
                required
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="Enter your session notes, code takeaways, and questions covered..."
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={generating || !selectedSessionId}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              {generating
                ? 'Synthesizing with Gemini AI...'
                : 'Generate & Save AI Summary'}
            </button>
          </form>
        </div>

        {/* Saved Summaries Archive (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-display">
            Saved Learning History & Summaries ({summaries.length})
          </h2>

          {summaries.length > 0 ? (
            <div className="space-y-4">
              {summaries.map((sum) => (
                <div
                  key={sum._id}
                  className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {sum.topic}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Generated on{' '}
                        {new Date(sum.createdAt).toLocaleDateString()} · Source:{' '}
                        <strong>{sum.generatedSource}</strong>
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    {sum.summaryText}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Key Concepts Learned
                      </p>
                      <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                        {sum.keyConceptsLearned.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                        Topics Needing Practice
                      </p>
                      <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                        {sum.topicsNeedingPractice.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                        Recommended Next Topics
                      </p>
                      <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                        {sum.recommendedNextTopics.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              No session summaries generated yet. Select a session on the left to generate your first AI summary.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
