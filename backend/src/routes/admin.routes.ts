import { Router, Request, Response } from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';
import { scraperService } from '../services/scraper.service';
import { jobQueueService } from '../services/job-queue.service';

const router = Router();

router.use(verifyToken, requireAdmin);

// POST /api/admin/scrape - Trigger marketplace scraping
router.post('/scrape', async (req: Request, res: Response) => {
  try {
    const { location, make, model, platforms } = req.body;

    if (!location) {
      res.status(400).json({ success: false, error: 'Location is required' });
      return;
    }

    // Enqueue scrape jobs
    const jobs = [];
    const targetPlatforms = platforms || ['facebook', 'craigslist'];

    for (const platform of targetPlatforms) {
      const job = await jobQueueService.enqueue(`scrape_${platform}`, {
        location,
        make,
        model,
      });
      jobs.push(job);
    }

    res.json({ success: true, data: { jobs, message: `${jobs.length} scrape job(s) enqueued` } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/metrics - System metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
