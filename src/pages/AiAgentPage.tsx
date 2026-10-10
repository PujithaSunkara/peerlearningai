import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Send,
  CheckCircle2,
  XCircle,
  Video,
  MessageSquare,
  Star,
  Clock,
  AlertCircle,
  Code2,
} from 'lucide-react';
import { api } from '../services/api';
import {
  DoubtRequestItem,
  LearningRequestItem,
  UserProfile,
} from '../types';
import { UserAvatar } from '../components/UserAvatar';

export function AiAgentPage() {
  const navigate = useNavigate();

  // Doubt Input State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // Active Analyzed Doubt & Matched Peers
  const [activeDoubt, setActiveDoubt] = useState<DoubtRequestItem | null>(null);
  const [recentDoubts, setRecentDoubts] = useState<DoubtRequestItem[]>([]);

  // Learning Requests (Incoming as Mentor & Outgoing as Learner)
  const [incomingRequests, setIncomingRequests] = useState<LearningRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<LearningRequestItem[]>([]);
  const [sendingToPeerId, setSendingToPeerId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [doubtsRes, reqRes] = await Promise.all([
        api.get('/doubts'),
        api.get('/learning/requests'),
      ]);
      const list: DoubtRequestItem[] = doubtsRes.data.doubts || [];
      setRecentDoubts(list);
      if (!activeDoubt && list.length > 0) {
        setActiveDoubt(list[0]);
      }
      setIncomingRequests(reqRes.data.incoming || []);
      setOutgoingRequests(reqRes.data.outgoing || []);
    } catch {
      // ignore
    }
  }, [activeDoubt]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAskAiAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBanner(null);
    setAnalyzing(true);

    try {
      const res = await api.post('/doubts', {
        title,
        description,
        codeSnippet,
        urgency: 'High',
      });
      setActiveDoubt(res.data.doubt);
      setTitle('');
      setDescription('');
      setCodeSnippet('');
      await loadData();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'AI Agent failed to analyze doubt.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendRequestToPeer = async (peer: UserProfile) => {
    if (!activeDoubt) return;
    setSendingToPeerId(peer._id);
    setBanner(null);

    try {
      await api.post('/learning/requests', {
        mentorId: peer._id,
        doubtRequestId: activeDoubt._id,
        topic: activeDoubt.title,
        message: `Hi ${peer.name}! I asked the AI Agent about "${activeDoubt.title}" and your skills matched. Can we connect for a 1-on-1 video & chat session?`,
        proposedTime: 'Right Now (Live)',
        roleMode: 'learner-to-mentor',
      });
      await loadData();
      setBanner({
        type: 'success',
        text: `1-on-1 learning request sent to ${peer.name}! Once accepted, your video & chat room will open.`,
      });
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        text:
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Could not send request.',
      });
    } finally {
      setSendingToPeerId(null);
    }
  };

  const handleRespondToRequest = async (
    requestId: string,
    decision: 'Accepted' | 'Rejected'
  ) => {
    setRespondingId(requestId);
    setBanner(null);
    try {
      const res = await api.patch(`/learning/requests/${requestId}/respond`, {
        decision,
      });
      await loadData();
      if (decision === 'Accepted' && res.data.session?._id) {
        navigate(`/chats?sessionId=${res.data.session._id}`);
      }
    } catch {
      setBanner({ type: 'error', text: 'Could not update request status.' });
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2.5">
          <Bot className="w-6 h-6 text-blue-600" />
          AI Agent — Doubt Analysis & Live Peer Matching
        </h1>
        <p className="text-sm text-slate-600">
          Ask your technical or subject doubt. The AI Agent extracts required skills, matches suitable peers who are available right now, and lets you send or accept 1-on-1 video & chat session requests.
        </p>
      </div>

      {banner && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            banner.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{banner.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Ask Doubt to AI Agent & Matched Available Peers (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleAskAiAgent}
            className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-slate-900 font-display">
              1. Ask a Doubt to the AI Agent
            </h2>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="agent-title"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Doubt Topic / Subject Question
              </label>
              <input
                id="agent-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Need help with Python recursion / React state hooks / SQL joins"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="agent-desc"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Explain Your Doubt in Detail
              </label>
              <textarea
                id="agent-desc"
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what problem you are facing and what concept you want a peer to explain..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="agent-code"
                className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
              >
                <Code2 className="w-3.5 h-3.5 text-slate-500" />
                Optional Code Snippet or Error Log
              </label>
              <textarea
                id="agent-code"
                rows={2}
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="Paste code snippet if applicable..."
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-900 text-slate-100 rounded-lg border border-slate-700 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={analyzing}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              {analyzing
                ? 'AI Agent Extracting Skills & Searching Available Peers...'
                : 'Analyze Doubt & Find Available Peers Now'}
            </button>
          </form>

          {/* AI Agent Match Results */}
          {activeDoubt && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-xs font-semibold text-blue-700">
                    AI Agent Analysis Result
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {activeDoubt.title}
                  </h3>
                </div>
                {recentDoubts.length > 1 && (
                  <select
                    value={activeDoubt._id}
                    onChange={(e) => {
                      const found = recentDoubts.find(
                        (d) => d._id === e.target.value
                      );
                      if (found) setActiveDoubt(found);
                    }}
                    className="px-2.5 py-1 text-xs rounded-md border border-slate-300 bg-white"
                  >
                    {recentDoubts.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-blue-50/60 p-3.5 rounded-lg border border-blue-200">
                {activeDoubt.aiAnalysisSummary}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">
                  Matched Skills Extracted:
                </span>
                {activeDoubt.extractedTopics.map((t) => (
                  <span key={t} className="font-medium text-blue-700">
                    {t} ·
                  </span>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-slate-900">
                  2. Suitable Available Peers ({activeDoubt.matchedPeers?.length || 0})
                </h4>

                {activeDoubt.matchedPeers && activeDoubt.matchedPeers.length > 0 ? (
                  <div className="space-y-3">
                    {activeDoubt.matchedPeers.map((match, i) => {
                      const peer = match.peer;
                      if (!peer) return null;
                      const alreadyRequested = outgoingRequests.some(
                        (r) =>
                          r.mentor?._id === peer._id &&
                          r.status === 'Pending'
                      );

                      return (
                        <div
                          key={peer._id || i}
                          className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                name={peer.name}
                                avatarUrl={peer.avatarUrl}
                                size="md"
                              />
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900">
                                    {peer.name}
                                  </span>
                                  <span className="text-xs font-mono font-bold text-blue-600">
                                    {match.matchScore}% Match
                                  </span>
                                  <span className="text-xs text-emerald-700 font-medium">
                                    · {peer.availability?.status || 'Available'}
                                  </span>
                                  {peer.stats?.ratingCount > 0 && (
                                    <span className="text-xs text-amber-700 inline-flex items-center gap-0.5 font-mono">
                                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                      {peer.stats.averageRating.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">
                                  {peer.academicDetails?.institution} ·{' '}
                                  {peer.academicDetails?.major} (
                                  {peer.academicDetails?.yearOfStudy}) · Role:{' '}
                                  {peer.targetCareerRole}
                                </p>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600">
                              <strong className="text-slate-800">Skills: </strong>
                              {(peer.competencies || [])
                                .map(
                                  (c) =>
                                    `${c.skillName}${
                                      c.isVerified
                                        ? ` (${c.verifiedScore || 80}% Verified)`
                                        : ''
                                    }`
                                )
                                .join(' · ') || 'Registered Student'}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={
                              sendingToPeerId === peer._id || alreadyRequested
                            }
                            onClick={() => handleSendRequestToPeer(peer)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {alreadyRequested
                              ? 'Request Sent'
                              : sendingToPeerId === peer._id
                              ? 'Sending...'
                              : 'Send Request'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800">
                      No other students have registered yet in this clean workspace.
                    </p>
                    <p>
                      Because the database starts completely clean with zero pre-populated accounts, open another browser tab or sign out and register a second student account with matching skills to test live peer-to-peer matching!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Incoming & Outgoing Peer Requests (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Incoming Requests for You to Accept */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-display">
              3. Incoming Peer Doubt Requests ({incomingRequests.length})
            </h2>
            <p className="text-xs text-slate-500">
              When another student’s doubt matches your skills, accept their request here to launch a 1-on-1 video & chat session.
            </p>

            {incomingRequests.length > 0 ? (
              <div className="space-y-3">
                {incomingRequests.map((req) => (
                  <div
                    key={req._id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        From: {req.learner?.name}
                      </span>
                      <span className="text-xs font-semibold text-blue-700">
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                      Topic: {req.topic}
                    </p>
                    <p className="text-xs text-slate-600">“{req.message}”</p>

                    {req.status === 'Pending' && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={respondingId === req._id}
                          onClick={() =>
                            handleRespondToRequest(req._id, 'Accepted')
                          }
                          className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Accept & Start 1-on-1 Video/Chat
                        </button>
                        <button
                          type="button"
                          disabled={respondingId === req._id}
                          onClick={() =>
                            handleRespondToRequest(req._id, 'Rejected')
                          }
                          className="py-2 px-3 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    )}

                    {req.status === 'Accepted' && req.sessionId && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/chats?sessionId=${req.sessionId}`)
                        }
                        className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Open Connected 1-on-1 Video & Chat Room
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">
                No incoming requests right now.
              </p>
            )}
          </div>

          {/* Outgoing Requests You Sent */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-display">
              4. Outgoing Requests You Sent ({outgoingRequests.length})
            </h2>

            {outgoingRequests.length > 0 ? (
              <div className="space-y-3">
                {outgoingRequests.map((req) => (
                  <div
                    key={req._id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">
                        To Peer: {req.mentor?.name}
                      </span>
                      <span
                        className={`font-semibold ${
                          req.status === 'Accepted'
                            ? 'text-emerald-700'
                            : req.status === 'Rejected'
                            ? 'text-red-600'
                            : 'text-amber-700'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">Topic: {req.topic}</p>

                    {req.status === 'Pending' && (
                      <p className="text-xs text-amber-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Waiting for {req.mentor?.name} to accept...
                      </p>
                    )}

                    {(req.status === 'Accepted' || req.status === 'Completed') &&
                      req.sessionId && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/chats?sessionId=${req.sessionId}`)
                          }
                          className="w-full mt-1 py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Join Connected 1-on-1 Chat & Video Session
                        </button>
                      )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">
                You haven’t sent any learning requests yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
