import { Router, Request, Response } from 'express';
import { alertService } from '../services/alert.service';
import { verifyToken, requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyToken, requireAuth);

// GET /api/alerts
router.get('/', async (req: Request, res: Response) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const alerts = await alertService.getUserAlerts(req.user!.id, unreadOnly);
    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/alerts/count
router.get('/count', async (req: Request, res: Response) => {
  try {
    const count = await alertService.getUnreadCount(req.user!.id);
    res.json({ success: true, data: { unread_count: count } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/alerts/:id/read
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    await alertService.markAsRead(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Alert marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await alertService.deleteAlert(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Alert dismissed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
