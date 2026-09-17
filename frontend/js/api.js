const API_BASE_URL = 'http://localhost:3000/api';

const Storage = {
  getToken: () => localStorage.getItem('sc_token'),
  setToken: (token) => localStorage.setItem('sc_token', token),
  clearToken: () => localStorage.removeItem('sc_token'),

  getUser: () => {
    const raw = localStorage.getItem('sc_user');
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user) => localStorage.setItem('sc_user', JSON.stringify(user)),
  clearUser: () => localStorage.removeItem('sc_user'),

  clearAll: () => {
    Storage.clearToken();
    Storage.clearUser();
  },

  isLoggedIn: () => !!Storage.getToken(),
};

/**
 * Wrapper genérico de requisições à API.
 * @param {string} path        
 * @param {object} options     
 */
async function apiRequest(path, options = {}) {
  const { method = 'GET', body = null, isFormData = false, auth = true } = options;

  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = Storage.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const config = { method, headers };
  if (body !== null) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, config);
  } catch (networkErr) {
    throw new Error('Não foi possível conectar ao servidor. Verifique se a API está rodando em ' + API_BASE_URL);
  }

  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    data = {};
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      // Token inválido/expirado -> força novo login
      Storage.clearAll();
      if (!location.pathname.includes('login.html')) {
        window.location.href = '/pages/login.html';
      }
    }
    const error = new Error(data.error || 'Ocorreu um erro na requisição.');
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

const Api = {
  // ---------- Auth ----------
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload, auth: false }),
  verifyEmail: (payload) => apiRequest('/auth/verify-email', { method: 'POST', body: payload, auth: false }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload, auth: false }),
  forgotPassword: (payload) => apiRequest('/auth/forgot-password', { method: 'POST', body: payload, auth: false }),
  resetPassword: (payload) => apiRequest('/auth/reset-password', { method: 'POST', body: payload, auth: false }),

  // ---------- Users ----------
  getMyProfile: () => apiRequest('/users/me'),
  getUserProfile: (id) => apiRequest(`/users/${id}`),
  updateBio: (bio) => apiRequest('/users/bio', { method: 'PUT', body: { bio } }),
  uploadAvatar: (formData) => apiRequest('/users/avatar', { method: 'POST', body: formData, isFormData: true }),
  searchUsers: (params) => apiRequest(`/users/search?${new URLSearchParams(params).toString()}`),

  // ---------- Follow ----------
  toggleFollow: (id) => apiRequest(`/users/${id}/follow`, { method: 'POST' }),
  getFollowers: (id) => apiRequest(`/users/${id}/followers`),
  getFollowing: (id) => apiRequest(`/users/${id}/following`),

  // ---------- Notifications ----------
  getNotifications: () => apiRequest('/users/me/notifications'),
  markNotificationRead: (id) => apiRequest(`/users/me/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => apiRequest('/users/me/notifications/read-all', { method: 'PATCH' }),

  // ---------- Posts / Feed ----------
  getFeed: () => apiRequest('/posts'),
  createPost: (formData) => apiRequest('/posts', { method: 'POST', body: formData, isFormData: true }),
  toggleLike: (postId) => apiRequest(`/posts/${postId}/like`, { method: 'POST' }),
  addComment: (postId, content) => apiRequest(`/posts/${postId}/comments`, { method: 'POST', body: { content } }),
  deletePost: (postId) => apiRequest(`/posts/${postId}`, { method: 'DELETE' }),
  reportPost: (postId, payload) => apiRequest(`/posts/${postId}/report`, { method: 'POST', body: payload }),

  // ---------- Messages ----------
  getInbox: () => apiRequest('/messages/inbox'),
  getConversation: (userId) => apiRequest(`/messages/${userId}`),
  sendMessage: (userId, content) => apiRequest(`/messages/${userId}`, { method: 'POST', body: { content } }),

  // ---------- Opportunities ----------
  getOpportunities: (params = {}) => apiRequest(`/opportunities?${new URLSearchParams(params).toString()}`),
  createOpportunity: (payload) => apiRequest('/opportunities', { method: 'POST', body: payload }),
  deleteOpportunity: (id) => apiRequest(`/opportunities/${id}`, { method: 'DELETE' }),

  // ---------- Admin ----------
  getAdminStats: () => apiRequest('/admin/stats'),
  getAdminUsers: (params = {}) => apiRequest(`/admin/users?${new URLSearchParams(params).toString()}`),
  updateUserRole: (id, role) => apiRequest(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
  adminDeletePost: (id) => apiRequest(`/admin/posts/${id}`, { method: 'DELETE' }),
  getReports: (params = {}) => apiRequest(`/admin/reports?${new URLSearchParams(params).toString()}`),
  resolveReport: (id, action) => apiRequest(`/admin/reports/${id}/resolve`, { method: 'PATCH', body: { action } }),
};
