import { Schema, model, Document, Types } from 'mongoose';

export interface CandyMakingRecord {
  candyId: Types.ObjectId;
  recipeId?: Types.ObjectId;
  materials: Array<{ materialId: Types.ObjectId; name: string; quality: string; quantity: number }>;
  result: 'success' | 'crit' | 'fail';
  timestamp: Date;
}

export interface ContestEntryRecord {
  contestId: Types.ObjectId;
  candyId: Types.ObjectId;
  rank: number;
  score: number;
  timestamp: Date;
}

export interface IPlayerHistory extends Document {
  playerId: Types.ObjectId;
  candyMaking: CandyMakingRecord[];
  contestEntries: ContestEntryRecord[];
  trades: Array<{
    tradeId: Types.ObjectId;
    type: 'buy' | 'sell';
    itemType: 'candy' | 'recipe';
    price: number;
    timestamp: Date;
  }>;
  achievements: string[];
}

const CandyMakingRecordSchema = new Schema({
  candyId: { type: Schema.Types.ObjectId, ref: 'Candy', required: true },
  recipeId: { type: Schema.Types.ObjectId, ref: 'Recipe' },
  materials: { type: Schema.Types.Mixed, default: [] },
  result: { type: String, enum: ['success', 'crit', 'fail'], required: true },
  timestamp: { type: Date, default: Date.now },
});

const ContestEntryRecordSchema = new Schema({
  contestId: { type: Schema.Types.ObjectId, ref: 'Contest', required: true },
  candyId: { type: Schema.Types.ObjectId, ref: 'Candy', required: true },
  rank: { type: Number, required: true },
  score: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

const PlayerHistorySchema = new Schema<IPlayerHistory>({
  playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true, unique: true, index: true },
  candyMaking: { type: [CandyMakingRecordSchema], default: [] },
  contestEntries: { type: [ContestEntryRecordSchema], default: [] },
  trades: { type: Schema.Types.Mixed, default: [] },
  achievements: { type: [String], default: [] },
});

export const PlayerHistory = model<IPlayerHistory>('PlayerHistory', PlayerHistorySchema);
