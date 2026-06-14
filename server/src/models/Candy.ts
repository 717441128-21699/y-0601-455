import { Schema, model, Document, Types } from 'mongoose';
import { MaterialQuality, MATERIAL_QUALITIES, SpecialEffect, SPECIAL_EFFECTS, Affix, AFFIXES } from '../config/constants';

export interface IngredientSlot {
  materialId: Types.ObjectId;
  name: string;
  quality: MaterialQuality;
  quantity: number;
}

export interface ICandy extends Document {
  creatorId: Types.ObjectId;
  workshopId: Types.ObjectId;
  recipeId?: Types.ObjectId;
  name: string;
  description: string;
  icon: string;
  color: string;
  ingredients: IngredientSlot[];
  sweetness: number;
  magicDuration: number;
  quality: MaterialQuality;
  affixes: Affix[];
  specialEffects: SpecialEffect[];
  critHit: boolean;
  rarityScore: number;
  collectionScore: number;
  contestValue: number;
  quantity: number;
  inTrade: boolean;
  createdAt: Date;
}

const IngredientSlotSchema = new Schema({
  materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
  name: { type: String, required: true },
  quality: { type: String, enum: MATERIAL_QUALITIES, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const CandySchema = new Schema<ICandy>({
  creatorId: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  workshopId: { type: Schema.Types.ObjectId, ref: 'Workshop', required: true, index: true },
  recipeId: { type: Schema.Types.ObjectId, ref: 'Recipe' },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '🍬' },
  color: { type: String, default: '#FF69B4' },
  ingredients: { type: [IngredientSlotSchema], required: true },
  sweetness: { type: Number, required: true },
  magicDuration: { type: Number, required: true },
  quality: { type: String, enum: MATERIAL_QUALITIES, required: true, index: true },
  affixes: { type: [{ type: String, enum: AFFIXES }], default: [] },
  specialEffects: { type: [{ type: String, enum: SPECIAL_EFFECTS }], default: [] },
  critHit: { type: Boolean, default: false },
  rarityScore: { type: Number, required: true },
  collectionScore: { type: Number, required: true },
  contestValue: { type: Number, required: true },
  quantity: { type: Number, default: 1, min: 1 },
  inTrade: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

export const Candy = model<ICandy>('Candy', CandySchema);
