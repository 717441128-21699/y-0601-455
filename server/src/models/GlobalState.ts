import { Schema, model, Document } from 'mongoose';

export interface IGlobalState extends Document {
  key: string;
  candyFestival: {
    active: boolean;
    startedAt?: Date;
    endsAt?: Date;
    critBonus: number;
    triggeredBy?: string;
    tradeId?: string;
  };
  dailyContestId?: string;
  lastReportWeek?: string;
  serverStats: {
    onlinePlayers: number;
    candiesToday: number;
    contestsToday: number;
    tradesToday: number;
  };
  lastUpdated: Date;
}

const GlobalStateSchema = new Schema<IGlobalState>({
  key: { type: String, default: 'global', unique: true },
  candyFestival: {
    active: { type: Boolean, default: false },
    startedAt: { type: Date },
    endsAt: { type: Date },
    critBonus: { type: Number, default: 0.3 },
    triggeredBy: { type: String },
    tradeId: { type: String },
  },
  dailyContestId: { type: String },
  lastReportWeek: { type: String },
  serverStats: {
    onlinePlayers: { type: Number, default: 0 },
    candiesToday: { type: Number, default: 0 },
    contestsToday: { type: Number, default: 0 },
    tradesToday: { type: Number, default: 0 },
  },
  lastUpdated: { type: Date, default: Date.now },
});

export const GlobalState = model<IGlobalState>('GlobalState', GlobalStateSchema);
