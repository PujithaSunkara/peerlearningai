import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const POPULAR_SKILLS = [
  'Python',
  'Java',
  'JavaScript',
  'React',
  'Node.js',
  'SQL',
  'Data Structures & Algorithms',
  'C / C++',
  'Django',
  'Machine Learning',
  'HTML & CSS',
  'Debugging',
];

const POPULAR_ROLES = [
  'Full Stack Developer',
  'Frontend Engineer',
  'Backend Engineer',
  'Data Scientist / AI Engineer',
  'Software Development Engineer (SDE)',
  'DevOps & Cloud Engineer',
];

export function StudentDetailsFormPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [college, setCollege] = useState(
    user?.academicDetails?.institution ||
      "Vignan's Institute of Information Technology"
  );
  const [branch, setBranch] = useState(
    user?.academicDetails?.major || 'Computer Science & Engineering (CSE)'
  );
  const [year, setYear] = useState(
    user?.academicDetails?.yearOfStudy || '3rd Year'
  );
  const [targetCareerRole, setTargetCareerRole] = useState(
    user?.targetCareerRole || 'Full Stack Developer'
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    user?.competencies && user.competencies.length > 0
      ? user.competencies.map((c) => c.skillName)
      : ['Python', 'JavaScript', 'React']
  );
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState<
    'Available' | 'Busy'
  >('Available');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleAddCustomSkill = () => {
    const trimmed = customSkillInput.trim();
    if (!trimmed) return;
    if (!selectedSkills.includes(trimmed)) {
      setSelectedSkills((prev) => [...prev, trimmed]);
    }
    setCustomSkillInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedSkills.length === 0) {
      setError(
        'Please select or add at least one skill you know so we can generate your Skill Assessment Test.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/users/onboarding-details', {
        college,
        branch,
        year,
        skills: selectedSkills,
        targetCareerRole,
        availabilityStatus,
      });
      await refreshUser();
      const taskId = res.data.assessmentTaskId;
      navigate(`/assessments/${taskId}/take?onboarding=true`);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Could not save student details. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-xl font-bold text-blue-700 font-display">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            PeerConnect AI
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Step 2: Student Academic, Skills & Role Form
          </h1>
          <p className="text-sm text-slate-600">
            Provide your college, branch, year, skills you know, and target role. Next, you will take a personalized Skill Assessment Test based on the skills you mention below.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6"
        >
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="onb-college"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              College / Institution Name
            </label>
            <input
              id="onb-college"
              type="text"
              required
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="onb-branch"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Branch / Department
              </label>
              <select
                id="onb-branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none bg-white"
              >
                <option value="Computer Science & Engineering (CSE)">
                  Computer Science & Engineering (CSE)
                </option>
                <option value="CSE (Artificial Intelligence & Data Science)">
                  CSE (Artificial Intelligence & Data Science)
                </option>
                <option value="Information Technology (IT)">
                  Information Technology (IT)
                </option>
                <option value="Electronics & Communication Engineering (ECE)">
                  Electronics & Communication Engineering (ECE)
                </option>
                <option value="Electrical & Electronics Engineering (EEE)">
                  Electrical & Electronics Engineering (EEE)
                </option>
                <option value="Mechanical Engineering">
                  Mechanical Engineering
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="onb-year"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Year of Study
              </label>
              <select
                id="onb-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none bg-white"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="onb-role"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Your Target Role (Tracks Your Role Learning Dashboard & Assessments)
            </label>
            <input
              id="onb-role"
              type="text"
              required
              value={targetCareerRole}
              onChange={(e) => setTargetCareerRole(e.target.value)}
              placeholder="e.g., Full Stack Developer, Data Scientist, SDE"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {POPULAR_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTargetCareerRole(r)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                    targetCareerRole === r
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Skills You Know (Used to Generate Your Assessment Test & Match Peers)
            </label>

            <div className="flex flex-wrap gap-2">
              {POPULAR_SKILLS.map((skill) => {
                const active = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {skill}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSkill();
                  }
                }}
                placeholder="Add another skill (e.g., Spring Boot, Flutter, Rust)..."
                className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomSkill}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Skill
              </button>
            </div>

            {selectedSkills.length > 0 && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <p className="text-xs font-semibold text-slate-700">
                  Selected Skills ({selectedSkills.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedSkills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className="text-blue-600 hover:text-blue-900 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="onb-avail"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Current Availability for Peer Matching
            </label>
            <select
              id="onb-avail"
              value={availabilityStatus}
              onChange={(e) =>
                setAvailabilityStatus(e.target.value as 'Available' | 'Busy')
              }
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white"
            >
              <option value="Available">
                Available Right Now (Visible to AI Agent for Live Peer Matching)
              </option>
              <option value="Busy">Busy</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting
              ? 'Generating Your Personalized Skill Assessment Test...'
              : 'Save Details & Start Skill Assessment Test'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
