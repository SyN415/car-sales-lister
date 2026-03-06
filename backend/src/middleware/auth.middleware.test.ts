import jwt from 'jsonwebtoken';
import { verifyToken } from './auth.middleware';
import { authService } from '../services/auth.service';

jest.mock('../services/auth.service', () => ({
  authService: {
    getCurrentUser: jest.fn(),
  },
}));

describe('verifyToken', () => {
  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('returns Token expired for expired jwt errors without logging a server error', async () => {
    const req: any = { headers: { authorization: 'Bearer expired-token' }, cookies: {} };
    const res = makeRes();
    const next = jest.fn();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    jest.spyOn(jwt, 'verify').mockImplementation(() => {
      throw new jwt.TokenExpiredError('jwt expired', new Date());
    });

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Token expired' });
    expect(next).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('returns Invalid token for invalid jwt errors', async () => {
    const req: any = { headers: { authorization: 'Bearer bad-token' }, cookies: {} };
    const res = makeRes();
    const next = jest.fn();

    jest.spyOn(jwt, 'verify').mockImplementation(() => {
      throw new jwt.JsonWebTokenError('invalid token');
    });

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches the user and calls next for a valid token', async () => {
    const req: any = { headers: { authorization: 'Bearer valid-token' }, cookies: {} };
    const res = makeRes();
    const next = jest.fn();

    jest.spyOn(jwt, 'verify').mockReturnValue({ sub: 'user-1' } as any);
    (authService.getCurrentUser as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'user-1', email: 'test@example.com', role: 'user' },
    });

    await verifyToken(req, res, next);

    expect(req.user).toEqual({ id: 'user-1', email: 'test@example.com', role: 'user' });
    expect(req.token).toBe('valid-token');
    expect(next).toHaveBeenCalled();
  });
});