import { Types } from 'mongoose';
import { Recipe, IRecipe } from '../models/Recipe';
import { Material } from '../models/Material';
import { Player } from '../models/Player';
import { Inventory } from '../models/Inventory';
import { ApprenticeRank, APPRENTICE_RANKS, MaterialQuality, MATERIAL_QUALITIES, RECIPE_STATUS } from '../config/constants';

export interface RecipeDevelopmentResult {
  success: boolean;
  message: string;
  recipe?: IRecipe;
  actualSuccessRate: number;
  returnedMaterials?: Array<{ materialId: Types.ObjectId; name: string; quality: MaterialQuality; quantity: number }>;
}

export interface ApprenticePromotionRequest {
  playerId: string;
  targetRank: ApprenticeRank;
  evidence: Array<{ recipeId: string; candyCount: number }>;
}

export class RecipeService {
  static async developRecipe(
    playerId: string,
    recipeData: {
      name: string;
      description: string;
      ingredients: Array<{ materialId: string; materialName: string; minQuantity: number; maxQuantity: number; order: number }>;
      baseSweetness: number;
      baseMagicDuration: number;
      targetQuality: MaterialQuality;
      possibleEffects: string[];
      difficulty: number;
      paperCost: number;
      dewCost: number;
    }
  ): Promise<RecipeDevelopmentResult> {
    const player = await Player.findById(playerId);
    const inventory = await Inventory.findOne({ playerId });
    if (!player) return { success: false, message: '玩家不存在', actualSuccessRate: 0 };
    if (!inventory) return { success: false, message: '背包不存在', actualSuccessRate: 0 };

    const paperItem = inventory.specialItems.find(i => i.itemId === 'sugar_paper');
    const dewItem = inventory.specialItems.find(i => i.itemId === 'rare_dew');
    if (!paperItem || paperItem.quantity < recipeData.paperCost) {
      return { success: false, message: '试糖纸数量不足', actualSuccessRate: 0 };
    }
    if (recipeData.dewCost > 0 && (!dewItem || dewItem.quantity < recipeData.dewCost)) {
      return { success: false, message: '稀有蜜露数量不足', actualSuccessRate: 0 };
    }

    const proficiencyKey = `recipe_${recipeData.targetQuality}`;
    const proficiency = (player.proficiency as any).get(proficiencyKey) || 0;

    const workshop = await (await import('../models/Workshop')).Workshop.findOne({ ownerId: playerId });
    const equipmentBonus = workshop ? (workshop.stations.decorationTable.level - 1) * 0.02 : 0;
    const creativityBonus = player.skills.creativity / 200;

    const baseSuccess = 0.5 - recipeData.difficulty * 0.03;
    const actualSuccessRate = Math.min(0.95, Math.max(0.1,
      baseSuccess + proficiency * 0.01 + equipmentBonus + creativityBonus
    ));

    paperItem.quantity -= recipeData.paperCost;
    if (recipeData.dewCost > 0 && dewItem) dewItem.quantity -= recipeData.dewCost;
    inventory.updatedAt = new Date();

    for (const ing of recipeData.ingredients) {
      const mat = await Material.findById(ing.materialId);
      if (!mat) {
        return { success: false, message: `原料 ${ing.materialId} 不存在`, actualSuccessRate };
      }
    }

    const success = Math.random() < actualSuccessRate;

    if (!success) {
      await inventory.save();
      const returned: Array<{ materialId: Types.ObjectId; name: string; quality: MaterialQuality; quantity: number }> = [];
      for (const ing of recipeData.ingredients) {
        const mat = await Material.findById(ing.materialId);
        if (mat) {
          returned.push({
            materialId: new Types.ObjectId(ing.materialId),
            name: mat.name,
            quality: mat.quality,
            quantity: Math.ceil(ing.minQuantity * 0.4),
          });
        }
      }
      return {
        success: false,
        message: '研发失败，部分原料已返还',
        actualSuccessRate,
        returnedMaterials: returned,
      };
    }

    const newProficiency = proficiency + recipeData.difficulty * 2;
    (player.proficiency as any).set(proficiencyKey, newProficiency);
    await player.save();
    await inventory.save();

    const recipe = new Recipe({
      creatorId: new Types.ObjectId(playerId),
      name: recipeData.name,
      description: recipeData.description,
      ingredients: recipeData.ingredients.map(ing => ({
        materialId: new Types.ObjectId(ing.materialId),
        materialName: ing.materialName,
        minQuantity: ing.minQuantity,
        maxQuantity: ing.maxQuantity,
        order: ing.order,
      })),
      baseSweetness: recipeData.baseSweetness,
      baseMagicDuration: recipeData.baseMagicDuration,
      targetQuality: recipeData.targetQuality,
      possibleEffects: recipeData.possibleEffects,
      difficulty: recipeData.difficulty,
      successRate: actualSuccessRate,
      paperCost: recipeData.paperCost,
      dewCost: recipeData.dewCost,
      isOfficial: false,
      status: 'pending' as typeof RECIPE_STATUS[number],
      submittedAt: new Date(),
    });
    await recipe.save();

    return {
      success: true,
      message: '配方研发成功！请等待首席调糖师审批',
      recipe,
      actualSuccessRate,
    };
  }

