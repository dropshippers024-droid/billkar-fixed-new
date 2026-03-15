import { syncPlanFromUser, setTeamRole } from './planStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://billkar-api.dropshippers024.workers.dev';
const ACTIVE_BIZ_KEY = 'billkar_active_business';

type TokenPayload = {
  exp?: number;
};

type InvoiceItemResponse = Record<string, unknown>;
type Membership = { business_id: string; role?: string | null };
type ApiErrorBody = { error?: string } & Record<string, unknown>;
type JsonObject = Record<string, unknown>;

export function getActiveBusiness(): { id: string; name: string; role: string } | null {
  try {
    const raw = localStorage.getItem(ACTIVE_BIZ_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setActiveBusiness(biz: { id: string; name: string; role: string } | null): void {
  if (biz) {
    localStorage.setItem(ACTIVE_BIZ_KEY, JSON.stringify(biz));
  } else {
    localStorage.removeItem(ACTIVE_BIZ_KEY);
  }
  window.dispatchEvent(new CustomEvent('billkar:business-switched'));
}

class BillKarAPI {
  private token: string | null = null;

  constructor() {
    const storedToken = localStorage.getItem('billkar_token');
    if (storedToken && !this.isTokenExpired(storedToken)) {
      this.token = storedToken;
    } else {
      this.clearSession();
    }
  }

  private decodeToken(token: string): TokenPayload | null {
    try {
      const [, payload] = token.split('.');
      if (!payload) return null;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload?.exp) return false;
    return payload.exp <= Math.floor(Date.now() / 1000);
  }

  private clearSession() {
    this.token = null;
    localStorage.removeItem('billkar_token');
    localStorage.removeItem('billkar_user');
    localStorage.removeItem('billkar_team_memberships');
    localStorage.removeItem('billkar_team_role');
    localStorage.removeItem('billkar_active_business');
    setTeamRole(null);
  }

  private normalizeInvoiceItem(item: InvoiceItemResponse) {
    const description = String(item.description || item.name || '');
    const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
    const gstRate = Number(item.gst_rate ?? item.gst_percent ?? item.gstPercent ?? 0) || 0;

    return {
      ...item,
      description,
      name: String(item.name || description),
      quantity,
      qty: quantity,
      gst_rate: gstRate,
      gst_percent: gstRate,
    };
  }

  private async request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    if (this.token && this.isTokenExpired(this.token)) {
      this.clearSession();
      throw new Error('Session expired. Please log in again.');
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    // Send X-Business-Id if user is operating on a team business
    const activeBiz = getActiveBusiness();
    if (activeBiz) headers['X-Business-Id'] = activeBiz.id;
    const url = `${API_URL}${path}`;

    let res: Response;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (err) {
      console.error(`[BillKar API] Network error: ${options.method || 'GET'} ${path}`, err);
      throw new Error('Network error — check your connection or if the backend is running.');
    }

    let data: T;
    try {
      if (res.status === 204) return null as T;
      data = await res.json();
    } catch {
      console.error(`[BillKar API] Invalid JSON: ${res.status} ${path}`);
      throw new Error(`Server returned invalid response (${res.status})`);
    }

    if (!res.ok) {
      if (res.status === 401) this.clearSession();
      const errorBody = data as ApiErrorBody;
      console.error(`[BillKar API] ${res.status} ${options.method || 'GET'} ${path}:`, errorBody.error || data);
      throw new Error(errorBody.error || `Request failed (${res.status})`);
    }
    return data;
  }

  // Auth
  async signup(email: string, password: string, full_name: string) {
    const data = await this.request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, full_name }) });
    this.token = data.token;
    localStorage.setItem('billkar_token', data.token);
    localStorage.setItem('billkar_user', JSON.stringify(data.user));
    syncPlanFromUser(data.user);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    this.token = data.token;
    localStorage.setItem('billkar_token', data.token);
    localStorage.setItem('billkar_user', JSON.stringify(data.user));
    syncPlanFromUser(data.user);
    return data;
  }

  async getMe() {
    const data = await this.request('/api/auth/me');
    if (data?.user) {
      // Sync personal plan to localStorage
      syncPlanFromUser(data.user);
      // Store team memberships for business switcher
      if (data.teamMemberships?.length) {
        localStorage.setItem('billkar_team_memberships', JSON.stringify(data.teamMemberships));
        // If user has an active business set, sync its role
        const activeBiz = getActiveBusiness();
        if (activeBiz) {
          const membership = data.teamMemberships.find((m: Membership) => m.business_id === activeBiz.id);
          setTeamRole(membership?.role || null);
        } else {
          setTeamRole(null);
        }
      } else {
        localStorage.removeItem('billkar_team_memberships');
        setTeamRole(null);
      }
      // Update cached user data
      try {
        const stored = JSON.parse(localStorage.getItem('billkar_user') || '{}');
        localStorage.setItem('billkar_user', JSON.stringify({ ...stored, ...data.user }));
      } catch {
        localStorage.setItem('billkar_user', JSON.stringify(data.user));
      }
    }
    return data;
  }
  async forgotPassword(email: string) { return this.request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }); }
  async resetPassword(token: string, password: string) { return this.request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }); }
  async changePassword(current_password: string, new_password: string) { return this.request('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }); }
  async updateProfile(data: JsonObject) { return this.request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }); }

  logout() {
    this.clearSession();
  }

  isLoggedIn() {
    if (!this.token) return false;
    if (this.isTokenExpired(this.token)) {
      this.clearSession();
      return false;
    }
    return true;
  }
  getUser() { try { return JSON.parse(localStorage.getItem('billkar_user') || 'null'); } catch { return null; } }

  // Business
  async getBusiness() { return this.request('/api/business'); }
  async updateBusiness(data: JsonObject) { return this.request('/api/business', { method: 'PUT', body: JSON.stringify(data) }); }

  // Invoices
  async getInvoices() { return this.request('/api/invoices'); }
  async createInvoice(data: JsonObject) { return this.request('/api/invoices', { method: 'POST', body: JSON.stringify(data) }); }
  async updateInvoice(id: string, data: JsonObject) { return this.request(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async getInvoiceItems(id: string) {
    const data = await this.request(`/api/invoices/${id}/items`);
    const rawItems = Array.isArray(data) ? data : data?.items || [];
    return rawItems.map((item: InvoiceItemResponse) => this.normalizeInvoiceItem(item));
  }

  // Recurring invoices
  async getRecurringInvoices() { return this.request('/api/recurring-invoices'); }
  async generateDueRecurringInvoices() { return this.request('/api/recurring-invoices/generate-due', { method: 'POST' }); }
  async updateRecurringInvoice(id: string, data: JsonObject) { return this.request(`/api/recurring-invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async deleteRecurringInvoice(id: string) { return this.request(`/api/recurring-invoices/${id}`, { method: 'DELETE' }); }

  // Customers
  async getCustomers() { return this.request('/api/customers'); }
  async createCustomer(data: JsonObject) { return this.request('/api/customers', { method: 'POST', body: JSON.stringify(data) }); }
  async updateCustomer(id: string, data: JsonObject) { return this.request(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async deleteCustomer(id: string) { return this.request(`/api/customers/${id}`, { method: 'DELETE' }); }

  // Products
  async getProducts() { return this.request('/api/products'); }
  async createProduct(data: JsonObject) { return this.request('/api/products', { method: 'POST', body: JSON.stringify(data) }); }
  async updateProduct(id: string, data: JsonObject) { return this.request(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async deleteProduct(id: string) { return this.request(`/api/products/${id}`, { method: 'DELETE' }); }

  // Expenses
  async getExpenses() { return this.request('/api/expenses'); }
  async createExpense(data: JsonObject) { return this.request('/api/expenses', { method: 'POST', body: JSON.stringify(data) }); }
  async updateExpense(id: string, data: JsonObject) { return this.request(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async deleteExpense(id: string) { return this.request(`/api/expenses/${id}`, { method: 'DELETE' }); }

  // Payments
  async createPayment(data: JsonObject) { return this.request('/api/payments', { method: 'POST', body: JSON.stringify(data) }); }

  // Reports
  async getGSTReport(month: string) { return this.request(`/api/reports/gst?month=${month}`); }
  async getSalesReport() { return this.request('/api/reports/sales'); }

  // Team
  async getTeam() { return this.request('/api/team'); }
  async inviteTeamMember(data: { email: string; role?: string }) { return this.request('/api/team/invite', { method: 'POST', body: JSON.stringify(data) }); }
  async updateTeamMember(id: string, data: { role: string }) { return this.request(`/api/team/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async removeTeamMember(id: string) { return this.request(`/api/team/${id}`, { method: 'DELETE' }); }
  async getInviteDetails(inviteId: string) { return this.request(`/api/team/invite/${inviteId}`); }
  async acceptInvite(inviteId: string) { return this.request(`/api/team/accept/${inviteId}`, { method: 'POST' }); }

  // Admin
  async getAdminStats() { return this.request('/api/admin/stats'); }
  async getAdminUsers() { return this.request('/api/admin/users'); }
  async updateUserPlan(data: { user_id: string; plan: string; days?: number }) { return this.request('/api/admin/update-plan', { method: 'POST', body: JSON.stringify(data) }); }
  async deleteUser(id: string) { return this.request(`/api/admin/users/${id}`, { method: 'DELETE' }); }

  // File upload
  async uploadFile(file: File, type: string = 'misc') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', headers, body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Upload failed (${res.status})`);
    }
    return res.json();
  }
}

export const api = new BillKarAPI();
export default api;
