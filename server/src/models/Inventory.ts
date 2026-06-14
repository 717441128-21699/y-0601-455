import { Schema, model, Document, Types } from 'mongoose';

export interface InventoryItem {
  materialId: Types.ObjectId;
  name: string;
  type: string;
  quality: string;
  icon: string;
  quantity: number;
  expiresAt?: Date;
}

export interface SpecialItem {
  itemId: string;
  name: string;
  description: string;
  icon: string;
  type: 'sugar_paper' | 'rare_dew' | 'blueprint' | 'consumable';
  quantity: number;
}

export interface IInventory extends Document {
  playerId: Types.ObjectId;
  materials: InventoryItem[];
  specialItems: SpecialItem[];
  updatedAt: Date;
}

const InventoryItemSchema = new Schema({
  materialId: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  quality: { type: String, required: true },
  icon: { type: String, required: true },
  quantity: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date },
});

const SpecialItemSchema = new Schema({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, required: true },
  type: { type: String, enum: ['sugar_paper', 'rare_dew', 'blueprint', 'consumable'], required: true },
  quantity: { type: Number, default: 0, min: 0 },
});

const InventorySchema = new Schema<IInventory>({
  playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true, unique: true, index: true },
  materials: { type: [InventoryItemSchema], default: [] },
  specialItems: { type: [SpecialItemSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

export const Inventory = model<IInventory>('Inventory', InventorySchema);
