import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import config from './config/config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { startPeriodicTasks } from './jobs/periodic-tasks';

// Route imports
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import listingRoutes from './routes/listing.routes';
import watchlistRoutes from './routes/watchlist.routes';
import alertRoutes from './routes/alert.routes';
import valuationRoutes from './routes/valuation.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Trust the first proxy (required on Render / any reverse-proxy host so that
// express-rate-limit can read X-Forwarded-For and identify clients correctly)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: [config.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
}));

// Rate limiting — applied only to API routes, not static assets
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check route
app.use('/health', healthRoutes);

// API routes (rate limiter scoped here only)
app.use('/api/auth', limiter, authRoutes);
app.use('/api/listings', limiter, listingRoutes);
app.use('/api/watchlists', limiter, watchlistRoutes);
app.use('/api/alerts', limiter, alertRoutes);
app.use('/api/valuations', limiter, valuationRoutes);
app.use('/api/admin', limiter, adminRoutes);

// Serve static files from the frontend build directory
const frontendPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`🚗 Car Sales Lister API running on port ${PORT}`);
  console.log(`📍 Environment: ${config.NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${config.FRONTEND_URL}`);

  // Start periodic tasks in production/development
  if (config.NODE_ENV !== 'test') {
    startPeriodicTasks();
  }
});

export default app;
