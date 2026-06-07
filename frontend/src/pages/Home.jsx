import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { listMatches, getLeaderboard, myPredictions } from '../lib/api';
import { Button } from '../components/ui/button';
import { MatchCard } from '../components/MatchCard';
import { PredictionDialog } from '../components/PredictionDialog';
import { Trophy, Target, Zap, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

const HERO_BG = 'https://images.pexels.com/photos/15779126/pexels-photo-15779126.jpeg';

export default function Home() {
  const { t, isAr } = useI18n();
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ entries: [], finished_matches: 0 });
  const [openMatch, setOpenMatch] = useState(null);

  const load = async () => {
    const [m, lb] = await Promise.all([listMatches(), getLeaderboard()]);
    setMatches(m);
    setLeaderboard(lb);
    if (user) {
      const preds = await myPredictions(user.employee_id);
      setPredictions(preds);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const upcoming = useMemo(() => matches.filter(m => m.status === 'upcoming').slice(0, 3), [matches]);
  const nextMatch = upcoming[0];

  const predMap = useMemo(() => Object.fromEntries(predictions.map(p => [p.match_id, p])), [predictions]);
  const arrow = isAr ? '←' : '→';

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `url(${HERO_BG})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-base/40 via-bg-base/80 to-bg-base" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ncc-teal/10 border border-ncc-teal/30 text-ncc-teal text-xs font-bold tracking-widest mb-6 animate-fade-up">
              <Sparkles className="w-3.5 h-3.5" />
              {t('hero.tagline')}
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.05] animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <span className="text-white">{t('hero.title')}</span>
              <br />
              <span className="headline-accent">{t('hero.titleAccent')}</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-2xl animate-fade-up" style={{ animationDelay: '0.2s' }}>
              {t('hero.desc')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 animate-fade-up" style={{ animationDelay: '0.3s' }}>
              {!user ? (
                <Link to="/register" data-testid="hero-cta-register">
                  <Button className="bg-saudi-green hover:bg-saudi-green-dark text-white font-black text-base px-8 py-6 rounded-full btn-glow">
                    <Trophy className={`w-5 h-5 ${isAr ? 'ml-2' : 'mr-2'}`} />
                    {t('hero.cta')}
                  </Button>
                </Link>
              ) : (
                <Link to="/matches" data-testid="hero-cta-matches">
                  <Button className="bg-saudi-green hover:bg-saudi-green-dark text-white font-black text-base px-8 py-6 rounded-full btn-glow">
                    <Target className={`w-5 h-5 ${isAr ? 'ml-2' : 'mr-2'}`} />
                    {t('hero.cta')}
                  </Button>
                </Link>
              )}
              <Link to="/matches">
                <Button variant="outline" className="border-ncc-teal/40 text-ncc-teal hover:bg-ncc-teal/10 hover:text-ncc-teal font-bold px-6 py-6 rounded-full btn-glow-teal">
                  {t('hero.ctaSecondary')} {arrow}
                </Button>
              </Link>
            </div>
          </div>

          {/* Scoring strip */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl animate-fade-up" style={{ animationDelay: '0.4s' }}>
            {[
              { icon: <Zap className="w-5 h-5" />, label: t('scoring.exact'), pts: t('scoring.exactPts'), color: 'text-gold border-gold/30' },
              { icon: <Target className="w-5 h-5" />, label: t('scoring.winner'), pts: t('scoring.winnerPts'), color: 'text-ncc-teal border-ncc-teal/30' },
              { icon: <ShieldCheck className="w-5 h-5" />, label: t('scoring.wrong'), pts: t('scoring.wrongPts'), color: 'text-slate-500 border-white/10' },
            ].map((s, i) => (
              <div key={i} className={`glass rounded-xl p-4 flex items-center gap-3 border ${s.color}`}>
                {s.icon}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{s.label}</div>
                  <div className={`text-xl font-black`}>{s.pts}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEXT MATCHES */}
      {nextMatch && (
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-ncc-teal font-bold mb-2">
                {t('matches.upcoming')}
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                {isAr ? 'مباريات قادمة' : 'Upcoming Fixtures'}
              </h2>
            </div>
            <Link to="/matches" className="text-sm text-ncc-teal hover:text-white transition-colors flex items-center gap-1 font-bold">
              {isAr ? 'الكل' : 'View all'} <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcoming.map((m, i) => (
              <MatchCard key={m.id} match={m} prediction={predMap[m.id]} index={i} onPredict={(mm) => {
                if (!user) { window.location.href = '/register'; return; }
                setOpenMatch(mm);
              }} />
            ))}
          </div>
        </section>
      )}

      {/* TOP PLAYERS */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gold font-bold mb-2">
              {t('leaderboard.title')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              {isAr ? 'أبطال الأسبوع' : 'Top Players'}
            </h2>
          </div>
          <Link to="/leaderboard" className="text-sm text-gold hover:text-white transition-colors flex items-center gap-1 font-bold">
            {isAr ? 'الترتيب الكامل' : 'Full board'} <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
          </Link>
        </div>
        {leaderboard.entries.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center text-slate-400">
            {t('leaderboard.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leaderboard.entries.slice(0, 3).map((e, i) => {
              const colors = ['border-gold text-gold bg-gold/5', 'border-silver text-slate-200 bg-white/5', 'border-bronze text-orange-300 bg-orange-500/5'];
              const labels = [t('leaderboard.top1'), t('leaderboard.top2'), t('leaderboard.top3')];
              return (
                <div key={e.employee_id} className={`glass rounded-2xl p-6 border-t-4 ${colors[i]}`}>
                  <div className="text-xs uppercase tracking-widest font-bold opacity-80">{labels[i]}</div>
                  <div className="text-2xl font-black mt-2 text-white">{e.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">#{e.employee_id}</div>
                  <div className="mt-4 flex items-end gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-400">{t('leaderboard.points')}</div>
                      <div className="text-4xl font-black text-white">{e.points}</div>
                    </div>
                    <div className="text-xs text-slate-500 pb-1">
                      ⚡ {e.exact_scores} · 🎯 {e.correct_winners}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <PredictionDialog
        match={openMatch}
        prediction={openMatch ? predMap[openMatch.id] : null}
        open={!!openMatch}
        onOpenChange={(o) => !o && setOpenMatch(null)}
        onSaved={() => load()}
      />
    </div>
  );
}
