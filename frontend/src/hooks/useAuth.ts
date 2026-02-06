import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../services/api';
import { authKeys } from '../lib/query-keys';
import { setSupabaseSession } from '../lib/supabase';
import type { User } from '../types';

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authAPI.login(email, password),

    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token);
      if (data.supabaseAccessToken) localStorage.setItem('supabase_access_token', data.supabaseAccessToken);
      if (data.refreshToken) localStorage.setItem('supabase_refresh_token', data.refreshToken);

      if (data.supabaseAccessToken && data.refreshToken) {
        setSupabaseSession(data.supabaseAccessToken, data.refreshToken);
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      queryClient.setQueryData(authKeys.currentUser, data.user);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
    },
  });
};

export const useSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password, fullName }: { email: string; password: string; fullName?: string }) =>
      authAPI.signup(email, password, fullName),

    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token);
      if (data.supabaseAccessToken) localStorage.setItem('supabase_access_token', data.supabaseAccessToken);
      if (data.refreshToken) localStorage.setItem('supabase_refresh_token', data.refreshToken);

      if (data.supabaseAccessToken && data.refreshToken) {
        setSupabaseSession(data.supabaseAccessToken, data.refreshToken);
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      queryClient.setQueryData(authKeys.currentUser, data.user);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authAPI.logout(),

    onMutate: async () => {
      queryClient.clear();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('supabase_access_token');
      localStorage.removeItem('supabase_refresh_token');
      localStorage.removeItem('user');
    },

    onError: () => {
      queryClient.clear();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    },
  });
};

export const useCurrentUserQuery = () => {
  return useQuery({
    queryKey: authKeys.currentUser,

    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const cachedUser = localStorage.getItem('user');

      if (!token) return null;

      const supabaseAccessToken = localStorage.getItem('supabase_access_token');
      const supabaseRefreshToken = localStorage.getItem('supabase_refresh_token');
      if (supabaseAccessToken && supabaseRefreshToken) {
        setSupabaseSession(supabaseAccessToken, supabaseRefreshToken);
      }

      if (cachedUser) {
        try { return JSON.parse(cachedUser); } catch { localStorage.removeItem('user'); }
      }

      const user = await authAPI.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    },

    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        return false;
      }
      return failureCount < 2;
    },

    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: true,
    enabled: () => !!localStorage.getItem('auth_token'),
  });
};

export const useAuth = () => {
  const loginMutation = useLogin();
  const signupMutation = useSignup();
  const logoutMutation = useLogout();
  const currentUserQuery = useCurrentUserQuery();

  return {
    user: currentUserQuery.data as User | null,
    isAuthenticated: !!currentUserQuery.data && !currentUserQuery.isLoading,
    isLoading: currentUserQuery.isLoading,
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    signupError: signupMutation.error,
    logoutError: logoutMutation.error,
    userError: currentUserQuery.error,
    login: loginMutation.mutate,
    signup: signupMutation.mutate,
    logout: logoutMutation.mutate,
    clearErrors: () => {
      loginMutation.reset();
      signupMutation.reset();
      logoutMutation.reset();
    },
    refetchUser: currentUserQuery.refetch,
  };
};
