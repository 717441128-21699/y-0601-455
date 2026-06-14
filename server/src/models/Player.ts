import { Schema, model, Document, Types } from 'mongoose';
import { ApprenticeRank, APPRENTICE_RANKS } from '../config/constants';

export interface PlayerSkills {
  taste: number;
  technique: number;
  creativity: number;
}

export interface IPlayer extends Document {
  username: string;
  email: string;
  password: string;
  nickname: string;
  avatar: string;
  level: number;
  exp: number;
  gold: number;
  points: number;
  collectionScore: number;
  contestScore: number;
  guildContribution: number;
  guildId?: Types.ObjectId;
  isChief: boolean;
  apprenticeRank: ApprenticeRank;
  skills: PlayerSkills;
  proficiency: Record<string, number>;
  createdAt: Date;
  lastLoginAt: Date;
}

const PlayerSkillsSchema = new Schema({
  taste: { type: Number, default: 10, min: 0, max: 100 },
  technique: { type: Number, default: 10, min: 0, max: 100 },
  creativity: { type: Number, default: 10, min: 0, max: 100 },
});

const PlayerSchema = new Schema<IPlayer>({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  nickname: { type: String, required: true },
  avatar: { type: String, default: '🍬' },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  gold: { type: Number, default: 1000 },
  points: { type: Number, default: 0 },
  collectionScore: { type: Number, default: 0, index: true },
  contestScore: { type: Number, default: 0, index: true },
  guildContribution: { type: Number, default: 0, index: true },
  guildId: { type: Schema.Types.ObjectId, ref: 'Guild' },
  isChief: { type: Boolean, default: false },
  apprenticeRank: { type: String, enum: APPRENTICE_RANKS, default: 'novice' },
  skills: { type: PlayerSkillsSchema, required: true },
  proficiency: { type: Map, of: Number, default: {} },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now },
});

export const Player = model<IPlayer>('Player', PlayerSchema);
