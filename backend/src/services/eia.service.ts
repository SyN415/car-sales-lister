import axios from 'axios';
import config from '../config/config';

const EIA_API_URL = 'https://api.eia.gov/v2/petroleum/pri/gnd/data/';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface GasPriceResult {
  price_per_gallon: number;
  area: string;
  product: string;
  period: string;
  source: string;
}

class EiaService {
  private cache: { data: GasPriceResult; fetchedAt: number } | null = null;

  /**
   * Get current California regular gasoline price from EIA.
   * Uses facet area=PCal (Pacific — California) for SF Bay Area relevance.
   * Falls back to a reasonable default if the API is unavailable.
   */
  async getCaliforniaGasPrice(): Promise<GasPriceResult> {
    // Check in-memory cache
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.data;
    }

    const fallback: GasPriceResult = {
      price_per_gallon: 4.99,
      area: 'California (fallback)',
      product: 'Regular Gasoline',
      period: 'unknown',
      source: 'default',
    };

    if (!config.EIA_API_KEY) {
      console.warn('[EiaService] No EIA_API_KEY configured — using fallback gas price');
      return fallback;
    }

    try {
      const resp = await axios.get(EIA_API_URL, {
        params: {
          api_key: config.EIA_API_KEY,
          frequency: 'weekly',
          'data[0]': 'value',
          'facets[duoarea][]': 'SCA',
          'facets[product][]': 'EPM0',
          sort: JSON.stringify([{ column: 'period', direction: 'desc' }]),
          length: 1,
        },
        timeout: 10000,
      });

      const rows = resp.data?.response?.data;
      if (!rows || rows.length === 0) {
        console.warn('[EiaService] No data from EIA API — using fallback');
        return fallback;
      }

      const row = rows[0];
      const result: GasPriceResult = {
        price_per_gallon: Number(row.value) || fallback.price_per_gallon,
        area: row['area-name'] || 'California',
        product: row['product-name'] || 'Regular Gasoline',
        period: row.period || 'unknown',
        source: 'eia',
      };

      this.cache = { data: result, fetchedAt: Date.now() };
      return result;
    } catch (error: any) {
      console.error('[EiaService] API error:', error.message);
      return fallback;
    }
  }
}

export const eiaService = new EiaService();

