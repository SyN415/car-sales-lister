// Extension configuration
const CONFIG = {
  // Backend API URL
  API_BASE_URL: 'https://car-sales-lister.onrender.com',

  // Supabase config - loaded from storage or defaults
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  // Scraping intervals (in minutes)
  SCRAPE_INTERVAL_FACEBOOK: 15,
  SCRAPE_INTERVAL_CRAIGSLIST: 15,

  // Rate limiting
  MIN_REQUEST_DELAY_MS: 2000,
  MAX_RETRIES: 3,

  // Deal score thresholds
  DEAL_SCORE_GREAT: 80,
  DEAL_SCORE_GOOD: 60,
  DEAL_SCORE_FAIR: 40,

  // Storage keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'car_sales_auth_token',
    USER: 'car_sales_user',
    SETTINGS: 'car_sales_settings',
    LAST_SCRAPE_FB: 'car_sales_last_scrape_fb',
    LAST_SCRAPE_CL: 'car_sales_last_scrape_cl',
  },
};

// Allow runtime config updates
if (typeof globalThis !== 'undefined') {
  globalThis.CAR_SALES_CONFIG = CONFIG;
}

export default CONFIG;
