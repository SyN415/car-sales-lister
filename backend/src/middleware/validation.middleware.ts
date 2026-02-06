import { Request, Response, NextFunction } from 'express';

/**
 * Validate car listing search parameters
 */
export const validateCarSearchParams = (req: Request, res: Response, next: NextFunction): void => {
  const { min_year, max_year, min_price, max_price, max_mileage } = req.query;

  if (min_year && (isNaN(Number(min_year)) || Number(min_year) < 1900 || Number(min_year) > new Date().getFullYear() + 1)) {
    res.status(400).json({ success: false, error: 'Invalid min_year parameter' });
    return;
  }
  if (max_year && (isNaN(Number(max_year)) || Number(max_year) < 1900 || Number(max_year) > new Date().getFullYear() + 1)) {
    res.status(400).json({ success: false, error: 'Invalid max_year parameter' });
    return;
  }
  if (min_price && (isNaN(Number(min_price)) || Number(min_price) < 0)) {
    res.status(400).json({ success: false, error: 'Invalid min_price parameter' });
    return;
  }
  if (max_price && (isNaN(Number(max_price)) || Number(max_price) < 0)) {
    res.status(400).json({ success: false, error: 'Invalid max_price parameter' });
    return;
  }
  if (max_mileage && (isNaN(Number(max_mileage)) || Number(max_mileage) < 0)) {
    res.status(400).json({ success: false, error: 'Invalid max_mileage parameter' });
    return;
  }

  next();
};

/**
 * Validate VIN format (17 characters, alphanumeric excluding I, O, Q)
 */
export const validateVin = (req: Request, res: Response, next: NextFunction): void => {
  const vin = req.params.vin || req.body.vin || req.query.vin;

  if (vin) {
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
    if (!vinRegex.test(vin)) {
      res.status(400).json({ success: false, error: 'Invalid VIN format. Must be 17 alphanumeric characters.' });
      return;
    }
  }

  next();
};
