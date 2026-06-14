import { Types } from 'mongoose';
import { IngredientSlot, ICandy, Candy } from '../models/Candy';
import { Material, IMaterial } from '../models/Material';
import { Player, PlayerSkills } from '../models/Player';
import { Workshop, IWorkshop } from '../models/Workshop';
import { Guild, IGuild } from '../models/Guild';
import { Inventory, IInventory } from '../models/Inventory';
import { PlayerHistory } from '../models/PlayerHistory';
import { GlobalState } from '../models/GlobalState';
import {
  QUALITY_MULTIPLIERS,
  AFFIX_CHANCES,
  MATERIAL_QUALITIES,
  SPECIAL_EFFECTS,
  AFFIXES,
  MaterialQuality,
  SpecialEffect,
  Affix,
} from '../config/constants';

export interface CandyMakingResult {
  success: boolean;
  message: string;
  candy?: ICandy;
  critHit: boolean;
  affixes: Affix[];
  specialEffects: SpecialEffect[];
  returnedMaterials?: IngredientSlot[];
  stats?: {
    sweetness: number;
    magicDuration: number;
    quality: MaterialQuality;
    rarityScore: number;
  };
}

const pickRandom = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const weightedPickQuality = (avgQual: number): MaterialQuality => {
  if (avgQual >= 4.2) return 'legendary';
  if (avgQual >= 3.2) return 'epic';
  if (avgQual >= 2.2) return 'rare';
  if (avgQual >= 1.2) return 'uncommon';
  return 'common';
};

const qualityIndex = (q: MaterialQuality): number =>
  MATERIAL_QUALITIES.indexOf(q);

