import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  ClipboardCheck,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const CATEGORIES = [
  'Programming',
  'Debugging',
  'Problem-solving',
  'Data analysis',
  'Communication',
] as const;

const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

interface CatalogItem {
  _id: string;
  name: string;
  category: (typeof CATEGORIES)[number];
  description: string;
}

export function CompetencyPage() {
  const { user, refreshUser } = useAuth();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]>('Programming');
  const [skillName, setSkillName] = useState('Django & REST APIs');
  const [proficiencyLevel, setProficiencyLevel] =
    useState<(typeof PROFICIENCY_LEVELS)[number]>('Intermediate');
  const [filterTab, setFilterTab] = useState<'all' | 'verified' | 'self-reported'>('all');
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    api
      .get('/users/competency-catalog')
      .then((res) => setCatalog(res.data.catalog || []))
      .catch(() => {});
  }, []);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    setSubmitting(true);
    setBanner(null);

    try {
      const res = await api.post('/users/competencies', {
        category,
        skillName: skillName.trim(),
        proficiencyLevel,
      });
      await refreshUser();
      setBanner({ type: 'success', text: res.data.message });
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        text:
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Could not update competency.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (targetSkill: string) => {
    setBanner(null);
    try {
      await api.delete(`/users/competencies/${encodeURIComponent(targetSkill)}`);
      await refreshUser();
      setBanner({
        type: 'success',
        text: `Removed "${targetSkill}" from your competency profile.`,
      });
    } catch {
      setBanner({ type: 'error', text: 'Could not remove competency.' });
    }
  };

  const allCompetencies = user?.competencies || [];
  const filteredCompetencies = allCompetencies.filter((c) => {
    if (filterTab === 'verified') return c.isVerified;
    if (filterTab === 'self-reported') return !c.isVerified;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Competency Tags & Proficiency Levels
          </h1>
          <p className="text-sm text-slate-600">
            Manage your skill matrix across Programming, Debugging, Problem-solving, Data analysis, and Communication
          </p>
        </div>

        <Link
          to="/assessments"
          className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 self-start whitespace-nowrap shrink-0"
        >
          <ClipboardCheck className="w-4 h-4" />
          Verify Skills via Assessment
        </Link>
      </div>

      {/* Policy Distinction Callout */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            Evidence-Based Competency Policy
          </p>
          <p className="text-xs text-slate-600">
            Skills you add manually are labeled <strong>Self-Reported</strong>. A competency is only marked <strong>Verified by Assessment Evidence</strong> after you achieve a passing score ($\ge 70\%$) in our isolated assessment module or following an authorized reviewer audit.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Add / Update Competency Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900 font-display">
            Add or Update a Competency
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

          <form onSubmit={handleAddOrUpdate} className="space-y-4">
            <div>
              <label
                htmlFor="comp-cat"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Competency Category
              </label>
              <select
                id="comp-cat"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as (typeof CATEGORIES)[number])
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="comp-skill"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Skill or Competency Name
              </label>
              <input
                id="comp-skill"
                type="text"
                required
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="e.g. Python, Django & REST APIs, Debugging"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
              />
              {catalog.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 mb-1.5">
                    Quick select from standard catalog:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {catalog.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => {
                          setSkillName(item.name);
                          setCategory(item.category);
                        }}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Self-Reported Proficiency Level
              </span>
              <div className="grid grid-cols-3 gap-2">
                {PROFICIENCY_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setProficiencyLevel(lvl)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      proficiencyLevel === lvl
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Save to Competency Profile'}
            </button>
          </form>
        </div>

        {/* Competency Matrix Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">
                Your Active Competency Matrix ({filteredCompetencies.length})
              </h2>
              <p className="text-xs text-slate-500">
                Used directly by the PeerConnect AI matching engine
              </p>
            </div>

            {/* Interactive Filter Control */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  filterTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({allCompetencies.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('verified')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  filterTab === 'verified'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Verified ({allCompetencies.filter((c) => c.isVerified).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('self-reported')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  filterTab === 'self-reported'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Self-Reported ({allCompetencies.filter((c) => !c.isVerified).length})
              </button>
            </div>
          </div>

          {filteredCompetencies.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {filteredCompetencies.map((comp) => (
                <div
                  key={comp.skillName}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {comp.skillName}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="text-xs text-slate-500">{comp.category}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-slate-700">
                        Proficiency: {comp.proficiencyLevel}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      {comp.isVerified ? (
                        <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified by Assessment Evidence (
                          <span className="font-mono tabular-nums">
                            {comp.verifiedScore || 80}%
                          </span>
                          )
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Self-Reported (Unverified)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!comp.isVerified && (
                      <Link
                        to="/assessments"
                        className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Take Assessment
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(comp.skillName)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title={`Remove ${comp.skillName}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-slate-500">
              No competencies match the selected filter. Use the form on the left to add skills.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
