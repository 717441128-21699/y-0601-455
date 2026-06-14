import { Types } from 'mongoose';
import { Trade, ITrade } from '../models/Trade';
import { Candy } from '../models/Candy';
import { Recipe } from '../models/Recipe';
import { Player } from '../models/Player';
import { Inventory } from '../models/Inventory';
import { GlobalState } from '../models/GlobalState';
import { MaterialQuality } from '../config/constants';

export interface PriceSuggestion {
  suggestedMin: number;
  suggestedMax: number;
  average7d: number;
  dataPoints: number;
}

export class TradeService {
  static async calculatePriceSuggestion(
    itemType: 'candy' | 'recipe',
    itemId: string
  ): Promise<PriceSuggestion> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let filter: any = {
      itemType,
      status: 'completed',
      completedAt: { $gte: sevenDaysAgo },
    };

    let basePrice = 100;

    if (itemType === 'candy') {
      const candy = await Candy.findById(itemId);
      if (!candy) throw new Error('糖果不存在');
      filter['candyQuality'] = candy.quality;
      basePrice = Math.round(candy.rarityScore * 2 + candy.collectionScore * 0.5);
    } else {
      const recipe = await Recipe.findById(itemId);
      if (!recipe) throw new Error('配方不存在');
      filter['targetQuality'] = recipe.targetQuality;
      basePrice = Math.round((recipe.difficulty * 200) + (recipe.timesSuccess / Math.max(1, recipe.timesUsed)) * 500);
    }

    const completed = await Trade.find({ ...filter, askingPrice: { $exists: true } }).limit(50);
    const prices = completed.map(t => t.askingPrice).filter(p => p > 0);

    if (prices.length === 0) {
      return {
        suggestedMin: Math.round(basePrice * 0.8),
        suggestedMax: Math.round(basePrice * 1.5),
        average7d: basePrice,
        dataPoints: 0,
      };
    }

    const sorted = [...prices].sort((a, b) => a - b);
    const avg = sorted.reduce((s, p) => s + p, 0) / sorted.length;
    const avgWithBase = (avg * 0.7) + (basePrice * 0.3);

