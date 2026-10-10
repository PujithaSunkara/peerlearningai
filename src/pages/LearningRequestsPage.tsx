import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Video,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { LearningRequestItem } from '../types';
import { UserAvatar } from '../components/UserAvatar';

export function LearningRequestsPage() {
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState<LearningRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<LearningRequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/learning/requests');
      setIncoming(res.data.incoming || []);
      setOutgoing(res.data.outgoing || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleRespond = async (
    requestId: string,
    decision: 'Accepted' | 'Rejected'
  ) => {
    setActionId(requestId);
    try {
      const res = await api.patch(`/learning/requests/${requestId}/respond`, {
        decision,
      });
      await loadRequests();
      if (decision === 'Accepted' && res.data.session?._id) {
        navigate(`/chat?sessionId=${res.data.session._id}`);
      }
    } catch {
      // ignore
    } finally {
      setActionId(null);
    }
  };

  const displayedList = activeTab === 'incoming' ? incoming : outgoing;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Peer Learning & Mentoring Requests
          </h1>
          <p className="text-sm text-slate-600">
            Act as a mentor by accepting incoming student requests or track your outgoing learning requests
          </p>
        </div>

        <Link
          to="/submit-doubt"
          className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 self-start whitespace-nowrap shrink-0"
        >
          <HelpCircle className="w-4 h-4" />
          New Doubt & Peer Match
        </Link>
      </div>

      {/* Role Switcher Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'incoming'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Incoming as Mentor ({incoming.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('outgoing')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'outgoing'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Outgoing as Learner ({outgoing.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
          <div className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
        </div>
      ) : displayedList.length > 0 ? (
        <div className="space-y-4">
          {displayedList.map((req) => {
            const partner = activeTab === 'incoming' ? req.learner : req.mentor;
            return (
              <div
                key={req._id}
                className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={partner?.name || 'Peer Student'}
                      avatarUrl={partner?.avatarUrl}
                      size="md"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {req.topic}
                        </h2>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="text-xs font-medium text-slate-600">
                          {activeTab === 'incoming' ? 'Learner:' : 'Mentor:'}{' '}
                          <strong className="text-slate-900">
                            {partner?.name}
                          </strong>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Proposed Time: {req.proposedTime} · Mode:{' '}
                        {req.roleMode === 'peer-collab'
                          ? 'Collaborative Pair Debugging'
                          : '1-on-1 Mentorship'}{' '}
                        · Status:{' '}
                        <strong
                          className={
                            req.status === 'Accepted'
                              ? 'text-emerald-700'
                              : req.status === 'Rejected'
                              ? 'text-red-600'
                              : 'text-amber-700'
                          }
                        >
                          {req.status}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    “{req.message}”
                  </p>
                </div>

                {/* Action Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {activeTab === 'incoming' && req.status === 'Pending' && (
                    <>
                      <button
                        type="button"
                        disabled={actionId === req._id}
                        onClick={() => handleRespond(req._id, 'Accepted')}
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Accept & Start Session
                      </button>
                      <button
                        type="button"
                        disabled={actionId === req._id}
                        onClick={() => handleRespond(req._id, 'Rejected')}
                        className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <XCircle className="w-4 h-4" />
                        Decline
                      </button>
                    </>
                  )}

                  {activeTab === 'outgoing' && req.status === 'Pending' && (
                    <span className="text-xs font-medium text-amber-700 inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 rounded-lg">
                      <Clock className="w-4 h-4" />
                      Awaiting Mentor Response
                    </span>
                  )}

                  {(req.status === 'Accepted' || req.status === 'Completed') &&
                    req.sessionId && (
                      <>
                        <Link
                          to={`/chat?sessionId=${req.sessionId}`}
                          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Open Chat
                        </Link>
                        <Link
                          to={`/video-session?sessionId=${req.sessionId}`}
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join Video
                        </Link>
                      </>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
          <p className="text-sm text-slate-600">
            No {activeTab} learning requests found.
          </p>
          <Link
            to="/peer-matches"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg"
          >
            Browse Matched Peers
          </Link>
        </div>
      )}
    </div>
  );
}
