export interface KbbValuation {
  id: string;
  vin?: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  condition: string;
  estimated_value: number;
  low_value: number;
  high_value: number;
  fetched_at: string;
  expires_at: string;
}

export interface KbbValuationRequest {
  vin?: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  condition: string;
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
  doors?: number;
  cylinders?: number;
  displacement?: string;
  plant_country?: string;
}

export interface RepairIssue {
  description: string;
  cost_low: number;
  cost_high: number;
  severity: 'minor' | 'moderate' | 'major';
}

export interface RepairEstimate {
  issues: RepairIssue[];
  total_low: number;
  total_high: number;
}

export interface VehicleFactor {
  icon: string;
  label: string;
  type: 'positive' | 'negative' | 'neutral';
}

export interface ResellabilityScore {
  median_days_to_sell: number;
  comp_count: number;
  price_percentile: number;
  resellability_score: number;
}

export interface NhtsaResult {
  recall_count: number;
  complaint_count: number;
  top_complaint_categories: string[];
}

export interface FuelEconomyData {
  year: number;
  make: string;
  model: string;
  combined_mpg: number;
  city_mpg: number;
  highway_mpg: number;
  fuel_type: string;
}

export interface VehicleAnalysis {
  listing_id: string;
  estimated_condition: string;
  condition_notes: string[];
  fair_market_value: number;
  deal_rating: 'excellent' | 'good' | 'fair' | 'overpriced';
  deal_score: number;
  price_vs_market: number;
  depreciation_rate?: number;
  red_flags: string[];
  recommendations: string[];
  repair_estimate?: RepairEstimate;
  vehicle_factors?: VehicleFactor[];
}
