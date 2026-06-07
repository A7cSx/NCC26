import React from 'react';
import { useI18n } from '../lib/i18n';
import { Clock, CheckCircle2, Radio, Lock, Edit3 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const formatKickoff = (iso, lang) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const MatchCard = ({ match, prediction, onPredict, index = 0 }) => {
  const { t, lang, isAr } = useI18n();
  const teamA = isAr ? (match.team_a_ar || match.team_a) : match.team_a;
  const teamB = isAr ? (match.team_b_ar || match.team_b) : match.team_b;

  const statusBadge = () => {
    if (match.status === 'live') return (
      <Badge className="bg-red-500/20 text-red-300 border border-red-500/40 gap-1.5" data-testid={`badge-live-${match.id}`}>
        <Radio className="w-3 h-3 animate-pulse" /> {t('matches.live')}
      </Badge>
    );
    if (match.status === 'finished') return (
      <Badge className="bg-saudi-green/20 text-emerald-300 border border-saudi-green/40 gap-1.5" data-testid={`badge-finished-${match.id}`}>
        <CheckCircle2 className="w-3 h-3" /> {t('matches.finished')}
      </Badge>
    );
    return (
      <Badge className="bg-ncc-teal/15 text-ncc-teal border border-ncc-teal/30 gap-1.5" data-testid={`badge-upcoming-${match.id}`}>
        <Clock className="w-3 h-3" /> {t('matches.upcoming')}
      </Badge>
    );
  };

  return (
    <div
      className="glass glass-hover rounded-2xl p-6 relative overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
      data-testid={`match-card-${match.id}`}
    >
      {/* group pill */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-bold">
            {t('common.group')} {match.group}
          </div>
          <div className="h-3 w-px bg-white/20" />
          <div className="text-[10px] text-slate-500">{formatKickoff(match.kickoff, lang)}</div>
        </div>
        {statusBadge()}
      </div>

      {/* teams */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-5">
        <div className="text-center">
          <div className="text-4xl mb-1">{match.flag_a}</div>
          <div className="font-bold text-base sm:text-lg truncate" data-testid={`team-a-${match.id}`}>{teamA}</div>
        </div>
        <div className="flex flex-col items-center px-2">
          {match.status === 'finished' ? (
            <div className="text-3xl font-black tracking-tighter" data-testid={`result-${match.id}`}>
              <span className={match.winner === 'team_a' ? 'text-saudi-green' : 'text-white'}>{match.result_a}</span>
              <span className="text-slate-500 mx-2">-</span>
              <span className={match.winner === 'team_b' ? 'text-saudi-green' : 'text-white'}>{match.result_b}</span>
            </div>
          ) : (
            <div className="text-2xl font-black text-slate-500">VS</div>
          )}
        </div>
        <div className="text-center">
          <div className="text-4xl mb-1">{match.flag_b}</div>
          <div className="font-bold text-base sm:text-lg truncate" data-testid={`team-b-${match.id}`}>{teamB}</div>
        </div>
      </div>

      {/* prediction footer */}
      <div className="pt-4 border-t border-white/5">
        {prediction ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('matches.yourPred')}</div>
              <div className="text-lg font-black mt-0.5" data-testid={`my-pred-${match.id}`}>
                {prediction.score_a} <span className="text-slate-500 mx-1">-</span> {prediction.score_b}
              </div>
            </div>
            {match.status === 'finished' ? (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('predict.points')}</div>
                <div className={`text-2xl font-black ${prediction.points > 0 ? 'text-gold' : 'text-slate-500'}`}>
                  {prediction.points}
                </div>
              </div>
            ) : match.status === 'upcoming' ? (
              <Button
                onClick={() => onPredict?.(match)}
                data-testid={`edit-pred-${match.id}`}
                variant="outline"
                className="border-ncc-teal/40 text-ncc-teal hover:bg-ncc-teal/10 hover:text-ncc-teal"
              >
                <Edit3 className="w-4 h-4" />
                {t('matches.edit')}
              </Button>
            ) : (
              <Badge className="bg-white/5 text-slate-400 border border-white/10 gap-1.5">
                <Lock className="w-3 h-3" /> {t('matches.locked')}
              </Badge>
            )}
          </div>
        ) : match.status === 'upcoming' ? (
          <Button
            onClick={() => onPredict?.(match)}
            data-testid={`predict-btn-${match.id}`}
            className="w-full bg-saudi-green hover:bg-saudi-green-dark text-white font-bold btn-glow"
          >
            {t('matches.predict')}
          </Button>
        ) : (
          <div className="flex items-center justify-center text-slate-500 text-sm gap-2 py-1">
            <Lock className="w-4 h-4" /> {t('matches.locked')}
          </div>
        )}
      </div>
    </div>
  );
};