    return {
      suggestedMin: Math.round(avgWithBase * 0.85),
      suggestedMax: Math.round(avgWithBase * 1.25),
      average7d: Math.round(avg),
      dataPoints: sorted.length,
    };
  }

  static async listItem(
    sellerId: string,
    itemType: 'candy' | 'recipe',
    itemId: string,
    quantity: number,
    askingPrice: number
  ): Promise<{ success: boolean; message: string; trade?: ITrade }> {
    const seller = await Player.findById(sellerId);
    if (!seller) return { success: false, message: '卖家不存在' };

    const suggestion = await this.calculatePriceSuggestion(itemType, itemId);

    if (itemType === 'candy') {
      const candy = await Candy.findById(itemId);
      if (!candy) return { success: false, message: '糖果不存在' };
      if (candy.creatorId.toString() !== sellerId) return { success: false, message: '不是您的糖果' };
      if (candy.inTrade) return { success: false, message: '糖果已在交易中' };
      if (candy.quantity < quantity) return { success: false, message: '数量不足' };

      candy.inTrade = true;
      await candy.save();
    } else {
      const recipe = await Recipe.findById(itemId);
      if (!recipe) return { success: false, message: '配方不存在' };
      if (recipe.creatorId.toString() !== sellerId) return { success: false, message: '不是您的配方' };
    }

    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 7);

    const trade = new Trade({
      sellerId: new Types.ObjectId(sellerId),
      itemType,
      candyId: itemType === 'candy' ? new Types.ObjectId(itemId) : undefined,
      recipeId: itemType === 'recipe' ? new Types.ObjectId(itemId) : undefined,
      quantity,
      askingPrice,
      suggestedMin: suggestion.suggestedMin,
      suggestedMax: suggestion.suggestedMax,
      average7d: suggestion.average7d,
      status: 'listed',
      expiredAt,
    });
    await trade.save();

    const gs = await GlobalState.findOne({ key: 'global' });
    if (gs) {
      gs.serverStats.tradesToday += 1;
      gs.lastUpdated = new Date();
      await gs.save();
    }

    return { success: true, message: '上架成功', trade };
  }

  static async buyItem(
    buyerId: string,
    tradeId: string
  ): Promise<{ success: boolean; message: string; trade?: ITrade; festivalTriggered?: boolean }> {
    const buyer = await Player.findById(buyerId);
    if (!buyer) return { success: false, message: '买家不存在' };

    const trade = await Trade.findById(tradeId);
    if (!trade) return { success: false, message: '交易不存在' };
    if (trade.status !== 'listed') return { success: false, message: '交易不可用' };
    if (trade.sellerId.toString() === buyerId) return { success: false, message: '不能购买自己的商品' };
    if (trade.expiredAt < new Date()) return { success: false, message: '交易已过期' };

    const fee = Math.round(trade.askingPrice * trade.transactionFee);
    const totalCost = trade.askingPrice + fee;
    if (buyer.gold < totalCost) return { success: false, message: '金币不足' };

    const seller = await Player.findById(trade.sellerId);
    if (!seller) return { success: false, message: '卖家不存在' };

    buyer.gold -= totalCost;
    seller.gold += trade.askingPrice;

    const itemName = trade.itemType === 'candy' ? '糖果' : '配方';
    const festivalTriggered = trade.askingPrice >= 10000 && Math.random() < 0.15;

    if (trade.itemType === 'candy' && trade.candyId) {
      const candy = await Candy.findById(trade.candyId);
      if (candy) {
        candy.creatorId = new Types.ObjectId(buyerId);
        candy.inTrade = false;
        await candy.save();
      }
    }

    if (trade.itemType === 'recipe' && trade.recipeId) {
      const originalRecipe = await Recipe.findById(trade.recipeId);
      if (originalRecipe) {
        const copiedRecipe = new Recipe({
          creatorId: new Types.ObjectId(buyerId),
          name: originalRecipe.name,
          description: originalRecipe.description,
          ingredients: originalRecipe.ingredients,
          baseSweetness: originalRecipe.baseSweetness,
          baseMagicDuration: originalRecipe.baseMagicDuration,
          targetQuality: originalRecipe.targetQuality,
          possibleEffects: originalRecipe.possibleEffects,
          difficulty: originalRecipe.difficulty,
          successRate: originalRecipe.successRate,
          paperCost: originalRecipe.paperCost,
          dewCost: originalRecipe.dewCost,
          isOfficial: false,
          status: 'approved',
          submittedAt: new Date(),
          limitedEdition: originalRecipe.limitedEdition,
        });
        await copiedRecipe.save();

        const buyerInventory = await Inventory.findOne({ playerId: buyerId });
        if (buyerInventory) {
          const existingBlueprint = buyerInventory.specialItems.find(i => i.itemId === `blueprint_${copiedRecipe._id}`);
          if (!existingBlueprint) {
            buyerInventory.specialItems.push({
              itemId: `blueprint_${copiedRecipe._id}`,
              name: `图纸: ${originalRecipe.name}`,
              description: `甜点大赛限定图纸 - ${originalRecipe.description || originalRecipe.name}`,
              icon: '📜',
              type: 'blueprint',
              quantity: 1,
            });
            await buyerInventory.save();
          }
        }
      }
    }

    trade.status = 'completed';
    trade.buyerId = new Types.ObjectId(buyerId);
    trade.completedAt = new Date();
    trade.triggersFestival = festivalTriggered;
    await trade.save();

    await Promise.all([buyer.save(), seller.save()]);

    if (festivalTriggered) {
      const gs = await GlobalState.findOne({ key: 'global' });
      if (gs && !gs.candyFestival.active) {
        const endsAt = new Date();
        endsAt.setHours(23, 59, 59, 999);
        gs.candyFestival = {
          active: true,
          startedAt: new Date(),
          endsAt,
          critBonus: parseFloat(process.env.CANDY_FESTIVAL_CRIT_BONUS || '0.3'),
          triggeredBy: buyer.nickname,
          tradeId: trade._id.toString(),
        };
        gs.lastUpdated = new Date();
        await gs.save();
      }
    }

    return {
      success: true,
      message: `购买${itemName}成功！${festivalTriggered ? '🎉 触发糖果节！全服熬糖暴击率提升！' : ''}`,
      trade,
      festivalTriggered,
    };
  }

  static async cancelListing(
    sellerId: string,
    tradeId: string
  ): Promise<{ success: boolean; message: string }> {
    const trade = await Trade.findById(tradeId);
    if (!trade) return { success: false, message: '交易不存在' };
    if (trade.sellerId.toString() !== sellerId) return { success: false, message: '不是您的交易' };
    if (trade.status !== 'listed') return { success: false, message: '交易无法取消' };

    trade.status = 'cancelled';
    await trade.save();

    if (trade.itemType === 'candy' && trade.candyId) {
      const candy = await Candy.findById(trade.candyId);
      if (candy) {
        candy.inTrade = false;
        await candy.save();
      }
    }
    return { success: true, message: '已取消上架' };
  }

  static async getMarketplace(
    itemType?: 'candy' | 'recipe',
    qualityFilter?: MaterialQuality,
    page = 1,
    limit = 20,
    sortBy: 'price' | 'newest' | 'rarity' = 'newest'
  ) {
    const skip = (page - 1) * limit;
    const query: any = { status: 'listed', expiredAt: { $gte: new Date() } };
    if (itemType) query.itemType = itemType;

    let sort: any = { listedAt: -1 };
    if (sortBy === 'price') sort = { askingPrice: 1 };
    else if (sortBy === 'rarity') sort = { askingPrice: -1 };

    let tradesQuery = Trade.find(query);

    if (qualityFilter && itemType === 'candy') {
      const candies = await Candy.find({ quality: qualityFilter }).select('_id');
      query.candyId = { $in: candies.map(c => c._id) };
      tradesQuery = Trade.find(query);
    }

    const [trades, total] = await Promise.all([
      tradesQuery.sort(sort).skip(skip).limit(limit)
        .populate('sellerId', 'nickname avatar')
        .populate('candyId')
        .populate('recipeId'),
      Trade.countDocuments(query),
    ]);
    return { trades, total, page, limit };
  }

  static async getMyTrades(playerId: string, role: 'seller' | 'buyer' = 'seller', page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const query: any = role === 'seller' ? { sellerId: playerId } : { buyerId: playerId };
    const [trades, total] = await Promise.all([
      Trade.find(query).sort({ listedAt: -1 }).skip(skip).limit(limit)
        .populate('sellerId', 'nickname avatar')
        .populate('buyerId', 'nickname avatar')
        .populate('candyId')
        .populate('recipeId'),
      Trade.countDocuments(query),
    ]);
    return { trades, total, page, limit };
  }
}
