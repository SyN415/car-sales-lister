import supabaseAdmin from '../config/supabase';
import { ResellabilityScore } from '../types/valuation.types';

class CompsService {
  /**
   * Calculate resellability score based on comparable sold listings.
   * Queries car_listings for recently sold vehicles with similar make/model/year/mileage.
   */
  async getResellabilityScore(
    make: string,
    model: string,
    year: number,
    price: number,
    mileage: number
  ): Promise<ResellabilityScore> {
    try {
      // Query comparable sold listings: same make/model, ±2 years, with days_on_market data
      const { data: comps, error } = await supabaseAdmin
        .from('car_listings')
        .select('price, mileage, days_on_market, sold_at, year')
        .ilike('make', make)
        .ilike('model', model)
        .gte('year', year - 2)
        .lte('year', year + 2)
        .not('sold_at', 'is', null)
        .not('days_on_market', 'is', null)
        .order('sold_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Comps query error:', error.message);
        return this.defaultScore();
      }

      if (!comps || comps.length === 0) {
        return this.defaultScore();
      }

      // Filter by mileage band (±30k miles)
      const mileageFiltered = comps.filter((c: any) => {
        if (!c.mileage) return true;
        return Math.abs(c.mileage - mileage) <= 30000;
      });

      const finalComps = mileageFiltered.length >= 3 ? mileageFiltered : comps;

      // Calculate median days on market
      const domValues = finalComps
        .map((c: any) => c.days_on_market as number)
        .filter((d: number) => d > 0)
        .sort((a: number, b: number) => a - b);

      const medianDays = domValues.length > 0
        ? domValues[Math.floor(domValues.length / 2)]
        : 14; // default assumption

      // Calculate price percentile (what % of comps sold for less than this price)
      const compPrices = finalComps
        .map((c: any) => Number(c.price))
        .filter((p: number) => p > 0)
        .sort((a: number, b: number) => a - b);

      let pricePercentile = 50;
      if (compPrices.length > 0) {
        const belowCount = compPrices.filter((p: number) => p < price).length;
        pricePercentile = Math.round((belowCount / compPrices.length) * 100);
      }

      // Resellability score 1-10 based on days to sell and comp count
      // Faster selling + more comps = higher score
      let score = 5;
      if (medianDays <= 3) score = 10;
      else if (medianDays <= 5) score = 9;
      else if (medianDays <= 7) score = 8;
      else if (medianDays <= 10) score = 7;
      else if (medianDays <= 14) score = 6;
      else if (medianDays <= 21) score = 5;
      else if (medianDays <= 30) score = 4;
      else if (medianDays <= 45) score = 3;
      else score = 2;

      // Boost score slightly if many comps (high liquidity)
      if (finalComps.length >= 20) score = Math.min(10, score + 1);

      // Penalize if very few comps (uncertain)
      if (finalComps.length < 3) score = Math.max(1, score - 1);

      return {
        median_days_to_sell: medianDays,
        comp_count: finalComps.length,
        price_percentile: pricePercentile,
        resellability_score: score,
      };
    } catch (error: any) {
      console.error('Comps service error:', error.message);
      return this.defaultScore();
    }
  }

  private defaultScore(): ResellabilityScore {
    return {
      median_days_to_sell: 14,
      comp_count: 0,
      price_percentile: 50,
      resellability_score: 5,
    };
  }
}

export const compsService = new CompsService();

