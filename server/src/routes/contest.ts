import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { ContestService } from '../services/ContestService';
import { PlayerHistory } from '../models/PlayerHistory';

const router = Router();

router.get('/active', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const contest = await ContestService.getActiveContest();
    const upcoming = await ContestService.getUpcomingContest();
    res.json({ active: contest, upcoming });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/daily/create', async (_req, res) => {
  try {
    const contest = await ContestService.createDailyContest();
    res.json({ success: true, contest });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/submit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { candyId } = req.body;
    const result = await ContestService.submitEntry(req.params.id, req.playerId!, candyId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/skill', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { skillType } = req.body;
    let result;
    if (skillType === 'sugar_boost') {
      result = await ContestService.useSugarBoost(req.params.id, req.playerId!);
    } else if (skillType === 'decoration') {
      result = await ContestService.useDecoration(req.params.id, req.playerId!);
    } else {
      return res.status(400).json({ message: '无效技能' });
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { Contest } = await import('../models/Contest');
    const contest = await Contest.findById(req.params.id)
      .populate({ path: 'participants.playerId', select: 'nickname avatar' })
      .populate({ path: 'participants.candyId' });
    res.json(contest);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/finalize', async (req, res) => {
  try {
    const result = await ContestService.finalizeContest(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/history/list', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(_req.query.page as string) || 1;
    const limit = parseInt(_req.query.limit as string) || 10;
    const result = await ContestService.getContestHistory(page, limit);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my/entries', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const history = await PlayerHistory.findOne({ playerId: req.playerId });
    res.json({ entries: history?.contestEntries || [] });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export const contestRouter = router;
