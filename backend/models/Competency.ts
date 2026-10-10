import mongoose, { Schema, Document } from 'mongoose';

export interface ICompetency extends Document {
  name: string;
  category: 'Programming' | 'Debugging' | 'Problem-solving' | 'Data analysis' | 'Communication';
  description: string;
  keywords: string[];
  createdAt: Date;
}

const CompetencySchema = new Schema<ICompetency>(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    category: {
      type: String,
      enum: ['Programming', 'Debugging', 'Problem-solving', 'Data analysis', 'Communication'],
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    keywords: [{ type: String }],
  },
  { timestamps: true }
);

export const Competency =
  mongoose.models.Competency || mongoose.model<ICompetency>('Competency', CompetencySchema);
