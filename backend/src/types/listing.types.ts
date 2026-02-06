export type Platform = 'facebook' | 'craigslist';
export type VehicleCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'salvage';

export interface CarListing {
  id: string;
  platform: Platform;
  platform_listing_id: string;
  title: string;
  description?: string;
  price: number;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  condition?: VehicleCondition;
  location?: string;
  images: string[];
  seller_info?: Record<string, any>;
  platform_url: string;
  scraped_at: string;
  created_at: string;
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
  radius_miles?: number;
  page?: number;
  limit?: number;
  sort_by?: 'price' | 'year' | 'mileage' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface CarListingCreateInput {
  platform: Platform;
  platform_listing_id: string;
  title: string;
  description?: string;
  price: number;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  condition?: VehicleCondition;
  location?: string;
  images?: string[];
  seller_info?: Record<string, any>;
  platform_url: string;
}
