import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Send,
  HelpCircle,
  Star,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { DoubtRequestItem, UserProfile } from '../types';
import { UserAvatar } from '../components/UserAvatar';

export function PeerMatchingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedDoubtId = searchParams.get('doubtId');

  const [doubts, setDoubts] = useState<DoubtRequestItem[]>([]);
  const [activeDoubt, setActiveDoubt] = useState<DoubtRequestItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Request Modal / Inline Composer state
  const [selectedMentor, setSelectedMentor] = useState<UserProfile | null>(null);
  const [requestTopic, setRequestTopic] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [proposedTime, setProposedTime] = useState('Today 18:00 UTC');
  const [roleMode, setRoleMode] = useState<'learner-to-mentor' | 'peer-collab'>(
    'learner-to-mentor'
  );
  const [sendingRequest, setSendingRequest] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get('/doubts')
      .then((res) => {
        const list: DoubtRequestItem[] = res.data.doubts || [];
        setDoubts(list);
        if (selectedDoubtId) {
          const found = list.find((d) => d._id === selectedDoubtId) || list[0] || null;
          setActiveDoubt(found);
        } else if (list.length > 0) {
          setActiveDoubt(list[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDoubtId]);

  const openRequestComposer = (peer: UserProfile) => {
    setSelectedMentor(peer);
    setRequestTopic(activeDoubt?.title || 'Peer Mentoring Session');
    setRequestMessage(
      `Hi ${peer.name}! PeerConnect AI matched your profile for "${
        activeDoubt?.title || 'my technical question'
      }". Would you be open to a short peer mentoring session?`
    );
    setStatusBanner(null);
  };

  const handleSendLearningRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor) return;
    setSendingRequest(true);
    setStatusBanner(null);

    try {
      await api.post('/learning/requests', {
        mentorId: selectedMentor._id,
        doubtRequestId: activeDoubt?._id,
        topic: requestTopic,
        message: requestMessage,
        proposedTime,
        roleMode,
      });
      setStatusBanner({
        type: 'success',
        text: `Learning request sent to ${selectedMentor.name}! Redirecting to Learning Requests...`,
      });
      setTimeout(() => {
        navigate('/learning-requests');
      }, 900);
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text:
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to send learning request.',
      });
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            AI Peer Matching & Deterministic Ranking Results
          </h1>
          <p className="text-sm text-slate-600">
            Inspect extracted competencies, 5-factor match explanations, and send learning requests
          </p>
        </div>

        <Link
          to="/submit-doubt"
          className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 self-start whitespace-nowrap shrink-0"
        >
          <HelpCircle className="w-4 h-4" />
          Submit Another Doubt
        </Link>
      </div>

      {/* Doubt Selector if multiple doubts exist */}
      {doubts.length > 1 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <label
            htmlFor="doubt-selector"
            className="text-xs font-semibold text-slate-700 shrink-0"
          >
            Select Submitted Doubt:
          </label>
          <select
            id="doubt-selector"
            value={activeDoubt?._id || ''}
            onChange={(e) => setSearchParams({ doubtId: e.target.value })}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white"
          >
            {doubts.map((d) => (
              <option key={d._id} value={d._id}>
                {d.title} ({d.extractedTopics.slice(0, 3).join(', ')})
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
          <div className="h-48 bg-white rounded-xl border border-slate-200 animate-pulse" />
        </div>
      ) : activeDoubt ? (
        <>
          {/* AI Doubt Diagnostic Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900 font-display">
                {activeDoubt.title}
              </h2>
              <span className="text-xs text-blue-700 font-medium">
                Engine: {activeDoubt.aiConfidence} · Recommended Mentor Level:{' '}
                <strong>{activeDoubt.recommendedProficiency}</strong>
              </span>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              {activeDoubt.aiAnalysisSummary}
            </p>

            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-900">Extracted Topics: </span>
                <span>{activeDoubt.extractedTopics.join(' · ')}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-900">
                  Competency Categories:{' '}
                </span>
                <span>{activeDoubt.extractedCompetencies.join(' · ')}</span>
              </div>
            </div>
          </div>

          {/* Send Learning Request Modal / Drawer */}
          {selectedMentor && (
            <div className="bg-blue-50/70 rounded-xl border border-blue-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Send Learning Request to {selectedMentor.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedMentor(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>

              {statusBanner && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    statusBanner.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {statusBanner.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{statusBanner.text}</span>
                </div>
              )}

              <form onSubmit={handleSendLearningRequest} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="req-topic"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Session Topic
                    </label>
                    <input
                      id="req-topic"
                      type="text"
                      required
                      value={requestTopic}
                      onChange={(e) => setRequestTopic(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="req-time"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Proposed Time
                    </label>
                    <input
                      id="req-time"
                      type="text"
                      required
                      value={proposedTime}
                      onChange={(e) => setProposedTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="req-mode"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Session Format
                    </label>
                    <select
                      id="req-mode"
                      value={roleMode}
                      onChange={(e) =>
                        setRoleMode(
                          e.target.value as 'learner-to-mentor' | 'peer-collab'
                        )
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="learner-to-mentor">
                        1-on-1 Peer Mentorship (Learner → Mentor)
                      </option>
                      <option value="peer-collab">
                        Collaborative Pair Debugging
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="req-msg"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Message to Mentor
                  </label>
                  <textarea
                    id="req-msg"
                    rows={2}
                    required
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMentor(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingRequest}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendingRequest ? 'Sending...' : 'Confirm & Send Request'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Ranked Peer Mentor Cards */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-display">
              Ranked Peer Mentors ({activeDoubt.matchedPeers?.length || 0})
            </h2>

            {activeDoubt.matchedPeers && activeDoubt.matchedPeers.length > 0 ? (
              <div className="space-y-4">
                {activeDoubt.matchedPeers.map((match, idx) => {
                  const peer = match.peer;
                  if (!peer) return null;

                  return (
                    <div
                      key={peer._id || idx}
                      className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                    >
                      <div className="space-y-3 flex-1">
                        <div className="flex items-start gap-4">
                          <UserAvatar
                            name={peer.name}
                            avatarUrl={peer.avatarUrl}
                            size="lg"
                          />
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono font-bold text-blue-700">
                                #{idx + 1}
                              </span>
                              <h3 className="text-base font-bold text-slate-900">
                                {peer.name}
                              </h3>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="text-xs text-slate-600">
                                {peer.academicDetails?.major} (
                                {peer.academicDetails?.yearOfStudy})
                              </span>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="text-xs font-medium text-amber-700 inline-flex items-center gap-1 font-mono tabular-nums">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                {(peer.stats?.averageRating || 5.0).toFixed(1)} (
                                {peer.stats?.sessionsMentored || 0} mentored)
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                              {peer.bio}
                            </p>
                          </div>
                        </div>

                        {/* Match Explanation */}
                        <p className="text-xs text-slate-700 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200">
                          <strong className="text-slate-900">Why Matched: </strong>
                          {match.explanation}
                        </p>

                        {/* Peer's Competencies distinguishing Verified vs Self-Reported */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                          <span className="font-semibold text-slate-700">
                            Competencies:
                          </span>
                          {(peer.competencies || []).map((c) => (
                            <span
                              key={c.skillName}
                              className="inline-flex items-center gap-1 text-slate-700"
                            >
                              {c.isVerified ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <span className="font-medium text-slate-900">
                                {c.skillName}
                              </span>
                              <span className="text-slate-500">
                                ({c.proficiencyLevel}
                                {c.isVerified
                                  ? ` · ${c.verifiedScore || 90}% Verified`
                                  : ' · Self-Reported'}
                                )
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Score Breakdown & Action Button */}
                      <div className="lg:w-64 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-6 flex flex-col justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-medium text-slate-500">
                              Overall Match Score
                            </span>
                            <span className="text-2xl font-bold text-blue-600 font-mono tabular-nums">
                              {match.matchScore}%
                            </span>
                          </div>
                          {match.scoreBreakdown && (
                            <div className="text-xs text-slate-500 space-y-0.5 font-mono tabular-nums">
                              <div className="flex justify-between">
                                <span>Skill Relevance:</span>
                                <span>{match.scoreBreakdown.skillRelevance}/35</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Topic Similarity:</span>
                                <span>{match.scoreBreakdown.topicSimilarity}/25</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Verified Level:</span>
                                <span>{match.scoreBreakdown.competencyLevel}/20</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Availability & Rating:</span>
                                <span>
                                  {Math.round(
                                    (match.scoreBreakdown.availabilityScore || 0) +
                                      (match.scoreBreakdown.experienceAndRating || 0)
                                  )}
                                  /20
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => openRequestComposer(peer)}
                          className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send Learning Request
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                No peer candidates found.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-4">
          <p className="text-sm text-slate-600">
            You haven’t submitted a technical doubt yet. Submit a question to see AI topic analysis and ranked peer mentors.
          </p>
          <Link
            to="/submit-doubt"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-lg"
          >
            Submit Your First Doubt
          </Link>
        </div>
      )}
    </div>
  );
}
