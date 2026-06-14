import { Router, Response } from 'express';
import { Workshop } from '../models/Workshop';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { WORKSHOP_STYLES } from '../config/constants';

const router = Router();

router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const workshop = await Workshop.findOne({ ownerId: req.playerId });
    if (!workshop) return res.status(404).json({ message: '工坊不存在' });
    res.json(workshop);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, style, isPublic, layout, decorations } = req.body;
    const update: any = {};
    if (name) update.name = name;
    if (style && WORKSHOP_STYLES.includes(style)) update.style = style;
    if (typeof isPublic === 'boolean') update.isPublic = isPublic;
    if (layout) update.layout = layout;
    if (decorations) update.decorations = decorations;

    const workshop = await Workshop.findOneAndUpdate(
      { ownerId: req.playerId },
      { $set: update },
      { new: true }
    );
    res.json({ success: true, workshop });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/upgrade/:station', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const station = req.params.station as 'candyPot' | 'mixingBowl' | 'decorationTable';
    const validStations = ['candyPot', 'mixingBowl', 'decorationTable'];
    if (!validStations.includes(station)) return res.status(400).json({ message: '无效的设备' });

    const { Player } = await import('../models/Player');
    const player = await Player.findById(req.playerId);
    const workshop = await Workshop.findOne({ ownerId: req.playerId });
    if (!player || !workshop) return res.status(404).json({ message: '数据不存在' });

    const currentLevel = (workshop.stations as any)[station].level;
    const cost = currentLevel * 5000;
    if (player.gold < cost) return res.status(400).json({ message: '金币不足' });

    player.gold -= cost;
    await player.save();

    (workshop.stations as any)[station].level = currentLevel + 1;
    workshop.markModified('stations');
    await workshop.save();

    res.json({ success: true, message: '升级成功！', workshop, remainingGold: player.gold });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/public/:id', async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id).populate('ownerId', 'nickname avatar level apprenticeRank');
    if (!workshop || !workshop.isPublic) return res.status(404).json({ message: '工坊不存在或未公开' });
    res.json(workshop);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export const workshopRouter = router;
