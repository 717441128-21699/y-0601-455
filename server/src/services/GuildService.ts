import { Types } from 'mongoose';
import { Guild, IGuild, GuildMember } from '../models/Guild';
import { Player } from '../models/Player';
import { Inventory } from '../models/Inventory';
import { Material } from '../models/Material';

export interface GuildUpgradeResult {
  success: boolean;
  message: string;
  newLevel?: number;
  cost?: { gold: number; materials: Record<string, number> };
}

export class GuildService {
  private static getUpgradeCost(level: number): { gold: number; materials: Record<string, number> } {
    return {
      gold: level * 10000,
      materials: {
        flower_fruit: level * 50,
        honey_syrup: level * 30,
        magic_crystal: level * 10,
      },
    };
  }

  static async createGuild(
    leaderId: string,
    name: string,
    description: string,
    emblem: string
  ): Promise<{ success: boolean; message: string; guild?: IGuild }> {
    const leader = await Player.findById(leaderId);
    if (!leader) return { success: false, message: '玩家不存在' };
    if (leader.guildId) return { success: false, message: '您已加入公会' };
    if (leader.gold < 50000) return { success: false, message: '创建公会需要50000金币' };

    const existing = await Guild.findOne({ name });
    if (existing) return { success: false, message: '公会名称已被使用' };

    leader.gold -= 50000;

    const guild = new Guild({
      name,
      description,
      emblem,
      leaderId: new Types.ObjectId(leaderId),
      level: 1,
      jointWorkshopLevel: 1,
      honeyFarmLevel: 1,
      members: [{
        playerId: new Types.ObjectId(leaderId),
        role: 'leader',
        joinedAt: new Date(),
        weeklyContribution: 50000,
        totalContribution: 50000,
      }],
      bonuses: {
        successRateBonus: 0,
        materialYieldBonus: 0,
        critRateBonus: 0,
      },
    });
    await guild.save();

    leader.guildId = guild._id;
    await leader.save();

    return { success: true, message: '公会创建成功！', guild };
  }

  static async joinGuild(
    playerId: string,
    guildId: string
  ): Promise<{ success: boolean; message: string }> {
    const player = await Player.findById(playerId);
    if (!player) return { success: false, message: '玩家不存在' };
    if (player.guildId) return { success: false, message: '您已加入公会' };

    const guild = await Guild.findById(guildId);
    if (!guild) return { success: false, message: '公会不存在' };
    if (guild.members.length >= 50) return { success: false, message: '公会人数已满' };

    guild.members.push({
      playerId: new Types.ObjectId(playerId),
      role: 'member',
      joinedAt: new Date(),
      weeklyContribution: 0,
      totalContribution: 0,
    });
    await guild.save();

    player.guildId = guild._id;
    await player.save();

    return { success: true, message: '加入公会成功！' };
  }

  static async leaveGuild(playerId: string): Promise<{ success: boolean; message: string }> {
    const player = await Player.findById(playerId);
    if (!player || !player.guildId) return { success: false, message: '您未加入公会' };

    const guild = await Guild.findById(player.guildId);
    if (!guild) return { success: false, message: '公会不存在' };

    if (guild.leaderId.toString() === playerId) {
      return { success: false, message: '请先转让公会会长' };
    }

    guild.members = guild.members.filter(m => m.playerId.toString() !== playerId);
    await guild.save();

    player.guildId = undefined;
    await player.save();

    return { success: true, message: '已离开公会' };
  }

