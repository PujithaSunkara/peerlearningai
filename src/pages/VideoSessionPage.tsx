import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MessageSquare,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { LearningSessionItem } from '../types';

interface VideoCredentialsResponse {
  configured: boolean;
  appId: string | null;
  channelName: string;
  uid: number;
  token: string | null;
  statusMessage: string;
}

export function VideoSessionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');

  const [sessions, setSessions] = useState<LearningSessionItem[]>([]);
  const [activeSession, setActiveSession] =
    useState<LearningSessionItem | null>(null);
  const [credentials, setCredentials] =
    useState<VideoCredentialsResponse | null>(null);

  const [joined, setJoined] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [remoteUsersCount, setRemoteUsersCount] = useState(0);

  const localVideoContainerRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement | null>(null);
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const localTracksRef = useRef<{
    videoTrack: ICameraVideoTrack | null;
    audioTrack: IMicrophoneAudioTrack | null;
  }>({ videoTrack: null, audioTrack: null });
  const fallbackStreamRef = useRef<MediaStream | null>(null);

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

  useEffect(() => {
    const targetId = sessionIdParam || sessions[0]?._id;
    if (!targetId) return;

    Promise.all([
      api.get(`/learning/sessions/${targetId}`),
      api.get(`/learning/sessions/${targetId}/video-credentials`),
    ])
      .then(([sessRes, credRes]) => {
        setActiveSession(sessRes.data.session);
        setCredentials(credRes.data);
      })
      .catch(() => {});
  }, [sessionIdParam, sessions]);

  const stopAllMedia = async () => {
    try {
      if (localTracksRef.current.videoTrack) {
        localTracksRef.current.videoTrack.stop();
        localTracksRef.current.videoTrack.close();
        localTracksRef.current.videoTrack = null;
      }
      if (localTracksRef.current.audioTrack) {
        localTracksRef.current.audioTrack.stop();
        localTracksRef.current.audioTrack.close();
        localTracksRef.current.audioTrack = null;
      }
      if (agoraClientRef.current) {
        await agoraClientRef.current.leave();
        agoraClientRef.current = null;
      }
      if (fallbackStreamRef.current) {
        fallbackStreamRef.current.getTracks().forEach((t) => t.stop());
        fallbackStreamRef.current = null;
      }
    } catch {
      // ignore cleanup errors
    }
    setJoined(false);
    setRemoteUsersCount(0);
  };

  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, []);

  const handleStartSession = async () => {
    setStatusError('');
    if (!credentials) return;

    // If Agora App ID is configured on backend, connect via Agora Web SDK
    if (credentials.configured && credentials.appId) {
      try {
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        agoraClientRef.current = client;

        client.on('user-published', async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          setRemoteUsersCount(client.remoteUsers.length);
          if (mediaType === 'video' && remoteVideoContainerRef.current) {
            remoteUser.videoTrack?.play(remoteVideoContainerRef.current);
          }
          if (mediaType === 'audio') {
            remoteUser.audioTrack?.play();
          }
        });

        client.on('user-left', () => {
          setRemoteUsersCount(client.remoteUsers.length);
        });

        await client.join(
          credentials.appId,
          credentials.channelName,
          credentials.token || null,
          credentials.uid
        );

        const [audioTrack, videoTrack] =
          await AgoraRTC.createMicrophoneAndCameraTracks();
        localTracksRef.current = { audioTrack, videoTrack };

        if (localVideoContainerRef.current) {
          videoTrack.play(localVideoContainerRef.current);
        }

        await client.publish([audioTrack, videoTrack]);
        setJoined(true);
        return;
      } catch (err) {
        setStatusError(
          `Agora WebRTC connection notice: ${(err as Error).message}. Falling back to local camera preview.`
        );
      }
    }

    // Graceful fallback when AGORA_APP_ID is not configured or camera permission tested locally
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      fallbackStreamRef.current = stream;
      if (localVideoContainerRef.current) {
        localVideoContainerRef.current.innerHTML = '';
        const videoEl = document.createElement('video');
        videoEl.srcObject = stream;
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.className = 'w-full h-full object-cover rounded-lg';
        localVideoContainerRef.current.appendChild(videoEl);
      }
      setJoined(true);
    } catch {
      setJoined(true);
      setStatusError(
        'Camera/microphone device not detected or permission declined in browser sandbox. Audio/video controls remain active in simulation-safe mode.'
      );
    }
  };

  const toggleCamera = async () => {
    const nextState = !cameraOn;
    setCameraOn(nextState);
    if (localTracksRef.current.videoTrack) {
      await localTracksRef.current.videoTrack.setEnabled(nextState);
    }
    if (fallbackStreamRef.current) {
      fallbackStreamRef.current
        .getVideoTracks()
        .forEach((t) => (t.enabled = nextState));
    }
  };

  const toggleMic = async () => {
    const nextState = !micOn;
    setMicOn(nextState);
    if (localTracksRef.current.audioTrack) {
      await localTracksRef.current.audioTrack.setEnabled(nextState);
    }
    if (fallbackStreamRef.current) {
      fallbackStreamRef.current
        .getAudioTracks()
        .forEach((t) => (t.enabled = nextState));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Peer Video Mentoring Session (Agora Web SDK)
          </h1>
          <p className="text-sm text-slate-600">
            Securely authorized WebRTC video rooms with graceful configuration handling
          </p>
        </div>

        {activeSession && (
          <div className="flex items-center gap-2">
            <Link
              to={`/chat?sessionId=${activeSession._id}`}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Back to Chat
            </Link>
            <Link
              to={`/session-summaries?sessionId=${activeSession._id}`}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Complete & Summarize
            </Link>
          </div>
        )}
      </div>

      {/* Agora Configuration Status Banner */}
      {credentials && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
            credentials.configured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {credentials.configured ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-semibold">
              Channel: <code className="font-mono">{credentials.channelName}</code> ·{' '}
              {credentials.configured
                ? 'Agora RTC App ID Configured'
                : 'Agora Environment Variable Notice'}
            </p>
            <p>{credentials.statusMessage}</p>
          </div>
        </div>
      )}

      {statusError && (
        <div className="p-3.5 rounded-lg bg-slate-100 border border-slate-300 text-xs text-slate-700">
          {statusError}
        </div>
      )}

      {/* Video Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local Participant Feed */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 h-80 relative overflow-hidden flex flex-col justify-between p-4">
          <div
            ref={localVideoContainerRef}
            className="absolute inset-0 w-full h-full flex items-center justify-center"
          >
            {!joined && (
              <div className="text-center space-y-2 p-6">
                <Video className="w-8 h-8 text-blue-400 mx-auto" />
                <p className="text-sm font-semibold text-white">
                  Local Camera & Microphone Ready
                </p>
                <p className="text-xs text-slate-400">
                  Click "Join Video Session" below to initialize stream
                </p>
              </div>
            )}
          </div>

          <div className="relative z-10 mt-auto flex items-center justify-between text-xs text-white bg-slate-950/75 px-3 py-1.5 rounded-lg">
            <span>You ({activeSession?.learner?.name || 'Participant'})</span>
            <span className="font-mono">
              {cameraOn ? 'Camera On' : 'Camera Muted'} ·{' '}
              {micOn ? 'Mic On' : 'Mic Muted'}
            </span>
          </div>
        </div>

        {/* Remote Peer Feed */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 h-80 relative overflow-hidden flex flex-col justify-between p-4">
          <div
            ref={remoteVideoContainerRef}
            className="absolute inset-0 w-full h-full flex items-center justify-center"
          >
            {remoteUsersCount === 0 && (
              <div className="text-center space-y-2 p-6">
                <p className="text-sm font-semibold text-white">
                  {activeSession?.mentor?.name || 'Peer Mentor'}
                </p>
                <p className="text-xs text-slate-400">
                  {joined
                    ? 'Connected to channel · Waiting for peer stream...'
                    : 'Join channel to connect with your matched peer'}
                </p>
              </div>
            )}
          </div>

          <div className="relative z-10 mt-auto flex items-center justify-between text-xs text-white bg-slate-950/75 px-3 py-1.5 rounded-lg">
            <span>Peer Mentor ({activeSession?.mentor?.name || 'Partner'})</span>
            <span className="font-mono">
              Channel: {credentials?.channelName || 'peerconnect'}
            </span>
          </div>
        </div>
      </div>

      {/* Call Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-center gap-3">
        {!joined ? (
          <button
            type="button"
            onClick={handleStartSession}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Video className="w-4 h-4" />
            Join Video Session
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleCamera}
              className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                cameraOn
                  ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {cameraOn ? (
                <Video className="w-4 h-4" />
              ) : (
                <VideoOff className="w-4 h-4" />
              )}
              {cameraOn ? 'Mute Camera' : 'Enable Camera'}
            </button>

            <button
              type="button"
              onClick={toggleMic}
              className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                micOn
                  ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {micOn ? (
                <Mic className="w-4 h-4" />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
              {micOn ? 'Mute Mic' : 'Unmute Mic'}
            </button>

            <button
              type="button"
              onClick={stopAllMedia}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              Leave Video Room
            </button>
          </>
        )}
      </div>
    </div>
  );
}
