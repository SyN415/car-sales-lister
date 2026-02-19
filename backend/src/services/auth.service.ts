import supabaseAdmin from '../config/supabase';
import config from '../config/config';
import jwt from 'jsonwebtoken';
import { SessionUser, AuthResponse } from '../types/auth.types';

class AuthService {
  /**
   * Register a new user
   */
  async signup(email: string, password: string, fullName?: string): Promise<{
    success: boolean;
    data?: { user: SessionUser; session: { access_token: string; refresh_token?: string; expires_in?: number } };
    error?: string;
  }> {
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (authError || !authData.user) {
        return { success: false, error: authError?.message || 'Failed to create user' };
      }

      // Create profile
      await supabaseAdmin.from('profiles').upsert({
        id: authData.user.id,
        email,
        full_name: fullName || '',
      });

      const user: SessionUser = {
        id: authData.user.id,
        email,
        full_name: fullName,
        role: 'user',
        created_at: authData.user.created_at,
      };

      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        config.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        data: { user, session: { access_token: token } },
      };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { success: false, error: error.message || 'Signup failed' };
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{
    success: boolean;
    data?: { user: SessionUser; session: { access_token: string; supabase_access_token?: string; refresh_token?: string; expires_in?: number } };
    error?: string;
  }> {
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({ email, password });

      if (authError || !authData.user) {
        console.error('Login failed for', email, '— Supabase error:', authError?.message, authError?.status);
        return { success: false, error: authError?.message || 'Invalid credentials' };
      }

      // Get profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      const user: SessionUser = {
        id: authData.user.id,
        email: authData.user.email || email,
        full_name: profile?.full_name,
        role: profile?.role || 'user',
        location: profile?.location,
        created_at: authData.user.created_at,
      };

      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        config.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        data: {
          user,
          session: {
            access_token: token,
            supabase_access_token: authData.session?.access_token,
            refresh_token: authData.session?.refresh_token,
            expires_in: authData.session?.expires_in,
          },
        },
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  }

  /**
   * Get current user from token
   */
  async getCurrentUser(token: string): Promise<AuthResponse> {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      const userId = decoded.sub;

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        return { success: false, error: 'User not found' };
      }

      return {
        success: true,
        data: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role || 'user',
          location: profile.location,
          created_at: profile.created_at,
        },
      };
    } catch (error: any) {
      return { success: false, error: 'Invalid token' };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
}

export const authService = new AuthService();
