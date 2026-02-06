import OpenAI from 'openai';
import config from '../config/config';
import { VehicleAnalysis } from '../types/valuation.types';

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
}

export const aiService = new AiService();
