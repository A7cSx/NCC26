import React, { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';
import { getLeaderboard } from '../lib/api';
import { Trophy, Crown, Medal, Award, ShieldCheck } from 'lucide-react';

export default function Leaderboard() {
  const { t, isAr } = useI18n();
  const [data, setData] = useState({ entries: [], finished_matches: 0 });

  useEffect(() => {
    getLeaderboard().then(setData);
  }, []);

  const top3 = data.entries.slice(0, 3);
  const rest = data.entries.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean); // 2nd, 1st, 3rd

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-2">
        <Trophy className="w-6 h-6 text-gold" />
        <div className="text-xs uppercase tracking-[0.2em] text-gold font-bold">{t('leaderboard.title')}</div>
      </div>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">
        {isAr ? 'لوحة المتصدرين' : 'Hall of Fame'}
      </h1>
      <p className="text-slate-400 mt-2 max-w-2xl flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-saudi-green mt-1 shrink-0" />
        {t('leaderboard.desc')}
      </p>
      <div className="mt-1 text-xs text-slate-500">
        {isAr ? `المباريات المنتهية: ${data.finished_matches}` : `Finished matches: ${data.finished_matches}`}
      </div>

      {data.entries.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center text-slate-400 mt-10" data-testid="leaderboard-empty">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          {t('leaderboard.empty')}
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-10 items-end" data-testid="podium">
              {podiumOrder.map((entry, displayIdx) => {
                const realRank = entry.rank;
                const heights = { 1: 'h-56', 2: 'h-44', 3: 'h-36' };
                const colors = {
                  1: 'border-gold text-gold from-gold/30 to-transparent',
                  2: 'border-silver text-slate-100 from-slate-400/30 to-transparent',
                  3: 'border-bronze text-orange-300 from-orange-500/30 to-transparent',
                };
                const Icon = realRank === 1 ? Crown : realRank === 2 ? Medal : Award;
                return (
                  <div key={entry.employee_id} className="flex flex-col items-center">
                    <div className="mb-2 text-center">
                      <Icon className={`w-8 h-8 mx-auto mb-1 ${realRank === 1 ? 'text-gold' : realRank === 2 ? 'text-slate-300' : 'text-orange-400'}`} />
                      <div className="font-black text-base sm:text-lg truncate max-w-[120px]">{entry.name}</div>
                      <div className="text-[10px] text-slate-500">#{entry.employee_id}</div>
                      <div className="text-2xl font-black mt-1">{entry.points}</div>
                    </div>
                    <div className={`w-full ${heights[realRank]} rounded-t-xl border-t-4 ${colors[realRank]} bg-gradient-to-t flex items-start justify-center pt-3`}>
                      <div className={`text-4xl font-black ${realRank === 1 ? 'text-gold' : realRank === 2 ? 'text-silver' : 'text-bronze'}`}>
                        {realRank}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rest table */}
          {rest.length > 0 && (
            <div className="mt-10 glass rounded-2xl overflow-hidden border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-bold w-16">#</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t('leaderboard.player')}</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-bold text-center">{t('leaderboard.exact')}</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-bold text-center">{t('leaderboard.correct')}</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-bold text-right">{t('leaderboard.points')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map(e => (
                    <tr key={e.employee_id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-slate-400">{e.rank}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold">{e.name}</div>
                        <div className="text-[10px] text-slate-500">#{e.employee_id}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-emerald-300 font-bold">{e.exact_scores}</td>
                      <td className="px-4 py-3 text-center text-ncc-teal font-bold">{e.correct_winners}</td>
                      <td className="px-4 py-3 text-right text-gold font-black text-lg">{e.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