  static async contributeMaterials(
    playerId: string,
    contributions: Array<{ materialId: string; quantity: number }>
  ): Promise<{ success: boolean; message: string; totalContributionValue?: number }> {
    const player = await Player.findById(playerId);
    if (!player || !player.guildId) return { success: false, message: '您未加入公会' };

    const inventory = await Inventory.findOne({ playerId });
    if (!inventory) return { success: false, message: '背包不存在' };

    const guild = await Guild.findById(player.guildId);
    if (!guild) return { success: false, message: '公会不存在' };

    let totalValue = 0;

    for (const c of contributions) {
      const invItem = inventory.materials.find(m => m.materialId.toString() === c.materialId);
      if (!invItem || invItem.quantity < c.quantity) {
        return { success: false, message: `${invItem?.name || '原料'}数量不足` };
      }
      const mat = await Material.findById(c.materialId);
      if (!mat) continue;

      invItem.quantity -= c.quantity;
      const val = c.quantity * mat.baseValue;
      totalValue += val;

      const key = mat.type;
      const current = (guild.materialsBank as any).get(key) || 0;
      (guild.materialsBank as any).set(key, current + c.quantity);

      guild.exp += val * 0.5;
    }

    inventory.materials = inventory.materials.filter(m => m.quantity > 0);
    inventory.updatedAt = new Date();
    await inventory.save();

    const member = guild.members.find(m => m.playerId.toString() === playerId);
    if (member) {
      member.weeklyContribution += totalValue;
      member.totalContribution += totalValue;
    }

    player.guildContribution += totalValue;
    await player.save();

    while (guild.exp >= this.guildExpToNext(guild.level)) {
      guild.exp -= this.guildExpToNext(guild.level);
      guild.level += 1;
      this.applyGuildBonuses(guild);
    }

    guild.markModified('members');
    guild.markModified('materialsBank');
    await guild.save();

    return { success: true, message: '捐献成功', totalContributionValue: totalValue };
  }

  static async contributeGold(
    playerId: string,
    goldAmount: number
  ): Promise<{ success: boolean; message: string }> {
    const player = await Player.findById(playerId);
    if (!player || !player.guildId) return { success: false, message: '您未加入公会' };
    if (player.gold < goldAmount) return { success: false, message: '金币不足' };

    const guild = await Guild.findById(player.guildId);
    if (!guild) return { success: false, message: '公会不存在' };

    player.gold -= goldAmount;
    guild.gold += goldAmount;
    guild.exp += goldAmount * 0.3;

    const member = guild.members.find(m => m.playerId.toString() === playerId);
    if (member) {
      member.weeklyContribution += goldAmount;
      member.totalContribution += goldAmount;
    }

    player.guildContribution += goldAmount;

    while (guild.exp >= this.guildExpToNext(guild.level)) {
      guild.exp -= this.guildExpToNext(guild.level);
      guild.level += 1;
      this.applyGuildBonuses(guild);
    }

    guild.markModified('members');
    await Promise.all([player.save(), guild.save()]);

    return { success: true, message: `捐献${goldAmount}金币成功` };
  }

  static async upgradeJointWorkshop(guildId: string): Promise<GuildUpgradeResult> {
    const guild = await Guild.findById(guildId);
    if (!guild) return { success: false, message: '公会不存在' };

    const cost = this.getUpgradeCost(guild.jointWorkshopLevel);
    if (guild.gold < cost.gold) return { success: false, message: '公会金币不足' };

    const matBank = guild.materialsBank as any;
    for (const [type, qty] of Object.entries(cost.materials)) {
      if ((matBank.get(type) || 0) < qty) {
        return { success: false, message: `原料不足：${type} 需要 ${qty}` };
      }
    }

    guild.gold -= cost.gold;
    for (const [type, qty] of Object.entries(cost.materials)) {
      matBank.set(type, matBank.get(type) - qty);
    }
    guild.jointWorkshopLevel += 1;
    guild.bonuses.successRateBonus += 0.02;

    guild.markModified('materialsBank');
    await guild.save();

    return { success: true, message: '联合工坊升级成功！', newLevel: guild.jointWorkshopLevel, cost };
  }

