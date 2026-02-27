import dotenv from 'dotenv';

dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',

  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'your-cookie-secret-change-in-production',

  // Rate limiting (300 req per 15 min per IP — enough for normal browsing)
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),

  // KBB / Vehicle Valuation
  KBB_API_KEY: process.env.KBB_API_KEY || '',
  KBB_API_URL: process.env.KBB_API_URL || '',
  NADA_API_KEY: process.env.NADA_API_KEY || '',
  EDMUNDS_API_KEY: process.env.EDMUNDS_API_KEY || '',

  // VIN Decoder
  VIN_DECODER_API_KEY: process.env.VIN_DECODER_API_KEY || '',
  VIN_DECODER_API_URL: process.env.VIN_DECODER_API_URL || 'https://vpic.nhtsa.dot.gov/api',

  // NHTSA (Recalls & Complaints)
  NHTSA_API_URL: 'https://api.nhtsa.gov',

  // Bright Data (Web Scraping)
  BRIGHT_DATA_ZONE: process.env.BRIGHT_DATA_ZONE || '',
  BRIGHT_DATA_USERNAME: process.env.BRIGHT_DATA_USERNAME || '',
  BRIGHT_DATA_PASSWORD: process.env.BRIGHT_DATA_PASSWORD || '',
  BRIGHT_DATA_HOST: process.env.BRIGHT_DATA_HOST || '',

  // OpenRouter (AI)
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'google/gemini-flash-1.5',

  // Stripe (Optional)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID || '',

  // Email Notifications
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@carsaleslister.com',
};

export default config;
