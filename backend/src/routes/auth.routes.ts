import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { verifyToken, validateRequiredFields } from '../middleware/auth.middleware';

const router = Router();

// POST /api/auth/signup
router.post('/signup', validateRequiredFields(['email', 'password']), async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;
    const result = await authService.signup(email, password, fullName);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', validateRequiredFields(['email', 'password']), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    if (!result.success) {
      res.status(401).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const result = await authService.logout();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
});

export default router;
