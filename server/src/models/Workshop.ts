import { Schema, model, Document, Types } from 'mongoose';
import { WorkshopStyle, WORKSHOP_STYLES } from '../config/constants';

export interface WorkshopStation {
  level: number;
  name: string;
}

export interface IWorkshop extends Document {
  ownerId: Types.ObjectId;
  name: string;
  style: WorkshopStyle;
  level: number;
  decorations: string[];
  stations: {
    candyPot: WorkshopStation;
    mixingBowl: WorkshopStation;
    decorationTable: WorkshopStation;
  };
  storageCapacity: number;
  layout: Record<string, any>;
  isPublic: boolean;
  totalCandiesMade: number;
  totalContestsWon: number;
  reputation: number;
  createdAt: Date;
}

const WorkshopStationSchema = new Schema({
  level: { type: Number, default: 1, min: 1, max: 10 },
  name: { type: String, default: '' },
});

const WorkshopSchema = new Schema<IWorkshop>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  name: { type: String, required: true },
  style: { type: String, enum: WORKSHOP_STYLES, required: true },
  level: { type: Number, default: 1, min: 1, max: 10 },
  decorations: { type: [String], default: [] },
  stations: {
    candyPot: { type: WorkshopStationSchema, default: () => ({ level: 1, name: '基础熬糖台' }) },
    mixingBowl: { type: WorkshopStationSchema, default: () => ({ level: 1, name: '基础搅拌碗' }) },
    decorationTable: { type: WorkshopStationSchema, default: () => ({ level: 1, name: '基础装饰台' }) },
  },
  storageCapacity: { type: Number, default: 100 },
  layout: { type: Schema.Types.Mixed, default: {} },
  isPublic: { type: Boolean, default: true },
  totalCandiesMade: { type: Number, default: 0 },
  totalContestsWon: { type: Number, default: 0 },
  reputation: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Workshop = model<IWorkshop>('Workshop', WorkshopSchema);