  static async reviewRecipe(
    reviewerId: string,
    recipeId: string,
    approve: boolean,
    note: string
  ): Promise<{ success: boolean; message: string; recipe?: IRecipe }> {
    const reviewer = await Player.findById(reviewerId);
    if (!reviewer || !reviewer.isChief) {
      return { success: false, message: '仅首席调糖师有权审批' };
    }
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) return { success: false, message: '配方不存在' };
    if (recipe.status !== 'pending') return { success: false, message: '该配方已被审批' };

    recipe.status = approve ? 'approved' : 'rejected';
    recipe.reviewNote = note;
    recipe.reviewerId = new Types.ObjectId(reviewerId);
    recipe.reviewedAt = new Date();
    await recipe.save();

    return { success: true, message: approve ? '配方审批通过' : '配方已驳回', recipe };
  }

  static async requestPromotion(
    playerId: string,
    targetRank: ApprenticeRank
  ): Promise<{ success: boolean; message: string; requiresApproval: boolean }> {
    const player = await Player.findById(playerId);
    if (!player) return { success: false, message: '玩家不存在', requiresApproval: false };

    const currentIdx = APPRENTICE_RANKS.indexOf(player.apprenticeRank);
    const targetIdx = APPRENTICE_RANKS.indexOf(targetRank);

    if (targetIdx <= currentIdx) {
      return { success: false, message: '目标等级不能低于或等于当前等级', requiresApproval: false };
    }
    if (targetIdx - currentIdx > 1) {
      return { success: false, message: '只能晋升一级', requiresApproval: false };
    }

    const requirements: Record<number, { level: number; exp: number; minCandies: number }> = {
      1: { level: 5, exp: 500, minCandies: 20 },
      2: { level: 15, exp: 3000, minCandies: 100 },
      3: { level: 30, exp: 15000, minCandies: 500 },
      4: { level: 50, exp: 80000, minCandies: 2000 },
    };
    const req = requirements[targetIdx];

    const candyCount = await (await import('../models/Candy')).Candy.countDocuments({ creatorId: playerId });
    if (player.level < req.level || player.exp < req.exp || candyCount < req.minCandies) {
      return {
        success: false,
        message: `未达到晋升要求：等级${req.level}/经验${req.exp}/糖果数${req.minCandies}`,
        requiresApproval: false,
      };
    }

    if (targetIdx <= 2) {
      player.apprenticeRank = targetRank;
      await player.save();
      return { success: true, message: `已自动晋升为${targetRank}`, requiresApproval: false };
    }

    return { success: true, message: '已提交晋升申请，请等待首席调糖师审批', requiresApproval: true };
  }

  static async approvePromotion(
    chiefId: string,
    playerId: string,
    approve: boolean
  ): Promise<{ success: boolean; message: string }> {
    const chief = await Player.findById(chiefId);
    if (!chief || !chief.isChief) return { success: false, message: '仅首席调糖师有权审批' };
    const player = await Player.findById(playerId);
    if (!player) return { success: false, message: '玩家不存在' };

    const currentIdx = APPRENTICE_RANKS.indexOf(player.apprenticeRank);
    const nextRank = APPRENTICE_RANKS[Math.min(currentIdx + 1, APPRENTICE_RANKS.length - 1)];

    if (approve) {
      player.apprenticeRank = nextRank;
      await player.save();
      return { success: true, message: `已晋升为${nextRank}` };
    }
    return { success: true, message: '已驳回晋升申请' };
  }

  static async getPendingRecipes(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [recipes, total] = await Promise.all([
      Recipe.find({ status: 'pending' }).sort({ submittedAt: -1 }).skip(skip).limit(limit).populate('creatorId', 'nickname avatar'),
      Recipe.countDocuments({ status: 'pending' }),
    ]);
    return { recipes, total, page, limit };
  }

  static async getApprovedRecipes(page = 1, limit = 20, playerId?: string) {
    const skip = (page - 1) * limit;
    const query: any = { status: 'approved' };
    if (playerId) query.$or = [{ isOfficial: true }, { creatorId: playerId }];
    const [recipes, total] = await Promise.all([
      Recipe.find(query).sort({ submittedAt: -1 }).skip(skip).limit(limit).populate('creatorId', 'nickname avatar'),
      Recipe.countDocuments(query),
    ]);
    return { recipes, total, page, limit };
  }
}
