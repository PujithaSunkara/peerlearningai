import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpRecord extends Document {
  email: string;
  otpCode: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

const OtpRecordSchema = new Schema<IOtpRecord>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpCode: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const OtpRecord =
  mongoose.models.OtpRecord || mongoose.model<IOtpRecord>('OtpRecord', OtpRecordSchema);
