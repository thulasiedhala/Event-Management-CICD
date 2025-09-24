import { projectId, publicAnonKey } from './supabase/info';
import { mockServer } from './mockServer';

const USE_MOCK_SERVER = true; // Set to false when Supabase functions are working

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-1eecec3b`;

class ApiClient {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    // If mock server is enabled, handle requests locally
    if (USE_MOCK_SERVER) {
      return this.handleMockRequest(endpoint, options);
    }

    // Try real API first, fallback to mock on error
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('API request failed, falling back to mock server:', error);
      return this.handleMockRequest(endpoint, options);
    }
  }

  private async handleMockRequest(endpoint: string, options: RequestInit = {}) {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body as string) : {};
    const authHeader = (options.headers as any)?.['Authorization'];
    const token = authHeader?.replace('Bearer ', '');

    try {
      // Route to appropriate mock server method
      if (endpoint === '/signup' && method === 'POST') {
        return await mockServer.signUp(body.email, body.password, body.firstName, body.lastName);
      }

      if (endpoint === '/signin' && method === 'POST') {
        return await mockServer.signIn(body.email, body.password);
      }

      if (endpoint === '/auth/social' && method === 'POST') {
        return await mockServer.signInWithSocial(body.provider);
      }

      if (endpoint === '/events' && method === 'GET') {
        return await mockServer.getEvents();
      }

      if (endpoint.startsWith('/events/') && method === 'GET') {
        const eventId = endpoint.split('/events/')[1];
        return await mockServer.getEvent(eventId);
      }

      if (endpoint === '/bookings' && method === 'POST') {
        return await mockServer.createBooking(token!, body.eventId, body.quantity, body.totalAmount);
      }

      if (endpoint === '/user/bookings' && method === 'GET') {
        return await mockServer.getUserBookings(token!);
      }

      if (endpoint === '/admin/stats' && method === 'GET') {
        return await mockServer.getAdminStats(token!);
      }

      if (endpoint === '/admin/events' && method === 'GET') {
        return await mockServer.getAdminEvents(token!);
      }

      if (endpoint === '/admin/events' && method === 'POST') {
        return await mockServer.createAdminEvent(token!, body);
      }

      throw new Error(`Unsupported endpoint: ${method} ${endpoint}`);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Request failed');
    }
  }

  async signUp(email: string, password: string, firstName: string, lastName: string) {
    return this.makeRequest('/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
  }

  async signIn(email: string, password: string) {
    return this.makeRequest('/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signInWithSocial(provider: 'google' | 'facebook' | 'github') {
    return this.makeRequest('/auth/social', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    });
  }

  async getEvents() {
    return this.makeRequest('/events');
  }

  async getEvent(eventId: string) {
    return this.makeRequest(`/events/${eventId}`);
  }

  async createBooking(token: string, eventId: string, quantity: number, totalAmount?: number) {
    return this.makeRequest('/bookings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ eventId, quantity, totalAmount }),
    });
  }

  async getUserBookings(token: string) {
    return this.makeRequest('/user/bookings', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  async getAdminStats(token: string) {
    return this.makeRequest('/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  async getAdminEvents(token: string) {
    return this.makeRequest('/admin/events', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  async createAdminEvent(token: string, eventData: any) {
    return this.makeRequest('/admin/events', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(eventData),
    });
  }
}

export const apiClient = new ApiClient();