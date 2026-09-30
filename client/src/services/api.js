import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for attaching auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('helpdesk_token');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper function to extract user-friendly error messages
export const getErrorMessage = (error, defaultMessage = 'An unexpected error occurred') => {
  if (!error.response) {
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      return 'Unable to connect to the server. Please check your network connection.';
    }
    return error.message || defaultMessage;
  }

  const { status, data } = error.response;
  if (data?.message) {
    return data.message;
  }

  switch (status) {
    case 400:
      return 'Invalid request parameters. Please check your inputs.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return 'The requested resource could not be found.';
    case 409:
      return 'The requested change conflicts with existing data.';
    case 422:
      return 'Validation failed. Please verify your submitted data.';
    case 500:
      return 'Something went wrong on the server. Please try again later.';
    default:
      return defaultMessage;
  }
};

// Response interceptor for handling errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');

    if (error.response && error.response.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('helpdesk_token');
      localStorage.removeItem('helpdesk_user');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Global Search API Service
export const searchService = {
  search: (query, limit = 10) => api.get('/search', { params: { q: query, limit } }),
};

// Profile & Personal Settings API Services
export const profileService = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.patch('/profile', data),
  changePassword: (data) => api.patch('/profile/password', data),
  updateSettings: (data) => api.patch('/profile/settings', data),
};

// Ticket API Services
export const ticketService = {
  createTicket: (data) => api.post('/tickets', data),
  getTickets: (params) => api.get('/tickets', { params }),
  getMyTickets: (params) => api.get('/tickets/my', { params }),
  getTicketById: (id) => api.get(`/tickets/${id}`),
  updateTicket: (id, data) => api.patch(`/tickets/${id}`, data),

  // Phase 5 Workflow Actions
  addComment: (id, data) => api.post(`/tickets/${id}/comments`, data),
  addInternalNote: (id, data) => api.post(`/tickets/${id}/internal-notes`, data),
  escalateTicket: (id, data) => api.post(`/tickets/${id}/escalate`, data),
  resolveTicket: (id, data) => api.post(`/tickets/${id}/resolve`, data),
  closeTicket: (id) => api.post(`/tickets/${id}/close`),
  reopenTicket: (id, data) => api.post(`/tickets/${id}/reopen`, data),
};

// Category API Services
export const categoryService = {
  getCategories: (params) => api.get('/categories', { params }),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.patch(`/categories/${id}`, data),
  updateCategoryStatus: (id, data) => api.patch(`/categories/${id}/status`, data),
};

// User API Services
export const userService = {
  getUsers: (params) => api.get('/users', { params }),
  getAssignableUsers: () => api.get('/users/assignable'),
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.patch(`/users/${id}`, data),
  updateUserRole: (id, data) => api.patch(`/users/${id}/role`, data),
  updateUserStatus: (id, data) => api.patch(`/users/${id}/status`, data),
};

// SLA API Services
export const slaService = {
  getSLAs: () => api.get('/sla'),
  getSLAById: (id) => api.get(`/sla/${id}`),
  createSLA: (data) => api.post('/sla', data),
  updateSLA: (id, data) => api.patch(`/sla/${id}`, data),
  updateSLAStatus: (id, data) => api.patch(`/sla/${id}/status`, data),
};

// Audit Log API Services
export const auditLogService = {
  getAuditLogs: (params) => api.get('/audit-logs', { params }),
};

// Notification API Services
export const notificationService = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

// Analytics API Services
export const analyticsService = {
  getAdminAnalytics: (params) => api.get('/analytics/admin', { params }),
  getEngineerAnalytics: (params) => api.get('/analytics/engineer', { params }),
  getEmployeeAnalytics: (params) => api.get('/analytics/employee', { params }),
};

// Health Check API Service
export const healthService = {
  checkHealth: () => api.get('/health'),
};

export default api;
