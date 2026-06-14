import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { ReportService } from '../services/ReportService';
import { LeaderboardService } from '../services/LeaderboardService';

const router = Router();

router.get('/report/latest', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const report = await ReportService.getLatestReport();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/report/history', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(_req.query.page as string) || 1;
    const limit = parseInt(_req.query.limit as string) || 10;
    const result = await ReportService.getReportHistory(page, limit);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/report/generate', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const report = await ReportService.generateWeeklyReport();
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/report/pdf/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { WeeklyReport } = await import('../models/WeeklyReport');
    const report = await WeeklyReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: '报告不存在' });
    const pdf = await ReportService.generateReportPDF(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="candy-report-${report._id}.pdf"`);
    res.send(pdf);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/leaderboard/collection', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(_req.query.page as string) || 1;
    const limit = parseInt(_req.query.limit as string) || 50;
    const result = await LeaderboardService.getCollectionLeaderboard(page, limit);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/leaderboard/contest', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(_req.query.page as string) || 1;
    const limit = parseInt(_req.query.limit as string) || 50;
    const result = await LeaderboardService.getContestLeaderboard(page, limit);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/leaderboard/guild-contribution', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(_req.query.page as string) || 1;
    const limit = parseInt(_req.query.limit as string) || 50;
    const result = await LeaderboardService.getGuildContributionLeaderboard(page, limit);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/leaderboard/guild', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(_req.query.page as string) || 1;
    const limit = parseInt(_req.query.limit as string) || 30;
    const result = await LeaderboardService.getGuildLeaderboard(page, limit);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/profile/:playerId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await LeaderboardService.getPlayerPublicProfile(req.params.playerId);
    if (!profile) return res.status(404).json({ message: '玩家不存在' });
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { PlayerHistory } = await import('../models/PlayerHistory');
    const history = await PlayerHistory.findOne({ playerId: req.playerId });
    res.json(history || { candyMaking: [], contestEntries: [], trades: [], achievements: [] });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export const reportRouter = router;
