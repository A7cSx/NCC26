import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useI18n } from '../lib/i18n';
import { getMatch, matchPredictions } from '../lib/api';
import { Trophy, Crown, Zap, Target, ArrowLeft, Share2, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function ChampionsCelebration() {
  const { matchId } = useParams();
  const { t, isAr, lang } = useI18n();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const firedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [m, p] = await Promise.all([getMatch(matchId), matchPredictions(matchId)]);
        setMatch(m);
        const list = (p.predictions || []).filter(x => x.points > 0).sort((a, b) => b.points - a.points);
        setWinners(list);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [matchId]);

  useEffect(() => {
    if (loading || firedRef.current || !match || match.status !== 'finished' || winners.length === 0) return;
    firedRef.current = true;
    // Saudi green + gold + white confetti burst
    const colors = ['#007A3D', '#F5C518', '#FFFFFF', '#2BB6C7'];
    const duration = 4000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    confetti({ particleCount: 120, spread: 110, origin: { y: 0.4 }, colors });
    setTimeout(frame, 250);
  }, [loading, match, winners]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-400">{t('common.loading')}</div>;
  }
  if (!match) {
    return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-400">404</div>;
  }

  const teamA = isAr ? (match.team_a_ar || match.team_a) : match.team_a;
  const teamB = isAr ? (match.team_b_ar || match.team_b) : match.team_b;

  const onShare = () => {
    const text = `${isAr ? '🏆 أبطال مباراة' : '🏆 Match Champions'}: ${match.team_a} ${match.result_a}-${match.result_b} ${match.team_b}`;
    if (navigator.share) navigator.share({ title: 'NCC World Cup', text, url: window.location.href }).catch(() => {});
    else { navigator.clipboard.writeText(`${text}\n${window.location.href}`); }
  };

  const exact = winners.filter(w => w.points === 5);
  const correct = winners.filter(w => w.points === 3);

  return (
    <div className="relative min-h-[80vh]">
      {/* big radial green burst behind hero */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-saudi-green/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-gold/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white text-sm font-bold inline-flex items-center gap-1 mb-6"
          data-testid="back-home-btn"
        >
          <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
          {isAr ? 'العودة' : 'Back'}
        </button>

        {/* Trophy + headline */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/15 border border-gold/40 text-gold text-xs font-bold tracking-[0.3em] uppercase mb-6 animate-fade-up">
            <Sparkles className="w-3.5 h-3.5" />
            {isAr ? 'إعلان أبطال المباراة' : 'Match Champions Reveal'}
          </div>
          <div className="relative inline-block mb-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <Trophy className="w-24 h-24 text-gold mx-auto drop-shadow-[0_0_30px_rgba(245,197,24,0.5)]" />
            <div className="absolute inset-0 bg-gold/30 blur-3xl rounded-full" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tighter leading-none headline-accent animate-fade-up" style={{ animationDelay: '0.2s' }}>
            {isAr ? 'أبطال المباراة' : 'Match Champions'}
          </h1>
          <div className="mt-6 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-bg-card border border-white/10 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <span className="text-3xl">{match.flag_a}</span>
            <span className="font-bold text-lg">{teamA}</span>
            <span className="text-3xl font-black tracking-tighter">
              <span className={match.winner === 'team_a' ? 'text-saudi-green' : 'text-white'}>{match.result_a}</span>
              <span className="text-slate-500 mx-2">-</span>
              <span className={match.winner === 'team_b' ? 'text-saudi-green' : 'text-white'}>{match.result_b}</span>
            </span>
            <span className="font-bold text-lg">{teamB}</span>
            <span className="text-3xl">{match.flag_b}</span>
          </div>
        </div>

        {winners.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <div className="text-xl font-bold mb-2">
              {isAr ? 'لا يوجد فائزون لهذه المباراة' : 'No winners this round'}
            </div>
            <div className="text-slate-400">
              {isAr ? 'حظ أوفر في المباراة القادمة! 🤞' : 'Better luck next match! 🤞'}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Exact-score heroes */}
            {exact.length > 0 && (
              <div data-testid="exact-section">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-gold" />
                  <h2 className="text-lg font-black tracking-tight uppercase tracking-widest">
                    {isAr ? '✨ نتيجة دقيقة · ٥ نقاط' : '✨ Exact score · 5 pts'}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {exact.map((w, i) => (
                    <div
                      key={w.employee_id + i}
                      data-testid={`celebration-exact-${w.employee_id}`}
                      className="rounded-2xl p-5 border-2 border-gold/50 bg-gradient-to-r from-gold/15 via-gold/5 to-transparent flex items-center gap-4 animate-fade-up"
                      style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                    >
                      <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center shadow-lg shadow-gold/30">
                        <Crown className="w-7 h-7 text-bg-base" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-xl truncate">{w.employee_name}</div>
                        <div className="text-xs text-slate-400 font-mono">#{w.employee_id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-black text-gold">+5</div>
                        <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">PTS</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Correct-winner */}
            {correct.length > 0 && (
              <div data-testid="correct-section">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-emerald-300" />
                  <h2 className="text-lg font-black tracking-tight uppercase tracking-widest">
                    {isAr ? '🎯 الفائز فقط · ٣ نقاط' : '🎯 Correct winner · 3 pts'}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {correct.map((w, i) => (
                    <div
                      key={w.employee_id + i}
                      data-testid={`celebration-correct-${w.employee_id}`}
                      className="rounded-xl p-4 border border-saudi-green/40 bg-saudi-green/5 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-saudi-green flex items-center justify-center">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{w.employee_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">#{w.employee_id}</div>
                      </div>
                      <div className="text-2xl font-black text-emerald-300">+3</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3 pt-4">
              <Button onClick={onShare} data-testid="share-btn" className="bg-saudi-green hover:bg-saudi-green-dark text-white font-bold rounded-full btn-glow">
                <Share2 className={`w-4 h-4 ${isAr ? 'ml-2' : 'mr-2'}`} />
                {isAr ? 'مشاركة' : 'Share'}
              </Button>
              <Link to="/leaderboard">
                <Button variant="outline" className="border-gold/50 text-gold hover:bg-gold/10 hover:text-gold rounded-full font-bold">
                  <Trophy className={`w-4 h-4 ${isAr ? 'ml-2' : 'mr-2'}`} />
                  {t('leaderboard.title')}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
