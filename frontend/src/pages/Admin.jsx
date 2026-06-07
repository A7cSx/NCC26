import React, { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';
import {
  listMatches,
  adminCheck,
  adminSubmitResult,
  adminSetStatus,
  adminDeleteMatch,
  adminMatchPredictions,
  adminSetStreamUrl,
  downloadAdminXlsx,
  setAdminPassword,
} from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ShieldCheck, LogIn, Radio, RotateCcw, Trash2, Save, Eye, EyeOff, Users, FileDown, Tv } from 'lucide-react';
import { toast } from 'sonner';

const fmtDateTime = (iso, lang) => {
  try {
    return new Date(iso).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return iso; }
};

export default function Admin() {
  const { t, lang, isAr } = useI18n();
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState(localStorage.getItem('ncc_admin_pwd') || '');
  const [matches, setMatches] = useState([]);
  const [editing, setEditing] = useState({}); // {match_id: {a, b}}
  const [openPreds, setOpenPreds] = useState({}); // {match_id: [preds]}

  const tryAuth = async (password) => {
    setAdminPassword(password);
    try {
      const r = await adminCheck();
      if (r.ok) {
        setAuthed(true);
        await load();
      } else {
        toast.error(isAr ? 'كلمة السر خطأ' : 'Wrong password');
        setAuthed(false);
      }
    } catch {
      toast.error('Error');
    }
  };

  const load = async () => {
    const m = await listMatches();
    setMatches(m);
  };

  useEffect(() => {
    if (pwd) tryAuth(pwd);
    // eslint-disable-next-line
  }, []);

  const onLogin = (e) => {
    e.preventDefault();
    tryAuth(pwd);
  };

  const onSaveResult = async (m) => {
    const e = editing[m.id] || { a: m.result_a ?? 0, b: m.result_b ?? 0 };
    try {
      await adminSubmitResult(m.id, Number(e.a), Number(e.b));
      toast.success(t('admin.saved'));
      await load();
      // Open celebration page in a new tab so admin can keep working
      window.open(`/champions/${m.id}`, '_blank');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error');
    }
  };

  const onStatus = async (m, status) => {
    try {
      await adminSetStatus(m.id, status);
      toast.success('OK');
      await load();
    } catch (err) {
      toast.error('Error');
    }
  };

  const onDelete = async (m) => {
    if (!window.confirm(isAr ? `حذف المباراة؟` : 'Delete match?')) return;
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
    } catch (err) {
      toast.error('Error loading predictions');
    }
  };

  const onSaveStream = async (m, url) => {
    try {
      await adminSetStreamUrl(m.id, url);
      toast.success(isAr ? 'تم حفظ رابط البث' : 'Stream URL saved');
      await load();
    } catch (err) {
      toast.error('Error');
    }
  };

  const exportMatch = async (m) => {
    try {
      await downloadAdminXlsx(`/admin/matches/${m.id}/export.xlsx`, `predictions_${m.team_a}_vs_${m.team_b}.xlsx`);
      toast.success(isAr ? 'تم التنزيل' : 'Downloaded');
    } catch { toast.error('Export failed'); }
  };

  const exportAll = async () => {
    try {
      await downloadAdminXlsx('/admin/predictions/export.xlsx', 'ncc_all_predictions.xlsx');
      toast.success(isAr ? 'تم التنزيل' : 'Downloaded');
    } catch { toast.error('Export failed'); }
  };

  if (!authed) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="glass rounded-3xl p-10 border border-gold/30">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-7 h-7 text-gold" />
            <div className="text-xs uppercase tracking-[0.2em] text-gold font-bold">{t('admin.title')}</div>
          </div>
          <h1 className="text-3xl font-black tracking-tight">{isAr ? 'تسجيل دخول الإدارة' : 'Admin Sign-in'}</h1>
          <form onSubmit={onLogin} className="mt-6 space-y-4" data-testid="admin-login-form">
            <div>
              <Label className="text-xs uppercase tracking-widest text-slate-400 font-bold">{t('admin.passwordPrompt')}</Label>
              <Input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="bg-bg-base border-white/10 text-white h-12 mt-2"
                data-testid="admin-password-input"
                required
              />
            </div>
            <Button type="submit" data-testid="admin-login-btn" className="w-full bg-gold hover:bg-yellow-400 text-bg-base font-black py-6 text-base">
              <LogIn className={`w-5 h-5 ${isAr ? 'ml-2' : 'mr-2'}`} />
              {t('admin.enter')}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-2">
        <ShieldCheck className="w-6 h-6 text-gold" />
        <div className="text-xs uppercase tracking-[0.2em] text-gold font-bold">{t('admin.title')}</div>
      </div>
      <h1 className="text-4xl font-black tracking-tighter">{isAr ? 'إدارة المسابقة' : 'Contest Console'}</h1>
      <p className="text-slate-400 mt-2">{t('admin.desc')}</p>

      {/* Top action bar */}
      <div className="mt-6 flex flex-wrap items-center gap-3" data-testid="admin-toolbar">
        <Button onClick={exportAll} data-testid="export-all-btn" className="bg-saudi-green hover:bg-saudi-green-dark text-white font-bold rounded-md btn-glow">
          <FileDown className={`w-4 h-4 ${isAr ? 'ml-2' : 'mr-2'}`} />
          {isAr ? 'تنزيل جميع التوقعات (Excel)' : 'Download All Predictions (Excel)'}
        </Button>
        <div className="text-xs text-slate-500">
          {isAr ? `إجمالي المباريات: ${matches.length}` : `Total matches: ${matches.length}`}
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {matches.map(m => {
          const e = editing[m.id] ?? { a: m.result_a ?? 0, b: m.result_b ?? 0 };
          const teamA = isAr ? (m.team_a_ar || m.team_a) : m.team_a;
          const teamB = isAr ? (m.team_b_ar || m.team_b) : m.team_b;
          return (
            <div key={m.id} className="glass rounded-xl p-4 sm:p-5 border border-white/10" data-testid={`admin-row-${m.id}`}>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
                <div className="flex items-center gap-3">
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
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded ${
                    m.status === 'finished' ? 'bg-saudi-green/20 text-emerald-300' :
                    m.status === 'live' ? 'bg-red-500/20 text-red-300' :
                    'bg-ncc-teal/15 text-ncc-teal'
                  }`}>
                    {t(`matches.${m.status}`)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <input
                    type="number"
                    min="0" max="30"
                    value={e.a}
                    onChange={(ev) => setEditing(s => ({ ...s, [m.id]: { ...e, a: ev.target.value } }))}
                    className="w-14 h-10 bg-bg-base border border-white/10 rounded text-center font-bold"
                    data-testid={`admin-score-a-${m.id}`}
                  />
                  <span className="font-bold text-slate-500">-</span>
                  <input
                    type="number"
                    min="0" max="30"
                    value={e.b}
                    onChange={(ev) => setEditing(s => ({ ...s, [m.id]: { ...e, b: ev.target.value } }))}
                    className="w-14 h-10 bg-bg-base border border-white/10 rounded text-center font-bold"
                    data-testid={`admin-score-b-${m.id}`}
                  />
                  <Button
                    size="sm"
                    onClick={() => onSaveResult(m)}
                    data-testid={`admin-save-${m.id}`}
                    className="bg-saudi-green hover:bg-saudi-green-dark text-white font-bold"
                  >
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

              {/* Stream URL row */}
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2" data-testid={`stream-row-${m.id}`}>
                <Tv className="w-4 h-4 text-red-300 shrink-0" />
                <Input
                  defaultValue={m.stream_url || ''}
                  placeholder={isAr ? 'رابط البث (YouTube) ...' : 'Stream URL (YouTube) ...'}
                  className="bg-bg-base border-white/10 text-white h-9 text-sm flex-1"
                  data-testid={`stream-input-${m.id}`}
                  onKeyDown={(e) => { if (e.key === 'Enter') onSaveStream(m, e.target.value); }}
                  onBlur={(e) => { if (e.target.value !== (m.stream_url || '')) onSaveStream(m, e.target.value); }}
                />
              </div>

              {/* predictions table */}
              {openPreds[m.id] && (
                <div className="mt-4 pt-4 border-t border-white/10" data-testid={`preds-table-${m.id}`}>
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
                          <tr className="text-left">
                            <th className="px-3 py-2 text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('admin.colEmployee')}</th>
                            <th className="px-3 py-2 text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('admin.colId')}</th>
                            <th className="px-3 py-2 text-[10px] uppercase tracking-widest text-slate-400 font-bold text-center">{t('admin.colPrediction')}</th>
                            <th className="px-3 py-2 text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('admin.colSubmittedAt')}</th>
                            <th className="px-3 py-2 text-[10px] uppercase tracking-widest text-slate-400 font-bold text-right">{t('admin.colPoints')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {openPreds[m.id].map(p => (
                            <tr key={p.id} className="border-t border-white/5" data-testid={`pred-row-${p.id}`}>
                              <td className="px-3 py-2 font-bold">{p.employee_name}</td>
                              <td className="px-3 py-2 text-slate-400 font-mono text-xs">#{p.employee_id}</td>
                              <td className="px-3 py-2 text-center font-black tracking-tighter">
                                {p.score_a} <span className="text-slate-500 mx-1">-</span> {p.score_b}
                              </td>
                              <td className="px-3 py-2 text-slate-400 text-xs">{fmtDateTime(p.created_at, lang)}</td>
                              <td className="px-3 py-2 text-right">
                                {m.status === 'finished' ? (
                                  <span className={`font-black text-base ${p.points === 5 ? 'text-gold' : p.points === 3 ? 'text-emerald-300' : 'text-slate-500'}`}>
                                    {p.points}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 text-xs">—</span>
                                )}
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
    </div>
  );
}
