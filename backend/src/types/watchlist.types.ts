export interface CarWatchlist {
  id: string;
  user_id: string;
  keywords?: string;
  make?: string;
  model?: string;
  min_year?: number;
  max_year?: number;
  min_price?: number;
  max_price?: number;
  max_mileage?: number;
  location?: string;
  radius_miles?: number;
  notification_enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CarWatchlistCreateInput {
  keywords?: string;
  make?: string;
  model?: string;
  min_year?: number;
  max_year?: number;
  min_price?: number;
  max_price?: number;
  max_mileage?: number;
  location?: string;
  radius_miles?: number;
  notification_enabled?: boolean;
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
}
