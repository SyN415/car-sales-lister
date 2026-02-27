import { Router, Request, Response } from 'express';
import { kbbService } from '../services/kbb.service';
import { vinDecoderService } from '../services/vin-decoder.service';
import { aiService } from '../services/ai.service';
import { compsService } from '../services/comps.service';
import { nhtsaService } from '../services/nhtsa.service';
import { fuelEconomyService } from '../services/fuel-economy.service';
import { eiaService } from '../services/eia.service';
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

// GET /api/valuations/resellability - Get resellability score from comps engine
router.get('/resellability', verifyToken, requireAuth, async (req: Request, res: Response) => {
  try {
    const { make, model, year, price, mileage } = req.query;

    if (!make || !model || !year || !price) {
      res.status(400).json({
        success: false,
        error: 'Required: make, model, year, price',
      });
      return;
    }

    const result = await compsService.getResellabilityScore(
      make as string,
      model as string,
      Number(year),
      Number(price),
      Number(mileage) || 50000
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/valuations/nhtsa - Get NHTSA recalls and complaints
router.get('/nhtsa', verifyToken, requireAuth, async (req: Request, res: Response) => {
  try {
    const { make, model, year } = req.query;

    if (!make || !model || !year) {
      res.status(400).json({
        success: false,
        error: 'Required: make, model, year',
      });
      return;
    }

    const result = await nhtsaService.getRecallsAndComplaints(
      make as string,
      model as string,
      Number(year)
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/valuations/fuel-economy - Get fuel economy data
router.get('/fuel-economy', verifyToken, requireAuth, async (req: Request, res: Response) => {
  try {
    const { make, model, year } = req.query;

    if (!make || !model || !year) {
      res.status(400).json({
        success: false,
        error: 'Required: make, model, year',
      });
      return;
    }

    const result = await fuelEconomyService.getFuelEconomy(
      Number(year),
      make as string,
      model as string
    );

    if (!result) {
      res.status(404).json({ success: false, error: 'No fuel economy data found' });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/valuations/gas-price - Get current California gas price from EIA
router.get('/gas-price', verifyToken, requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await eiaService.getCaliforniaGasPrice();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
