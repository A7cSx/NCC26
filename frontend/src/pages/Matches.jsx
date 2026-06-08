import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { listMatches, myPredictions } from '../lib/api';
import { MatchCard } from '../components/MatchCard';
import { PredictionDialog } from '../components/PredictionDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Calendar, Search, X } from 'lucide-react';

export default function Matches() {
  const { t, isAr } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [openMatch, setOpenMatch] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [query, setQuery] = useState('');

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

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const filtered = useMemo(() => {
    const byTab = searching ? matches : matches.filter(m => m.status === tab);
    if (!searching) return byTab;
    return byTab.filter(m => {
      const hay = [
        m.team_a, m.team_b, m.team_a_ar, m.team_b_ar,
        m.group, `group ${m.group}`, `مجموعة ${m.group}`,
        m.venue,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [matches, tab, q, searching]);

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

      {/* Search bar */}
      <div className="relative mb-6 max-w-2xl" data-testid="matches-search-wrapper">
        <Search className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'} w-5 h-5 text-ncc-teal pointer-events-none`} />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('matches.searchPlaceholder')}
          data-testid="matches-search-input"
          className={`bg-bg-card border border-white/10 text-white placeholder:text-slate-400 h-12 ${isAr ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12'} focus-visible:ring-ncc-teal focus-visible:ring-offset-0`}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t('matches.clearSearch')}
            data-testid="matches-search-clear"
            className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-3' : 'right-3'} w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center`}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {searching && (
        <div className="mb-6 text-sm text-slate-300" data-testid="matches-search-meta">
          <span className="font-bold text-ncc-teal">{filtered.length}</span>{' '}
          {t('matches.searchResults')}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className={`bg-bg-card border border-white/10 mb-8 ${searching ? 'opacity-50 pointer-events-none' : ''}`} data-testid="matches-tabs">
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
            <div className="glass rounded-2xl p-16 text-center text-slate-400" data-testid="matches-empty">
              {searching ? (
                <span>{t('matches.noSearchResults')} <span className="text-white font-bold">“{query}”</span></span>
              ) : (
                t('matches.noMatches')
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="matches-grid">
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
