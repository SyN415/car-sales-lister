import axios from 'axios';
import supabaseAdmin from '../config/supabase';
import { FuelEconomyData } from '../types/valuation.types';

const FUEL_ECONOMY_BASE_URL = 'https://www.fueleconomy.gov/ws/rest';
const CACHE_TTL_DAYS = 30;

class FuelEconomyService {
  /**
   * Get fuel economy data for a vehicle, checking Supabase cache first.
   */
  async getFuelEconomy(year: number, make: string, model: string): Promise<FuelEconomyData | null> {
    try {
      // Check cache first
      const cached = await this.getCached(year, make, model);
      if (cached) return cached;

      // Fetch from fueleconomy.gov
      const data = await this.fetchFromApi(year, make, model);
      if (data) {
        await this.saveToCache(data);
      }
      return data;
    } catch (error: any) {
      console.error('FuelEconomy service error:', error.message);
      return null;
    }
  }

  private async getCached(year: number, make: string, model: string): Promise<FuelEconomyData | null> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CACHE_TTL_DAYS);

    const { data, error } = await supabaseAdmin
      .from('fuel_economy_cache')
      .select('*')
      .eq('year', year)
      .ilike('make', make)
      .ilike('model', model)
      .gte('fetched_at', cutoff.toISOString())
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      year: data.year,
      make: data.make,
      model: data.model,
      combined_mpg: data.combined_mpg,
      city_mpg: data.city_mpg,
      highway_mpg: data.highway_mpg,
      fuel_type: data.fuel_type,
    };
  }

  private async fetchFromApi(year: number, make: string, model: string): Promise<FuelEconomyData | null> {
    // Step 1: Get vehicle menu options to find a vehicle ID
    const optionsUrl = `${FUEL_ECONOMY_BASE_URL}/vehicle/menu/options?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;

    const optionsResp = await axios.get(optionsUrl, {
      headers: { Accept: 'application/json' },
      timeout: 10000,
    });

    const menuItems = optionsResp.data?.menuItem;
    if (!menuItems) return null;

    // menuItem can be a single object or an array
    const items = Array.isArray(menuItems) ? menuItems : [menuItems];
    if (items.length === 0) return null;

    // Use the first option's vehicle ID
    const vehicleId = items[0].value;

    // Step 2: Get vehicle details by ID
    const vehicleUrl = `${FUEL_ECONOMY_BASE_URL}/vehicle/${vehicleId}`;
    const vehicleResp = await axios.get(vehicleUrl, {
      headers: { Accept: 'application/json' },
      timeout: 10000,
    });

    const v = vehicleResp.data;
    if (!v) return null;

    return {
      year,
      make,
      model,
      combined_mpg: Number(v.comb08) || 0,
      city_mpg: Number(v.city08) || 0,
      highway_mpg: Number(v.highway08) || 0,
      fuel_type: v.fuelType || 'Regular Gasoline',
    };
  }

  private async saveToCache(data: FuelEconomyData): Promise<void> {
    try {
      await supabaseAdmin
        .from('fuel_economy_cache')
        .upsert(
          {
            year: data.year,
            make: data.make,
            model: data.model,
            combined_mpg: data.combined_mpg,
            city_mpg: data.city_mpg,
            highway_mpg: data.highway_mpg,
            fuel_type: data.fuel_type,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: 'year,make,model' }
        );
    } catch (error: any) {
      console.error('Failed to cache fuel economy data:', error.message);
    }
  }
}

export const fuelEconomyService = new FuelEconomyService();

