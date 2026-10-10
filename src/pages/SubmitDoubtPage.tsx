import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HelpCircle, ArrowRight, AlertCircle, Code2 } from 'lucide-react';
import { api } from '../services/api';
import { DoubtRequestItem } from '../types';

const SAMPLE_PROMPTS = [
  {
    label: 'Django JWT & Refresh Tokens',
    title: 'Implementing JWT authentication and refresh tokens in Django REST Framework',
    description:
      'I need help implementing JWT authentication and refresh tokens in Django. Specifically, how to configure SimpleJWT token rotation, blacklist old refresh tokens, and handle 401 refresh interceptors.',
    codeSnippet: `SIMPLE_JWT = {\n    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),\n    'ROTATE_REFRESH_TOKENS': True,\n}`,
  },
  {
    label: 'React Async Race Conditions',
    title: 'Preventing stale state updates and race conditions in React useEffect',
    description:
      'When typing quickly in a search input, earlier slower API responses overwrite newer results. How do I properly combine AbortController and debouncing in React hooks?',
    codeSnippet: `useEffect(() => {\n  fetchResults(query).then(data => setItems(data));\n}, [query]);`,
  },
  {
    label: 'Algorithmic Complexity & Hash Maps',
    title: 'Optimizing nested O(N^2) array lookup to linear O(N) time complexity',
    description:
      'I am timing out on large array test cases in Python/JavaScript and want a mentor to walk through hash map and two-pointer optimization patterns.',
    codeSnippet: '',
  },
];

export function SubmitDoubtPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [urgency, setUrgency] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [recentDoubts, setRecentDoubts] = useState<DoubtRequestItem[]>([]);

  useEffect(() => {
    api
      .get('/doubts')
      .then((res) => setRecentDoubts(res.data.doubts || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/doubts', {
        title,
        description,
        codeSnippet,
        urgency,
      });
      const createdDoubtId = res.data.doubt?._id;
      navigate(`/peer-matches?doubtId=${createdDoubtId}`);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to analyze doubt. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">
          Submit a Technical Doubt or Learning Requirement
        </h1>
        <p className="text-sm text-slate-600">
          Gemini AI extracts topics and competencies from your question, and our deterministic backend algorithm ranks the best peer mentors
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Doubt Submission Form (8 cols) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5"
        >
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-600">
              Try a sample student doubt:
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((sp) => (
                <button
                  key={sp.label}
                  type="button"
                  onClick={() => {
                    setTitle(sp.title);
                    setDescription(sp.description);
                    setCodeSnippet(sp.codeSnippet);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="doubt-title"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Doubt Summary / Question Title
            </label>
            <input
              id="doubt-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., I need help implementing JWT authentication and refresh tokens in Django"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="doubt-desc"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Detailed Problem Description & Learning Goal
            </label>
            <textarea
              id="doubt-desc"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you are building, what error or conceptual block you hit, and what you want to learn in a mentoring session..."
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="doubt-code"
              className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5 text-slate-500" />
              Optional Code Snippet or Error Traceback
            </label>
            <textarea
              id="doubt-code"
              rows={4}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="Paste relevant code or stack trace here..."
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-900 text-slate-100 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Urgency:</span>
              {(['Low', 'Medium', 'High'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                    urgency === u
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <HelpCircle className="w-4 h-4" />
              {submitting
                ? 'Analyzing with Gemini & Ranking Peers...'
                : 'Analyze Doubt & Match Peers'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Previous Doubts & How Ranking Works (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 font-display">
              How Deterministic + AI Matching Works
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              1. <strong>Gemini Topic & Competency Extraction:</strong> Identifies technical topics and maps your request to Programming, Debugging, Problem-solving, Data analysis, or Communication.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              2. <strong>5-Factor Backend Ranking:</strong> Peers are scored out of 100 across Skill Relevance (35 pts), Topic Similarity (25 pts), Competency & Verification Evidence (20 pts), Availability (10 pts), and Mentoring Experience & Rating (10 pts).
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 font-display">
              Your Recent Doubt Submissions ({recentDoubts.length})
            </h2>
            {recentDoubts.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {recentDoubts.slice(0, 4).map((d) => (
                  <div key={d._id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <Link
                      to={`/peer-matches?doubtId=${d._id}`}
                      className="text-xs font-semibold text-slate-900 hover:text-blue-600 block"
                    >
                      {d.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      Topics: {d.extractedTopics.slice(0, 3).join(', ')} ·{' '}
                      {d.matchedPeers?.length || 0} peers ranked
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No doubts submitted yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
