import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Player } from '../models/Player';
import { Workshop } from '../models/Workshop';
import { Inventory } from '../models/Inventory';
import { PlayerHistory } from '../models/PlayerHistory';
import { GlobalState } from '../models/GlobalState';
import { authMiddleware, AuthRequest, generateToken } from '../middleware/auth';
import { WORKSHOP_STYLES, APPRENTICE_RANKS } from '../config/constants';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, nickname } = req.body;
    if (!username || !email || !password || !nickname) {
      return res.status(400).json({ message: '请填写完整信息' });
    }
    const existing = await Player.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).json({ message: '用户名或邮箱已存在' });

    const salt = await bcrypt.genSalt(parseInt(process.env.CRYPTO_SALT_ROUNDS || '10'));
    const hashed = await bcrypt.hash(password, salt);

    const player = new Player({
      username, email, password: hashed, nickname,
      avatar: ['🍬', '🍭', '🍫', '🧁', '🎂', '🍩'][Math.floor(Math.random() * 6)],
      apprenticeRank: APPRENTICE_RANKS[0],
    });
    await player.save();

    const styleIdx = Math.floor(Math.random() * WORKSHOP_STYLES.length);
    const workshop = new Workshop({
      ownerId: player._id,
      name: `${nickname}的糖果工坊`,
      style: WORKSHOP_STYLES[styleIdx],
    });
    await workshop.save();

    const inventory = new Inventory({
      playerId: player._id,
      specialItems: [
        { itemId: 'sugar_paper', name: '试糖纸', description: '研发新配方必需的魔法纸张', icon: '📜', type: 'sugar_paper', quantity: 10 },
        { itemId: 'rare_dew', name: '稀有蜜露', description: '研发高难度配方的珍贵材料', icon: '🫧', type: 'rare_dew', quantity: 3 },
        { itemId: 'sugar_powder_consumable', name: '魔法糖粉', description: '大赛中使用，可撒糖粉提升观众喜爱', icon: '✨', type: 'consumable', quantity: 5 },
        { itemId: 'decoration_kit', name: '装饰包', description: '大赛中使用，可装饰糖果提升评委好感', icon: '🎀', type: 'consumable', quantity: 3 },
      ],
    });
    await inventory.save();

    await PlayerHistory.create({ playerId: player._id });
    await GlobalState.findOneAndUpdate({ key: 'global' }, {}, { upsert: true });

    const token = generateToken(player._id.toString());
    res.json({ success: true, token, player: { id: player._id, nickname: player.nickname, avatar: player.avatar } });
  } catch (err: any) {
    res.status(500).json({ message: err.message || '注册失败' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const player = await Player.findOne({ $or: [{ username }, { email: username }] });
    if (!player) return res.status(401).json({ message: '账号不存在' });
    const valid = await bcrypt.compare(password, player.password);
    if (!valid) return res.status(401).json({ message: '密码错误' });
    player.lastLoginAt = new Date();
    await player.save();
    const token = generateToken(player._id.toString());
    res.json({
      success: true, token,
      player: {
        id: player._id, nickname: player.nickname, avatar: player.avatar,
        level: player.level, gold: player.gold, apprenticeRank: player.apprenticeRank,
        isChief: player.isChief,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || '登录失败' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const player = await Player.findById(req.playerId).select('-password');
    if (!player) return res.status(404).json({ message: '玩家不存在' });
    const workshop = await Workshop.findOne({ ownerId: req.playerId });
    const inventory = await Inventory.findOne({ playerId: req.playerId });
    const gs = await GlobalState.findOne({ key: 'global' });
    res.json({
      player,
      workshop,
      inventory,
      festival: gs?.candyFestival || { active: false },
      serverStats: gs?.serverStats,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { nickname, avatar } = req.body;
    const player = await Player.findByIdAndUpdate(
      req.playerId,
      { $set: { nickname, avatar } },
      { new: true }
    ).select('-password');
    res.json({ success: true, player });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export const authRouter = router;
