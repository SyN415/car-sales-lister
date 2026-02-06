-- ============================================
-- Car Sales Marketplace Lister - Initial Schema
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- ============================================
-- 1. Profiles
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. Car Listings
-- ============================================
CREATE TABLE IF NOT EXISTS car_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'craigslist')),
  platform_id TEXT,
  url TEXT,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  
  -- Vehicle specifics
  vin TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  mileage INTEGER,
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'salvage', NULL)),
  color TEXT,
  transmission TEXT,
  fuel_type TEXT,
  drive_type TEXT,
  body_type TEXT,
  trim_level TEXT,
  engine TEXT,
  
  -- Media
  images JSONB DEFAULT '[]',
  
  -- Seller info
  seller_name TEXT,
  seller_location TEXT,
  
  -- Analysis
  deal_score INTEGER,
  kbb_value NUMERIC(10,2),
  price_vs_kbb NUMERIC(5,2),
  ai_analysis JSONB,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to avoid duplicates
  CONSTRAINT unique_platform_listing UNIQUE (platform, platform_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_car_listings_platform ON car_listings(platform);
CREATE INDEX IF NOT EXISTS idx_car_listings_make_model ON car_listings(make, model);
CREATE INDEX IF NOT EXISTS idx_car_listings_year ON car_listings(year);
CREATE INDEX IF NOT EXISTS idx_car_listings_price ON car_listings(price);
CREATE INDEX IF NOT EXISTS idx_car_listings_mileage ON car_listings(mileage);
CREATE INDEX IF NOT EXISTS idx_car_listings_deal_score ON car_listings(deal_score);
CREATE INDEX IF NOT EXISTS idx_car_listings_created_at ON car_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_car_listings_is_active ON car_listings(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_car_listings_vin ON car_listings(vin) WHERE vin IS NOT NULL;

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_car_listings_title_trgm ON car_listings USING gin(title gin_trgm_ops);

-- ============================================
-- 3. Car Watchlists
-- ============================================
CREATE TABLE IF NOT EXISTS car_watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  
  -- Filter criteria
  make TEXT,
  model TEXT,
  min_year INTEGER,
  max_year INTEGER,
  min_price NUMERIC(10,2),
  max_price NUMERIC(10,2),
  max_mileage INTEGER,
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'salvage', NULL)),
  platforms JSONB DEFAULT '["facebook", "craigslist"]',
  location TEXT,
  search_radius_miles INTEGER DEFAULT 50,
  
  -- Notifications
  notify_email BOOLEAN NOT NULL DEFAULT TRUE,
  notify_push BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_car_watchlists_user_id ON car_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_car_watchlists_active ON car_watchlists(is_active) WHERE is_active = TRUE;

-- ============================================
-- 4. KBB Valuations (cached)
-- ============================================
CREATE TABLE IF NOT EXISTS kbb_valuations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  mileage INTEGER NOT NULL,
  condition TEXT NOT NULL,
  vin TEXT,
  
  -- Valuation data
  estimated_value NUMERIC(10,2) NOT NULL,
  low_value NUMERIC(10,2),
  high_value NUMERIC(10,2),
  source TEXT DEFAULT 'estimated',
  
  -- Cache management
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kbb_valuations_lookup ON kbb_valuations(make, model, year, condition);
CREATE INDEX IF NOT EXISTS idx_kbb_valuations_expires ON kbb_valuations(expires_at);

-- ============================================
-- 5. Deal Alerts
-- ============================================
CREATE TABLE IF NOT EXISTS deal_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  watchlist_id UUID NOT NULL REFERENCES car_watchlists(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES car_listings(id) ON DELETE CASCADE,
  
  -- Deal info
  deal_score INTEGER NOT NULL DEFAULT 0,
  price_vs_kbb NUMERIC(5,2),
  match_details JSONB DEFAULT '{}',
  
  -- Status
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate alerts
  CONSTRAINT unique_user_listing_alert UNIQUE (user_id, listing_id, watchlist_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_alerts_user_id ON deal_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_alerts_unread ON deal_alerts(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_deal_alerts_created_at ON deal_alerts(created_at DESC);

-- ============================================
-- 6. Job Queue
-- ============================================
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error TEXT,
  result JSONB,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_pending ON job_queue(status, priority DESC, scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_job_queue_type ON job_queue(type);

-- ============================================
-- 7. Updated-at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_car_listings_updated_at BEFORE UPDATE ON car_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_car_watchlists_updated_at BEFORE UPDATE ON car_watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_queue_updated_at BEFORE UPDATE ON job_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. Row Level Security (RLS) Policies
-- ============================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Car Listings (public read, admin write)
ALTER TABLE car_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active listings"
  ON car_listings FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Service role can manage listings"
  ON car_listings FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Car Watchlists (user-owned)
ALTER TABLE car_watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlists"
  ON car_watchlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create watchlists"
  ON car_watchlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlists"
  ON car_watchlists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlists"
  ON car_watchlists FOR DELETE
  USING (auth.uid() = user_id);

-- Deal Alerts (user-owned)
ALTER TABLE deal_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON deal_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON deal_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON deal_alerts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage alerts"
  ON deal_alerts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- KBB Valuations (public read, service write)
ALTER TABLE kbb_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read valuations"
  ON kbb_valuations FOR SELECT
  USING (TRUE);

CREATE POLICY "Service role can manage valuations"
  ON kbb_valuations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Job Queue (service only)
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage jobs"
  ON job_queue FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
