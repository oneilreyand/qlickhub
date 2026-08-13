import { apiClient } from './apiClient';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

export interface AuthResponseData {
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponseData> {
    const response = await apiClient<{ data: AuthResponseData }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
      }),
    });
    return response.data;
  },

  async getSession(): Promise<User> {
    const response = await apiClient<{ data: AuthResponseData }>('/auth/session');
    return response.data.user;
  },

  async logout() {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Clear the browser's non-sensitive UI profile even if the session already expired.
    }
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_id');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  },
};