export class CandyService {
  static async makeCandy(
    playerId: string,
    workshopId: string,
    orderedIngredients: { materialId: string; quantity: number }[],
    recipeId?: string,
    recipeName?: string
  ): Promise<CandyMakingResult> {
    const player = await Player.findById(playerId);
    const workshop = await Workshop.findById(workshopId);
    const inventory = await Inventory.findOne({ playerId });

    if (!player) return { success: false, message: '玩家不存在', critHit: false, affixes: [], specialEffects: [] };
    if (!workshop) return { success: false, message: '工坊不存在', critHit: false, affixes: [], specialEffects: [] };
    if (workshop.ownerId.toString() !== playerId) {
      return { success: false, message: '您不是该工坊的主人', critHit: false, affixes: [], specialEffects: [] };
    }
    if (!inventory) return { success: false, message: '背包不存在', critHit: false, affixes: [], specialEffects: [] };

    const ingredientSlots: IngredientSlot[] = [];
    const materialDocs: IMaterial[] = [];

    for (const ing of orderedIngredients) {
      const mat = await Material.findById(ing.materialId);
      if (!mat) return { success: false, message: `原料 ${ing.materialId} 不存在`, critHit: false, affixes: [], specialEffects: [] };
      const invItem = inventory.materials.find(m => m.materialId.toString() === ing.materialId);
      if (!invItem || invItem.quantity < ing.quantity) {
        return { success: false, message: `原料 ${mat.name} 数量不足`, critHit: false, affixes: [], specialEffects: [] };
      }
      invItem.quantity -= ing.quantity;
      ingredientSlots.push({
        materialId: new Types.ObjectId(ing.materialId),
        name: mat.name,
        quality: mat.quality,
        quantity: ing.quantity,
      });
      materialDocs.push(mat);
    }

    inventory.materials = inventory.materials.filter(m => m.quantity > 0);
    inventory.updatedAt = new Date();
    await inventory.save();

    const { sweetness, magicDuration, quality, avgQuality } = this.calculateCandyStats(
      materialDocs,
      orderedIngredients,
      player.skills,
      workshop
    );

    let guildBonus = { successRateBonus: 0, critRateBonus: 0, materialYieldBonus: 0 };
    if (player.guildId) {
      const guild = await Guild.findById(player.guildId);
      if (guild) guildBonus = guild.bonuses;
    }

    const globalState = await GlobalState.findOne({ key: 'global' });
    const festivalBonus = (globalState?.candyFestival.active ? globalState.candyFestival.critBonus : 0);

    const baseSuccessRate = 0.6 + (avgQuality * 0.05) + (player.skills.technique / 300);
    const finalSuccessRate = Math.min(0.98, baseSuccessRate + guildBonus.successRateBonus);

    if (Math.random() > finalSuccessRate) {
      const returned = ingredientSlots.map(slot => ({
        ...slot,
        quantity: Math.ceil(slot.quantity * 0.5),
      })).filter(s => s.quantity > 0);

      for (const slot of returned) {
        const existing = inventory.materials.find(m => m.materialId.toString() === slot.materialId.toString());
        if (existing) existing.quantity += slot.quantity;
        else {
          const mat = await Material.findById(slot.materialId);
          if (mat) {
            inventory.materials.push({
              materialId: slot.materialId,
              name: mat.name,
              type: mat.type,
              quality: mat.quality,
              icon: mat.icon,
              quantity: slot.quantity,
            });
          }
        }
      }
      await inventory.save();

      await PlayerHistory.findOneAndUpdate(
        { playerId },
        { $push: { candyMaking: { materials: ingredientSlots, result: 'fail', timestamp: new Date() } } },
        { upsert: true }
      );

      return {
        success: false,
        message: '熬糖失败，部分原料已返还',
        critHit: false,
        affixes: [],
        specialEffects: [],
        returnedMaterials: returned,
      };
    }

    const baseCritRate = 0.05 + (player.skills.creativity / 400) + guildBonus.critRateBonus + festivalBonus;
    const critHit = Math.random() < baseCritRate;

    const affixes: Affix[] = [];
    for (let i = 0; i < 3; i++) {
      const chance = AFFIX_CHANCES[quality] * (1 + player.skills.taste / 150);
      if (Math.random() < chance) {
        const affix = pickRandom(AFFIXES);
        if (!affixes.includes(affix)) affixes.push(affix);
      }
    }

    const specialEffects: SpecialEffect[] = [];
    const effectChance = qualityIndex(quality) * 0.08 + (affixes.length * 0.05);
    for (let i = 0; i < 2; i++) {
      if (Math.random() < effectChance) {
        const effect = pickRandom(SPECIAL_EFFECTS);
        if (!specialEffects.includes(effect)) specialEffects.push(effect);
      }
    }

    const rarityMultiplier = CANDY_RARITY_MULTIPLIER(quality, affixes.length, specialEffects.length);
    const rarityScore = Math.round((sweetness + magicDuration) * rarityMultiplier * (critHit ? 1.5 : 1));
    const collectionScore = Math.round(rarityScore * 0.6 + affixes.length * 50 + specialEffects.length * 100);
    const contestValue = Math.round(rarityScore * 0.8 + player.skills.taste * 2);

    const finalSweetness = critHit ? Math.round(sweetness * 1.3) : sweetness;
    const finalMagicDuration = critHit ? Math.round(magicDuration * 1.3) : magicDuration;

    const colors = ['#FF69B4', '#FFB6C1', '#98FB98', '#87CEEB', '#DDA0DD', '#FFA07A', '#FFD700', '#7FFF00'];
    const candy = new Candy({
      creatorId: playerId,
      workshopId,
      recipeId: recipeId ? new Types.ObjectId(recipeId) : undefined,
      name: recipeName || this.generateCandyName(quality, affixes, specialEffects),
      description: this.generateCandyDescription(quality, affixes, specialEffects),
      icon: pickRandom(['🍬', '🍭', '🍫', '🍩', '🧁', '🍪', '🎂']),
      color: pickRandom(colors),
      ingredients: ingredientSlots,
      sweetness: finalSweetness,
      magicDuration: finalMagicDuration,
      quality,
      affixes,
      specialEffects,
      critHit,
      rarityScore,
      collectionScore,
      contestValue,
      quantity: 1 + (critHit ? 1 : 0),
    });
    await candy.save();

    player.collectionScore = (player.collectionScore || 0) + collectionScore;
    player.exp += Math.round(rarityScore * 0.1);
    player.lastLoginAt = new Date();
    await player.save();

    workshop.totalCandiesMade += 1;
    workshop.reputation += Math.round(rarityScore * 0.05);
    await workshop.save();

    await PlayerHistory.findOneAndUpdate(
      { playerId },
      {
        $push: {
          candyMaking: {
            candyId: candy._id,
            recipeId: recipeId ? new Types.ObjectId(recipeId) : undefined,
            materials: ingredientSlots,
            result: critHit ? 'crit' : 'success',
            timestamp: new Date(),
          },
        },
      },
      { upsert: true }
    );

    if (globalState) {
      globalState.serverStats.candiesToday += 1;
      globalState.lastUpdated = new Date();
      await globalState.save();
    }

    return {
      success: true,
      message: critHit ? '✨ 暴击成功！获得双倍糖果！' : '🍬 熬糖成功！',
      candy,
      critHit,
      affixes,
      specialEffects,
      stats: {
        sweetness: finalSweetness,
        magicDuration: finalMagicDuration,
        quality,
        rarityScore,
      },
    };
  }

