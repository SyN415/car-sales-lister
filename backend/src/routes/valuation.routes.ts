import { Router, Request, Response } from 'express';
import { kbbService } from '../services/kbb.service';
import { vinDecoderService } from '../services/vin-decoder.service';
import { aiService } from '../services/ai.service';
import { verifyToken, requireAuth } from '../middleware/auth.middleware';
import { validateVin } from '../middleware/validation.middleware';

const router = Router();

// GET /api/valuations/kbb - Get KBB valuation
router.get('/kbb', verifyToken, requireAuth, async (req: Request, res: Response) => {
  try {
    const { make, model, year, mileage, condition, vin } = req.query;

    if (!make || !model || !year || !mileage || !condition) {
      res.status(400).json({
        success: false,
        error: 'Required: make, model, year, mileage, condition',
      });
      return;
    }

    const valuation = await kbbService.getValuation({
      vin: vin as string,
      make: make as string,
      model: model as string,
      year: Number(year),
      mileage: Number(mileage),
      condition: condition as string,
    });

    res.json({ success: true, data: valuation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/valuations/vin/:vin - Decode VIN
router.get('/vin/:vin', validateVin, async (req: Request, res: Response) => {
  try {
    const result = await vinDecoderService.decodeVin(req.params.vin);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/valuations/analyze - AI-powered vehicle analysis
router.post('/analyze', verifyToken, requireAuth, async (req: Request, res: Response) => {
  try {
    const analysis = await aiService.analyzeVehicleListing(req.body);
    res.json({ success: true, data: analysis });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
