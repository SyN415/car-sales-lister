import React, { createContext, useContext, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;
  isSigningUp: boolean;
  isLoggingOut: boolean;
  loginError: Error | null;
  signupError: Error | null;
  logoutError: Error | null;
  userError: Error | null;
}

interface AuthActions {
  login: (credentials: { email: string; password: string }) => void;
  signup: (credentials: { email: string; password: string; fullName?: string }) => void;
  logout: () => void;
  clearErrors: () => void;
  refetchUser: () => void;
  setToken: (token: string) => void;
}

interface AuthContextValue extends AuthState, AuthActions {}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const authState = useAuth();

  const handleLogin = useCallback((credentials: { email: string; password: string }) => {
    authState.login(credentials);
  }, []);

  const handleSignup = useCallback((credentials: { email: string; password: string; fullName?: string }) => {
    authState.signup(credentials);
  }, []);

  const handleLogout = useCallback(() => {
    authState.logout();
    navigate('/');
  }, [navigate]);

  const handleClearErrors = useCallback(() => {
    authState.clearErrors();
  }, []);

  const handleRefetchUser = useCallback(() => {
    authState.refetchUser();
  }, []);

  const setToken = useCallback((token: string) => {
    localStorage.setItem('auth_token', token);
    authState.refetchUser();
  }, [authState]);

  const contextValue: AuthContextValue = useMemo(() => ({
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    isLoggingIn: authState.isLoggingIn,
    isSigningUp: authState.isSigningUp,
    isLoggingOut: authState.isLoggingOut,
    loginError: authState.loginError,
    signupError: authState.signupError,
    logoutError: authState.logoutError,
    userError: authState.userError,
    login: handleLogin,
    signup: handleSignup,
    logout: handleLogout,
    clearErrors: handleClearErrors,
    refetchUser: handleRefetchUser,
    setToken,
  }), [
    authState.user, authState.isAuthenticated, authState.isLoading,
    authState.isLoggingIn, authState.isSigningUp, authState.isLoggingOut,
    authState.loginError, authState.signupError, authState.logoutError,
    authState.userError, handleLogin, handleSignup, handleLogout,
    handleClearErrors, handleRefetchUser, setToken,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const useAuthStatus = () => {
  const { isAuthenticated, isLoading } = useAuthContext();
  return { isAuthenticated, isLoading };
};

export const useCurrentUser = () => {
  const { user } = useAuthContext();
  return user;
};

export { useAuth } from '../hooks/useAuth';