  static async upgradeHoneyFarm(guildId: string): Promise<GuildUpgradeResult> {
    const guild = await Guild.findById(guildId);
    if (!guild) return { success: false, message: '公会不存在' };

    const cost = this.getUpgradeCost(guild.honeyFarmLevel);
    if (guild.gold < cost.gold) return { success: false, message: '公会金币不足' };

    const matBank = guild.materialsBank as any;
    for (const [type, qty] of Object.entries(cost.materials)) {
      if ((matBank.get(type) || 0) < qty) {
        return { success: false, message: `原料不足：${type} 需要 ${qty}` };
      }
    }

    guild.gold -= cost.gold;
    for (const [type, qty] of Object.entries(cost.materials)) {
      matBank.set(type, matBank.get(type) - qty);
    }
    guild.honeyFarmLevel += 1;
    guild.bonuses.materialYieldBonus += 0.03;
    guild.bonuses.critRateBonus += 0.01;

    guild.markModified('materialsBank');
    await guild.save();

    return { success: true, message: '蜜糖农场升级成功！', newLevel: guild.honeyFarmLevel, cost };
  }

  private static guildExpToNext(level: number): number {
    return level * 100000;
  }

  private static applyGuildBonuses(guild: IGuild) {
    guild.bonuses.successRateBonus = (guild.jointWorkshopLevel - 1) * 0.02 + Math.floor(guild.level / 5) * 0.01;
    guild.bonuses.materialYieldBonus = (guild.honeyFarmLevel - 1) * 0.03;
    guild.bonuses.critRateBonus = (guild.honeyFarmLevel - 1) * 0.01 + Math.floor(guild.level / 10) * 0.01;
  }

  static async getGuildById(guildId: string) {
    return Guild.findById(guildId).populate({
      path: 'members.playerId',
      select: 'nickname avatar level apprenticeRank',
    });
  }

  static async getGuildByMember(playerId: string) {
    const player = await Player.findById(playerId);
    if (!player || !player.guildId) return null;
    return this.getGuildById(player.guildId.toString());
  }

  static async listGuilds(page = 1, limit = 20, sortBy: 'level' | 'members' | 'contests' = 'level') {
    const skip = (page - 1) * limit;
    let sort: any = { level: -1 };
    if (sortBy === 'members') sort = { 'members.0': -1 };
    if (sortBy === 'contests') sort = { totalContestsWon: -1 };

    const [guilds, total] = await Promise.all([
      Guild.find().sort(sort).skip(skip).limit(limit)
        .populate('leaderId', 'nickname avatar'),
      Guild.countDocuments(),
    ]);
    return { guilds, total, page, limit };
  }

  static async collectFarmYield(playerId: string): Promise<{ success: boolean; message: string; items?: Array<{ name: string; icon: string; quantity: number }> }> {
    const player = await Player.findById(playerId);
    if (!player || !player.guildId) return { success: false, message: '您未加入公会' };

    const guild = await Guild.findById(player.guildId);
    if (!guild) return { success: false, message: '公会不存在' };

    const member = guild.members.find(m => m.playerId.toString() === playerId);
    if (!member) return { success: false, message: '不是公会成员' };

    const inventory = await Inventory.findOne({ playerId });
    if (!inventory) return { success: false, message: '背包不存在' };

    const baseYield = guild.honeyFarmLevel;
    const items = [
      { name: '魔法花果', type: 'flower_fruit', icon: '🌸', quality: 'common' as const, quantity: baseYield * 3 },
      { name: '蜜糖浆', type: 'honey_syrup', icon: '🍯', quality: 'common' as const, quantity: baseYield * 2 },
      { name: '魔力结晶', type: 'magic_crystal', icon: '💎', quality: 'uncommon' as const, quantity: baseYield },
    ];

    for (const item of items) {
      const existing = inventory.materials.find(m => m.type === item.type && m.quality === item.quality);
      if (existing) existing.quantity += item.quantity;
      else {
        const mat = await Material.findOne({ type: item.type, quality: item.quality });
        if (mat) {
          inventory.materials.push({
            materialId: mat._id,
            name: mat.name,
            type: mat.type,
            quality: mat.quality,
            icon: mat.icon,
            quantity: item.quantity,
          });
        }
      }
    }

    inventory.updatedAt = new Date();
    await inventory.save();

    return { success: true, message: '农场收获成功！', items };
  }
}
