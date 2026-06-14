import { Schema, model, Document, Types } from 'mongoose';
import { ContestStatus, CONTEST_STATUS } from '../config/constants';

export interface JuryMember {
  name: string;
  avatar: string;
  bias: Record<string, number>;
  strictness: number;
}

export interface ContestParticipant {
  playerId: Types.ObjectId;
  candyId: Types.ObjectId;
  submittedAt: Date;
  juryScores: number[];
  audienceLove: number;
  boostCount: number;
  decorationCount: number;
  totalScore: number;
  rank?: number;
  reward?: {
    points: number;
    gold: number;
    recipeId?: Types.ObjectId;
  };
}

export interface IContest extends Document {
  title: string;
  description: string;
  theme: string;
  status: ContestStatus;
  startTime: Date;
  endTime: Date;
  submissionDeadline: Date;
  maxParticipants: number;
  participants: ContestParticipant[];
  jury: JuryMember[];
  audienceSize: number;
  audienceNoise: number[];
  scoringWeights: {
    jury: number;
    audience: number;
    quality: number;
  };
  rewards: {
    ranks: Record<string, { points: number; gold: number; recipeBlueprint?: string }>;
    participation: { points: number; gold: number };
  };
  prizePool: number;
  currentRound: number;
  totalRounds: number;
  scoreHistory: Array<{
    timestamp: Date;
    scores: Record<string, number>;
  }>;
  events: Array<{
    timestamp: Date;
    type: string;
    playerId?: Types.ObjectId;
    message: string;
  }>;
  createdAt: Date;
}

const JuryMemberSchema = new Schema({
  name: { type: String, required: true },
  avatar: { type: String, default: '👨‍🍳' },
  bias: { type: Map, of: Number, default: {} },
  strictness: { type: Number, default: 0.5, min: 0, max: 1 },
});

const ContestParticipantSchema = new Schema({
  playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  candyId: { type: Schema.Types.ObjectId, ref: 'Candy', required: true },
  submittedAt: { type: Date, default: Date.now },
  juryScores: { type: [Number], default: [] },
  audienceLove: { type: Number, default: 0 },
  boostCount: { type: Number, default: 0 },
  decorationCount: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  rank: { type: Number },
  reward: {
    points: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    recipeId: { type: Schema.Types.ObjectId, ref: 'Recipe' },
  },
});

const ContestSchema = new Schema<IContest>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  theme: { type: String, required: true },
  status: { type: String, enum: CONTEST_STATUS, default: 'scheduled', index: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  submissionDeadline: { type: Date, required: true },
  maxParticipants: { type: Number, default: 100 },
  participants: { type: [ContestParticipantSchema], default: [] },
  jury: { type: [JuryMemberSchema], required: true },
  audienceSize: { type: Number, default: 1000 },
  audienceNoise: { type: [Number], default: [] },
  scoringWeights: {
    jury: { type: Number, default: 0.5 },
    audience: { type: Number, default: 0.3 },
    quality: { type: Number, default: 0.2 },
  },
  rewards: {
    ranks: { type: Map, of: Schema.Types.Mixed, default: {} },
    participation: { points: { type: Number, default: 10 }, gold: { type: Number, default: 50 } },
  },
  prizePool: { type: Number, default: 5000 },
  currentRound: { type: Number, default: 0 },
  totalRounds: { type: Number, default: 3 },
  scoreHistory: {
    type: [{
      timestamp: { type: Date, default: Date.now },
      scores: { type: Map, of: Number, default: {} },
    }],
    default: [],
  },
  events: {
    type: [{
      timestamp: { type: Date, default: Date.now },
      type: { type: String, required: true },
      playerId: { type: Schema.Types.ObjectId, ref: 'Player' },
      message: { type: String, required: true },
    }],
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
});

export const Contest = model<IContest>('Contest', ContestSchema);
