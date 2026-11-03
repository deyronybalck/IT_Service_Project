const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('itlab_auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('itlab_auth_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('itlab_auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err: any = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => request<any>('/auth/me'),
  verifyEmail: (token: string) => request<any>(`/auth/verify-email?token=${token}`),
  resendVerification: (email: string) => request<any>('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email: string) => request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (payload: any) => request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  changePassword: (payload: any) => request<any>('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  getDevDispatches: () => request<any>('/auth/dev-dispatches'),

  // Services
  getServices: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/services${query ? `?${query}` : ''}`);
  },
  getService: (id: string) => request<any>(`/services/${id}`),
  lookupBarcode: (barcode: string) => request<any>(`/services/barcode/${barcode}`),
  createService: (serviceData: any) => request<any>('/services', { method: 'POST', body: JSON.stringify(serviceData) }),
  updateService: (id: string, updateData: any) => request<any>(`/services/${id}`, { method: 'PUT', body: JSON.stringify(updateData) }),
  deleteService: (id: string) => request<any>(`/services/${id}`, { method: 'DELETE' }),

  // Schedules
  getSchedules: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/schedules${query ? `?${query}` : ''}`);
  },
  getSchedule: (id: string) => request<any>(`/schedules/${id}`),
  createSchedule: (scheduleData: any) => request<any>('/schedules', { method: 'POST', body: JSON.stringify(scheduleData) }),
  updateSchedule: (id: string, updateData: any) => request<any>(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(updateData) }),
  submitWorkReport: (scheduleId: string, reportData: any) => request<any>(`/schedules/${scheduleId}/report`, { method: 'POST', body: JSON.stringify(reportData) }),
  submitServiceRequest: (reqData: any) => request<any>('/schedules/technician-requests', { method: 'POST', body: JSON.stringify(reqData) }),
  getServiceRequests: () => request<any[]>('/schedules/technician-requests'),
  approveServiceRequest: (id: string, payload: any) => request<any>(`/schedules/technician-requests/${id}/approve`, { method: 'PATCH', body: JSON.stringify(payload) }),
  rejectServiceRequest: (id: string, payload: any) => request<any>(`/schedules/technician-requests/${id}/reject`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getFreeLabRecords: () => request<any[]>('/schedules/free-lab'),
  createFreeLabRecord: (labData: any) => request<any>('/schedules/free-lab', { method: 'POST', body: JSON.stringify(labData) }),

  // Quotations
  getQuotations: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/quotations${query ? `?${query}` : ''}`);
  },
  getQuotation: (id: string) => request<any>(`/quotations/${id}`),
  createQuotation: (quoData: any) => request<any>('/quotations', { method: 'POST', body: JSON.stringify(quoData) }),
  updateQuotationStatus: (id: string, payload: any) => request<any>(`/quotations/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),
  convertQuotationToService: (id: string) => request<any>(`/quotations/${id}/convert-to-service`, { method: 'POST' }),

  // Customers & Ledger
  getCustomers: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/customers${query ? `?${query}` : ''}`);
  },
  getCustomer: (id: string) => request<any>(`/customers/${id}`),
  createCustomer: (customerData: any) => request<any>('/customers', { method: 'POST', body: JSON.stringify(customerData) }),
  updateCustomer: (id: string, customerData: any) => request<any>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(customerData) }),
  recordPayment: (customerId: string, paymentData: any) => request<any>(`/customers/${customerId}/payments`, { method: 'POST', body: JSON.stringify(paymentData) }),

  // Products
  getProducts: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/products${query ? `?${query}` : ''}`);
  },
  createProduct: (productData: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(productData) }),
  updateProduct: (id: string, productData: any) => request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(productData) }),
  deleteProduct: (id: string) => request<any>(`/products/${id}`, { method: 'DELETE' }),

  // TA/DA Claims
  getTadaClaims: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/tada${query ? `?${query}` : ''}`);
  },
  createTadaClaim: (claimData: any) => request<any>('/tada', { method: 'POST', body: JSON.stringify(claimData) }),
  reviewTadaClaim: (id: string, payload: any) => request<any>(`/tada/${id}/review`, { method: 'PATCH', body: JSON.stringify(payload) }),
  payTadaClaim: (id: string) => request<any>(`/tada/${id}/pay`, { method: 'PATCH' }),

  // Follow-ups
  getFollowups: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/followups${query ? `?${query}` : ''}`);
  },
  createFollowup: (followupData: any) => request<any>('/followups', { method: 'POST', body: JSON.stringify(followupData) }),

  // Reports
  getDashboardStats: () => request<any>('/reports/dashboard-stats'),
  getFinancialReport: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any>(`/reports/financial${query ? `?${query}` : ''}`);
  },
  getServicesSummary: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any>(`/reports/services-summary${query ? `?${query}` : ''}`);
  },

  // Users
  getUsers: () => request<any[]>('/users'),
  createUser: (userData: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(userData) }),
  toggleUserStatus: (id: string, isActive: boolean) => request<any>(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive }) }),
  changeUserRole: (id: string, role: string) => request<any>(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),

  // Settings & WhatsApp
  getSettings: () => request<any>('/settings'),
  updateSettings: (settings: any) => request<any>('/settings', { method: 'POST', body: JSON.stringify(settings) }),
  triggerWhatsAppReminders: (forceSimulation: boolean = false) => request<any>('/settings/whatsapp/trigger-reminders', { method: 'POST', body: JSON.stringify({ forceSimulation }) }),
  getWhatsAppLogs: () => request<any[]>('/settings/whatsapp/logs'),
  getActivityLogs: () => request<any[]>('/settings/activity-logs'),

  // Notifications
  getNotifications: () => request<any>('/settings/notifications'),
  markNotificationRead: (id: string) => request<any>(`/settings/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<any>('/settings/notifications/mark-all-read', { method: 'PATCH' }),
};
