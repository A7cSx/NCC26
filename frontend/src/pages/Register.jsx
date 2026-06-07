import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { register } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Trophy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
  const { t, isAr } = useI18n();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !employeeId.trim()) return;
    setBusy(true);
    try {
      const u = await register(employeeId.trim(), name.trim());
      setUser(u);
      toast.success(`${t('auth.logged')} ${u.name}!`);
      navigate('/matches');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="glass rounded-3xl p-8 sm:p-10 border border-white/10 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-saudi-green/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-ncc-teal/20 rounded-full blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saudi-green/15 border border-saudi-green/40 text-emerald-300 text-xs font-bold tracking-widest mb-4">
            <Sparkles className="w-3 h-3" /> NCC × World Cup
          </div>
          <h1 className="text-4xl font-black tracking-tight">{t('auth.registerTitle')}</h1>
          <p className="text-slate-400 mt-2">{t('auth.registerDesc')}</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" data-testid="register-form">
            <div className="space-y-2">
              <Label htmlFor="emp-id" className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                {t('auth.employeeId')}
              </Label>
              <Input
                id="emp-id"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="bg-bg-base border-white/10 text-white h-12 text-lg font-bold tracking-wider"
                placeholder="EMP-1024"
                data-testid="employee-id-input"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                {t('auth.name')}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-bg-base border-white/10 text-white h-12 text-lg"
                placeholder={isAr ? 'محمد العنزي' : 'Mohammed AlAnzi'}
                data-testid="name-input"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              data-testid="register-submit"
              className="w-full bg-saudi-green hover:bg-saudi-green-dark text-white font-black text-base py-6 btn-glow"
            >
              <Trophy className={`w-5 h-5 ${isAr ? 'ml-2' : 'mr-2'}`} />
              {busy ? t('common.loading') : t('auth.submit')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
