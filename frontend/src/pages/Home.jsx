import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { listMatches, latestWinners, myPredictions } from '../lib/api';
import { Button } from '../components/ui/button';
import { MatchCard } from '../components/MatchCard';
import { PredictionDialog } from '../components/PredictionDialog';
import { Trophy, Target, Zap, ArrowRight, Sparkles, Star, Flag, Brain } from 'lucide-react';

const HERO_BG = 'https://images.pexels.com/photos/15779126/pexels-photo-15779126.jpeg';

export default function Home() {
  const { t, isAr } = useI18n();
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [latest, setLatest] = useState({ match: null, winners: [] });
  const [openMatch, setOpenMatch] = useState(null);

  const load = async () => {
    const [m, w] = await Promise.all([listMatches(), latestWinners()]);
    setMatches(m);
    setLatest(w);
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
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${HERO_BG})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-saudi-green/10 via-bg-base/85 to-bg-base" />
        {/* Subtle Saudi-green glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-saudi-green/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-ncc-teal/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-saudi-green/15 border border-saudi-green/40 text-emerald-300 text-xs font-bold tracking-widest mb-6 animate-fade-up">
              <Star className="w-3.5 h-3.5 fill-current" />
              {t('hero.tagline')}
              <span className="text-white/40">·</span>
              <span>2026</span>
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
                <>
                  <Link to="/register" data-testid="hero-cta-register">
                    <Button className="bg-saudi-green hover:bg-saudi-green-dark text-white font-black text-base px-8 py-6 rounded-full btn-glow">
                      <Trophy className={`w-5 h-5 ${isAr ? 'ml-2' : 'mr-2'}`} />
                      {t('hero.cta')}
                    </Button>
                  </Link>
                  <Link to="/login" data-testid="hero-cta-login">
                    <Button variant="outline" className="border-ncc-teal/40 text-ncc-teal hover:bg-ncc-teal/10 hover:text-emerald-300 font-bold px-6 py-6 rounded-full btn-glow-teal">
                      {t('auth.goLogin')}
                    </Button>
                  </Link>
                </>
              ) : (
                <Link to="/matches" data-testid="hero-cta-matches">
                  <Button className="bg-saudi-green hover:bg-saudi-green-dark text-white font-black text-base px-8 py-6 rounded-full btn-glow">
                    <Target className={`w-5 h-5 ${isAr ? 'ml-2' : 'mr-2'}`} />
                    {t('hero.cta')}
                  </Button>
                </Link>
              )}
              {user && (
                <Link to="/matches">
                  <Button variant="outline" className="border-ncc-teal/40 text-ncc-teal hover:bg-ncc-teal/10 hover:text-ncc-teal font-bold px-6 py-6 rounded-full btn-glow-teal">
                    {t('hero.ctaSecondary')} {arrow}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Scoring strip - only 2 cards now (no wrong prediction) */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <div className="glass rounded-xl p-5 flex items-center gap-4 border border-gold/40 bg-gold/5">
              <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-gold" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('scoring.exact')}</div>
                <div className="text-2xl font-black text-gold">{t('scoring.exactPts')}</div>
              </div>
            </div>
            <div className="glass rounded-xl p-5 flex items-center gap-4 border border-saudi-green/40 bg-saudi-green/5">
              <div className="w-12 h-12 rounded-full bg-saudi-green/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('scoring.winner')}</div>
                <div className="text-2xl font-black text-emerald-300">{t('scoring.winnerPts')}</div>
              </div>
            </div>
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
                if (!user) { window.location.href = '/login'; return; }
                setOpenMatch(mm);
              }} />
            ))}
          </div>
        </section>
      )}

      {/* CHAMPIONS OF THE LATEST MATCH */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24" data-testid="champions-section">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gold font-bold mb-2 flex items-center gap-2">
              <Flag className="w-3.5 h-3.5" />
              {t('champions.title')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              {t('champions.heading')}
            </h2>
          </div>
          <Link to="/leaderboard" className="text-sm text-gold hover:text-white transition-colors flex items-center gap-1 font-bold">
            {isAr ? 'الترتيب الكامل' : 'Full board'} <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
          </Link>
        </div>

        {!latest.match ? (
          <div className="glass rounded-2xl p-12 text-center text-slate-400">
            {t('champions.empty')}
          </div>
        ) : (
          <Link to={`/champions/${latest.match.id}`} className="block group" data-testid="latest-champions-link">
            <div className="glass rounded-2xl p-6 sm:p-8 border border-gold/30 bg-gradient-to-br from-saudi-green/5 to-transparent group-hover:border-gold/60 transition-colors">
            {/* Match recap header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{latest.match.flag_a}</div>
                <div className="text-lg font-bold">
                  {isAr ? (latest.match.team_a_ar || latest.match.team_a) : latest.match.team_a}
                </div>
                <div className="px-3 py-1 rounded-md bg-bg-base border border-white/10 font-black tracking-tighter">
                  <span className={latest.match.winner === 'team_a' ? 'text-saudi-green' : 'text-white'}>{latest.match.result_a}</span>
                  <span className="text-slate-500 mx-2">-</span>
                  <span className={latest.match.winner === 'team_b' ? 'text-saudi-green' : 'text-white'}>{latest.match.result_b}</span>
                </div>
                <div className="text-lg font-bold">
                  {isAr ? (latest.match.team_b_ar || latest.match.team_b) : latest.match.team_b}
                </div>
                <div className="text-3xl">{latest.match.flag_b}</div>
              </div>
              <div className="text-xs uppercase tracking-widest text-gold font-bold flex items-center gap-2">
                {isAr ? 'افتح صفحة الاحتفال' : 'Open celebration'} {arrow}
              </div>
            </div>

            {latest.winners.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {isAr ? 'لا يوجد فائزون لهذه المباراة. حظ أوفر للمرة القادمة!' : 'No winners for this match — better luck next time!'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {latest.winners.map((w, i) => (
                  <div
                    key={w.employee_id + i}
                    data-testid={`champion-${w.employee_id}`}
                    className={`rounded-xl p-4 border ${
                      w.exact
                        ? 'border-gold/50 bg-gold/5'
                        : 'border-saudi-green/40 bg-saudi-green/5'
                    } flex items-center gap-3 animate-fade-up`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                      w.exact ? 'bg-gold text-bg-base' : 'bg-saudi-green text-white'
                    }`}>
                      {w.exact ? <Zap className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{w.name}</div>
                      <div className="text-[10px] text-slate-500 tracking-wider">#{w.employee_id}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-black ${w.exact ? 'text-gold' : 'text-emerald-300'}`}>
                        +{w.points}
                      </div>
                      <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                        {w.exact ? t('champions.exact') : t('champions.correct')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </Link>
        )}
      </section>

      {/* TRIVIA CHALLENGE BANNER */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20" data-testid="home-trivia-card">
        <div className="relative glass rounded-3xl overflow-hidden border border-purple-400/30 group hover:border-purple-400/60 transition-colors">
          {/* Animated gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-pink-500/10 to-transparent" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl group-hover:bg-purple-500/50 transition-colors" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />

          <div className="relative px-6 sm:px-10 py-10 sm:py-14 flex flex-col md:flex-row items-center gap-8">
            {/* Icon */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-purple-500/40 blur-2xl rounded-full" />
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 grid place-items-center shadow-xl shadow-purple-500/40 rotate-3 group-hover:rotate-6 transition-transform">
                <Brain className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Copy */}
            <div className="flex-1 text-center md:text-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-[10px] font-bold tracking-widest mb-3">
                <Sparkles className="w-3 h-3" />
                {t('trivia.heroTagline')}
                <span className="text-purple-400/60">·</span>
                <span>NEW</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-3">
                {t('trivia.heroTitle')}
              </h2>
              <p className="text-slate-300 max-w-2xl text-sm sm:text-base leading-relaxed">
                {t('trivia.heroDesc')}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3">
                {user ? (
                  <Link to="/trivia" data-testid="home-trivia-cta">
                    <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black text-base px-8 py-6 rounded-full shadow-lg shadow-purple-500/30">
                      <Sparkles className={`w-5 h-5 ${isAr ? 'ml-2' : 'mr-2'}`} />
                      {t('trivia.heroCta')}
                    </Button>
                  </Link>
                ) : (
                  <Link to="/login" data-testid="home-trivia-cta-login">
                    <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black text-base px-8 py-6 rounded-full shadow-lg shadow-purple-500/30">
                      <Sparkles className={`w-5 h-5 ${isAr ? 'ml-2' : 'mr-2'}`} />
                      {t('trivia.heroLoginRequired')}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
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
