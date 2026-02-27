import axios from 'axios';
import config from '../config/config';
import { NhtsaResult } from '../types/valuation.types';

class NhtsaService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.NHTSA_API_URL || 'https://api.nhtsa.gov';
  }

  /**
   * Fetch recall count and top complaint categories for a vehicle.
   */
  async getRecallsAndComplaints(make: string, model: string, year: number): Promise<NhtsaResult> {
    const [recallCount, complaints] = await Promise.all([
      this.fetchRecallCount(make, model, year),
      this.fetchComplaints(make, model, year),
    ]);

    return {
      recall_count: recallCount,
      complaint_count: complaints.count,
      top_complaint_categories: complaints.categories,
    };
  }

  private async fetchRecallCount(make: string, model: string, year: number): Promise<number> {
    try {
      const url = `${this.baseUrl}/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
      const resp = await axios.get(url, { timeout: 10000 });
      const results = resp.data?.results;
      if (Array.isArray(results)) return results.length;
      return 0;
    } catch (error: any) {
      console.error('NHTSA recall fetch error:', error.message);
      return 0;
    }
  }

  private async fetchComplaints(
    make: string,
    model: string,
    year: number
  ): Promise<{ count: number; categories: string[] }> {
    try {
      const url = `${this.baseUrl}/complaints/complaintsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
      const resp = await axios.get(url, { timeout: 10000 });
      const results = resp.data?.results;
      if (!Array.isArray(results)) return { count: 0, categories: [] };

      // Tally complaint components/categories
      const categoryMap: Record<string, number> = {};
      for (const complaint of results) {
        const component = complaint.components || complaint.Component || 'Unknown';
        categoryMap[component] = (categoryMap[component] || 0) + 1;
      }

      // Sort by frequency, take top 5
      const categories = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat]) => cat);

      return { count: results.length, categories };
    } catch (error: any) {
      console.error('NHTSA complaints fetch error:', error.message);
      return { count: 0, categories: [] };
    }
  }
}

export const nhtsaService = new NhtsaService();

