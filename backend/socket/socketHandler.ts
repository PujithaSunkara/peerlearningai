import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ChatMessage } from '../models/ChatMessage.js';
import { LearningSession } from '../models/LearningSession.js';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'peerconnect_ai_default_jwt_secret_2026';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

export function initializeSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = await User.findById(decoded.id).select('name');
      if (!user) {
        return next(new Error('User not found'));
      }
      socket.userId = user._id.toString();
      socket.userName = user.name;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    socket.on('session:join', async ({ sessionId }: { sessionId: string }) => {
      if (!sessionId) return;
      socket.join(`session:${sessionId}`);
      io.to(`session:${sessionId}`).emit('session:presence', {
        userId: socket.userId,
        userName: socket.userName,
        status: 'online',
      });
    });

    socket.on(
      'chat:send',
      async (payload: {
        sessionId: string;
        content: string;
        messageType?: 'text' | 'code';
        codeLanguage?: string;
      }) => {
        try {
          const { sessionId, content, messageType, codeLanguage } = payload;
          if (!sessionId || !content || !content.trim() || !socket.userId) return;

          const session = await LearningSession.findById(sessionId);
          if (!session) return;

          const savedMsg = await ChatMessage.create({
            session: session._id,
            sender: socket.userId,
            senderName: socket.userName || 'Peer Student',
            messageType: messageType === 'code' ? 'code' : 'text',
            content: content.trim(),
            codeLanguage: codeLanguage || 'javascript',
          });

          io.to(`session:${sessionId}`).emit('chat:message', savedMsg);
        } catch (err) {
          console.error('[Socket chat:send error]:', (err as Error).message);
        }
      }
    );

    socket.on(
      'notes:update',
      async (payload: { sessionId: string; sharedNotes: string }) => {
        try {
          const { sessionId, sharedNotes } = payload;
          if (!sessionId || typeof sharedNotes !== 'string') return;
          await LearningSession.findByIdAndUpdate(sessionId, { sharedNotes });
          socket.to(`session:${sessionId}`).emit('notes:synced', {
            sessionId,
            sharedNotes,
            updatedBy: socket.userName,
          });
        } catch (err) {
          console.error('[Socket notes:update error]:', (err as Error).message);
        }
      }
    );

    // WebRTC 1-on-1 Video Call Signaling Events (Offer, Answer, ICE Candidate, Call Hangup)
    socket.on('webrtc:ready', ({ sessionId }: { sessionId: string }) => {
      if (!sessionId) return;
      socket.to(`session:${sessionId}`).emit('webrtc:peer-ready', {
        userId: socket.userId,
        userName: socket.userName,
      });
    });

    socket.on(
      'webrtc:offer',
      (payload: { sessionId: string; offer: RTCSessionDescriptionInit }) => {
        if (!payload?.sessionId) return;
        socket.to(`session:${payload.sessionId}`).emit('webrtc:offer', {
          offer: payload.offer,
          fromUser: socket.userName,
        });
      }
    );

    socket.on(
      'webrtc:answer',
      (payload: { sessionId: string; answer: RTCSessionDescriptionInit }) => {
        if (!payload?.sessionId) return;
        socket.to(`session:${payload.sessionId}`).emit('webrtc:answer', {
          answer: payload.answer,
          fromUser: socket.userName,
        });
      }
    );

    socket.on(
      'webrtc:ice-candidate',
      (payload: { sessionId: string; candidate: RTCIceCandidateInit }) => {
        if (!payload?.sessionId) return;
        socket.to(`session:${payload.sessionId}`).emit('webrtc:ice-candidate', {
          candidate: payload.candidate,
        });
      }
    );

    socket.on('webrtc:leave', ({ sessionId }: { sessionId: string }) => {
      if (!sessionId) return;
      socket.to(`session:${sessionId}`).emit('webrtc:peer-left', {
        userId: socket.userId,
        userName: socket.userName,
      });
    });
  });

  return io;
}
