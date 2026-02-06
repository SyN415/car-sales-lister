import supabaseAdmin from '../config/supabase';
import { CarListing, CarListingFilters, CarListingCreateInput } from '../types/listing.types';

class ListingService {
  /**
   * Get car listings with filters and pagination
   */
  async getListings(filters: CarListingFilters): Promise<{
    listings: CarListing[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin.from('car_listings').select('*', { count: 'exact' });

    if (filters.platform) query = query.eq('platform', filters.platform);
    if (filters.make) query = query.ilike('make', `%${filters.make}%`);
    if (filters.model) query = query.ilike('model', `%${filters.model}%`);
    if (filters.min_year) query = query.gte('year', filters.min_year);
    if (filters.max_year) query = query.lte('year', filters.max_year);
    if (filters.min_price) query = query.gte('price', filters.min_price);
    if (filters.max_price) query = query.lte('price', filters.max_price);
    if (filters.max_mileage) query = query.lte('mileage', filters.max_mileage);
    if (filters.condition) query = query.eq('condition', filters.condition);
    if (filters.location) query = query.ilike('location', `%${filters.location}%`);

    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order === 'asc';
    query = query.order(sortBy, { ascending: sortOrder });

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) throw new Error(`Failed to fetch listings: ${error.message}`);

    return {
      listings: (data || []) as CarListing[],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Get a single listing by ID
   */
  async getListingById(id: string): Promise<CarListing | null> {
    const { data, error } = await supabaseAdmin
      .from('car_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as CarListing;
  }

  /**
   * Create or upsert a car listing (from scraping)
   */
  async upsertListing(input: CarListingCreateInput): Promise<CarListing> {
    const { data, error } = await supabaseAdmin
      .from('car_listings')
      .upsert(
        {
          ...input,
          images: input.images || [],
          scraped_at: new Date().toISOString(),
        },
        { onConflict: 'platform,platform_listing_id' }
      )
      .select()
      .single();

    if (error) throw new Error(`Failed to upsert listing: ${error.message}`);
    return data as CarListing;
  }

  /**
   * Search listings by keyword
   */
  async searchListings(query: string, filters?: CarListingFilters): Promise<CarListing[]> {
    let dbQuery = supabaseAdmin
      .from('car_listings')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,make.ilike.%${query}%,model.ilike.%${query}%`);

    if (filters?.min_price) dbQuery = dbQuery.gte('price', filters.min_price);
    if (filters?.max_price) dbQuery = dbQuery.lte('price', filters.max_price);
    if (filters?.min_year) dbQuery = dbQuery.gte('year', filters.min_year);
    if (filters?.max_year) dbQuery = dbQuery.lte('year', filters.max_year);

    dbQuery = dbQuery.order('created_at', { ascending: false }).limit(50);

    const { data, error } = await dbQuery;
    if (error) throw new Error(`Search failed: ${error.message}`);
    return (data || []) as CarListing[];
  }

  /**
   * Delete old listings (cleanup)
   */
  async deleteOldListings(daysOld: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const { data, error } = await supabaseAdmin
      .from('car_listings')
      .delete()
      .lt('scraped_at', cutoff.toISOString())
      .select('id');

    if (error) throw new Error(`Cleanup failed: ${error.message}`);
    return data?.length || 0;
  }
}

export const listingService = new ListingService();
