import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { Clock, CheckCircle2, Radio, Lock, Edit3, Tv, MapPin } from 'lucide-react';
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

const useCountdown = (targetIso) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = (() => { try { return new Date(targetIso).getTime(); } catch { return null; } })();
  if (!target) return null;
  const lockMs = 5 * 60 * 1000;
  const lockAt = target - lockMs;
  const diffToLock = lockAt - now;
  const diffToKickoff = target - now;
  return { now, target, lockAt, lockMs, diffToLock, diffToKickoff };
};

const fmtCountdown = (ms, lang) => {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (d > 0) return lang === 'ar' ? `${d} يوم · ${pad(h)}:${pad(m)}:${pad(sec)}` : `${d}d · ${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

export const MatchCard = ({ match, prediction, onPredict, index = 0 }) => {
  const { t, lang, isAr } = useI18n();
  const teamA = isAr ? (match.team_a_ar || match.team_a) : match.team_a;
  const teamB = isAr ? (match.team_b_ar || match.team_b) : match.team_b;

  const cd = useCountdown(match.kickoff);
  const isLockedByTime = cd ? cd.diffToLock <= 0 : false;
  const canPredict = match.status === 'upcoming' && !isLockedByTime;
  const showCountdown = match.status === 'upcoming' && cd && cd.diffToKickoff > 0;
  // urgency: less than 1 hour to lock
  const urgent = cd && cd.diffToLock > 0 && cd.diffToLock < 3600 * 1000;

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
      {/* Saudi-green accent for Saudi Arabia matches */}
      {(match.team_a === 'Saudi Arabia' || match.team_b === 'Saudi Arabia') && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-saudi-green via-saudi-green to-transparent" />
      )}

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

      {/* live countdown */}
      {showCountdown && (
        <div
          data-testid={`countdown-${match.id}`}
          className={`mb-4 rounded-lg p-3 text-center border ${
            urgent
              ? 'border-red-500/50 bg-red-500/10 animate-glow-pulse'
              : 'border-saudi-green/30 bg-saudi-green/5'
          }`}
        >
          <div className="text-[9px] uppercase tracking-[0.3em] font-bold text-slate-400 mb-1">
            {isLockedByTime
              ? (isAr ? 'مغلق · بدء المباراة بعد' : 'Locked · Kickoff in')
              : (isAr ? 'يُقفل بعد' : 'Locks in')}
          </div>
          <div className={`font-mono text-xl sm:text-2xl font-black tracking-tighter ${urgent ? 'text-red-300' : 'text-emerald-300'}`}>
            {fmtCountdown(isLockedByTime ? cd.diffToKickoff : cd.diffToLock, lang)}
          </div>
        </div>
      )}

      {/* venue + stream link */}
      {(match.venue || match.stream_url) && (
        <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3">
          {match.venue && (
            <div className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{match.venue}</span>
            </div>
          )}
          {match.stream_url && (
            <Link
              to={`/watch/${match.id}`}
              className="flex items-center gap-1 text-red-300 hover:text-red-200 font-bold ms-auto"
              data-testid={`watch-link-${match.id}`}
            >
              <Tv className="w-3 h-3" />
              {isAr ? 'البث المباشر' : 'Watch live'}
            </Link>
          )}
        </div>
      )}

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
            ) : canPredict ? (
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
        ) : canPredict ? (
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
