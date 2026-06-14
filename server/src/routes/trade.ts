import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { TradeService } from '../services/TradeService';
import { Player } from '../models/Player';
import { getSocketServer } from '../socket';

const router = Router();

router.get('/suggest-price', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { itemType, itemId } = req.query;
    if (!itemType || !itemId) return res.status(400).json({ message: '缺少参数' });
    const suggestion = await TradeService.calculatePriceSuggestion(itemType as 'candy' | 'recipe', itemId as string);
    res.json(suggestion);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { itemType, itemId, quantity, askingPrice } = req.body;
    const result = await TradeService.listItem(req.playerId!, itemType, itemId, quantity, askingPrice);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/buy', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await TradeService.buyItem(req.playerId!, req.params.id);
    if (result.success && result.trade) {
      const io = getSocketServer.get();
      const [buyer, seller] = await Promise.all([
        Player.findById(req.playerId).select('nickname'),
        Player.findById(result.trade.sellerId).select('nickname'),
      ]);
      if (io && buyer && seller) {
        io.emit('trade_completed', {
          tradeId: result.trade._id,
          itemType: result.trade.itemType,
          buyer: buyer.nickname,
          seller: seller.nickname,
          price: result.trade.askingPrice,
          quantity: result.trade.quantity,
          totalValue: result.trade.askingPrice * result.trade.quantity,
          festivalTriggered: result.festivalTriggered,
          timestamp: new Date(),
        });
        if (result.festivalTriggered) {
          io.emit('candy_festival_started', {
            triggeredBy: buyer.nickname,
            critBonus: parseFloat(process.env.CANDY_FESTIVAL_CRIT_BONUS || '0.3'),
            endsAt: new Date().setHours(23, 59, 59, 999),
          });
        }
      }
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await TradeService.cancelListing(req.playerId!, req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/marketplace', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const itemType = req.query.itemType as 'candy' | 'recipe' | undefined;
    const qualityFilter = req.query.quality as any;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = (req.query.sortBy as any) || 'newest';
    const result = await TradeService.getMarketplace(itemType, qualityFilter, page, limit, sortBy);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my/:role', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.params.role as 'seller' | 'buyer';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await TradeService.getMyTrades(req.playerId!, role, page, limit);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export const tradeRouter = router;
