import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { listMatches, myPredictions } from '../lib/api';
import { MatchCard } from '../components/MatchCard';
import { PredictionDialog } from '../components/PredictionDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Calendar } from 'lucide-react';

export default function Matches() {
  const { t, isAr } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [openMatch, setOpenMatch] = useState(null);
  const [tab, setTab] = useState('upcoming');

  const load = async () => {
    const m = await listMatches();
    setMatches(m);
    if (user) {
      const p = await myPredictions(user.employee_id);
      setPredictions(p);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const predMap = useMemo(() => Object.fromEntries(predictions.map(p => [p.match_id, p])), [predictions]);
  const filtered = matches.filter(m => m.status === tab);

  const onPredictClick = (m) => {
    if (!user) { navigate('/register'); return; }
    setOpenMatch(m);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-2">
        <Calendar className="w-6 h-6 text-ncc-teal" />
        <div className="text-xs uppercase tracking-[0.2em] text-ncc-teal font-bold">{t('nav.matches')}</div>
      </div>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-8">
        {isAr ? 'جدول كأس العالم' : 'World Cup Fixtures'}
      </h1>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-bg-card border border-white/10 mb-8" data-testid="matches-tabs">
          <TabsTrigger value="upcoming" data-testid="tab-upcoming" className="data-[state=active]:bg-ncc-teal data-[state=active]:text-bg-base font-bold">
            {t('matches.upcoming')}
          </TabsTrigger>
          <TabsTrigger value="live" data-testid="tab-live" className="data-[state=active]:bg-red-500 data-[state=active]:text-white font-bold">
            {t('matches.live')}
          </TabsTrigger>
          <TabsTrigger value="finished" data-testid="tab-finished" className="data-[state=active]:bg-saudi-green data-[state=active]:text-white font-bold">
            {t('matches.finished')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-0">
          {filtered.length === 0 ? (
            <div className="glass rounded-2xl p-16 text-center text-slate-400">
              {t('matches.noMatches')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((m, i) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  prediction={predMap[m.id]}
                  index={i}
                  onPredict={onPredictClick}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
