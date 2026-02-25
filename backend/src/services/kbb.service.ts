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
   * Lookup approximate original MSRP by make (and optionally model).
   * These are based on real-world average MSRPs for popular makes/segments.
   */
  private getBaseMSRP(make: string, model: string, year: number): number {
    const m = make.toLowerCase();
    const mod = model.toLowerCase();

    // Make + model specific overrides for common vehicles
    const modelMSRP: Record<string, Record<string, number>> = {
      'mercedes-benz': { 'c-class': 32000, 'e-class': 52000, 's-class': 85000, 'glc': 44000, 'gle': 56000, 'gla': 36000, 'cla': 34000, 'a-class': 33000 },
      'bmw': { '3 series': 35000, '5 series': 52000, '7 series': 80000, 'x3': 43000, 'x5': 58000, 'x1': 36000, '4 series': 42000 },
      'audi': { 'a3': 33000, 'a4': 38000, 'a6': 52000, 'a8': 82000, 'q3': 35000, 'q5': 43000, 'q7': 55000 },
      'lexus': { 'es': 40000, 'is': 38000, 'gs': 48000, 'ls': 75000, 'rx': 46000, 'nx': 38000, 'gx': 55000 },
      'toyota': { 'camry': 26000, 'corolla': 21000, 'rav4': 28000, 'highlander': 36000, 'tacoma': 28000, 'tundra': 36000, '4runner': 38000, 'prius': 25000, 'sienna': 35000 },
      'honda': { 'civic': 22000, 'accord': 27000, 'cr-v': 28000, 'pilot': 35000, 'hr-v': 23000, 'odyssey': 33000, 'fit': 17000 },
      'ford': { 'f-150': 33000, 'mustang': 28000, 'explorer': 34000, 'escape': 27000, 'fusion': 24000, 'focus': 19000, 'edge': 32000, 'bronco': 32000 },
      'chevrolet': { 'silverado': 33000, 'malibu': 23000, 'equinox': 27000, 'tahoe': 50000, 'camaro': 26000, 'traverse': 34000, 'cruze': 19000, 'impala': 28000, 'corvette': 60000 },
      'nissan': { 'altima': 25000, 'sentra': 20000, 'rogue': 27000, 'pathfinder': 34000, 'maxima': 36000, 'frontier': 28000, 'murano': 33000 },
      'hyundai': { 'elantra': 20000, 'sonata': 24000, 'tucson': 27000, 'santa fe': 30000, 'kona': 22000, 'palisade': 35000 },
      'kia': { 'forte': 18000, 'optima': 23000, 'k5': 24000, 'sportage': 27000, 'sorento': 30000, 'telluride': 35000, 'soul': 19000 },
      'subaru': { 'outback': 28000, 'forester': 27000, 'crosstrek': 24000, 'impreza': 20000, 'wrx': 29000, 'legacy': 24000, 'ascent': 33000 },
      'volkswagen': { 'jetta': 20000, 'passat': 24000, 'tiguan': 26000, 'atlas': 33000, 'golf': 24000, 'gti': 30000 },
      'mazda': { 'mazda3': 22000, '3': 22000, 'mazda6': 25000, '6': 25000, 'cx-5': 27000, 'cx-9': 34000, 'cx-30': 23000, 'mx-5': 27000 },
      'jeep': { 'wrangler': 30000, 'grand cherokee': 37000, 'cherokee': 28000, 'compass': 25000, 'gladiator': 35000 },
      'dodge': { 'charger': 30000, 'challenger': 29000, 'durango': 35000, 'ram': 33000 },
      'ram': { '1500': 34000, '2500': 38000, '3500': 40000 },
      'gmc': { 'sierra': 35000, 'terrain': 28000, 'acadia': 34000, 'yukon': 52000 },
      'tesla': { 'model 3': 40000, 'model y': 44000, 'model s': 80000, 'model x': 90000 },
      'porsche': { 'cayenne': 68000, 'macan': 55000, '911': 100000, 'panamera': 88000, 'boxster': 60000, 'cayman': 58000 },
      'volvo': { 'xc90': 50000, 'xc60': 42000, 'xc40': 35000, 's60': 38000, 's90': 48000 },
      'acura': { 'tlx': 37000, 'mdx': 46000, 'rdx': 38000, 'ilx': 27000, 'integra': 32000 },
      'infiniti': { 'q50': 37000, 'q60': 42000, 'qx50': 38000, 'qx60': 45000, 'qx80': 68000 },
      'genesis': { 'g70': 37000, 'g80': 48000, 'g90': 72000, 'gv70': 42000, 'gv80': 50000 },
      'buick': { 'encore': 24000, 'envision': 32000, 'enclave': 40000, 'regal': 28000 },
      'cadillac': { 'ct4': 34000, 'ct5': 38000, 'xt4': 36000, 'xt5': 44000, 'escalade': 78000 },
      'lincoln': { 'corsair': 36000, 'nautilus': 42000, 'aviator': 52000, 'navigator': 78000 },
      'chrysler': { '300': 30000, 'pacifica': 35000 },
      'mitsubishi': { 'outlander': 27000, 'eclipse cross': 24000, 'mirage': 15000 },
    };

    // Try make+model lookup first
    const makeModels = modelMSRP[m];
    if (makeModels) {
      // Try exact model match
      if (makeModels[mod]) return makeModels[mod];
      // Try partial match (e.g. "es 350" matches "es")
      for (const [key, val] of Object.entries(makeModels)) {
        if (mod.startsWith(key) || mod.includes(key)) return val;
      }
    }

    // Fallback: make-level average MSRP
    const makeMSRP: Record<string, number> = {
      'toyota': 28000, 'honda': 26000, 'ford': 30000, 'chevrolet': 28000,
      'nissan': 26000, 'hyundai': 24000, 'kia': 24000, 'subaru': 26000,
      'volkswagen': 25000, 'mazda': 25000, 'jeep': 32000, 'dodge': 30000,
      'ram': 35000, 'gmc': 36000, 'buick': 30000, 'chrysler': 30000,
      'mitsubishi': 22000, 'fiat': 20000, 'mini': 28000, 'suzuki': 18000,
      'scion': 18000, 'saturn': 20000, 'pontiac': 22000, 'mercury': 22000,
      'oldsmobile': 22000, 'plymouth': 18000, 'saab': 30000, 'isuzu': 22000,
      'bmw': 45000, 'mercedes-benz': 45000, 'audi': 42000, 'lexus': 42000,
      'acura': 36000, 'infiniti': 40000, 'volvo': 40000, 'genesis': 45000,
      'cadillac': 42000, 'lincoln': 45000, 'land rover': 55000, 'jaguar': 50000,
      'porsche': 70000, 'maserati': 75000, 'alfa romeo': 42000,
      'tesla': 50000, 'rivian': 75000, 'lucid': 80000, 'polestar': 48000,
    };

    // Adjust MSRP for older model years (cars were cheaper in the past)
    let msrp = makeMSRP[m] || 25000;
    if (year < 2010) {
      // Rough inflation adjustment: cars were ~2-3% cheaper per year before 2010
      const yearsBack = 2010 - year;
      msrp *= Math.pow(0.975, yearsBack);
    }

    return msrp;
  }

  /**
   * Percentage of MSRP retained at each vehicle age (private-party, good condition).
   * Calibrated against real KBB private-party values across multiple makes/models.
   */
  private static readonly RETAINED_PCT = [
    1.00,  // 0yr (new)
    0.91,  // 1yr
    0.84,  // 2yr
    0.77,  // 3yr
    0.70,  // 4yr
    0.64,  // 5yr
    0.58,  // 6yr
    0.52,  // 7yr
    0.47,  // 8yr
    0.42,  // 9yr
    0.38,  // 10yr
    0.33,  // 11yr
    0.28,  // 12yr
    0.24,  // 13yr
    0.20,  // 14yr
    0.17,  // 15yr
    0.14,  // 16yr
    0.12,  // 17yr
    0.10,  // 18yr
    0.09,  // 19yr
    0.08,  // 20yr
  ];

  private getRetainedPct(age: number): number {
    if (age <= 0) return 1.0;
    const table = KbbService.RETAINED_PCT;
    if (age < table.length) return table[age];
    // Beyond 20 years: slow 5%/yr decay from the 20-year value
    return table[table.length - 1] * Math.pow(0.95, age - (table.length - 1));
  }

  /**
   * Realistic valuation estimation using make/model-aware MSRP,
   * a KBB-calibrated depreciation curve, mileage adjustments,
   * and brand-level retention factors.
   */
  private estimateValuation(request: KbbValuationRequest): KbbValuation {
    const currentYear = new Date().getFullYear();
    const age = currentYear - request.year;
    const baseMSRP = this.getBaseMSRP(request.make, request.model, request.year);

    // Apply age-based depreciation from calibrated lookup table
    let estimatedValue = baseMSRP * this.getRetainedPct(age);

    // Mileage adjustment: penalize above-average, reward below-average
    const expectedMileage = age * 12000;
    const mileageDiff = request.mileage - expectedMileage;
    let mileageAdjustment = -(mileageDiff / 10000) * 0.03;
    // Cap the below-average bonus when absolute mileage is high (>100k)
    if (request.mileage > 100000 && mileageAdjustment > 0) {
      mileageAdjustment *= Math.max(0, 1 - (request.mileage - 100000) / 150000);
    }
    // Additional penalty for high absolute mileage regardless of age
    if (request.mileage > 100000) {
      mileageAdjustment += -((request.mileage - 100000) / 10000) * 0.02;
    }
    estimatedValue *= (1 + Math.max(-0.30, Math.min(0.15, mileageAdjustment)));

    // Condition adjustment
    const conditionMultiplier: Record<string, number> = {
      excellent: 1.10,
      good: 1.00,
      fair: 0.85,
      poor: 0.65,
      salvage: 0.40,
    };
    estimatedValue *= (conditionMultiplier[request.condition] || 1.0);

    // Make-level retention factor: some brands hold value better
    const m = request.make.toLowerCase();
    const retentionBonus: Record<string, number> = {
      'toyota': 1.12, 'lexus': 1.10, 'honda': 1.10, 'subaru': 1.08,
      'porsche': 1.15, 'jeep': 1.15, 'tesla': 1.05, 'mazda': 1.03,
      'ford': 1.05,
      // Brands that depreciate faster
      'bmw': 0.94, 'mercedes-benz': 0.93, 'audi': 0.94,
      'jaguar': 0.88, 'maserati': 0.85, 'land rover': 0.88,
      'infiniti': 0.90, 'acura': 0.97, 'volvo': 0.93,
      'lincoln': 0.90, 'cadillac': 0.91, 'buick': 0.92,
      'chrysler': 0.91, 'dodge': 0.94, 'fiat': 0.86,
      'mitsubishi': 0.91, 'nissan': 0.93, 'kia': 0.97, 'hyundai': 0.97,
    };
    estimatedValue *= (retentionBonus[m] || 1.0);

    // Floor: no running car is worth less than ~$500-$800 depending on age
    const floor = age > 20 ? 500 : age > 15 ? 800 : 1000;
    estimatedValue = Math.max(estimatedValue, floor);

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
      low_value: Math.round(estimatedValue * 0.82),
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
