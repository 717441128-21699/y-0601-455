import { Material, IMaterial } from '../models/Material';
import { MATERIAL_TYPES, MATERIAL_QUALITIES, MaterialType, MaterialQuality } from '../config/constants';

const MATERIAL_TEMPLATES = [
  { type: 'flower_fruit', name: '月光蔷薇', icon: '🌹', baseSweetness: 15, baseMagicDuration: 20, baseValue: 50, effects: ['sparkle'] },
  { type: 'flower_fruit', name: '星辰果', icon: '⭐', baseSweetness: 20, baseMagicDuration: 30, baseValue: 80, effects: ['sparkle', 'luck_boost'] },
  { type: 'flower_fruit', name: '梦幻莓', icon: '🍓', baseSweetness: 25, baseMagicDuration: 15, baseValue: 40, effects: ['flying_kiss'] },
  { type: 'flower_fruit', name: '彩虹樱桃', icon: '🍒', baseSweetness: 30, baseMagicDuration: 25, baseValue: 65, effects: ['sparkle', 'healing'] },
  { type: 'flower_fruit', name: '幻影葡萄', icon: '🍇', baseSweetness: 18, baseMagicDuration: 40, baseValue: 90, effects: ['invisibility'] },
  { type: 'honey_syrup', name: '晨露蜂蜜', icon: '🍯', baseSweetness: 35, baseMagicDuration: 10, baseValue: 30, effects: ['healing'] },
  { type: 'honey_syrup', name: '蜂皇浆', icon: '💧', baseSweetness: 40, baseMagicDuration: 25, baseValue: 75, effects: ['healing', 'luck_boost'] },
  { type: 'honey_syrup', name: '金枫糖浆', icon: '🍁', baseSweetness: 45, baseMagicDuration: 15, baseValue: 55, effects: ['time_freeze'] },
  { type: 'honey_syrup', name: '花蜜精萃', icon: '🌺', baseSweetness: 50, baseMagicDuration: 35, baseValue: 110, effects: ['flying_kiss', 'sparkle'] },
  { type: 'magic_crystal', name: '星砂晶', icon: '💎', baseSweetness: 5, baseMagicDuration: 60, baseValue: 120, effects: ['invisibility', 'sparkle'] },
  { type: 'magic_crystal', name: '月光石', icon: '🌙', baseSweetness: 8, baseMagicDuration: 80, baseValue: 180, effects: ['time_freeze'] },
  { type: 'magic_crystal', name: '彩虹碎片', icon: '🌈', baseSweetness: 12, baseMagicDuration: 50, baseValue: 150, effects: ['sparkle', 'flying_kiss'] },
  { type: 'magic_crystal', name: '龙晶石', icon: '🔮', baseSweetness: 3, baseMagicDuration: 100, baseValue: 250, effects: ['luck_boost', 'time_freeze'] },
  { type: 'sugar_powder', name: '白砂糖', icon: '✨', baseSweetness: 10, baseMagicDuration: 5, baseValue: 10, effects: [] },
  { type: 'sugar_powder', name: '魔晶糖粉', icon: '💫', baseSweetness: 18, baseMagicDuration: 12, baseValue: 35, effects: ['sparkle'] },
  { type: 'sugar_powder', name: '星尘糖霜', icon: '🌟', baseSweetness: 25, baseMagicDuration: 25, baseValue: 70, effects: ['sparkle', 'luck_boost'] },
  { type: 'rare_dew', name: '朝露精华', icon: '💧', baseSweetness: 5, baseMagicDuration: 45, baseValue: 95, effects: ['healing'] },
  { type: 'rare_dew', name: '千年甘露', icon: '🫧', baseSweetness: 10, baseMagicDuration: 90, baseValue: 220, effects: ['time_freeze', 'invisibility'] },
];

export class MaterialService {
  static async seedMaterials(): Promise<number> {
    const existing = await Material.countDocuments();
    if (existing > 0) return existing;
    const materials: IMaterial[] = [];
    for (const tpl of MATERIAL_TEMPLATES) {
      for (let qi = 0; qi < MATERIAL_QUALITIES.length; qi++) {
        const quality = MATERIAL_QUALITIES[qi] as MaterialQuality;
        const qualityMult = [1, 1.3, 1.8, 2.5, 4][qi];
        const weight = [50, 30, 15, 4, 1][qi];
        const mat = new Material({
          name: this.getQualityPrefix(quality) + tpl.name,
          type: tpl.type as MaterialType,
          quality,
          description: `${this.getQualityDesc(quality)}${tpl.name}，用于熬制魔法糖果`,
          icon: tpl.icon,
          baseValue: Math.round(tpl.baseValue * qualityMult),
          baseSweetness: Math.round(tpl.baseSweetness * qualityMult),
          baseMagicDuration: Math.round(tpl.baseMagicDuration * qualityMult),
          rarityWeight: weight,
          effects: tpl.effects,
        });
        materials.push(mat);
      }
    }
    await Material.insertMany(materials);
    return materials.length;
  }

  private static getQualityPrefix(q: MaterialQuality): string {
    const map: Record<MaterialQuality, string> = {
      common: '普通', uncommon: '优质', rare: '稀有', epic: '史诗', legendary: '传说',
    };
    return map[q];
  }

  private static getQualityDesc(q: MaterialQuality): string {
    const map: Record<MaterialQuality, string> = {
      common: '随处可见的', uncommon: '精心挑选的', rare: '蕴含魔力的', epic: '凝聚灵韵的', legendary: '来自远古的',
    };
    return map[q];
  }

  static async listMaterials(type?: MaterialType, quality?: MaterialQuality, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const query: any = {};
    if (type) query.type = type;
    if (quality) query.quality = quality;
    const [materials, total] = await Promise.all([
      Material.find(query).sort({ type: 1, baseValue: 1 }).skip(skip).limit(limit),
      Material.countDocuments(query),
    ]);
    return { materials, total, page, limit };
  }

  static async getMaterialById(id: string) {
    return Material.findById(id);
  }

  static async collectRandom(playerId: string, count: number = 5): Promise<Array<{ materialId: string; name: string; icon: string; type: string; quality: string; quantity: number }>> {
    const { Inventory } = await import('../models/Inventory');
    const inventory = await Inventory.findOne({ playerId });
    if (!inventory) throw new Error('背包不存在');
    const allMaterials = await Material.find();
    const totalWeight = allMaterials.reduce((s, m) => s + m.rarityWeight, 0);
    const collected: any[] = [];
    for (let i = 0; i < count; i++) {
      let r = Math.random() * totalWeight;
      let selected = allMaterials[0];
      for (const m of allMaterials) {
        r -= m.rarityWeight;
        if (r <= 0) { selected = m; break; }
      }
      const existing = inventory.materials.find(x => x.materialId.toString() === selected._id.toString());
      if (existing) existing.quantity += 1;
      else {
        inventory.materials.push({
          materialId: selected._id,
          name: selected.name,
          type: selected.type,
          quality: selected.quality,
          icon: selected.icon,
          quantity: 1,
        });
      }
      const sameCollected = collected.find(x => x.materialId === selected._id.toString());
      if (sameCollected) sameCollected.quantity += 1;
      else {
        collected.push({
          materialId: selected._id.toString(),
          name: selected.name,
          icon: selected.icon,
          type: selected.type,
          quality: selected.quality,
          quantity: 1,
        });
      }
    }
    inventory.updatedAt = new Date();
    await inventory.save();
    return collected;
  }
}
