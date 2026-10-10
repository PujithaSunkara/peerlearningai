import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  session: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  senderName: string;
  messageType: 'text' | 'code';
  content: string;
  codeLanguage?: string;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    session: { type: Schema.Types.ObjectId, ref: 'LearningSession', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    messageType: { type: String, enum: ['text', 'code'], default: 'text' },
    content: { type: String, required: true },
    codeLanguage: { type: String, default: 'javascript' },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ session: 1, createdAt: 1 });

export const ChatMessage =
  mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
