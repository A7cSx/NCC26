import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { useI18n } from '../lib/i18n';
import { Trophy } from 'lucide-react';
import { submitPrediction } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

export const PredictionDialog = ({ match, prediction, open, onOpenChange, onSaved }) => {
  const { t, isAr } = useI18n();
  const { user } = useAuth();
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (prediction) {
      setScoreA(prediction.score_a);
      setScoreB(prediction.score_b);
    } else {
      setScoreA(0);
      setScoreB(0);
    }
  }, [prediction, match]);

  if (!match) return null;
  const teamA = isAr ? (match.team_a_ar || match.team_a) : match.team_a;
  const teamB = isAr ? (match.team_b_ar || match.team_b) : match.team_b;
  const winner = scoreA > scoreB ? 'team_a' : scoreA < scoreB ? 'team_b' : 'draw';

  const onSubmit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const saved = await submitPrediction({
        employee_id: user.employee_id,
        match_id: match.id,
        winner,
        score_a: Number(scoreA),
        score_b: Number(scoreB),
      });
      toast.success(t('predict.success'));
      onSaved?.(saved);
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-card border-white/10 text-white max-w-md" data-testid="prediction-dialog">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight">{t('predict.title')}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {prediction ? t('predict.already') : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Q1: Winner */}
        <div className="space-y-2 mt-2">
          <div className="text-xs uppercase tracking-widest text-ncc-teal font-bold">{t('predict.questionWinner')}</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'team_a', label: teamA, flag: match.flag_a },
              { key: 'draw', label: t('predict.draw'), flag: '🤝' },
              { key: 'team_b', label: teamB, flag: match.flag_b },
            ].map(opt => (
              <div
                key={opt.key}
                data-testid={`winner-display-${opt.key}`}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  winner === opt.key
                    ? 'border-saudi-green bg-saudi-green/10 shadow-lg shadow-saudi-green/20'
                    : 'border-white/10 bg-white/5 opacity-60'
                }`}
              >
                <div className="text-2xl mb-1">{opt.flag}</div>
                <div className="text-[11px] font-bold truncate">{opt.label}</div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 italic">
            {isAr ? 'يتم تحديد الفائز تلقائيًا من النتيجة' : 'Winner is auto-derived from the score'}
          </div>
        </div>

        {/* Q2: Score */}
        <div className="space-y-3 mt-3">
          <div className="text-xs uppercase tracking-widest text-ncc-teal font-bold">{t('predict.questionScore')}</div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex flex-col items-center gap-2">
              <div className="text-3xl">{match.flag_a}</div>
              <div className="text-xs font-bold text-slate-300 truncate max-w-full">{teamA}</div>
              <input
                type="number"
                min="0"
                max="20"
                value={scoreA}
                onChange={(e) => setScoreA(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                className="score-input"
                data-testid="score-a-input"
              />
            </div>
            <div className="text-3xl font-black text-slate-500 pt-12">-</div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-3xl">{match.flag_b}</div>
              <div className="text-xs font-bold text-slate-300 truncate max-w-full">{teamB}</div>
              <input
                type="number"
                min="0"
                max="20"
                value={scoreB}
                onChange={(e) => setScoreB(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                className="score-input"
                data-testid="score-b-input"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={onSubmit}
          disabled={busy}
          data-testid="submit-prediction-btn"
          className="w-full bg-saudi-green hover:bg-saudi-green-dark text-white font-black text-base py-6 btn-glow mt-4"
        >
          <Trophy className={`w-5 h-5 ${isAr ? 'ml-2' : 'mr-2'}`} />
          {busy ? t('common.loading') : t('predict.submit')}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
