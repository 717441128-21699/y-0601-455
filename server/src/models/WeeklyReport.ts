import { Schema, model, Document } from 'mongoose';

export interface MaterialUsageHeatmap {
  hour: number;
  weekday: number;
  counts: Record<string, number>;
}

export interface ScorePoint {
  timestamp: number;
  contestId: string;
  participantId: string;
  score: number;
}

export interface TradePricePoint {
  date: string;
  itemKey: string;
  avgPrice: number;
  volume: number;
  high: number;
  low: number;
}

export interface WeeklyReport extends Document {
  weekStart: Date;
  weekEnd: Date;
  totalCandiesMade: number;
  totalContests: number;
  totalTrades: number;
  totalTradeVolume: number;
  materialUsageHeatmap: MaterialUsageHeatmap[];
  contestScoreCurves: ScorePoint[];
  tradePriceTrends: TradePricePoint[];
  topMaterials: Array<{ materialId: string; name: string; usage: number }>;
  topCandies: Array<{ candyName: string; creator: string; score: number }>;
  topPlayers: Array<{ playerId: string; nickname: string; score: number; category: string }>;
  generatedAt: Date;
}

const MaterialUsageHeatmapSchema = new Schema({
  hour: { type: Number, required: true },
  weekday: { type: Number, required: true },
  counts: { type: Map, of: Number, default: {} },
});

const ScorePointSchema = new Schema({
  timestamp: { type: Number, required: true },
  contestId: { type: String, required: true },
  participantId: { type: String, required: true },
  score: { type: Number, required: true },
});

const TradePricePointSchema = new Schema({
  date: { type: String, required: true },
  itemKey: { type: String, required: true },
  avgPrice: { type: Number, required: true },
  volume: { type: Number, required: true },
  high: { type: Number, required: true },
  low: { type: Number, required: true },
});

const WeeklyReportSchema = new Schema<WeeklyReport>({
  weekStart: { type: Date, required: true, index: true },
  weekEnd: { type: Date, required: true },
  totalCandiesMade: { type: Number, default: 0 },
  totalContests: { type: Number, default: 0 },
  totalTrades: { type: Number, default: 0 },
  totalTradeVolume: { type: Number, default: 0 },
  materialUsageHeatmap: { type: [MaterialUsageHeatmapSchema], default: [] },
  contestScoreCurves: { type: [ScorePointSchema], default: [] },
  tradePriceTrends: { type: [TradePricePointSchema], default: [] },
  topMaterials: { type: [{ materialId: String, name: String, usage: Number }], default: [] },
  topCandies: { type: [{ candyName: String, creator: String, score: Number }], default: [] },
  topPlayers: { type: [{ playerId: String, nickname: String, score: Number, category: String }], default: [] },
  generatedAt: { type: Date, default: Date.now },
});

export const WeeklyReport = model<WeeklyReport>('WeeklyReport', WeeklyReportSchema);
