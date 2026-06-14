import { Schema, model, Document, Types } from 'mongoose';
import { MaterialType, MATERIAL_TYPES, MaterialQuality, MATERIAL_QUALITIES } from '../config/constants';

export interface IMaterial extends Document {
  name: string;
  type: MaterialType;
  quality: MaterialQuality;
  description: string;
  icon: string;
  baseValue: number;
  baseSweetness: number;
  baseMagicDuration: number;
  rarityWeight: number;
  season?: string;
  effects: string[];
}

const MaterialSchema = new Schema<IMaterial>({
  name: { type: String, required: true },
  type: { type: String, enum: MATERIAL_TYPES, required: true, index: true },
  quality: { type: String, enum: MATERIAL_QUALITIES, required: true, index: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  baseValue: { type: Number, required: true },
  baseSweetness: { type: Number, required: true },
  baseMagicDuration: { type: Number, required: true },
  rarityWeight: { type: Number, required: true },
  season: { type: String },
  effects: { type: [String], default: [] },
});

export const Material = model<IMaterial>('Material', MaterialSchema);
