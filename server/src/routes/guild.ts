import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { GuildService } from '../services/GuildService';

const router = Router();

router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const guild = await GuildService.getGuildByMember(req.playerId!);
    res.json({ guild });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, emblem } = req.body;
    const result = await GuildService.createGuild(req.playerId!, name, description, emblem);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await GuildService.joinGuild(req.playerId!, req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await GuildService.leaveGuild(req.playerId!);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/contribute/materials', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await GuildService.contributeMaterials(req.playerId!, req.body.contributions || []);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/contribute/gold', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const result = await GuildService.contributeGold(req.playerId!, parseInt(amount));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/upgrade/workshop', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { Player } = await import('../models/Player');
    const { Guild } = await import('../models/Guild');
    const player = await Player.findById(req.playerId);
    if (!player?.guildId) return res.status(400).json({ message: '未加入公会' });
    const guild = await Guild.findById(player.guildId);
    if (!guild) return res.status(404).json({ message: '公会不存在' });
    const member = guild.members.find(m => m.playerId.toString() === req.playerId);
    if (!member || !['leader', 'officer'].includes(member.role)) {
      return res.status(403).json({ message: '仅干部可升级' });
    }
    const result = await GuildService.upgradeJointWorkshop(guild._id.toString());
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/upgrade/farm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { Player } = await import('../models/Player');
    const { Guild } = await import('../models/Guild');
    const player = await Player.findById(req.playerId);
    if (!player?.guildId) return res.status(400).json({ message: '未加入公会' });
    const guild = await Guild.findById(player.guildId);
    if (!guild) return res.status(404).json({ message: '公会不存在' });
    const member = guild.members.find(m => m.playerId.toString() === req.playerId);
    if (!member || !['leader', 'officer'].includes(member.role)) {
      return res.status(403).json({ message: '仅干部可升级' });
    }
    const result = await GuildService.upgradeHoneyFarm(guild._id.toString());
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/farm/collect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await GuildService.collectFarmYield(req.playerId!);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/list', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(_req.query.page as string) || 1;
    const limit = parseInt(_req.query.limit as string) || 20;
    const sortBy = (_req.query.sortBy as any) || 'level';
    const result = await GuildService.listGuilds(page, limit, sortBy);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const guild = await GuildService.getGuildById(req.params.id);
    res.json(guild);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export const guildRouter = router;
