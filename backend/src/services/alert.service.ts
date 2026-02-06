import supabaseAdmin from '../config/supabase';
import { DealAlert } from '../types/watchlist.types';

class AlertService {
  /**
   * Get alerts for a user
   */
  async getUserAlerts(userId: string, unreadOnly: boolean = false): Promise<DealAlert[]> {
    let query = supabaseAdmin
      .from('deal_alerts')
      .select('*, car_listings(*), car_watchlists(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch alerts: ${error.message}`);
    return (data || []) as DealAlert[];
  }

  /**
   * Create a deal alert
   */
  async createAlert(alert: {
    user_id: string;
    watchlist_id: string;
    listing_id: string;
    deal_score: number;
    price_vs_kbb: number;
  }): Promise<DealAlert> {
    // Check for duplicate alert
    const { data: existing } = await supabaseAdmin
      .from('deal_alerts')
      .select('id')
      .eq('user_id', alert.user_id)
      .eq('listing_id', alert.listing_id)
      .eq('watchlist_id', alert.watchlist_id)
      .single();

    if (existing) {
      return existing as unknown as DealAlert;
    }

    const { data, error } = await supabaseAdmin
      .from('deal_alerts')
      .insert({ ...alert, is_read: false })
      .select()
      .single();

    if (error) throw new Error(`Failed to create alert: ${error.message}`);
    return data as DealAlert;
  }

  /**
   * Mark an alert as read
   */
  async markAsRead(id: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('deal_alerts')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to mark alert as read: ${error.message}`);
  }

  /**
   * Delete an alert
   */
  async deleteAlert(id: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('deal_alerts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to delete alert: ${error.message}`);
  }

  /**
   * Get unread alert count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('deal_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) return 0;
    return count || 0;
  }
}

export const alertService = new AlertService();
