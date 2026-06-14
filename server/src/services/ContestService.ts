import { Types } from 'mongoose';
import { Contest, IContest, ContestParticipant, JuryMember } from '../models/Contest';
import { Candy } from '../models/Candy';
import { Player } from '../models/Player';
import { PlayerHistory } from '../models/PlayerHistory';
import { GlobalState } from '../models/GlobalState';
import { Recipe } from '../models/Recipe';

export interface SkillBoostResult {
  success: boolean;
  message: string;
  participant?: ContestParticipant;
  audienceGain?: number;
  juryGain?: number;
}

const JURY_POOL: Omit<JuryMember, '_id'>[] = [
  { name: '糖霜大师·艾琳', avatar: '👩‍🍳', strictness: 0.6, bias: { sparkle: 0.2, sweetness: 0.15 } },
  { name: '魔法甜点师·洛基', avatar: '🧙', strictness: 0.4, bias: { invisibility: 0.25, magicDuration: 0.2 } },
  { name: '首席品糖官·赛琳娜', avatar: '👸', strictness: 0.8, bias: { rarityScore: 0.3, affixes: 0.15 } },
  { name: '糖果诗人·维伦', avatar: '🎭', strictness: 0.5, bias: { flying_kiss: 0.2, creativity: 0.2 } },
  { name: '宫廷烘焙师·戈多', avatar: '👨‍🍳', strictness: 0.7, bias: { technique: 0.2, quality: 0.2 } },
];

const THEMES = [
  { name: '春日花语', desc: '以花果为主题，展现春天的甜美气息' },
  { name: '星河璀璨', desc: '追求稀有词缀和闪光效果的视觉盛宴' },
  { name: '魔力试炼', desc: '侧重魔力持续时间和魔法效果的比赛' },
  { name: '创意狂想曲', desc: '考验创意搭配和独特配方的创新赛' },
  { name: '经典传承', desc: '比拼基础技巧和传统口味的经典赛' },
];

export class ContestService {
  static async createDailyContest(): Promise<IContest> {
    const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startTime = new Date(today);
    startTime.setHours(10, 0, 0, 0);
    const submissionDeadline = new Date(today);
    submissionDeadline.setHours(18, 0, 0, 0);
    const endTime = new Date(today);
    endTime.setHours(20, 0, 0, 0);

    const selectedJury = [...JURY_POOL].sort(() => Math.random() - 0.5).slice(0, 3);

    const contest = new Contest({
      title: `${theme.name} - 每日甜点大赛`,
      description: theme.desc,
      theme: theme.name,
      status: 'scheduled',
      startTime,
      endTime,
      submissionDeadline,
      maxParticipants: 100,
      jury: selectedJury,
      audienceSize: 1000 + Math.floor(Math.random() * 2000),
      scoringWeights: { jury: 0.5, audience: 0.3, quality: 0.2 },
      rewards: {
        ranks: {
          '1': { points: 1000, gold: 5000, recipeBlueprint: '限定_星霜糖' },
          '2': { points: 600, gold: 3000 },
          '3': { points: 400, gold: 2000 },
          '4-10': { points: 200, gold: 1000 },
          '11-30': { points: 100, gold: 500 },
        },
        participation: { points: 20, gold: 100 },
      },
      prizePool: 10000,
      totalRounds: 3,
    });
    await contest.save();

    await GlobalState.findOneAndUpdate(
      { key: 'global' },
      { $set: { dailyContestId: contest._id.toString(), 'serverStats.contestsToday': 1 } },
      { upsert: true }
    );

    return contest;
  }

