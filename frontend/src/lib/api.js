import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const setAdminPassword = (pwd) => {
  if (pwd) {
    api.defaults.headers.common['X-Admin-Password'] = pwd;
    localStorage.setItem('ncc_admin_pwd', pwd);
  } else {
    delete api.defaults.headers.common['X-Admin-Password'];
    localStorage.removeItem('ncc_admin_pwd');
  }
};

const stored = localStorage.getItem('ncc_admin_pwd');
if (stored) setAdminPassword(stored);

// ---- Auth ----
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

// ---- Admin ----
export const adminCheck = () => api.get('/admin/check').then(r => r.data);
export const adminSubmitResult = (match_id, result_a, result_b) =>
  api.post(`/admin/matches/${match_id}/result`, { result_a, result_b }).then(r => r.data);
export const adminSetStatus = (match_id, status) =>
  api.post(`/admin/matches/${match_id}/status?status=${status}`).then(r => r.data);
export const adminCreateMatch = (data) =>
  api.post('/admin/matches', data).then(r => r.data);
export const adminDeleteMatch = (match_id) =>
  api.delete(`/admin/matches/${match_id}`).then(r => r.data);
export const adminSeed = () => api.post('/admin/seed').then(r => r.data);
export const adminMatchPredictions = (match_id) =>
  api.get(`/admin/matches/${match_id}/predictions`).then(r => r.data);
export const adminSetStreamUrl = (match_id, stream_url) =>
  api.post(`/admin/matches/${match_id}/stream?stream_url=${encodeURIComponent(stream_url || '')}`).then(r => r.data);
export const adminExportMatchUrl = (match_id) =>
  `${API}/admin/matches/${match_id}/export.xlsx`;
export const adminExportAllUrl = () =>
  `${API}/admin/predictions/export.xlsx`;

// Helper to download a file with the admin header attached
export const downloadAdminXlsx = async (path, filename) => {
  const pwd = localStorage.getItem('ncc_admin_pwd') || '';
  const r = await fetch(`${API}${path}`, { headers: { 'X-Admin-Password': pwd } });
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
