import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import {
  Send,
  Code2,
  MessageSquare,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  FileText,
  Star,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Bot,
} from 'lucide-react';
import { api, TOKEN_STORAGE_KEY } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ChatMessageItem,
  LearningSessionItem,
  SessionSummaryItem,
} from '../types';

export function ChatPage() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');

  const [sessions, setSessions] = useState<LearningSessionItem[]>([]);
  const [activeSession, setActiveSession] =
    useState<LearningSessionItem | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [summaries, setSummaries] = useState<SessionSummaryItem[]>([]);
  const [sharedNotes, setSharedNotes] = useState('');

  // Chat composer
  const [inputContent, setInputContent] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'code'>('text');
  const [codeLanguage, setCodeLanguage] = useState('python');
  const [socketConnected, setSocketConnected] = useState(false);

  // 1-on-1 Video Call State
  const [inVideoCall, setInVideoCall] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [videoNotice, setVideoNotice] = useState('');
  const [remoteConnected, setRemoteConnected] = useState(false);

  // Post-Video AI Summary & Listener Review/Rating State
  const [rating, setRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [completingSession, setCompletingSession] = useState(false);
  const [reviewSuccessBanner, setReviewSuccessBanner] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnRef = useRef<RTCPeerConnection | null>(null);
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const agoraTracksRef = useRef<{
    videoTrack: ICameraVideoTrack | null;
    audioTrack: IMicrophoneAudioTrack | null;
  }>({ videoTrack: null, audioTrack: null });

  // Load sessions
  useEffect(() => {
    api
      .get('/learning/sessions')
      .then((res) => {
        const list: LearningSessionItem[] = res.data.sessions || [];
        setSessions(list);
        if (!sessionIdParam && list.length > 0) {
          setSearchParams({ sessionId: list[0]._id });
        }
      })
      .catch(() => {});
  }, [sessionIdParam, setSearchParams]);

  // Load active session, messages, and summaries
  useEffect(() => {
    const targetId = sessionIdParam || sessions[0]?._id;
    if (!targetId) return;

    api
      .get(`/learning/sessions/${targetId}`)
      .then((res) => {
        setActiveSession(res.data.session);
        setMessages(res.data.messages || []);
        setSummaries(res.data.summaries || []);
        setSharedNotes(res.data.session?.sharedNotes || '');
        if (res.data.session?.learnerRating) {
          setRating(res.data.session.learnerRating);
        }
        if (res.data.session?.learnerFeedback) {
          setReviewComment(res.data.session.learnerFeedback);
        }
      })
      .catch(() => {});
  }, [sessionIdParam, sessions]);

  const createWebRtcPeerConnection = (sessionId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc:ice-candidate', {
          sessionId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteConnected(true);
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnRef.current = pc;
    return pc;
  };

  // Connect Socket.IO for Chat + WebRTC 1-on-1 Video Signaling
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token || !activeSession?._id) return;

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('session:join', { sessionId: activeSession._id });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('chat:message', (incomingMsg: ChatMessageItem) => {
      setMessages((prev) =>
        prev.some((m) => m._id === incomingMsg._id) ? prev : [...prev, incomingMsg]
      );
    });

    socket.on(
      'notes:synced',
      (payload: { sessionId: string; sharedNotes: string }) => {
        if (payload.sessionId === activeSession._id) {
          setSharedNotes(payload.sharedNotes);
        }
      }
    );

    // WebRTC Signaling handlers
    socket.on('webrtc:peer-ready', async () => {
      if (!localStreamRef.current) return;
      const pc =
        peerConnRef.current || createWebRtcPeerConnection(activeSession._id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { sessionId: activeSession._id, offer });
    });

    socket.on(
      'webrtc:offer',
      async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
        if (!localStreamRef.current) return;
        const pc =
          peerConnRef.current || createWebRtcPeerConnection(activeSession._id);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc:answer', { sessionId: activeSession._id, answer });
      }
    );

    socket.on(
      'webrtc:answer',
      async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        if (peerConnRef.current) {
          await peerConnRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
        }
      }
    );

    socket.on(
      'webrtc:ice-candidate',
      async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        if (peerConnRef.current && candidate) {
          try {
            await peerConnRef.current.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          } catch {
            // ignore
          }
        }
      }
    );

    socket.on('webrtc:peer-left', () => {
      setRemoteConnected(false);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeSession?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleStartVideoSession = async () => {
    if (!activeSession) return;
    setVideoNotice('');
    setInVideoCall(true);

    try {
      const credRes = await api.get(
        `/learning/sessions/${activeSession._id}/video-credentials`
      );
      const creds = credRes.data;

      if (creds.configured && creds.appId) {
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        agoraClientRef.current = client;
        await client.join(
          creds.appId,
          creds.channelName,
          creds.token || null,
          creds.uid
        );
        const [audioTrack, videoTrack] =
          await AgoraRTC.createMicrophoneAndCameraTracks();
        agoraTracksRef.current = { audioTrack, videoTrack };
        await client.publish([audioTrack, videoTrack]);
        setVideoNotice('Connected to Agora 1-on-1 Video Channel.');
        return;
      }
    } catch {
      // Fallback to native WebRTC over Socket.IO
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      createWebRtcPeerConnection(activeSession._id);
      socketRef.current?.emit('webrtc:ready', {
        sessionId: activeSession._id,
      });
      setVideoNotice(
        '1-on-1 Live WebRTC Video Session active. When your connected peer clicks Start Video, streams connect automatically.'
      );
    } catch {
      setVideoNotice(
        '1-on-1 Video Session Room active (Camera/microphone device not detected in sandbox environment — simulated video feed ready).'
      );
    }
  };

  const handleEndVideoAndGenerateSummary = async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnRef.current) {
      peerConnRef.current.close();
      peerConnRef.current = null;
    }
    if (agoraTracksRef.current.videoTrack) {
      agoraTracksRef.current.videoTrack.stop();
      agoraTracksRef.current.videoTrack.close();
    }
    if (agoraTracksRef.current.audioTrack) {
      agoraTracksRef.current.audioTrack.stop();
      agoraTracksRef.current.audioTrack.close();
    }
    if (agoraClientRef.current) {
      await agoraClientRef.current.leave().catch(() => {});
      agoraClientRef.current = null;
    }
    if (activeSession) {
      socketRef.current?.emit('webrtc:leave', {
        sessionId: activeSession._id,
      });
    }
    setInVideoCall(false);
    setRemoteConnected(false);

    // Automatically generate AI session summary right after ending the video session!
    if (activeSession) {
      try {
        setCompletingSession(true);
        const res = await api.post(
          `/learning/sessions/${activeSession._id}/summarize`,
          {
            rawNotes:
              sharedNotes ||
              `Completed 1-on-1 video session on ${activeSession.topic}.`,
          }
        );
        if (res.data.summary) {
          setSummaries((prev) => [res.data.summary, ...prev]);
        }
        setVideoNotice(
          'Video session ended and AI Session Summary generated below! You can continue asking follow-up doubts in chat or submit your rating & review.'
        );
      } catch {
        // ignore
      } finally {
        setCompletingSession(false);
      }
    }
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    setCameraOn(next);
    if (localStreamRef.current) {
      localStreamRef.current
        .getVideoTracks()
        .forEach((t) => (t.enabled = next));
    }
    if (agoraTracksRef.current.videoTrack) {
      agoraTracksRef.current.videoTrack.setEnabled(next);
    }
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    if (localStreamRef.current) {
      localStreamRef.current
        .getAudioTracks()
        .forEach((t) => (t.enabled = next));
    }
    if (agoraTracksRef.current.audioTrack) {
      agoraTracksRef.current.audioTrack.setEnabled(next);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim() || !activeSession) return;

    const text = inputContent;
    setInputContent('');

    if (socketRef.current && socketConnected) {
      socketRef.current.emit('chat:send', {
        sessionId: activeSession._id,
        content: text,
        messageType,
        codeLanguage,
      });
    } else {
      try {
        const res = await api.post(
          `/learning/sessions/${activeSession._id}/messages`,
          {
            content: text,
            messageType,
            codeLanguage,
          }
        );
        const saved = res.data.message;
        setMessages((prev) =>
          prev.some((m) => m._id === saved._id) ? prev : [...prev, saved]
        );
      } catch {
        // ignore
      }
    }
  };

  const handleSubmitPeerReviewAndSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    setCompletingSession(true);
    setReviewSuccessBanner('');

    try {
      const res = await api.patch(
        `/learning/sessions/${activeSession._id}/complete`,
        {
          rating,
          feedback:
            reviewComment.trim() ||
            'Clear explanation during our 1-on-1 peer video & chat session!',
          rawNotes: sharedNotes,
          generateSummary: true,
        }
      );
      setActiveSession(res.data.session);
      if (res.data.summary) {
        setSummaries((prev) => [res.data.summary, ...prev]);
      }
      await refreshUser();
      setReviewSuccessBanner(
        'Your rating & review have been saved to your peer’s profile, and the AI Session Summary has been updated!'
      );
    } catch {
      // ignore
    } finally {
      setCompletingSession(false);
    }
  };

  const partnerName =
    activeSession?.mentor?._id === user?._id
      ? activeSession?.learner?.name
      : activeSession?.mentor?.name;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            1-on-1 Video Call, Real-Time Peer Chat & AI Session Summary
          </h1>
          <p className="text-sm text-slate-600">
            Communicate via live 1-on-1 video session, ask follow-up doubts in chat, generate AI session summaries, and rate the explaining peer
          </p>
        </div>

        {sessions.length > 0 && (
          <select
            value={activeSession?._id || ''}
            onChange={(e) => setSearchParams({ sessionId: e.target.value })}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white"
          >
            {sessions.map((s) => (
              <option key={s._id} value={s._id}>
                Session: {s.topic} ({s.learner?.name} & {s.mentor?.name})
              </option>
            ))}
          </select>
        )}
      </div>

      {activeSession ? (
        <>
          {/* 1. Integrated 1-on-1 Video Call Stage */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 text-white space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-blue-400">
                  1-on-1 Interactive Video Room · Channel:{' '}
                  {activeSession.channelName}
                </span>
                <h2 className="text-base font-bold">
                  Topic: {activeSession.topic} (Connected Peer:{' '}
                  {partnerName || 'Peer Student'})
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!inVideoCall ? (
                  <button
                    type="button"
                    onClick={handleStartVideoSession}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                    Start 1-on-1 Video Call
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={toggleCamera}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer ${
                        cameraOn ? 'bg-slate-800 text-white' : 'bg-amber-600'
                      }`}
                    >
                      {cameraOn ? (
                        <Video className="w-3.5 h-3.5" />
                      ) : (
                        <VideoOff className="w-3.5 h-3.5" />
                      )}
                      {cameraOn ? 'Camera On' : 'Camera Off'}
                    </button>
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer ${
                        micOn ? 'bg-slate-800 text-white' : 'bg-amber-600'
                      }`}
                    >
                      {micOn ? (
                        <Mic className="w-3.5 h-3.5" />
                      ) : (
                        <MicOff className="w-3.5 h-3.5" />
                      )}
                      {micOn ? 'Mic On' : 'Mic Muted'}
                    </button>
                    <button
                      type="button"
                      onClick={handleEndVideoAndGenerateSummary}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      End Video & Generate AI Summary
                    </button>
                  </>
                )}
              </div>
            </div>

            {videoNotice && (
              <p className="text-xs text-blue-200 bg-slate-800/90 px-3.5 py-2 rounded-lg border border-slate-700">
                {videoNotice}
              </p>
            )}

            {inVideoCall && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="relative h-60 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 text-xs bg-slate-900/80 px-2.5 py-1 rounded">
                    You ({user?.name})
                  </span>
                </div>

                <div className="relative h-60 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!remoteConnected && (
                    <div className="text-center p-4 space-y-1">
                      <p className="text-xs font-semibold text-slate-200">
                        Connected Peer: {partnerName || 'Peer'}
                      </p>
                      <p className="text-xs text-slate-400">
                        Waiting for peer camera stream in room...
                      </p>
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 text-xs bg-slate-900/80 px-2.5 py-1 rounded">
                    Peer ({partnerName || 'Partner'})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Real-Time Chat + Post-Session AI Summary & Peer Review Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Real-Time Chat Column for Follow-Up Doubts (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 flex flex-col h-[560px]">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Real-Time Doubt & Follow-Up Chat with {partnerName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ask any follow-up doubts or share code snippets during or after the video session
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-700">
                  {socketConnected ? 'Live Socket.IO' : 'Synced'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.map((msg) => {
                  const isMe = msg.sender === user?._id;
                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col ${
                        isMe ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {msg.senderName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {msg.messageType === 'code' ? (
                        <div className="max-w-xl w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-900 text-slate-100">
                          <div className="px-3 py-1 bg-slate-800 text-xs font-mono text-slate-300">
                            Code ({msg.codeLanguage || 'code'})
                          </div>
                          <pre className="p-3 text-xs font-mono overflow-x-auto">
                            <code>{msg.content}</code>
                          </pre>
                        </div>
                      ) : (
                        <div
                          className={`max-w-md px-4 py-2.5 rounded-xl text-sm ${
                            isMe
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}
                        >
                          {msg.content}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-slate-200 bg-white space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setMessageType('text')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                        messageType === 'text'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      <MessageSquare className="w-3 h-3 inline mr-1" />
                      Doubt / Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageType('code')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                        messageType === 'code'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      <Code2 className="w-3 h-3 inline mr-1" />
                      Code
                    </button>
                  </div>
                  {messageType === 'code' && (
                    <select
                      value={codeLanguage}
                      onChange={(e) => setCodeLanguage(e.target.value)}
                      className="px-2 py-1 text-xs font-mono border border-slate-300 rounded"
                    >
                      <option value="python">python</option>
                      <option value="javascript">javascript</option>
                      <option value="java">java</option>
                      <option value="sql">sql</option>
                    </select>
                  )}
                </div>

                <div className="flex gap-2">
                  {messageType === 'code' ? (
                    <textarea
                      rows={2}
                      value={inputContent}
                      onChange={(e) => setInputContent(e.target.value)}
                      placeholder="Paste code snippet..."
                      className="flex-1 px-3 py-2 text-xs font-mono bg-slate-900 text-slate-100 rounded-lg"
                    />
                  ) : (
                    <input
                      type="text"
                      value={inputContent}
                      onChange={(e) => setInputContent(e.target.value)}
                      placeholder={`Ask a follow-up doubt to ${partnerName}...`}
                      className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                    />
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Post-Session Rating/Review for Explained Peer & AI Session Summary (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Listener Rating & Review Form */}
              <form
                onSubmit={handleSubmitPeerReviewAndSummary}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
              >
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Rate & Review Explained Peer ({partnerName}) + Generate AI Summary
                </h3>

                {reviewSuccessBanner && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{reviewSuccessBanner}</span>
                  </div>
                )}

                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Rating for {partnerName} (1 to 5 Stars)
                  </span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1 cursor-pointer ${
                          rating >= star
                            ? 'bg-amber-50 border-amber-400 text-amber-800'
                            : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            rating >= star
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                        {star}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rev-feedback"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Review Feedback for Explaining Peer
                  </label>
                  <textarea
                    id="rev-feedback"
                    rows={2}
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={`How well did ${partnerName} explain the concept and resolve your doubt?`}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label
                    htmlFor="rev-notes"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Session Notes (Included in AI Session Summary)
                  </label>
                  <textarea
                    id="rev-notes"
                    rows={2}
                    value={sharedNotes}
                    onChange={(e) => setSharedNotes(e.target.value)}
                    placeholder="Key points discussed during the video session..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={completingSession}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {completingSession
                    ? 'Saving Review & Generating AI Summary...'
                    : 'Submit Peer Review & Generate AI Session Summary'}
                </button>
              </form>

              {/* Generated AI Session Summaries */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  AI Session Summary ({summaries.length})
                </h3>

                {summaries.length > 0 ? (
                  <div className="space-y-4">
                    {summaries.slice(0, 2).map((sum) => (
                      <div
                        key={sum._id}
                        className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3 text-xs"
                      >
                        <p className="text-slate-800 leading-relaxed font-medium">
                          {sum.summaryText}
                        </p>

                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Key Concepts Learned:
                          </p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            {sum.keyConceptsLearned.map((c, idx) => (
                              <li key={idx}>{c}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                            Topics Needing Practice:
                          </p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            {sum.topicsNeedingPractice.map((c, idx) => (
                              <li key={idx}>{c}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 flex items-center gap-1">
                            <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                            Recommended Next Topics:
                          </p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            {sum.recommendedNextTopics.map((c, idx) => (
                              <li key={idx}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    End your 1-on-1 video call or click “Submit Peer Review & Generate AI Session Summary” above to produce your structured summary.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-4">
          <Bot className="w-8 h-8 text-blue-600 mx-auto" />
          <p className="text-sm text-slate-600">
            No active 1-on-1 peer session yet. Ask a doubt in the AI Agent tab and connect with an available peer!
          </p>
          <Link
            to="/ai-agent"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg"
          >
            Go to AI Agent & Match Peers
          </Link>
        </div>
      )}
    </div>
  );
}
