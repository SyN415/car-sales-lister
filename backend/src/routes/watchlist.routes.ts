import { Router, Request, Response } from 'express';
import { watchlistService } from '../services/watchlist.service';
import { verifyToken, requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All watchlist routes require authentication
router.use(verifyToken, requireAuth);

// GET /api/watchlists
router.get('/', async (req: Request, res: Response) => {
  try {
    const watchlists = await watchlistService.getUserWatchlists(req.user!.id);
    res.json({ success: true, data: watchlists });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/watchlists
router.post('/', async (req: Request, res: Response) => {
  try {
    const watchlist = await watchlistService.createWatchlist(req.user!.id, req.body);
    res.status(201).json({ success: true, data: watchlist });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/watchlists/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const watchlist = await watchlistService.updateWatchlist(req.params.id, req.user!.id, req.body);
    res.json({ success: true, data: watchlist });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/watchlists/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await watchlistService.deleteWatchlist(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Watchlist deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
