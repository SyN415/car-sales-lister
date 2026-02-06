import supabaseAdmin from '../config/supabase';
import { CarWatchlist, CarWatchlistCreateInput } from '../types/watchlist.types';

class WatchlistService {
  /**
   * Get all watchlists for a user
   */
  async getUserWatchlists(userId: string): Promise<CarWatchlist[]> {
    const { data, error } = await supabaseAdmin
      .from('car_watchlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch watchlists: ${error.message}`);
    return (data || []) as CarWatchlist[];
  }

  /**
   * Create a new watchlist
   */
  async createWatchlist(userId: string, input: CarWatchlistCreateInput): Promise<CarWatchlist> {
    const { data, error } = await supabaseAdmin
      .from('car_watchlists')
      .insert({
        user_id: userId,
        ...input,
        notification_enabled: input.notification_enabled ?? true,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create watchlist: ${error.message}`);
    return data as CarWatchlist;
  }

  /**
   * Update a watchlist
   */
  async updateWatchlist(id: string, userId: string, input: Partial<CarWatchlistCreateInput>): Promise<CarWatchlist> {
    const { data, error } = await supabaseAdmin
      .from('car_watchlists')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update watchlist: ${error.message}`);
    return data as CarWatchlist;
  }

  /**
   * Delete a watchlist
   */
  async deleteWatchlist(id: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('car_watchlists')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to delete watchlist: ${error.message}`);
  }

  /**
   * Get a single watchlist
   */
  async getWatchlistById(id: string, userId: string): Promise<CarWatchlist | null> {
    const { data, error } = await supabaseAdmin
      .from('car_watchlists')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data as CarWatchlist;
  }
}

export const watchlistService = new WatchlistService();
