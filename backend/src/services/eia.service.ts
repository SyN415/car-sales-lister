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

  private setCache(data: GasPriceResult): GasPriceResult {
    this.cache = { data, fetchedAt: Date.now() };
    return data;
  }

  private async fetchLatestGasPrice(params: Record<string, string | number>): Promise<any | null> {
    const resp = await axios.get(EIA_API_URL, {
      params: {
        api_key: config.EIA_API_KEY,
        ...params,
      },
      timeout: 10000,
    });

    const rows = resp.data?.response?.data;
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  }

  private logQueryFailure(label: string, error: any): void {
    const status = error?.response?.status;
    const details = error?.response?.data || error?.message;
    console.error(`[EiaService] ${label} query failed`, { status, details });
  }

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
      return this.setCache(fallback);
    }

    const queries: Array<{ label: string; params: Record<string, string | number> }> = [
      {
        label: 'weekly duoarea/product',
        params: {
          frequency: 'weekly',
          'data[0]': 'value',
          'facets[duoarea][]': 'SCA',
          'facets[product][]': 'EPM0',
          'sort[0][column]': 'period',
          'sort[0][direction]': 'desc',
          length: 1,
        },
      },
      {
        label: 'monthly series fallback',
        params: {
          frequency: 'monthly',
          'data[0]': 'value',
          'facets[series][]': 'EMD_EPD2D_PTE_R1Y_DPG',
          'sort[0][column]': 'period',
          'sort[0][direction]': 'desc',
          offset: 0,
          length: 1,
        },
      },
    ];

    for (const query of queries) {
      try {
        const row = await this.fetchLatestGasPrice(query.params);
        if (!row) {
          console.warn(`[EiaService] No data returned for ${query.label} query`);
          continue;
        }

        const result: GasPriceResult = {
          price_per_gallon: Number(row.value) || fallback.price_per_gallon,
          area: row['area-name'] || 'California',
          product: row['product-name'] || 'Regular Gasoline',
          period: row.period || 'unknown',
          source: 'eia',
        };

        return this.setCache(result);
      } catch (error: any) {
        this.logQueryFailure(query.label, error);
      }
    }

    console.warn('[EiaService] All EIA queries failed — using fallback gas price');
    return this.setCache(fallback);
  }
}

export const eiaService = new EiaService();

