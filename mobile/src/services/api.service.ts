import { API_BASE_URL } from '../config/env.js';
import { User, Lead } from '../types/index.js';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Request failed`);
      }

      return data as T;
    } catch (err: any) {
      if (err.message && err.message.includes('Network request failed')) {
        throw new Error(
          `Unable to connect to backend at ${API_BASE_URL}. Ensure your backend server is running and your IP is configured correctly.`
        );
      }
      throw err;
    }
  }

  // Auth Endpoints
  async register(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
    return this.request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    return this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me', {
      method: 'GET',
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.token = null;
    }
  }

  // Leads Endpoints
  async getLeads(): Promise<{ leads: Lead[]; count: number }> {
    return this.request<{ leads: Lead[]; count: number }>('/api/leads', {
      method: 'GET',
    });
  }
}

export const apiService = new ApiService();
