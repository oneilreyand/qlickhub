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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await apiClient<{ data: { message: string } }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response.data;
  },

  async resetPassword(payload: { token: string; newPassword: string }): Promise<{ message: string }> {
    const response = await apiClient<{ data: { message: string } }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    const response = await apiClient<{ data: { message: string } }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async updateProfile(payload: { name?: string; avatarUrl?: string | null }): Promise<User> {
    const response = await apiClient<{ data: AuthResponseData }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (payload.name) localStorage.setItem('user_name', payload.name);
    return response.data.user;
  },

  async adminResetMemberPassword(payload: { targetUserId: string; newPassword: string }): Promise<{ message: string }> {
    const response = await apiClient<{ data: { message: string } }>('/auth/admin/reset-member-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
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
