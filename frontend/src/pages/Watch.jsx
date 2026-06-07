import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { getMatch } from '../lib/api';
import { ArrowLeft, Tv, MapPin } from 'lucide-react';

// Convert various YouTube URL forms to /embed/ URL. Falls back to the raw URL.
const toEmbed = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) return url;
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}?autoplay=1`;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    return url;
  } catch { return url; }
};

export default function Watch() {
  const { matchId } = useParams();
  const { t, isAr } = useI18n();
  const [match, setMatch] = useState(null);

  useEffect(() => {
    getMatch(matchId).then(setMatch).catch(() => setMatch(null));
  }, [matchId]);

  if (!match) {
    return <div className="max-w-5xl mx-auto px-4 py-20 text-center text-slate-400">{t('common.loading')}</div>;
  }

  const teamA = isAr ? (match.team_a_ar || match.team_a) : match.team_a;
  const teamB = isAr ? (match.team_b_ar || match.team_b) : match.team_b;
  const embed = toEmbed(match.stream_url);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/matches" className="text-slate-400 hover:text-white text-sm font-bold inline-flex items-center gap-1 mb-6">
        <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
        {isAr ? 'العودة للمباريات' : 'Back to matches'}
      </Link>

      <div className="flex items-center gap-2 text-red-400 mb-2">
        <Tv className="w-5 h-5" />
        <span className="text-xs uppercase tracking-[0.3em] font-bold">{isAr ? 'البث المباشر' : 'Live Broadcast'}</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-black tracking-tighter flex items-center gap-3 flex-wrap mb-4">
        <span className="text-3xl">{match.flag_a}</span> {teamA}
        <span className="text-slate-500">vs</span>
        <span>{teamB}</span> <span className="text-3xl">{match.flag_b}</span>
      </h1>
      {match.venue && (
        <div className="text-slate-400 text-sm mb-6 flex items-center gap-1">
          <MapPin className="w-4 h-4" /> {match.venue}
        </div>
      )}

      <div className="aspect-video rounded-2xl overflow-hidden bg-bg-card border border-white/10" data-testid="stream-player">
        {embed ? (
          <iframe
            src={embed}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`${teamA} vs ${teamB}`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
            <Tv className="w-16 h-16 text-slate-700 mb-4" />
            <div className="text-xl font-bold mb-2">
              {isAr ? 'البث المباشر غير متوفر بعد' : 'Stream not available yet'}
            </div>
            <div className="text-slate-400 text-sm">
              {isAr ? 'سيتم إضافة رابط البث من قبل الإدارة قبل بدء المباراة.' : 'Admin will add the broadcast link before kickoff.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
