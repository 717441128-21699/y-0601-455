import { Schema, model, Document, Types } from 'mongoose';
import { MaterialQuality, MATERIAL_QUALITIES, RecipeStatus, RECIPE_STATUS, SpecialEffect, SPECIAL_EFFECTS } from '../config/constants';

export interface RecipeIngredient {
  materialId: Types.ObjectId;
  materialName: string;
  minQuantity: number;
  maxQuantity: number;
  order: number;
}

export interface IRecipe extends Document {
  creatorId: Types.ObjectId;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  baseSweetness: number;
  baseMagicDuration: number;
  targetQuality: MaterialQuality;
  possibleEffects: SpecialEffect[];
  difficulty: number;
  successRate: number;
  paperCost: number;
  dewCost: number;
  isOfficial: boolean;
  status: RecipeStatus;
  reviewNote?: string;
  reviewerId?: Types.ObjectId;
  reviewedAt?: Date;
  timesUsed: number;
  timesSuccess: number;
  limitedEdition: boolean;
  season?: string;
  submittedAt: Date;
}

const RecipeIngredientSchema = new Schema({
  materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
  materialName: { type: String, required: true },
  minQuantity: { type: Number, required: true, min: 1 },
  maxQuantity: { type: Number, required: true, min: 1 },
  order: { type: Number, required: true, min: 0 },
});

const RecipeSchema = new Schema<IRecipe>({
  creatorId: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  ingredients: { type: [RecipeIngredientSchema], required: true },
  baseSweetness: { type: Number, required: true },
  baseMagicDuration: { type: Number, required: true },
  targetQuality: { type: String, enum: MATERIAL_QUALITIES, required: true },
  possibleEffects: { type: [{ type: String, enum: SPECIAL_EFFECTS }], default: [] },
  difficulty: { type: Number, default: 1, min: 1, max: 10 },
  successRate: { type: Number, default: 0.7, min: 0, max: 1 },
  paperCost: { type: Number, default: 1 },
  dewCost: { type: Number, default: 0 },
  isOfficial: { type: Boolean, default: false },
  status: { type: String, enum: RECIPE_STATUS, default: 'pending', index: true },
  reviewNote: { type: String },
  reviewerId: { type: Schema.Types.ObjectId, ref: 'Player' },
  reviewedAt: { type: Date },
  timesUsed: { type: Number, default: 0 },
  timesSuccess: { type: Number, default: 0 },
  limitedEdition: { type: Boolean, default: false },
  season: { type: String },
  submittedAt: { type: Date, default: Date.now },
});

export const Recipe = model<IRecipe>('Recipe', RecipeSchema);
