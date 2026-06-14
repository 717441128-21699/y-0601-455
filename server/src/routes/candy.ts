import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { CandyService } from '../services/CandyService';
import { MaterialService } from '../services/MaterialService';
import { RecipeService } from '../services/RecipeService';

const router = Router();

router.get('/materials', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { Inventory } = await import('../models/Inventory');
    const inv = await Inventory.findOne({ playerId: req.playerId });
    if (!inv) return res.json({ materials: [], specialItems: [] });
    res.json({ materials: inv.materials, specialItems: inv.specialItems, updatedAt: inv.updatedAt });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/materials/catalog', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const type = req.query.type as any;
    const quality = req.query.quality as any;
    const result = await MaterialService.listMaterials(type, quality, page, limit);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/materials/collect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const count = parseInt(req.body.count) || 5;
    const collected = await MaterialService.collectRandom(req.playerId!, count);
    res.json({ success: true, collected });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/candy/make', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { workshopId, ingredients, recipeId, recipeName } = req.body;
    if (!workshopId || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: '参数错误' });
    }
    const result = await CandyService.makeCandy(req.playerId!, workshopId, ingredients, recipeId, recipeName);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/candies/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await CandyService.getPlayerCandies(req.playerId!, page, limit);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/candy/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const candy = await CandyService.getCandyById(req.params.id);
    res.json(candy);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/recipe/develop', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await RecipeService.developRecipe(req.playerId!, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/recipes/pending', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { Player } = await import('../models/Player');
    const player = await Player.findById(req.playerId);
    if (!player?.isChief) return res.status(403).json({ message: '仅首席调糖师可查看' });
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await RecipeService.getPendingRecipes(page, limit);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/recipe/:id/review', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { approve, note } = req.body;
    const result = await RecipeService.reviewRecipe(req.playerId!, req.params.id, !!approve, note || '');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/recipes/approved', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await RecipeService.getApprovedRecipes(page, limit, req.playerId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/apprentice/promote', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await RecipeService.requestPromotion(req.playerId!, req.body.targetRank);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/apprentice/:id/approve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await RecipeService.approvePromotion(req.playerId!, req.params.id, req.body.approve);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export const candyRouter = router;
