import { Schema, model, Document, Types } from 'mongoose';

export interface GuildMember {
  playerId: Types.ObjectId;
  role: 'leader' | 'officer' | 'member';
  joinedAt: Date;
  weeklyContribution: number;
  totalContribution: number;
}

export interface GuildUpgrade {
  level: number;
  bonusType: string;
  bonusValue: number;
  unlocked: boolean;
}

export interface IGuild extends Document {
  name: string;
  description: string;
  emblem: string;
  leaderId: Types.ObjectId;
  members: GuildMember[];
  level: number;
  exp: number;
  gold: number;
  materialsBank: Record<string, number>;
  jointWorkshopLevel: number;
  honeyFarmLevel: number;
  upgrades: GuildUpgrade[];
  bonuses: {
    successRateBonus: number;
    materialYieldBonus: number;
    critRateBonus: number;
  };
  totalContestsWon: number;
  createdAt: Date;
}

const GuildMemberSchema = new Schema({
  playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  role: { type: String, enum: ['leader', 'officer', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
  weeklyContribution: { type: Number, default: 0 },
  totalContribution: { type: Number, default: 0 },
});

const GuildUpgradeSchema = new Schema({
  level: { type: Number, required: true },
  bonusType: { type: String, required: true },
  bonusValue: { type: Number, required: true },
  unlocked: { type: Boolean, default: false },
});

const GuildSchema = new Schema<IGuild>({
  name: { type: String, required: true, unique: true, index: true },
  description: { type: String, default: '' },
  emblem: { type: String, default: '🏰' },
  leaderId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  members: { type: [GuildMemberSchema], default: [] },
  level: { type: Number, default: 1, min: 1 },
  exp: { type: Number, default: 0 },
  gold: { type: Number, default: 0 },
  materialsBank: { type: Map, of: Number, default: {} },
  jointWorkshopLevel: { type: Number, default: 1, min: 1 },
  honeyFarmLevel: { type: Number, default: 1, min: 1 },
  upgrades: { type: [GuildUpgradeSchema], default: [] },
  bonuses: {
    successRateBonus: { type: Number, default: 0 },
    materialYieldBonus: { type: Number, default: 0 },
    critRateBonus: { type: Number, default: 0 },
  },
  totalContestsWon: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Guild = model<IGuild>('Guild', GuildSchema);
