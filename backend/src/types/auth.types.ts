export interface SessionUser {
  id: string;
  email: string;
  full_name?: string;
  role: 'user' | 'admin';
  location?: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  data?: SessionUser;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  fullName?: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}
