import { Schema, model, Document, Types } from 'mongoose';
import { TradeStatus, TRADE_STATUS } from '../config/constants';

export interface ITrade extends Document {
  sellerId: Types.ObjectId;
  buyerId?: Types.ObjectId;
  itemType: 'candy' | 'recipe';
  candyId?: Types.ObjectId;
  recipeId?: Types.ObjectId;
  quantity: number;
  askingPrice: number;
  suggestedMin: number;
  suggestedMax: number;
  average7d: number;
  status: TradeStatus;
  listedAt: Date;
  completedAt?: Date;
  transactionFee: number;
  triggersFestival: boolean;
  expiredAt: Date;
}

const TradeSchema = new Schema<ITrade>({
  sellerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  buyerId: { type: Schema.Types.ObjectId, ref: 'Player', index: true },
  itemType: { type: String, enum: ['candy', 'recipe'], required: true, index: true },
  candyId: { type: Schema.Types.ObjectId, ref: 'Candy', index: true },
  recipeId: { type: Schema.Types.ObjectId, ref: 'Recipe', index: true },
  quantity: { type: Number, required: true, min: 1 },
  askingPrice: { type: Number, required: true },
  suggestedMin: { type: Number, required: true },
  suggestedMax: { type: Number, required: true },
  average7d: { type: Number, required: true },
  status: { type: String, enum: TRADE_STATUS, default: 'listed', index: true },
  listedAt: { type: Date, default: Date.now, index: true },
  completedAt: { type: Date },
  transactionFee: { type: Number, default: 0.05 },
  triggersFestival: { type: Boolean, default: false },
  expiredAt: { type: Date, required: true },
});

TradeSchema.index({ itemType: 1, status: 1, listedAt: -1 });

export const Trade = model<ITrade>('Trade', TradeSchema);
