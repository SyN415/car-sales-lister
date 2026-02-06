export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export type Platform = 'facebook' | 'craigslist';
export type VehicleCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'salvage';
export type DealRating = 'excellent' | 'good' | 'fair' | 'overpriced';

export interface CarListing {
  id: string;
  platform: Platform;
  platform_id?: string;
  url?: string;
  title: string;
  description?: string;
  price: number;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  condition?: VehicleCondition;
  color?: string;
  transmission?: string;
  fuel_type?: string;
  drive_type?: string;
  body_type?: string;
  images?: string[];
  seller_name?: string;
  seller_location?: string;
  deal_score?: number;
  is_active: boolean;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface CarListingFilters {
  platform?: Platform;
  make?: string;
  model?: string;
  min_year?: number;
  max_year?: number;
  min_price?: number;
  max_price?: number;
  max_mileage?: number;
  condition?: VehicleCondition;
  location?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CarWatchlist {
  id: string;
  user_id: string;
  name: string;
  make?: string;
  model?: string;
  min_year?: number;
  max_year?: number;
  min_price?: number;
  max_price?: number;
  max_mileage?: number;
  condition?: VehicleCondition;
  platforms?: Platform[];
  location?: string;
  search_radius_miles?: number;
  is_active: boolean;
  notify_email: boolean;
  notify_push: boolean;
  created_at: string;
  updated_at: string;
}

export interface DealAlert {
  id: string;
  user_id: string;
  watchlist_id: string;
  listing_id: string;
  deal_score: number;
  price_vs_kbb: number;
  is_read: boolean;
  created_at: string;
  car_listings?: CarListing;
  car_watchlists?: CarWatchlist;
}

export interface KbbValuation {
  id: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  condition: string;
  estimated_value: number;
  low_value: number;
  high_value: number;
}

export interface VinDecodeResult {
  vin: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  engine?: string;
  transmission?: string;
  drive_type?: string;
  fuel_type?: string;
  body_type?: string;
}

export interface VehicleAnalysis {
  estimated_condition: VehicleCondition;
  condition_notes: string[];
  fair_market_value: number;
  deal_rating: DealRating;
  deal_score: number;
  price_vs_market: number;
  red_flags: string[];
  recommendations: string[];
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
