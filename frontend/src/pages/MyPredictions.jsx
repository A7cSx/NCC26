import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { listMatches, myPredictions } from '../lib/api';
import { MatchCard } from '../components/MatchCard';
import { PredictionDialog } from '../components/PredictionDialog';
import { Target, Trophy } from 'lucide-react';

export default function MyPredictions() {
  const { t, isAr } = useI18n();
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [openMatch, setOpenMatch] = useState(null);

  const load = async () => {
    const [m, p] = await Promise.all([listMatches(), myPredictions(user.employee_id)]);
    setMatches(m);
    setPredictions(p);
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  const predMap = useMemo(() => Object.fromEntries(predictions.map(p => [p.match_id, p])), [predictions]);

  if (!user) return <Navigate to="/register" replace />;

  const myMatches = matches.filter(m => predMap[m.id]);
  const totalPoints = predictions.reduce((s, p) => s + (p.points || 0), 0);
  const exact = predictions.filter(p => p.points === 5).length;
  const correct = predictions.filter(p => p.points === 3).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-2">
        <Target className="w-6 h-6 text-ncc-teal" />
        <div className="text-xs uppercase tracking-[0.2em] text-ncc-teal font-bold">{t('nav.myPredictions')}</div>
      </div>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-8">
        {isAr ? `أهلاً، ${user.full_name || user.name}` : `Hi, ${user.full_name || user.name}`}
      </h1>

      {/* stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <div className="glass rounded-xl p-5 border-l-4 border-gold">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('leaderboard.points')}</div>
          <div className="text-3xl font-black text-gold mt-1" data-testid="stat-points">{totalPoints}</div>
        </div>
        <div className="glass rounded-xl p-5 border-l-4 border-saudi-green">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('leaderboard.exact')}</div>
          <div className="text-3xl font-black text-emerald-300 mt-1">{exact}</div>
        </div>
        <div className="glass rounded-xl p-5 border-l-4 border-ncc-teal">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('leaderboard.correct')}</div>
          <div className="text-3xl font-black text-ncc-teal mt-1">{correct}</div>
        </div>
        <div className="glass rounded-xl p-5 border-l-4 border-white/30">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{isAr ? 'إجمالي التوقعات' : 'Total predictions'}</div>
          <div className="text-3xl font-black mt-1">{predictions.length}</div>
        </div>
      </div>

      {myMatches.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center text-slate-400">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          {isAr ? 'لم تقم بأي توقعات بعد. اذهب لقسم المباريات وابدأ!' : 'No predictions yet. Head to Matches and start!'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {myMatches.map((m, i) => (
            <MatchCard
              key={m.id}
              match={m}
              prediction={predMap[m.id]}
              index={i}
              onPredict={(mm) => setOpenMatch(mm)}
            />
          ))}
        </div>
      )}

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
