import React, { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../lib/i18n';
import {
  listMatches,
  adminCheck,
  adminLogin,
  setAdminToken,
  setAdminPassword,
  adminSubmitResult,
  adminSetStatus,
  adminDeleteMatch,
  adminMatchPredictions,
  adminSetStreamUrl,
  adminListUsers,
  adminGetUser,
  adminDeleteUser,
  adminResetUserPassword,
  adminListAllPredictions,
  adminDeletePrediction,
  adminDashboard,
  downloadAdminXlsx,
} from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  ShieldCheck, LogIn, LogOut, Radio, RotateCcw, Trash2, Save, Eye, EyeOff, Users,
  FileDown, Tv, KeyRound, Search, Activity, ListChecks, BarChart3, UserCheck, Trophy, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatFullDate } from '../lib/dates';

const fmtDateTime = (iso, lang) => (iso ? formatFullDate(iso, lang) : '—');

export default function Admin() {
  const { t, lang, isAr } = useI18n();
  const [authed, setAuthed] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);

  // On mount: validate stored admin token (silently)
  useEffect(() => {
    (async () => {
      const tok = localStorage.getItem('ncc_admin_token');
      const pwd = localStorage.getItem('ncc_admin_pwd');
      if (!tok && !pwd) return;
      try {
        const r = await adminCheck();
        if (r.ok) {
          setAuthed(true);
          setAdminInfo({ username: r.username || 'admin', role: r.role });
        } else {
          setAdminToken(null);
          setAdminPassword(null);
        }
      } catch {
        setAdminToken(null);
        setAdminPassword(null);
      }
    })();
  }, []);

  const onLoginSuccess = (admin) => {
    setAuthed(true);
    setAdminInfo(admin);
  };

  const onLogout = () => {
    setAdminToken(null);
    setAdminPassword(null);
    setAuthed(false);
    setAdminInfo(null);
  };

  if (!authed) {
    return <AdminLogin onSuccess={onLoginSuccess} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold font-bold mb-1">
            <ShieldCheck className="w-5 h-5" />
            {t('admin.title')}
          </div>
          <h1 className="text-4xl font-black tracking-tighter">
            {isAr ? 'لوحة تحكم المسابقة' : 'Contest Control Center'}
          </h1>
          <p className="text-slate-400 mt-1">{t('admin.desc')}</p>
        </div>
        <div className="flex items-center gap-3">
          {adminInfo && (
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400">{t('admin.welcome')}</div>
              <div className="text-sm font-bold text-gold" data-testid="admin-user-name">{adminInfo.username}</div>
            </div>
          )}
          <Button onClick={onLogout} variant="outline" data-testid="admin-logout-btn" className="border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200">
            <LogOut className="w-4 h-4" />
            {t('admin.logout')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full mt-8">
        <TabsList className="bg-bg-card border border-white/10 mb-6 flex-wrap h-auto" data-testid="admin-tabs">
          <TabsTrigger value="dashboard" data-testid="admin-tab-dashboard" className="data-[state=active]:bg-gold data-[state=active]:text-bg-base font-bold gap-1.5">
            <BarChart3 className="w-4 h-4" /> {t('admin.tabDashboard')}
          </TabsTrigger>
          <TabsTrigger value="matches" data-testid="admin-tab-matches" className="data-[state=active]:bg-saudi-green data-[state=active]:text-white font-bold gap-1.5">
            <Calendar className="w-4 h-4" /> {t('admin.tabMatches')}
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users" className="data-[state=active]:bg-ncc-teal data-[state=active]:text-bg-base font-bold gap-1.5">
            <Users className="w-4 h-4" /> {t('admin.tabUsers')}
          </TabsTrigger>
          <TabsTrigger value="predictions" data-testid="admin-tab-predictions" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white font-bold gap-1.5">
            <ListChecks className="w-4 h-4" /> {t('admin.tabPredictions')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="matches"><MatchesTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="predictions"><PredictionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============ LOGIN ============ */
const AdminLogin = ({ onSuccess }) => {
  const { t, isAr } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await adminLogin(username.trim(), password);
      setAdminToken(r.token);
      // Make sure legacy pwd doesn't shadow new token
      setAdminPassword(null);
      toast.success(`${t('admin.welcome')} ${r.admin.full_name || r.admin.username}`);
      onSuccess(r.admin);
    } catch (err) {
      const code = err?.response?.data?.detail;
      toast.error(code === 'INVALID_CREDENTIALS'
        ? (isAr ? 'اسم المستخدم أو كلمة السر خاطئة.' : 'Wrong username or password.')
        : (isAr ? 'حدث خطأ' : 'Error'));
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="glass rounded-3xl p-10 border border-gold/30 relative overflow-hidden" data-testid="admin-login-card">
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-gold/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-saudi-green/20 rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold via-yellow-300 to-gold" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-7 h-7 text-gold" />
            <div className="text-xs uppercase tracking-[0.2em] text-gold font-bold">{t('admin.title')}</div>
          </div>
          <h1 className="text-3xl font-black tracking-tight">{t('admin.loginTitle')}</h1>

          <form onSubmit={submit} className="mt-8 space-y-5" data-testid="admin-login-form">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-slate-400 font-bold">{t('admin.username')}</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Rashed550011"
                dir="ltr"
                autoComplete="username"
                data-testid="admin-username-input"
                className="bg-bg-base border-white/10 text-white h-12 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-slate-400 font-bold">{t('admin.password')}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                autoComplete="current-password"
                data-testid="admin-password-input"
                className="bg-bg-base border-white/10 text-white h-12 text-base"
                required
              />
            </div>
            <Button type="submit" disabled={busy} data-testid="admin-login-btn"
              className="w-full bg-gold hover:bg-yellow-400 text-bg-base font-black py-6 text-base">
              <LogIn className={`w-5 h-5 ${isAr ? 'ml-2' : 'mr-2'}`} />
              {busy ? '...' : t('admin.enter')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ============ DASHBOARD TAB ============ */
const DashboardTab = () => {
  const { t, lang, isAr } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    adminDashboard().then(setData).catch(() => toast.error('Error'));
  }, []);

  if (!data) return <div className="text-slate-400 py-12 text-center">{t('common.loading')}</div>;

  return (
    <div className="space-y-8" data-testid="admin-dashboard">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<UserCheck className="w-5 h-5" />} label={t('admin.stats.totalUsers')} value={data.users_total} color="ncc-teal" testId="stat-users" />
        <StatCard icon={<ListChecks className="w-5 h-5" />} label={t('admin.stats.totalPredictions')} value={data.predictions_total} color="gold" testId="stat-preds" />
        <StatCard icon={<Calendar className="w-5 h-5" />} label={t('admin.stats.totalMatches')} value={data.matches.total} color="saudi-green" testId="stat-matches" />
        <StatCard icon={<Activity className="w-5 h-5" />} label={t('admin.stats.liveNow')} value={data.matches.live} color="red-400" testId="stat-live" />
        <StatCard icon={<Calendar className="w-5 h-5" />} label={t('admin.stats.upcoming')} value={data.matches.upcoming} color="purple-400" testId="stat-upcoming" />
        <StatCard icon={<Trophy className="w-5 h-5" />} label={t('admin.stats.finished')} value={data.matches.finished} color="emerald-400" testId="stat-finished" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent signups */}
        <div className="glass rounded-2xl p-5 border border-white/10" data-testid="recent-signups-card">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-ncc-teal font-bold mb-4">
            <UserCheck className="w-4 h-4" />
            {t('admin.stats.recentSignups')}
          </div>
          {data.recent_signups.length === 0 ? (
            <div className="text-slate-500 text-sm py-6 text-center">{t('admin.noUsers')}</div>
          ) : (
            <ul className="space-y-2">
              {data.recent_signups.map(u => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                  <div>
                    <div className="font-bold">{u.full_name || u.name}</div>
                    <div className="text-xs text-slate-400 font-mono">@{u.username} · #{u.employee_id}</div>
                  </div>
                  <div className="text-xs text-slate-500 text-right">{fmtDateTime(u.created_at, lang)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top scorers */}
        <div className="glass rounded-2xl p-5 border border-white/10" data-testid="top-scorers-card">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold font-bold mb-4">
            <Trophy className="w-4 h-4" />
            {t('admin.stats.topScorers')}
          </div>
          {data.top_scorers.length === 0 ? (
            <div className="text-slate-500 text-sm py-6 text-center">—</div>
          ) : (
            <ol className="space-y-2">
              {data.top_scorers.map((p, i) => (
                <li key={p._id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-black ${i === 0 ? 'bg-gold text-bg-base' : i === 1 ? 'bg-slate-300 text-bg-base' : i === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-white'}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold truncate">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.count} {isAr ? 'توقع' : 'preds'}</div>
                    </div>
                  </div>
                  <div className="text-lg font-black text-gold">{p.total_points}</div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, testId }) => (
  <div className={`glass rounded-xl p-4 border border-${color}/30 hover:border-${color}/60 transition-colors`} data-testid={testId}>
    <div className={`text-${color} mb-2`}>{icon}</div>
    <div className="text-3xl font-black tracking-tighter text-white">{value}</div>
    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">{label}</div>
  </div>
);

/* ============ USERS TAB ============ */
const UsersTab = () => {
  const { t, lang, isAr } = useI18n();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [resetTarget, setResetTarget] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [userDetail, setUserDetail] = useState(null);

  const load = async () => {
    try {
      const r = await adminListUsers(q);
      setUsers(r.users);
    } catch { toast.error('Error loading users'); }
  };
  // eslint-disable-next-line
  useEffect(() => { load(); }, []);

  const onSearch = (e) => { e.preventDefault(); load(); };

  const onDelete = async (u) => {
    if (!window.confirm(t('admin.confirmDeleteUser'))) return;
    try {
      await adminDeleteUser(u.employee_id);
      toast.success(t('admin.userDeleted'));
      load();
    } catch { toast.error('Error'); }
  };

  const onResetSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminResetUserPassword(resetTarget.employee_id, newPw);
      toast.success(t('admin.resetPwDone'));
      setResetTarget(null);
      setNewPw('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error');
    }
  };

  const toggleDetail = async (u) => {
    if (expanded === u.employee_id) {
      setExpanded(null); setUserDetail(null); return;
    }
    try {
      const r = await adminGetUser(u.employee_id);
      setUserDetail(r);
      setExpanded(u.employee_id);
    } catch { toast.error('Error'); }
  };

  return (
    <div className="space-y-5" data-testid="admin-users-tab">
      <form onSubmit={onSearch} className="flex items-center gap-2 max-w-2xl">
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-slate-400 pointer-events-none`} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('admin.searchUsers')}
            data-testid="users-search-input"
            className={`bg-bg-card border-white/10 text-white h-11 ${isAr ? 'pr-10' : 'pl-10'}`}
          />
        </div>
        <Button type="submit" data-testid="users-search-btn" className="bg-ncc-teal hover:bg-emerald-400 text-bg-base font-bold h-11">
          {isAr ? 'بحث' : 'Search'}
        </Button>
      </form>

      <div className="text-xs text-slate-500">{users.length} {isAr ? 'مستخدم' : 'users'}</div>

      {users.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-slate-400">{t('admin.noUsers')}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-bg-card/60">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <Th>{t('admin.colFullName')}</Th>
                <Th>{t('admin.colUsername')}</Th>
                <Th>{t('admin.colId')}</Th>
                <Th>{t('admin.colJoined')}</Th>
                <Th className="text-center">{t('admin.colPredsCount')}</Th>
                <Th className="text-center">{t('admin.colTotalPts')}</Th>
                <Th className="text-right">{t('admin.colActions')}</Th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <React.Fragment key={u.employee_id}>
                  <tr className="border-t border-white/5 hover:bg-white/[0.02]" data-testid={`user-row-${u.employee_id}`}>
                    <td className="px-3 py-3 font-bold">{u.full_name || u.name}</td>
                    <td className="px-3 py-3 text-ncc-teal font-mono text-xs">@{u.username}</td>
                    <td className="px-3 py-3 text-slate-400 font-mono text-xs">#{u.employee_id}</td>
                    <td className="px-3 py-3 text-slate-500 text-xs">{fmtDateTime(u.created_at, lang)}</td>
                    <td className="px-3 py-3 text-center font-bold">{u.predictions_count}</td>
                    <td className="px-3 py-3 text-center text-gold font-black">{u.total_points}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => toggleDetail(u)} data-testid={`user-view-${u.employee_id}`}
                          className="p-2 text-ncc-teal hover:bg-ncc-teal/10 rounded" title={isAr ? 'تفاصيل' : 'Details'}>
                          {expanded === u.employee_id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => { setResetTarget(u); setNewPw(''); }} data-testid={`user-reset-${u.employee_id}`}
                          className="p-2 text-gold hover:bg-gold/10 rounded" title={t('admin.resetPwTitle')}>
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(u)} data-testid={`user-delete-${u.employee_id}`}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded" title={t('admin.delete')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === u.employee_id && userDetail && (
                    <tr className="bg-bg-base/60" data-testid={`user-detail-${u.employee_id}`}>
                      <td colSpan={7} className="px-4 py-4">
                        <div className="text-xs uppercase tracking-widest text-gold font-bold mb-3">
                          {userDetail.predictions_count} {isAr ? 'توقعات' : 'predictions'} · {userDetail.total_points} {isAr ? 'نقطة' : 'pts'}
                        </div>
                        {userDetail.predictions.length === 0 ? (
                          <div className="text-slate-500 text-sm">{t('admin.noPredictions')}</div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-white/10">
                            <table className="w-full text-xs">
                              <thead className="bg-white/5">
                                <tr>
                                  <Th small>{t('admin.colMatch')}</Th>
                                  <Th small className="text-center">{t('admin.colPrediction')}</Th>
                                  <Th small className="text-center">{isAr ? 'النتيجة' : 'Actual'}</Th>
                                  <Th small>{t('admin.colSubmittedAt')}</Th>
                                  <Th small className="text-right">{t('admin.colPoints')}</Th>
                                </tr>
                              </thead>
                              <tbody>
                                {userDetail.predictions.map(p => {
                                  const m = p.match || {};
                                  const a = isAr ? (m.team_a_ar || m.team_a) : m.team_a;
                                  const b = isAr ? (m.team_b_ar || m.team_b) : m.team_b;
                                  return (
                                    <tr key={p.id} className="border-t border-white/5">
                                      <td className="px-3 py-2">
                                        <span className="mr-1">{m.flag_a}</span>{a}
                                        <span className="text-slate-500 mx-1">vs</span>
                                        <span className="mr-1">{m.flag_b}</span>{b}
                                      </td>
                                      <td className="px-3 py-2 text-center font-bold">{p.score_a} - {p.score_b}</td>
                                      <td className="px-3 py-2 text-center">
                                        {m.status === 'finished' ? <span className="font-bold text-emerald-300">{m.result_a} - {m.result_b}</span> : <span className="text-slate-600">—</span>}
                                      </td>
                                      <td className="px-3 py-2 text-slate-500">{fmtDateTime(p.created_at || p.timestamp, lang)}</td>
                                      <td className="px-3 py-2 text-right font-black text-gold">{p.points ?? 0}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 grid place-items-center p-4" data-testid="reset-pw-modal">
          <form onSubmit={onResetSubmit} className="glass rounded-2xl p-6 border border-gold/40 w-full max-w-md">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold font-bold mb-2">
              <KeyRound className="w-4 h-4" /> {t('admin.resetPwTitle')}
            </div>
            <div className="text-lg font-bold mb-1">{resetTarget.full_name || resetTarget.name}</div>
            <div className="text-xs text-slate-400 font-mono mb-4">@{resetTarget.username} · #{resetTarget.employee_id}</div>
            <Label className="text-xs uppercase tracking-widest text-slate-400 font-bold">{t('admin.resetPwLabel')}</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} data-testid="reset-pw-input"
              className="bg-bg-base border-white/10 text-white h-11 mt-2" required minLength={6} />
            <div className="flex items-center justify-end gap-2 mt-5">
              <Button type="button" variant="ghost" onClick={() => setResetTarget(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button type="submit" data-testid="reset-pw-submit" className="bg-gold hover:bg-yellow-400 text-bg-base font-black">
                {t('admin.resetPwSubmit')}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const Th = ({ children, className = '', small }) => (
  <th className={`px-3 ${small ? 'py-2 text-[10px]' : 'py-3 text-[10px]'} uppercase tracking-widest text-slate-400 font-bold ${className || 'text-left'}`}>
    {children}
  </th>
);

/* ============ PREDICTIONS TAB ============ */
const PredictionsTab = () => {
  const { t, lang, isAr } = useI18n();
  const [preds, setPreds] = useState([]);
  const [q, setQ] = useState('');

  const load = async () => {
    try {
      const r = await adminListAllPredictions(q ? { q } : {});
      setPreds(r.predictions);
    } catch { toast.error('Error'); }
  };
  // eslint-disable-next-line
  useEffect(() => { load(); }, []);

  const onSearch = (e) => { e.preventDefault(); load(); };

  const onDelete = async (p) => {
    if (!window.confirm(t('admin.confirmDeletePred'))) return;
    try {
      await adminDeletePrediction(p.id);
      toast.success(t('admin.predictionDeleted'));
      load();
    } catch { toast.error('Error'); }
  };

  const exportAll = async () => {
    try {
      await downloadAdminXlsx('/admin/predictions/export.xlsx', 'ncc_all_predictions.xlsx');
      toast.success(isAr ? 'تم التنزيل' : 'Downloaded');
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-5" data-testid="admin-predictions-tab">
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={onSearch} className="flex items-center gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-slate-400 pointer-events-none`} />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('admin.searchPreds')}
              data-testid="preds-search-input"
              className={`bg-bg-card border-white/10 text-white h-11 ${isAr ? 'pr-10' : 'pl-10'}`}
            />
          </div>
          <Button type="submit" data-testid="preds-search-btn" className="bg-purple-500 hover:bg-purple-400 text-white font-bold h-11">
            {isAr ? 'بحث' : 'Search'}
          </Button>
        </form>
        <Button onClick={exportAll} data-testid="preds-export-btn" className="bg-saudi-green hover:bg-saudi-green-dark text-white font-bold h-11">
          <FileDown className="w-4 h-4" /> Excel
        </Button>
      </div>

      <div className="text-xs text-slate-500">{preds.length} {isAr ? 'توقع' : 'predictions'}</div>

      {preds.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-slate-400">{t('admin.noPredsFound')}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-bg-card/60">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <Th>{t('admin.colEmployee')}</Th>
                <Th>{t('admin.colMatch')}</Th>
                <Th className="text-center">{t('admin.colPrediction')}</Th>
                <Th className="text-center">{isAr ? 'النتيجة' : 'Actual'}</Th>
                <Th>{t('admin.colSubmittedAt')}</Th>
                <Th className="text-center">{t('admin.colPoints')}</Th>
                <Th className="text-right">{t('admin.colActions')}</Th>
              </tr>
            </thead>
            <tbody>
              {preds.map(p => {
                const m = p.match || {};
                const u = p.user || {};
                const a = isAr ? (m.team_a_ar || m.team_a) : m.team_a;
                const b = isAr ? (m.team_b_ar || m.team_b) : m.team_b;
                return (
                  <tr key={p.id} className="border-t border-white/5" data-testid={`pred-row-${p.id}`}>
                    <td className="px-3 py-3">
                      <div className="font-bold">{u.full_name || p.name}</div>
                      <div className="text-xs text-slate-400 font-mono">@{u.username || '—'} · #{p.employee_id}</div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <span className="mr-1">{m.flag_a}</span>{a}
                      <span className="text-slate-500 mx-1">vs</span>
                      <span className="mr-1">{m.flag_b}</span>{b}
                    </td>
                    <td className="px-3 py-3 text-center font-bold">{p.score_a} - {p.score_b}</td>
                    <td className="px-3 py-3 text-center text-emerald-300 font-bold">
                      {m.status === 'finished' ? `${m.result_a} - ${m.result_b}` : '—'}
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-xs">{fmtDateTime(p.created_at || p.timestamp, lang)}</td>
                    <td className="px-3 py-3 text-center font-black text-gold">{p.points ?? 0}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => onDelete(p)} data-testid={`pred-delete-${p.id}`} className="p-2 text-red-400 hover:bg-red-500/10 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ============ MATCHES TAB (mostly retained from previous Admin.jsx) ============ */
const MatchesTab = () => {
  const { t, lang, isAr } = useI18n();
  const [matches, setMatches] = useState([]);
  const [editing, setEditing] = useState({});
  const [openPreds, setOpenPreds] = useState({});

  const load = async () => {
    const m = await listMatches();
    setMatches(m);
  };
  // eslint-disable-next-line
  useEffect(() => { load(); }, []);

  const onSaveResult = async (m) => {
    const e = editing[m.id] || { a: m.result_a ?? 0, b: m.result_b ?? 0 };
    try {
      await adminSubmitResult(m.id, Number(e.a), Number(e.b));
      toast.success(t('admin.saved'));
      await load();
      window.open(`/champions/${m.id}`, '_blank');
    } catch (err) { toast.error(err?.response?.data?.detail || 'Error'); }
  };

  const onStatus = async (m, status) => {
    try { await adminSetStatus(m.id, status); toast.success('OK'); await load(); }
    catch { toast.error('Error'); }
  };

  const onDelete = async (m) => {
    if (!window.confirm(isAr ? 'حذف المباراة؟' : 'Delete match?')) return;
    await adminDeleteMatch(m.id);
    toast.success('Deleted');
    await load();
  };

  const togglePredictions = async (m) => {
    if (openPreds[m.id]) {
      setOpenPreds(s => { const c = { ...s }; delete c[m.id]; return c; });
      return;
    }
    try {
      const data = await adminMatchPredictions(m.id);
      setOpenPreds(s => ({ ...s, [m.id]: data.predictions }));
    } catch { toast.error('Error'); }
  };

  const onSaveStream = async (m, url) => {
    try {
      await adminSetStreamUrl(m.id, url);
      toast.success(isAr ? 'تم حفظ رابط البث' : 'Stream URL saved');
      await load();
    } catch { toast.error('Error'); }
  };

  const exportMatch = async (m) => {
    try {
      await downloadAdminXlsx(`/admin/matches/${m.id}/export.xlsx`, `predictions_${m.team_a}_vs_${m.team_b}.xlsx`);
      toast.success(isAr ? 'تم التنزيل' : 'Downloaded');
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-3" data-testid="admin-matches-tab">
      <div className="text-xs text-slate-500 mb-2">
        {isAr ? `إجمالي المباريات: ${matches.length}` : `Total matches: ${matches.length}`}
      </div>
      {matches.map(m => {
        const e = editing[m.id] ?? { a: m.result_a ?? 0, b: m.result_b ?? 0 };
        const teamA = isAr ? (m.team_a_ar || m.team_a) : m.team_a;
        const teamB = isAr ? (m.team_b_ar || m.team_b) : m.team_b;
        return (
          <div key={m.id} className="glass rounded-xl p-4 sm:p-5 border border-white/10" data-testid={`admin-row-${m.id}`}>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-400 font-bold">{m.group}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl">{m.flag_a}</span>
                  <span className="font-bold truncate">{teamA}</span>
                </div>
                <span className="text-slate-500 font-bold">vs</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl">{m.flag_b}</span>
                  <span className="font-bold truncate">{teamB}</span>
                </div>
                <span className="text-xs text-slate-500">{fmtDateTime(m.kickoff, lang)}</span>
                <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded ${
                  m.status === 'finished' ? 'bg-saudi-green/20 text-emerald-300' :
                  m.status === 'live' ? 'bg-red-500/20 text-red-300' :
                  'bg-ncc-teal/15 text-ncc-teal'
                }`}>{t(`matches.${m.status}`)}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <input type="number" min="0" max="30" value={e.a}
                  onChange={(ev) => setEditing(s => ({ ...s, [m.id]: { ...e, a: ev.target.value } }))}
                  className="w-14 h-10 bg-bg-base border border-white/10 rounded text-center font-bold"
                  data-testid={`admin-score-a-${m.id}`} />
                <span className="font-bold text-slate-500">-</span>
                <input type="number" min="0" max="30" value={e.b}
                  onChange={(ev) => setEditing(s => ({ ...s, [m.id]: { ...e, b: ev.target.value } }))}
                  className="w-14 h-10 bg-bg-base border border-white/10 rounded text-center font-bold"
                  data-testid={`admin-score-b-${m.id}`} />
                <Button size="sm" onClick={() => onSaveResult(m)} data-testid={`admin-save-${m.id}`} className="bg-saudi-green hover:bg-saudi-green-dark text-white font-bold">
                  <Save className="w-4 h-4" /> {t('admin.setResult')}
                </Button>
                {m.status !== 'live' && m.status !== 'finished' && (
                  <Button size="sm" variant="outline" onClick={() => onStatus(m, 'live')} className="border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200">
                    <Radio className="w-4 h-4" /> {t('admin.setLive')}
                  </Button>
                )}
                {m.status === 'finished' && (
                  <Button size="sm" variant="outline" onClick={() => onStatus(m, 'upcoming')} className="border-ncc-teal/40 text-ncc-teal hover:bg-ncc-teal/10 hover:text-ncc-teal">
                    <RotateCcw className="w-4 h-4" /> {t('admin.setUpcoming')}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => togglePredictions(m)} data-testid={`view-preds-${m.id}`} className="border-gold/40 text-gold hover:bg-gold/10 hover:text-gold">
                  {openPreds[m.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {openPreds[m.id] ? t('admin.hidePredictions') : t('admin.viewPredictions')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportMatch(m)} data-testid={`export-match-${m.id}`} className="border-saudi-green/40 text-emerald-300 hover:bg-saudi-green/10 hover:text-emerald-200">
                  <FileDown className="w-4 h-4" /> Excel
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(m)} className="text-red-400 hover:bg-red-500/10 hover:text-red-300">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
              <Tv className="w-4 h-4 text-red-300 shrink-0" />
              <Input defaultValue={m.stream_url || ''} placeholder={isAr ? 'رابط البث ...' : 'Stream URL ...'}
                className="bg-bg-base border-white/10 text-white h-9 text-sm flex-1"
                onKeyDown={(ev) => { if (ev.key === 'Enter') onSaveStream(m, ev.target.value); }}
                onBlur={(ev) => { if (ev.target.value !== (m.stream_url || '')) onSaveStream(m, ev.target.value); }} />
            </div>

            {openPreds[m.id] && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-widest text-gold font-bold">
                  <Users className="w-4 h-4" />
                  {openPreds[m.id].length} {isAr ? 'توقع' : 'predictions'}
                </div>
                {openPreds[m.id].length === 0 ? (
                  <div className="text-slate-500 text-sm text-center py-6">{t('admin.noPredictions')}</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5">
                        <tr>
                          <Th>{t('admin.colEmployee')}</Th>
                          <Th>{t('admin.colId')}</Th>
                          <Th className="text-center">{t('admin.colPrediction')}</Th>
                          <Th>{t('admin.colSubmittedAt')}</Th>
                          <Th className="text-right">{t('admin.colPoints')}</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {openPreds[m.id].map(p => (
                          <tr key={p.id} className="border-t border-white/5">
                            <td className="px-3 py-2 font-bold">{p.employee_name}</td>
                            <td className="px-3 py-2 text-slate-400 font-mono text-xs">#{p.employee_id}</td>
                            <td className="px-3 py-2 text-center font-black tracking-tighter">{p.score_a} - {p.score_b}</td>
                            <td className="px-3 py-2 text-slate-400 text-xs">{fmtDateTime(p.created_at, lang)}</td>
                            <td className="px-3 py-2 text-right">
                              {m.status === 'finished'
                                ? <span className={`font-black text-base ${p.points === 5 ? 'text-gold' : p.points === 3 ? 'text-emerald-300' : 'text-slate-500'}`}>{p.points}</span>
                                : <span className="text-slate-600 text-xs">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
