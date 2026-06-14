import { Player } from '../models/Player';
import { Guild } from '../models/Guild';
import { Candy } from '../models/Candy';
import { Workshop } from '../models/Workshop';
import { PlayerHistory } from '../models/PlayerHistory';

export interface LeaderboardEntry {
  id: string;
  rank: number;
  nickname: string;
  avatar: string;
  score: number;
  level?: number;
  extra?: any;
}

export class LeaderboardService {
  static async getCollectionLeaderboard(page = 1, limit = 50): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    const skip = (page - 1) * limit;
    const players = await Player.find({ collectionScore: { $gt: 0 } })
      .sort({ collectionScore: -1 })
      .skip(skip)
      .limit(limit)
      .select('nickname avatar collectionScore level guildId');

    const total = await Player.countDocuments({ collectionScore: { $gt: 0 } });

    return {
      entries: players.map((p, i) => ({
        id: p._id.toString(),
        rank: skip + i + 1,
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.collectionScore || 0,
        level: p.level,
        extra: { guildId: p.guildId?.toString() },
      })),
      total,
    };
  }

  static async getContestLeaderboard(page = 1, limit = 50): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    const skip = (page - 1) * limit;
    const players = await Player.find({ contestScore: { $gt: 0 } })
      .sort({ contestScore: -1 })
      .skip(skip)
      .limit(limit)
      .select('nickname avatar contestScore level');

    const total = await Player.countDocuments({ contestScore: { $gt: 0 } });

    return {
      entries: players.map((p, i) => ({
        id: p._id.toString(),
        rank: skip + i + 1,
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.contestScore || 0,
        level: p.level,
      })),
      total,
    };
  }

  static async getGuildContributionLeaderboard(page = 1, limit = 50): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    const skip = (page - 1) * limit;
    const players = await Player.find({ guildContribution: { $gt: 0 } })
      .sort({ guildContribution: -1 })
      .skip(skip)
      .limit(limit)
      .select('nickname avatar guildContribution level guildId');

    const total = await Player.countDocuments({ guildContribution: { $gt: 0 } });

    return {
      entries: players.map((p, i) => ({
        id: p._id.toString(),
        rank: skip + i + 1,
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.guildContribution || 0,
        level: p.level,
        extra: { guildId: p.guildId?.toString() },
      })),
      total,
    };
  }

  static async getGuildLeaderboard(page = 1, limit = 30): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    const skip = (page - 1) * limit;
    const guilds = await Guild.find()
      .sort({ level: -1, totalContestsWon: -1 })
      .skip(skip)
      .limit(limit)
      .populate('leaderId', 'nickname avatar');

    const total = await Guild.countDocuments();

    return {
      entries: guilds.map((g, i) => ({
        id: g._id.toString(),
        rank: skip + i + 1,
        nickname: g.name,
        avatar: g.emblem,
        score: g.level * 10000 + g.totalContestsWon * 500 + g.members.length * 100,
        level: g.level,
        extra: {
          memberCount: g.members.length,
          leader: (g.leaderId as any)?.nickname,
          contestsWon: g.totalContestsWon,
        },
      })),
      total,
    };
  }

  static async getPlayerPublicProfile(playerId: string) {
    const [player, workshop, history, candies] = await Promise.all([
      Player.findById(playerId).select('-password -email'),
      Workshop.findOne({ ownerId: playerId }).populate('ownerId', 'nickname'),
      PlayerHistory.findOne({ playerId }),
      Candy.find({ creatorId: playerId }).sort({ createdAt: -1 }).limit(20),
    ]);

    if (!player) return null;

    const recentRecords = history?.candyMaking
      ?.slice(-10)
      .reverse()
      .map(r => ({
        candyId: r.candyId,
        result: r.result,
        timestamp: r.timestamp,
      })) || [];

    return {
      player: {
        id: player._id,
        nickname: player.nickname,
        avatar: player.avatar,
        level: player.level,
        apprenticeRank: player.apprenticeRank,
        collectionScore: player.collectionScore,
        contestScore: player.contestScore,
        guildContribution: player.guildContribution,
        isChief: player.isChief,
        skills: player.skills,
      },
      workshop,
      recentRecords,
      recentCandies: candies,
    };
  }
}
