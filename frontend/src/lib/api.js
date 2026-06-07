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
export const register = (employee_id, name) =>
  api.post('/auth/register', { employee_id, name }).then(r => r.data);

export const login = (employee_id) =>
  api.post('/auth/login', { employee_id }).then(r => r.data);

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

// ---- Winners ----
export const latestWinners = () => api.get('/winners/latest').then(r => r.data);
