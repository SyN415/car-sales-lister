import OpenAI from 'openai';
import config from '../config/config';
import { VehicleAnalysis, RepairEstimate, VehicleFactor } from '../types/valuation.types';

class AiService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.OPENROUTER_API_KEY,
    });
  }

  /**
   * Analyze a vehicle listing using AI
   */
  async analyzeVehicleListing(listing: {
    title: string;
    description?: string;
    price: number;
    images?: string[];
    make?: string;
    model?: string;
    year?: number;
    mileage?: number;
  }): Promise<VehicleAnalysis> {
    const prompt = `Analyze this vehicle listing and provide a detailed assessment:

Title: ${listing.title}
Description: ${listing.description || 'N/A'}
Price: $${listing.price}
Make: ${listing.make || 'Unknown'}
Model: ${listing.model || 'Unknown'}
Year: ${listing.year || 'Unknown'}
Mileage: ${listing.mileage ? `${listing.mileage} miles` : 'Unknown'}

Provide your analysis in JSON format with these fields:
- estimated_condition: one of "excellent", "good", "fair", "poor"
- condition_notes: array of observations about condition
- fair_market_value: estimated fair market value in dollars
- deal_rating: one of "excellent", "good", "fair", "overpriced"
- deal_score: 1-100 (100 being the best deal)
- price_vs_market: percentage difference from market value (negative = below market)
- red_flags: array of potential concerns
- recommendations: array of buyer recommendations

Return ONLY valid JSON, no other text.`;

    try {
      const response = await this.client.chat.completions.create({
        model: config.OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert automotive appraiser and car buying advisor. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const analysis = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, ''));

      return {
        listing_id: '',
        estimated_condition: analysis.estimated_condition || 'fair',
        condition_notes: analysis.condition_notes || [],
        fair_market_value: analysis.fair_market_value || listing.price,
        deal_rating: analysis.deal_rating || 'fair',
        deal_score: analysis.deal_score || 50,
        price_vs_market: analysis.price_vs_market || 0,
        red_flags: analysis.red_flags || [],
        recommendations: analysis.recommendations || [],
      };
    } catch (error: any) {
      console.error('AI analysis error:', error.message);
      return {
        listing_id: '',
        estimated_condition: 'fair',
        condition_notes: ['AI analysis unavailable'],
        fair_market_value: listing.price,
        deal_rating: 'fair',
        deal_score: 50,
        price_vs_market: 0,
        red_flags: ['Unable to perform AI analysis'],
        recommendations: ['Manual inspection recommended'],
      };
    }
  }

  /**
   * Estimate repair costs from a listing description using AI.
   * Returns empty result if no description is provided.
   */
  async estimateRepairCosts(description: string): Promise<RepairEstimate> {
    const empty: RepairEstimate = { issues: [], total_low: 0, total_high: 0 };
    if (!description || !description.trim()) return empty;

    const prompt = `You are an auto repair cost estimator for San Francisco, CA.
Labor rate: $175/hour average.
Given this listing description, identify all mentioned issues and estimate repair costs.
Return JSON: { "issues": [{ "description": "...", "cost_low": 0, "cost_high": 0, "severity": "minor"|"moderate"|"major" }], "total_low": 0, "total_high": 0 }
If no issues are mentioned, return { "issues": [], "total_low": 0, "total_high": 0 }
Description: ${description}

Return ONLY valid JSON, no other text.`;

    try {
      const response = await this.client.chat.completions.create({
        model: config.OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert auto mechanic and cost estimator. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, ''));

      return {
        issues: (parsed.issues || []).map((i: any) => ({
          description: i.description || '',
          cost_low: Number(i.cost_low) || Number(i.estimated_cost_low) || 0,
          cost_high: Number(i.cost_high) || Number(i.estimated_cost_high) || 0,
          severity: (['minor', 'moderate', 'major'].includes(i.severity) ? i.severity : 'minor') as 'minor' | 'moderate' | 'major',
        })),
        total_low: Number(parsed.total_low) || 0,
        total_high: Number(parsed.total_high) || 0,
      };
    } catch (error: any) {
      console.error('Repair estimate error:', error.message);
      return empty;
    }
  }

  /**
   * Get vehicle factor badges (quick-scan facts for flippers).
   * Returns empty array if insufficient vehicle info.
   */
  async getVehicleFactors(year: number, make: string, model: string): Promise<VehicleFactor[]> {
    if (!make || !model) return [];

    const prompt = `Return a JSON array of up to 4 badges for a ${year} ${make} ${model}.
Each badge: { "icon": "emoji", "label": "short text", "type": "positive"|"negative"|"neutral" }
Focus on: 0-60 time, MPG, reliability reputation, known issues, resale demand, cool factor.
Examples: { "icon":"⚡", "label":"0-60 in 5.4s", "type":"positive" }, { "icon":"⛽", "label":"32 MPG", "type":"positive" }

Return ONLY a valid JSON array, no other text.`;

    try {
      const response = await this.client.chat.completions.create({
        model: config.OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'You are an automotive expert. Respond only with a valid JSON array.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, ''));

      if (!Array.isArray(parsed)) return [];

      return parsed.slice(0, 4).map((f: any) => ({
        icon: f.icon || '📌',
        label: f.label || '',
        type: (['positive', 'negative', 'neutral'].includes(f.type) ? f.type : 'neutral') as 'positive' | 'negative' | 'neutral',
      }));
    } catch (error: any) {
      console.error('Vehicle factors error:', error.message);
      return [];
    }
  }
}

export const aiService = new AiService();
