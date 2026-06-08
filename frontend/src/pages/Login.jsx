import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { LogIn, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const errorKey = (e) => {
  const code = e?.response?.data?.detail;
  return typeof code === 'string' ? code : 'GENERIC';
};

export default function Login() {
  const { t, isAr } = useI18n();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return;
    setBusy(true);
    try {
      const u = await signIn(form.username.trim(), form.password);
      toast.success(`${t('auth.logged')} ${u.full_name || u.name}!`);
      navigate('/matches');
    } catch (err) {
      const code = errorKey(err);
      toast.error(t(`auth.err.${code}`) || t('auth.err.INVALID_CREDENTIALS'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="glass rounded-3xl p-8 sm:p-10 border border-white/10 relative overflow-hidden" data-testid="login-card">
        {/* Saudi-green + NCC accent glows */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-saudi-green/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-ncc-teal/25 rounded-full blur-3xl" />
        {/* Saudi green top stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-saudi-green via-emerald-400 to-saudi-green" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saudi-green/15 border border-saudi-green/40 text-emerald-300 text-xs font-bold tracking-widest mb-4">
            <Sparkles className="w-3 h-3" /> NCC × World Cup 2026
          </div>
          <h1 className="text-4xl font-black tracking-tight">{t('auth.loginTitle')}</h1>
          <p className="text-slate-400 mt-2">{t('auth.loginDesc')}</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" data-testid="login-form">
            <Field
              id="login-username"
              label={t('auth.username')}
              value={form.username}
              onChange={set('username')}
              placeholder="mali"
              autoComplete="username"
              testId="login-username-input"
              ltr
            />
            <Field
              id="login-password"
              label={t('auth.password')}
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="••••••••"
              autoComplete="current-password"
              testId="login-password-input"
              ltr
            />

            <Button
              type="submit"
              disabled={busy}
              data-testid="login-submit"
              className="w-full bg-saudi-green hover:bg-saudi-green-dark text-white font-black text-base py-6 btn-glow"
            >
              <LogIn className={`w-5 h-5 ${isAr ? 'ml-2' : 'mr-2'}`} />
              {busy ? t('common.loading') : t('auth.loginSubmit')}
            </Button>

            <div className="text-center text-sm text-slate-400 pt-2">
              {t('auth.noAccount')}{' '}
              <Link to="/register" data-testid="login-goto-register" className="text-ncc-teal hover:text-emerald-300 font-bold">
                {t('auth.goRegister')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const Field = ({ id, label, value, onChange, type = 'text', placeholder, autoComplete, testId, ltr }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-xs uppercase tracking-widest text-slate-400 font-bold">{label}</Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      data-testid={testId}
      dir={ltr ? 'ltr' : undefined}
      className="bg-bg-base border-white/10 text-white h-12 text-base"
      required
    />
  </div>
);
