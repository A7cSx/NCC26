import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { Languages, LogOut, Trophy, ShieldCheck, LogIn } from 'lucide-react';
import { Button } from './ui/button';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_world-cup-contest/artifacts/zdttaysn_unnamed.png';

export const Header = () => {
  const { t, lang, setLang, isAr } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/matches', label: t('nav.matches') },
    { to: '/leaderboard', label: t('nav.leaderboard') },
  ];
  if (user) {
    navLinks.splice(2, 0, { to: '/my-predictions', label: t('nav.myPredictions') });
    navLinks.push({ to: '/trivia', label: t('trivia.navLabel'), highlight: true });
  }

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5" data-testid="app-header">
      {/* Saudi-green hairline accent */}
      <div className="h-[2px] bg-gradient-to-r from-saudi-green via-emerald-400 to-saudi-green opacity-80" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 group" data-testid="logo-link">
          <div className="w-10 h-10 rounded-lg bg-white/95 p-1 flex items-center justify-center shadow-lg shadow-saudi-green/30 group-hover:shadow-saudi-green/50 transition-shadow">
            <img src={LOGO_URL} alt="NCC" className="w-full h-full object-contain" />
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-sm font-extrabold tracking-tight">{t('appName')}</div>
            <div className="text-[10px] text-slate-400 tracking-widest uppercase">{t('company')}</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.to.replace('/', '') || 'home'}`}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                  isActive
                    ? (l.highlight ? 'text-purple-200 bg-purple-500/15' : 'text-ncc-teal bg-white/5')
                    : (l.highlight ? 'text-purple-300 hover:text-purple-200 hover:bg-purple-500/10' : 'text-slate-300 hover:text-white hover:bg-white/5')
                }`
              }
            >
              {l.highlight && <span className="mr-1">✨</span>}
              {l.label}
            </NavLink>
          ))}
          <NavLink
            to="/admin"
            data-testid="nav-admin"
            className={({ isActive }) =>
              `px-3 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                isActive ? 'text-gold bg-white/5' : 'text-slate-400 hover:text-gold'
              }`
            }
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('nav.admin')}
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            data-testid="lang-toggle"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/10 hover:border-ncc-teal/50 text-xs font-bold transition-all"
          >
            <Languages className="w-4 h-4" />
            {isAr ? 'EN' : 'عربي'}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <div className="text-xs text-slate-400">{t('auth.logged')}</div>
                <div className="text-sm font-bold truncate max-w-[120px]" data-testid="user-name">
                  {user.full_name || user.name}
                </div>
              </div>
              <button
                onClick={() => { logout(); navigate('/'); }}
                data-testid="logout-btn"
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                title={t('auth.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate('/login')}
                data-testid="header-login-btn"
                variant="outline"
                className="border-ncc-teal/40 text-ncc-teal hover:bg-ncc-teal/10 hover:text-emerald-300 font-bold rounded-md"
              >
                <LogIn className={`w-4 h-4 ${isAr ? 'ml-1.5' : 'mr-1.5'}`} />
                <span className="hidden sm:inline">{t('auth.goLogin')}</span>
                <span className="sm:hidden">{isAr ? 'دخول' : 'Login'}</span>
              </Button>
              <Button
                onClick={() => navigate('/register')}
                data-testid="header-register-btn"
                className="bg-saudi-green hover:bg-saudi-green-dark text-white font-bold rounded-md btn-glow"
              >
                <Trophy className={`w-4 h-4 ${isAr ? 'ml-1.5' : 'mr-1.5'}`} />
                <span className="hidden sm:inline">{t('auth.goRegister')}</span>
                <span className="sm:hidden">{isAr ? 'حساب' : 'Sign up'}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
