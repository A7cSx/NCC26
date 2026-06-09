import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Main axios instance — uses regular user Bearer token for /auth, /predictions, /matches etc.
export const api = axios.create({ baseURL: API });

// Separate axios instance for admin endpoints — uses admin Bearer token.
export const adminApi = axios.create({ baseURL: API });

// ---- Legacy admin password (kept for back-compat / quick-access via X-Admin-Password) ----
export const setAdminPassword = (pwd) => {
  if (pwd) {
    adminApi.defaults.headers.common['X-Admin-Password'] = pwd;
    localStorage.setItem('ncc_admin_pwd', pwd);
  } else {
    delete adminApi.defaults.headers.common['X-Admin-Password'];
    localStorage.removeItem('ncc_admin_pwd');
  }
};
const storedPwd = localStorage.getItem('ncc_admin_pwd');
if (storedPwd) setAdminPassword(storedPwd);

// ---- Admin token (modern Bearer JWT) ----
const ADMIN_TOKEN_KEY = 'ncc_admin_token';
export const setAdminToken = (tok) => {
  if (tok) {
    adminApi.defaults.headers.common['Authorization'] = `Bearer ${tok}`;
    localStorage.setItem(ADMIN_TOKEN_KEY, tok);
  } else {
    delete adminApi.defaults.headers.common['Authorization'];
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
};
const storedAdminTok = localStorage.getItem(ADMIN_TOKEN_KEY);
if (storedAdminTok) setAdminToken(storedAdminTok);

// ---- User auth ----
const TOKEN_KEY = 'ncc_token';
export const setAuthToken = (tok) => {
  if (tok) {
    api.defaults.headers.common['Authorization'] = `Bearer ${tok}`;
    localStorage.setItem(TOKEN_KEY, tok);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem(TOKEN_KEY);
  }
};
const _tok = localStorage.getItem(TOKEN_KEY);
if (_tok) setAuthToken(_tok);

export const register = (data) =>
  api.post('/auth/register', data).then(r => r.data);

export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then(r => r.data);

export const me = () => api.get('/auth/me').then(r => r.data);

// ---- Matches ----
export const listMatches = () => api.get('/matches').then(r => r.data);
export const getMatch = (id) => api.get(`/matches/${id}`).then(r => r.data);

// ---- Predictions ----
export const submitPrediction = (data) =>
  api.post('/predictions', data).then(r => r.data);
export const myPredictions = (employee_id) =>
  api.get('/predictions/me', { params: { employee_id } }).then(r => r.data);
export const matchPredictions = (match_id) =>
  api.get(`/predictions/match/${match_id}`).then(r => r.data);

// ---- Leaderboard ----
export const getLeaderboard = () => api.get('/leaderboard').then(r => r.data);

// ---- Admin: auth ----
export const adminLogin = (username, password) =>
  adminApi.post('/admin/auth/login', { username, password }).then(r => r.data);
export const adminCheck = () => adminApi.get('/admin/check').then(r => r.data);

// ---- Admin: matches ----
export const adminSubmitResult = (match_id, result_a, result_b) =>
  adminApi.post(`/admin/matches/${match_id}/result`, { result_a, result_b }).then(r => r.data);
export const adminSetStatus = (match_id, status) =>
  adminApi.post(`/admin/matches/${match_id}/status?status=${status}`).then(r => r.data);
export const adminCreateMatch = (data) =>
  adminApi.post('/admin/matches', data).then(r => r.data);
export const adminDeleteMatch = (match_id) =>
  adminApi.delete(`/admin/matches/${match_id}`).then(r => r.data);
export const adminSeed = () => adminApi.post('/admin/seed').then(r => r.data);
export const adminMatchPredictions = (match_id) =>
  adminApi.get(`/admin/matches/${match_id}/predictions`).then(r => r.data);
export const adminSetStreamUrl = (match_id, stream_url) =>
  adminApi.post(`/admin/matches/${match_id}/stream?stream_url=${encodeURIComponent(stream_url || '')}`).then(r => r.data);

// ---- Admin: users ----
export const adminListUsers = (q = '') =>
  adminApi.get('/admin/users', { params: q ? { q } : {} }).then(r => r.data);
export const adminGetUser = (employee_id) =>
  adminApi.get(`/admin/users/${employee_id}`).then(r => r.data);
export const adminDeleteUser = (employee_id) =>
  adminApi.delete(`/admin/users/${employee_id}`).then(r => r.data);
export const adminResetUserPassword = (employee_id, new_password) =>
  adminApi.post(`/admin/users/${employee_id}/reset-password`, { new_password }).then(r => r.data);

// ---- Admin: predictions ----
export const adminListAllPredictions = (params = {}) =>
  adminApi.get('/admin/predictions', { params }).then(r => r.data);
export const adminDeletePrediction = (prediction_id) =>
  adminApi.delete(`/admin/predictions/${prediction_id}`).then(r => r.data);

// ---- Admin: dashboard ----
export const adminDashboard = () => adminApi.get('/admin/dashboard').then(r => r.data);

// ---- Admin: file exports ----
export const downloadAdminXlsx = async (path, filename) => {
  const headers = {};
  const tok = localStorage.getItem('ncc_admin_token');
  const pwd = localStorage.getItem('ncc_admin_pwd');
  if (tok) headers['Authorization'] = `Bearer ${tok}`;
  if (pwd) headers['X-Admin-Password'] = pwd;
  const r = await fetch(`${API}${path}`, { headers });
  if (!r.ok) throw new Error('Export failed');
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ---- Winners ----
export const latestWinners = () => api.get('/winners/latest').then(r => r.data);
