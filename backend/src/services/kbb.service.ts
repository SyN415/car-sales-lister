import axios from 'axios';
import config from '../config/config';
import supabaseAdmin from '../config/supabase';
import { KbbValuation, KbbValuationRequest } from '../types/valuation.types';

class KbbService {
  /**
   * Get KBB valuation for a vehicle (with caching)
   */
  async getValuation(request: KbbValuationRequest): Promise<KbbValuation> {
    // Check cache first
    const cached = await this.getCachedValuation(request);
    if (cached) return cached;

    // Fetch from KBB API (or fallback)
    const valuation = await this.fetchValuation(request);

    // Cache the result
    await this.cacheValuation(valuation);

    return valuation;
  }

  /**
   * Check for cached valuation
   */
  private async getCachedValuation(request: KbbValuationRequest): Promise<KbbValuation | null> {
    let query = supabaseAdmin
      .from('kbb_valuations')
      .select('*')
      .eq('make', request.make)
      .eq('model', request.model)
      .eq('year', request.year)
      .gte('expires_at', new Date().toISOString());

    if (request.vin) {
      query = query.eq('vin', request.vin);
    }

    const { data } = await query.single();
    return data as KbbValuation | null;
  }

  /**
   * Fetch valuation from external API
   * TODO: Implement actual KBB/NADA/Edmunds API integration
   */
  private async fetchValuation(request: KbbValuationRequest): Promise<KbbValuation> {
    // Placeholder: Use NHTSA for basic vehicle data and estimate values
    // In production, integrate with KBB, NADA, or Edmunds API
    
    if (config.KBB_API_KEY && config.KBB_API_URL) {
      try {
        const response = await axios.get(`${config.KBB_API_URL}/valuation`, {
          params: {
            make: request.make,
            model: request.model,
            year: request.year,
            mileage: request.mileage,
            condition: request.condition,
          },
          headers: { 'Authorization': `Bearer ${config.KBB_API_KEY}` },
        });

        return this.mapApiResponse(response.data, request);
      } catch (error) {
        console.error('KBB API error, using estimation:', error);
      }
    }

    // Fallback: Simple estimation based on year and mileage
    return this.estimateValuation(request);
  }

  /**
   * Simple valuation estimation (fallback when no API is available)
   */
  private estimateValuation(request: KbbValuationRequest): KbbValuation {
    const currentYear = new Date().getFullYear();
    const age = currentYear - request.year;
    const baseValue = 35000; // Average new car price

    // Simple depreciation model
    let depreciationRate = 0;
    if (age <= 1) depreciationRate = 0.20;
    else if (age <= 3) depreciationRate = 0.15;
    else if (age <= 5) depreciationRate = 0.12;
    else if (age <= 10) depreciationRate = 0.08;
    else depreciationRate = 0.05;

    let estimatedValue = baseValue;
    for (let i = 0; i < age; i++) {
      estimatedValue *= (1 - depreciationRate);
    }

    // Mileage adjustment (average 12k/year)
    const expectedMileage = age * 12000;
    const mileageDiff = request.mileage - expectedMileage;
    if (mileageDiff > 0) {
      estimatedValue *= (1 - (mileageDiff / 200000));
    }

    // Condition adjustment
    const conditionMultiplier: Record<string, number> = {
      excellent: 1.1,
      good: 1.0,
      fair: 0.85,
      poor: 0.65,
      salvage: 0.4,
    };
    estimatedValue *= (conditionMultiplier[request.condition] || 1.0);

    estimatedValue = Math.max(estimatedValue, 500);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return {
      id: '',
      vin: request.vin,
      make: request.make,
      model: request.model,
      year: request.year,
      mileage: request.mileage,
      condition: request.condition,
      estimated_value: Math.round(estimatedValue),
      low_value: Math.round(estimatedValue * 0.85),
      high_value: Math.round(estimatedValue * 1.15),
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };
  }

  /**
   * Map external API response to our format
   */
  private mapApiResponse(apiData: any, request: KbbValuationRequest): KbbValuation {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return {
      id: '',
      vin: request.vin,
      make: request.make,
      model: request.model,
      year: request.year,
      mileage: request.mileage,
      condition: request.condition,
      estimated_value: apiData.estimatedValue || apiData.value || 0,
      low_value: apiData.lowValue || apiData.rangeLow || 0,
      high_value: apiData.highValue || apiData.rangeHigh || 0,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };
  }

  /**
   * Cache valuation in database
   */
  private async cacheValuation(valuation: KbbValuation): Promise<void> {
    try {
      await supabaseAdmin.from('kbb_valuations').insert({
        vin: valuation.vin,
        make: valuation.make,
        model: valuation.model,
        year: valuation.year,
        mileage: valuation.mileage,
        condition: valuation.condition,
        estimated_value: valuation.estimated_value,
        low_value: valuation.low_value,
        high_value: valuation.high_value,
        fetched_at: valuation.fetched_at,
        expires_at: valuation.expires_at,
      });
    } catch (error) {
      console.error('Failed to cache valuation:', error);
    }
  }
}

export const kbbService = new KbbService();
