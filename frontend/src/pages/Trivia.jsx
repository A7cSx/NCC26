import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { triviaStart, triviaAnswer, triviaLeaderboard, triviaMyStats } from '../lib/api';
import { Button } from '../components/ui/button';
import { Brain, Timer, CheckCircle2, XCircle, Trophy, Zap, Sparkles, ArrowRight, Star, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const TOTAL_TIME = 40; // seconds per question

export default function Trivia() {
  const { t, isAr } = useI18n();
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('intro'); // intro | playing | finished
  const [session, setSession] = useState(null);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [myStats, setMyStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const startedAtRef = useRef(null);

  // Redirect non-authed users to login
  useEffect(() => {
    if (ready && !user) navigate('/login');
  }, [ready, user, navigate]);

  // Initial load: my stats + leaderboard
  useEffect(() => {
    if (!user) return;
    triviaMyStats().then(setMyStats).catch(() => {});
    triviaLeaderboard().then(d => setLeaderboard(d.entries || [])).catch(() => {});
  }, [user]);

  const currentQ = useMemo(
    () => session?.questions?.[qIdx],
    [session, qIdx]
  );

  const onStart = async () => {
    setBusy(true);
    try {
      const data = await triviaStart();
      setSession(data);
      setQIdx(0);
      setScore(0);
      setCorrectCount(0);
      setRevealed(null);
      setSelected(null);
      setPhase('playing');
    } catch (err) {
      const code = err?.response?.data?.detail;
      if (code === 'NO_QUESTIONS_AVAILABLE') {
        toast.error(t('trivia.noQuestions'));
      } else {
        toast.error(isAr ? 'حدث خطأ' : 'Error starting');
      }
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async (chosenIdx, forcedMs = null) => {
    if (revealed || !currentQ) return;
    setBusy(true);
    const ms = forcedMs != null ? forcedMs : (Date.now() - (startedAtRef.current || Date.now()));
    try {
      const res = await triviaAnswer({
        session_id: session.session_id,
        question_id: currentQ.id,
        chosen_index: chosenIdx,
        time_taken_ms: Math.max(0, ms),
      });
      setRevealed(res);
      setScore(res.session_score);
      setCorrectCount(res.session_correct);
    } catch (err) {
      toast.error(isAr ? 'تعذّر الإرسال' : 'Failed to submit');
    } finally {
      setBusy(false);
    }
  };

  const onTimeUp = () => submitAnswer(-1, TOTAL_TIME * 1000);
  const onQuestionStart = () => { startedAtRef.current = Date.now(); };

  const onNext = () => {
    const total = session?.questions?.length || 0;
    if (qIdx + 1 >= total) {
      setPhase('finished');
      triviaMyStats().then(setMyStats).catch(() => {});
      triviaLeaderboard().then(d => setLeaderboard(d.entries || [])).catch(() => {});
    } else {
      setQIdx(qIdx + 1);
      setSelected(null);
      setRevealed(null);
    }
  };

  if (!user) return null;

  return (
    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Glow accents */}
      <div className="absolute -top-20 -right-32 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-saudi-green/15 rounded-full blur-3xl pointer-events-none" />

      {phase === 'intro' && (
        <IntroScreen
          t={t} isAr={isAr}
          onStart={onStart} busy={busy}
          myStats={myStats} leaderboard={leaderboard}
        />
      )}

      {phase === 'playing' && currentQ && (
        <PlayScreen
          key={qIdx}
          t={t} isAr={isAr}
          q={currentQ}
          qIdx={qIdx}
          total={session.questions.length}
          selected={selected}
          setSelected={setSelected}
          revealed={revealed}
          score={score}
          correctCount={correctCount}
          busy={busy}
          onSubmit={(idx) => submitAnswer(idx)}
          onNext={onNext}
          onStart={onQuestionStart}
          onTimeUp={onTimeUp}
        />
      )}

      {phase === 'finished' && (
        <FinishedScreen
          t={t} isAr={isAr}
          score={score}
          correctCount={correctCount}
          total={session.questions.length}
          onPlayAgain={onStart}
          busy={busy}
          leaderboard={leaderboard}
          user={user}
        />
      )}
    </div>
  );
}

/* ---------------- INTRO ---------------- */
const IntroScreen = ({ t, isAr, onStart, busy, myStats, leaderboard }) => (
  <div className="relative space-y-8" data-testid="trivia-intro">
    <div className="text-center pt-6">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/15 border border-purple-400/40 text-purple-200 text-xs font-bold tracking-widest mb-5">
        <Brain className="w-3.5 h-3.5" />
        {t('trivia.heroTagline')}
      </div>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter mb-4">
        {t('trivia.pageTitle')}
      </h1>
      <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">
        {t('trivia.pageDesc')}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={onStart} disabled={busy} data-testid="trivia-start-btn"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black text-base px-8 py-6 rounded-full shadow-lg shadow-purple-500/30"
        >
          <Sparkles className={`w-5 h-5 ${isAr ? 'ml-2' : 'mr-2'}`} />
          {busy ? t('trivia.starting') : t('trivia.start')}
        </Button>
      </div>
    </div>

    {/* Stats row */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
      <StatBadge icon={<Trophy className="w-5 h-5" />} label={t('trivia.bestScore')} value={myStats?.best_score ?? 0} color="gold" />
      <StatBadge icon={<BarChart3 className="w-5 h-5" />} label={t('trivia.sessionsPlayed')} value={myStats?.sessions_count ?? 0} color="ncc-teal" />
      <StatBadge icon={<Zap className="w-5 h-5" />} label={t('trivia.totalPoints')} value={myStats?.total_points ?? 0} color="purple-400" />
    </div>

    {/* Leaderboard preview */}
    {leaderboard.length > 0 && (
      <div className="glass rounded-2xl p-6 border border-white/10 max-w-3xl mx-auto" data-testid="trivia-leaderboard-preview">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold font-bold mb-4">
          <Trophy className="w-4 h-4" />
          {t('trivia.leaderboardTitle')}
        </div>
        <ol className="space-y-2">
          {leaderboard.slice(0, 5).map((row, i) => (
            <li key={row.employee_id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-8 h-8 rounded-full grid place-items-center text-xs font-black ${i === 0 ? 'bg-gold text-bg-base' : i === 1 ? 'bg-slate-300 text-bg-base' : i === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-white'}`}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-bold truncate">{row.full_name}</div>
                  <div className="text-xs text-slate-400">@{row.username}</div>
                </div>
              </div>
              <div className="text-2xl font-black text-purple-300">{row.total_points}</div>
            </li>
          ))}
        </ol>
      </div>
    )}
  </div>
);

const StatBadge = ({ icon, label, value, color }) => (
  <div className={`glass rounded-xl p-4 border border-${color}/30 flex items-center gap-3`}>
    <div className={`w-10 h-10 rounded-full bg-${color}/10 grid place-items-center text-${color}`}>
      {icon}
    </div>
    <div>
      <div className="text-2xl font-black tracking-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{label}</div>
    </div>
  </div>
);

/* ---------------- PLAY ---------------- */
const PlayScreen = ({ t, isAr, q, qIdx, total, timeLeft, selected, setSelected, revealed, score, correctCount, busy, onSubmit, onNext }) => {
  const choices = isAr ? q.choices_ar : q.choices;
  const qText = isAr ? q.question_ar : q.question;
  const explanation = isAr ? (q.explanation_ar || revealed?.explanation_ar) : (q.explanation || revealed?.explanation);
  const lowTime = timeLeft <= 10;
  const isImage = q.type?.startsWith('image_') && q.image_url;
  const showFacePixelated = q.type === 'image_face' && !revealed;

  return (
    <div className="space-y-6" data-testid="trivia-play">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">
          {t('trivia.question')} {qIdx + 1} / {total}
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-black tracking-tight ${lowTime ? 'bg-red-500/20 border border-red-500/40 text-red-300 animate-pulse' : 'bg-white/5 border border-white/10 text-emerald-300'}`} data-testid="trivia-timer">
            <Timer className="w-4 h-4" />
            {timeLeft}{t('trivia.seconds')}
          </div>
          <div className="px-4 py-2 rounded-full bg-purple-500/15 border border-purple-400/30 font-black text-purple-200" data-testid="trivia-score">
            {score} pts
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-[width] duration-1000 ease-linear ${lowTime ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}
          style={{ width: `${(timeLeft / TOTAL_TIME) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
        {isImage && (
          <div className="mb-5 flex justify-center">
            <div className="relative inline-block rounded-xl overflow-hidden border border-white/10">
              <img
                src={q.image_url}
                alt="trivia"
                className={`max-h-64 object-contain transition-all duration-700 ${showFacePixelated ? 'blur-md scale-105 saturate-50' : 'blur-0'}`}
                style={{ filter: showFacePixelated ? 'blur(10px) contrast(0.9)' : 'none' }}
              />
              {showFacePixelated && (
                <div className="absolute bottom-2 right-2 text-[10px] uppercase tracking-widest text-white/90 bg-black/60 px-2 py-1 rounded">
                  {isAr ? 'الوجه مغطى' : 'Face hidden'}
                </div>
              )}
            </div>
          </div>
        )}

        <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight" data-testid="trivia-question-text">
          {qText}
        </h2>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {choices.map((c, i) => {
            const isPicked = selected === i;
            const isCorrect = revealed && i === revealed.correct_index;
            const isWrongPick = revealed && isPicked && !revealed.correct;
            const base = 'text-left px-5 py-4 rounded-xl border font-bold transition-all';
            const cls = revealed
              ? isCorrect
                ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
                : isWrongPick
                ? 'border-red-400 bg-red-400/10 text-red-200'
                : 'border-white/10 bg-white/[0.02] text-slate-400'
              : isPicked
              ? 'border-purple-400 bg-purple-500/15 text-white'
              : 'border-white/10 bg-white/[0.02] hover:border-purple-400/50 hover:bg-white/5 text-white';
            return (
              <button
                key={i}
                disabled={!!revealed}
                onClick={() => setSelected(i)}
                data-testid={`trivia-choice-${i}`}
                className={`${base} ${cls}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-black ${revealed && isCorrect ? 'bg-emerald-400 text-bg-base' : isPicked ? 'bg-purple-400 text-bg-base' : 'bg-white/10'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{c}</span>
                  {revealed && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {revealed && isWrongPick && <XCircle className="w-5 h-5 text-red-400" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Reveal banner */}
        {revealed && (
          <div className={`mt-5 rounded-xl p-4 border ${revealed.correct ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-red-400/40 bg-red-500/10 text-red-200'}`} data-testid="trivia-reveal">
            <div className="font-black flex items-center gap-2">
              {revealed.correct ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {revealed.correct ? t('trivia.correct') : (selected == null || selected < 0 ? t('trivia.timeUp') : t('trivia.wrong'))}
              <span className="ms-auto text-white">+{revealed.points_earned} pts</span>
            </div>
            {explanation && (
              <div className="mt-2 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mr-2">{t('trivia.explanation')}:</span>
                {explanation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs text-slate-500">
          {correctCount} / {qIdx + (revealed ? 1 : 0)} {t('trivia.correctAnswers')}
        </div>
        <div className="flex items-center gap-2">
          {!revealed ? (
            <Button
              onClick={() => onSubmit(selected != null ? selected : -1)}
              disabled={busy || selected == null}
              data-testid="trivia-submit-btn"
              className="bg-purple-500 hover:bg-purple-400 text-white font-black px-6 py-5 rounded-full"
            >
              {t('trivia.submit')}
              <ArrowRight className={`w-4 h-4 ${isAr ? 'mr-2 rotate-180' : 'ml-2'}`} />
            </Button>
          ) : (
            <Button
              onClick={onNext}
              data-testid="trivia-next-btn"
              className="bg-saudi-green hover:bg-saudi-green-dark text-white font-black px-6 py-5 rounded-full"
            >
              {t('trivia.next')}
              <ArrowRight className={`w-4 h-4 ${isAr ? 'mr-2 rotate-180' : 'ml-2'}`} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------- FINISHED ---------------- */
const FinishedScreen = ({ t, isAr, score, correctCount, total, onPlayAgain, busy, leaderboard, user }) => {
  const myRank = leaderboard.findIndex(r => r.employee_id === user?.employee_id) + 1;
  return (
    <div className="space-y-8 text-center" data-testid="trivia-finished">
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-purple-500/30 blur-3xl rounded-full" />
        <div className="relative w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 grid place-items-center shadow-xl shadow-purple-500/40">
          <Trophy className="w-14 h-14 text-white" />
        </div>
      </div>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">{t('trivia.finished')}</h1>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <div className="glass rounded-2xl p-6 border border-purple-400/30">
          <div className="text-xs uppercase tracking-widest text-purple-300 font-bold mb-2">{t('trivia.yourScore')}</div>
          <div className="text-5xl font-black text-white" data-testid="trivia-final-score">{score}</div>
        </div>
        <div className="glass rounded-2xl p-6 border border-emerald-400/30">
          <div className="text-xs uppercase tracking-widest text-emerald-300 font-bold mb-2">{t('trivia.correctAnswers')}</div>
          <div className="text-5xl font-black text-white">{correctCount}<span className="text-2xl text-slate-500">/{total}</span></div>
        </div>
      </div>

      {myRank > 0 && (
        <div className="text-sm text-slate-300">
          {isAr ? 'ترتيبك على لوحة المتصدّرين:' : 'Your trivia rank:'}{' '}
          <span className="font-black text-gold text-xl">#{myRank}</span>
        </div>
      )}

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Button onClick={onPlayAgain} disabled={busy} data-testid="trivia-play-again-btn"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black px-8 py-6 rounded-full">
          <Sparkles className={`w-5 h-5 ${isAr ? 'ml-2' : 'mr-2'}`} />
          {t('trivia.playAgain')}
        </Button>
        <Link to="/">
          <Button variant="outline" className="border-white/20 text-slate-200 hover:bg-white/5 font-bold px-6 py-6 rounded-full">
            {t('trivia.backHome')}
          </Button>
        </Link>
      </div>
    </div>
  );
};
