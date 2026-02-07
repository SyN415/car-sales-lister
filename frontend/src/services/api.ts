import axios from 'axios';
import type { AxiosResponse, AxiosError } from 'axios';
import type {
  User, CarListing, CarListingFilters, CarWatchlist,
  DealAlert, KbbValuation, VinDecodeResult, VehicleAnalysis,
  PaginatedResponse,
} from '../types';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---- Auth API ----
export const authAPI = {
  login: async (email: string, password: string): Promise<{
    user: User; token: string; supabaseAccessToken?: string; refreshToken?: string;
  }> => {
    const response = await api.post<ApiResponse<{
      user: User;
      session: { access_token: string; supabase_access_token?: string; refresh_token?: string };
    }>>('/api/auth/login', { email, password });
    if (!response.data.success || !response.data.data) throw new Error(response.data.error || 'Login failed');
    return {
      user: response.data.data.user,
      token: response.data.data.session.access_token,
      supabaseAccessToken: response.data.data.session.supabase_access_token,
      refreshToken: response.data.data.session.refresh_token,
    };
  },

  signup: async (email: string, password: string, fullName?: string): Promise<{
    user: User; token: string; supabaseAccessToken?: string; refreshToken?: string;
  }> => {
    const response = await api.post<ApiResponse<{
      user: User;
      session: { access_token: string; supabase_access_token?: string; refresh_token?: string };
    }>>('/api/auth/signup', { email, password, fullName });
    if (!response.data.success || !response.data.data) throw new Error(response.data.error || 'Signup failed');
    return {
      user: response.data.data.user,
      token: response.data.data.session.access_token,
      supabaseAccessToken: response.data.data.session.supabase_access_token,
      refreshToken: response.data.data.session.refresh_token,
    };
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/api/auth/me');
    if (!response.data.success || !response.data.data) throw new Error(response.data.error || 'Failed to get user');
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },
};

// ---- Listings API ----
export const listingsAPI = {
  getListings: async (filters?: CarListingFilters): Promise<PaginatedResponse<CarListing>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<CarListing>>>('/api/listings', { params: filters });
    if (!response.data.success || !response.data.data) throw new Error(response.data.error || 'Failed to fetch listings');
    return response.data.data;
  },

  getListing: async (id: string): Promise<CarListing> => {
    const response = await api.get<ApiResponse<CarListing>>(`/api/listings/${id}`);
    if (!response.data.success || !response.data.data) throw new Error(response.data.error || 'Failed to fetch listing');
    return response.data.data;
  },

  searchListings: async (query: string): Promise<CarListing[]> => {
    const response = await api.get<ApiResponse<CarListing[]>>('/api/listings/search', { params: { q: query } });
    if (!response.data.success || !response.data.data) throw new Error(response.data.error || 'Search failed');
    return response.data.data;
  },
};

// ---- Watchlists API ----
export const watchlistsAPI = {
  getWatchlists: async (): Promise<CarWatchlist[]> => {
    const response = await api.get<ApiResponse<CarWatchlist[]>>('/api/watchlists');
    if (!response.data.success || !response.data.data) throw new Error(response.data.error || 'Failed to fetch watchlists');
    return response.data.data;
  },

  createWatchlist: async (data: Partial<CarWatchlist>): Promise<CarWatchlist> => {
    const response = await api.post<ApiResponse<CarWatchlist>>('/api/watchlists', data);
    if (!response.data.success || !response.data.data) throw new Error(response.data.error || 'Failed to create watchlist');
    return response.data.data;
  },

  updateWatchlist: async (id: string, data: Partial<CarWatchlist>): Promise<CarWatchlist> => {
    const response = await api.put<ApiResponse<CarWatchlist>>(`/api/watchlists/${id}`, data);
    if (!response.data.success || !response.data.data) throw new Error(response.data.error || 'Failed to update watchlist');
    return response.data.data;
  },

  deleteWatchlist: async (id: string): Promise<void> => {
    await api.delete(`/api/watchlists/${id}`);
  },
};

// ---- Alerts API ----
export const alertsAPI = {
  getAlerts: async (unreadOnly: boolean = false): Promise<DealAlert[]> => {
    const response = await api.get<ApiResponse<DealAlert[]>>('/api/alerts', { params: { unread: unreadOnly } });
    if (!response.data.success || !response.data.data) throw new Error(response.data.error || 'Failed to fetch alerts');
    return response.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<ApiResponse<{ unread_count: number }>>('/api/alerts/count');
    if (!response.data.success || !response.data.data) return 0;
    return response.data.data.unread_count;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.put(`/api/alerts/${id}/read`);
  },

  dismissAlert: async (id: string): Promise<void> => {
    await api.delete(`/api/alerts/${id}`);
  },
};

// ---- Valuations API ----
export const valuationsAPI = {
  getKbbValuation: async (params: {
    make: string; model: string; year: number; mileage: number; condition: string; vin?: string;
  }): Promise<KbbValuation> => {
    const response = await api.get<ApiResponse<KbbValuation>>('/api/valuations/kbb', { params });
    if (!response.data.success || !response.data.data) throw new Error(response.data.error || 'Valuation failed');
    return response.data.data;
  },

  decodeVin: async (vin: string): Promise<VinDecodeResult> => {
    const response = await api.get<ApiResponse<VinDecodeResult>>(`/api/valuations/vin/${vin}`);
    if (!response.data.success || !response.data.data) throw new Error(response.data.error || 'VIN decode failed');
    return response.data.data;
  },

  analyzeVehicle: async (data: any): Promise<VehicleAnalysis> => {
    const response = await api.post<ApiResponse<VehicleAnalysis>>('/api/valuations/analyze', data);
    if (!response.data.success || !response.data.data) throw new Error(response.data.error || 'Analysis failed');
    return response.data.data;
  },
};

export const handleApiError = (error: AxiosError): string => {
  if (error.response) {
    const message = (error.response.data as any)?.message || error.message;
    return typeof message === 'string' ? message : 'An error occurred';
  } else if (error.request) {
    return 'Network error - please check your connection';
  }
  return error.message || 'An unexpected error occurred';
};
