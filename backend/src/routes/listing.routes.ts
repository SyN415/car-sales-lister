import { Router, Request, Response } from 'express';
import { listingService } from '../services/listing.service';
import { optionalAuth, verifyToken, requireAuth } from '../middleware/auth.middleware';
import { validateCarSearchParams } from '../middleware/validation.middleware';

const router = Router();

// POST /api/listings - Submit a listing (from extension content scripts)
router.post('/', verifyToken, requireAuth, async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.platform || !body.title) {
      res.status(400).json({ success: false, error: 'platform and title are required' });
      return;
    }

    const input = {
      platform: body.platform,
      platform_listing_id: body.platform_id || body.platform_listing_id || `ext-${Date.now()}`,
      title: body.title,
      description: body.description || null,
      price: body.price || 0,
      vin: body.vin || null,
      make: body.make || null,
      model: body.model || null,
      year: body.year || null,
      mileage: body.mileage || null,
      condition: body.condition || null,
      location: body.seller_location || body.location || null,
      images: body.images || [],
      seller_info: body.seller_name ? { name: body.seller_name } : undefined,
      platform_url: body.url || body.platform_url || '',
    };

    const listing = await listingService.upsertListing(input);
    res.status(201).json({ success: true, data: listing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/listings - Get car listings with filters
router.get('/', optionalAuth, validateCarSearchParams, async (req: Request, res: Response) => {
  try {
    const filters = {
      platform: req.query.platform as any,
      make: req.query.make as string,
      model: req.query.model as string,
      min_year: req.query.min_year ? Number(req.query.min_year) : undefined,
      max_year: req.query.max_year ? Number(req.query.max_year) : undefined,
      min_price: req.query.min_price ? Number(req.query.min_price) : undefined,
      max_price: req.query.max_price ? Number(req.query.max_price) : undefined,
      max_mileage: req.query.max_mileage ? Number(req.query.max_mileage) : undefined,
      condition: req.query.condition as any,
      location: req.query.location as string,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      sort_by: req.query.sort_by as any,
      sort_order: req.query.sort_order as any,
    };

    const result = await listingService.getListings(filters);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/listings/search - Search listings
router.get('/search', optionalAuth, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ success: false, error: 'Search query is required' });
      return;
    }

    const results = await listingService.searchListings(query, req.query as any);
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/listings/:id - Get listing details
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const listing = await listingService.getListingById(req.params.id);
    if (!listing) {
      res.status(404).json({ success: false, error: 'Listing not found' });
      return;
    }

    res.json({ success: true, data: listing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