  static async submitEntry(
    contestId: string,
    playerId: string,
    candyId: string
  ): Promise<{ success: boolean; message: string; participant?: ContestParticipant }> {
    const contest = await Contest.findById(contestId);
    if (!contest) return { success: false, message: '比赛不存在' };

    const now = new Date();
    if (now < contest.startTime) return { success: false, message: '比赛尚未开始' };
    if (now > contest.submissionDeadline) return { success: false, message: '报名已截止' };
    if (contest.participants.length >= contest.maxParticipants) {
      return { success: false, message: '参赛人数已满' };
    }
    if (contest.participants.some(p => p.playerId.toString() === playerId)) {
      return { success: false, message: '您已报名参赛' };
    }

    const candy = await Candy.findById(candyId);
    if (!candy) return { success: false, message: '糖果不存在' };
    if (candy.creatorId.toString() !== playerId) return { success: false, message: '只能提交自己制作的糖果' };
    if (candy.inTrade) return { success: false, message: '该糖果正在交易中' };

    const juryScores = contest.jury.map(() => 0);
    const participant: ContestParticipant = {
      playerId: new Types.ObjectId(playerId),
      candyId: new Types.ObjectId(candyId),
      submittedAt: now,
      juryScores,
      audienceLove: 0,
      boostCount: 0,
      decorationCount: 0,
      totalScore: 0,
    };

    contest.participants.push(participant);
    contest.events.push({
      timestamp: now,
      type: 'join',
      playerId: new Types.ObjectId(playerId),
      message: `选手加入了比赛`,
    });
    await contest.save();

    return { success: true, message: '报名成功！', participant };
  }

  static async useSugarBoost(
    contestId: string,
    playerId: string
  ): Promise<SkillBoostResult> {
    const contest = await Contest.findById(contestId);
    if (!contest) return { success: false, message: '比赛不存在' };
    if (contest.status !== 'ongoing') return { success: false, message: '比赛未进行中' };

    const pIdx = contest.participants.findIndex(p => p.playerId.toString() === playerId);
    if (pIdx === -1) return { success: false, message: '您未参赛' };

    const participant = contest.participants[pIdx];
    if (participant.boostCount >= 5) return { success: false, message: '今日撒糖粉次数已用完' };

    const inventory = await (await import('../models/Inventory')).Inventory.findOne({ playerId });
    const powder = inventory?.specialItems.find(i => i.itemId === 'sugar_powder_consumable');
    if (!powder || powder.quantity < 1) return { success: false, message: '糖粉不足' };
    powder.quantity -= 1;
    await inventory!.save();

    const audienceGain = 20 + Math.floor(Math.random() * 30);
    participant.audienceLove += audienceGain;
    participant.boostCount += 1;

    contest.events.push({
      timestamp: new Date(),
      type: 'skill',
      playerId: new Types.ObjectId(playerId),
      message: `使用了撒糖粉技能，观众喜爱值+${audienceGain}`,
    });
    contest.markModified('participants');
    await contest.save();

    return { success: true, message: `撒糖粉成功！观众喜爱值+${audienceGain}`, participant, audienceGain };
  }

  static async useDecoration(
    contestId: string,
    playerId: string
  ): Promise<SkillBoostResult> {
    const contest = await Contest.findById(contestId);
    if (!contest) return { success: false, message: '比赛不存在' };
    if (contest.status !== 'ongoing') return { success: false, message: '比赛未进行中' };

    const pIdx = contest.participants.findIndex(p => p.playerId.toString() === playerId);
    if (pIdx === -1) return { success: false, message: '您未参赛' };

    const participant = contest.participants[pIdx];
    if (participant.decorationCount >= 3) return { success: false, message: '今日装饰次数已用完' };

    const inventory = await (await import('../models/Inventory')).Inventory.findOne({ playerId });
    const deco = inventory?.specialItems.find(i => i.itemId === 'decoration_kit');
    if (!deco || deco.quantity < 1) return { success: false, message: '装饰包不足' };
    deco.quantity -= 1;
    await inventory!.save();

    const juryGain = 3 + Math.floor(Math.random() * 5);
    participant.juryScores = participant.juryScores.map(s => s + juryGain);
    participant.decorationCount += 1;

    contest.events.push({
      timestamp: new Date(),
      type: 'skill',
      playerId: new Types.ObjectId(playerId),
      message: `使用了装饰技能，评委好感+${juryGain}`,
    });
    contest.markModified('participants');
    await contest.save();

    return { success: true, message: `装饰成功！评委好感+${juryGain}`, participant, juryGain };
  }