  private static calculateCandyStats(
    materials: IMaterial[],
    orderedIngredients: { materialId: string; quantity: number }[],
    skills: PlayerSkills,
    workshop: IWorkshop
  ) {
    let totalSweetness = 0;
    let totalMagicDuration = 0;
    let totalQualityWeight = 0;
    let weightedQualitySum = 0;

    const orderBonus = orderedIngredients.length > 0 ? 1 + (orderedIngredients.length - 1) * 0.05 : 1;
    const stationBonus = 1 + (workshop.stations.candyPot.level - 1) * 0.05 + (workshop.stations.mixingBowl.level - 1) * 0.03;
    const skillBonus = 1 + skills.taste / 200 + skills.technique / 250 + skills.creativity / 300;

    for (let i = 0; i < materials.length; i++) {
      const mat = materials[i];
      const qty = orderedIngredients[i].quantity;
      const qMult = QUALITY_MULTIPLIERS[mat.quality];
      const s = mat.baseSweetness * qMult * qty;
      const m = mat.baseMagicDuration * qMult * qty;
      totalSweetness += s;
      totalMagicDuration += m;
      const w = qty * (qualityIndex(mat.quality) + 1);
      totalQualityWeight += w;
      weightedQualitySum += w * (qualityIndex(mat.quality) + 1);
    }

    const avgQuality = totalQualityWeight > 0 ? weightedQualitySum / totalQualityWeight : 1;
    const quality = weightedPickQuality(avgQuality);

    return {
      sweetness: Math.round(totalSweetness * orderBonus * stationBonus * skillBonus),
      magicDuration: Math.round(totalMagicDuration * orderBonus * stationBonus * skillBonus),
      quality,
      avgQuality,
    };
  }

  private static generateCandyName(quality: MaterialQuality, affixes: Affix[], effects: SpecialEffect[]): string {
    const prefixes: Record<MaterialQuality, string[]> = {
      common: ['普通', '家常', '日常'],
      uncommon: ['精致', '优质', '特制'],
      rare: ['稀有', '璀璨', '魔法'],
      epic: ['史诗', '传奇', '神迹'],
      legendary: ['远古', '神圣', '创世'],
    };
    const bases = ['果糖', '硬糖', '软糖', '奶糖', '夹心糖', '水果糖', '水晶糖'];
    const prefix = pickRandom(prefixes[quality]);
    const affixPart = affixes.length > 0 ? pickRandom(affixes) : '';
    return `${prefix}${affixPart}${pickRandom(bases)}`;
  }

  private static generateCandyDescription(quality: MaterialQuality, affixes: Affix[], effects: SpecialEffect[]): string {
    const parts: string[] = [];
    parts.push(`品质等级：${quality}`);
    if (affixes.length) parts.push(`词缀：${affixes.join('、')}`);
    if (effects.length) parts.push(`特殊效果：${effects.map(e => EFFECT_NAMES[e]).join('、')}`);
    return parts.join(' | ');
  }

  static async getPlayerCandies(playerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [candies, total] = await Promise.all([
      Candy.find({ creatorId: playerId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Candy.countDocuments({ creatorId: playerId }),
    ]);
    return { candies, total, page, limit };
  }

  static async getCandyById(candyId: string) {
    return Candy.findById(candyId);
  }
}

function CANDY_RARITY_MULTIPLIER(quality: MaterialQuality, affixCount: number, effectCount: number): number {
  const base = QUALITY_MULTIPLIERS[quality];
  return base * (1 + affixCount * 0.15) * (1 + effectCount * 0.2);
}

const EFFECT_NAMES: Record<SpecialEffect, string> = {
  sparkle: '闪光',
  invisibility: '隐身',
  flying_kiss: '飞吻',
  time_freeze: '时停',
  luck_boost: '幸运',
  healing: '治愈',
};