  static async updateContestScores(contestId: string): Promise<IContest | null> {
    const contest = await Contest.findById(contestId);
    if (!contest) return null;

    for (const participant of contest.participants) {
      const candy = await Candy.findById(participant.candyId);
      if (!candy) continue;

      let qualityScore = (candy.rarityScore / 100) * contest.scoringWeights.quality;
      const qualityIdx = ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(candy.quality);
      qualityScore += qualityIdx * 10;

      let juryScore = 0;
      for (let j = 0; j < contest.jury.length; j++) {
        const jury = contest.jury[j];
        let base = 50 + Math.random() * 30;
        base += candy.specialEffects.length * (jury.bias?.['effects'] || 5);
        base += candy.affixes.length * (jury.bias?.['affixes'] || 3);
        base *= (1 - jury.strictness * 0.3);
        participant.juryScores[j] = Math.max(0, Math.min(100, Math.round(base + (participant.juryScores[j] || 0))));
        juryScore += participant.juryScores[j];
      }
      juryScore = (juryScore / contest.jury.length) * contest.scoringWeights.jury;

      const audienceScore = Math.min(100, participant.audienceLove) * contest.scoringWeights.audience;

      participant.totalScore = Math.round(qualityScore + juryScore + audienceScore);
    }

    const scoresMap: Record<string, number> = {};
    contest.participants.forEach(p => {
      scoresMap[p.playerId.toString()] = p.totalScore;
    });
    contest.scoreHistory.push({
      timestamp: new Date(),
      scores: scoresMap,
    });

    contest.markModified('participants');
    contest.markModified('scoreHistory');
    await contest.save();
    return contest;
  }

  static async finalizeContest(contestId: string): Promise<{ success: boolean; message: string; results?: ContestParticipant[] }> {
    const contest = await Contest.findById(contestId);
    if (!contest) return { success: false, message: '比赛不存在' };
    if (contest.status === 'completed') return { success: false, message: '比赛已结束' };

    await this.updateContestScores(contestId);
    const reloaded = await Contest.findById(contestId);
    if (!reloaded) return { success: false, message: '加载比赛失败' };

    const sorted = [...reloaded.participants].sort((a, b) => b.totalScore - a.totalScore);
    sorted.forEach((p, idx) => {
      const rank = idx + 1;
      p.rank = rank;

      let reward = { ...reloaded.rewards.participation };
      if (rank === 1) reward = { ...reward, ...(reloaded.rewards.ranks as any)['1'] };
      else if (rank === 2) reward = { ...reward, ...(reloaded.rewards.ranks as any)['2'] };
      else if (rank === 3) reward = { ...reward, ...(reloaded.rewards.ranks as any)['3'] };
      else if (rank <= 10) reward = { ...reward, ...(reloaded.rewards.ranks as any)['4-10'] };
      else if (rank <= 30) reward = { ...reward, ...(reloaded.rewards.ranks as any)['11-30'] };

      p.reward = { points: reward.points, gold: reward.gold };
    });

    for (const p of sorted) {
      const player = await Player.findById(p.playerId);
      if (player && p.reward) {
        player.contestScore += p.reward.points;
        player.gold += p.reward.gold;
        player.points += p.reward.points;
        if (p.rank === 1) {
          player.exp += 1000;
        }
        await player.save();

        await PlayerHistory.findOneAndUpdate(
          { playerId: p.playerId },
          {
            $push: {
              contestEntries: {
                contestId: reloaded._id,
                candyId: p.candyId,
                rank: p.rank!,
                score: p.totalScore,
              },
            },
          },
          { upsert: true }
        );
      }
    }

    reloaded.status = 'completed';
    reloaded.participants = sorted;
    reloaded.markModified('participants');
    await reloaded.save();

    return { success: true, message: '比赛已结束！', results: sorted };
  }

  static async getActiveContest() {
    const now = new Date();
    return Contest.findOne({
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).sort({ startTime: -1 });
  }

  static async getUpcomingContest() {
    const now = new Date();
    return Contest.findOne({
      startTime: { $gt: now },
    }).sort({ startTime: 1 });
  }

  static async getContestHistory(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [contests, total] = await Promise.all([
      Contest.find({ status: 'completed' }).sort({ endTime: -1 }).skip(skip).limit(limit),
      Contest.countDocuments({ status: 'completed' }),
    ]);
    return { contests, total, page, limit };
  }
}
