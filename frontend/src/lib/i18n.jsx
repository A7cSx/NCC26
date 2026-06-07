import React, { createContext, useContext, useState, useEffect } from 'react';

const dict = {
  en: {
    appName: 'NCC World Cup Cup',
    company: 'National Care Co.',
    subtitle: 'Employee Prediction Contest',
    nav: {
      home: 'Home',
      matches: 'Matches',
      myPredictions: 'My Predictions',
      leaderboard: 'Leaderboard',
      admin: 'Admin',
      register: 'Join Contest',
      logout: 'Sign out',
    },
    hero: {
      tagline: 'Predict. Compete. Win.',
      title: 'The Cup is calling.',
      titleAccent: 'Are you in?',
      desc: 'Predict every match of the World Cup against your colleagues. Earn points for correct winners and exact scores. Climb the leaderboard.',
      cta: 'Start Predicting',
      ctaSecondary: 'View Matches',
    },
    scoring: {
      title: 'Scoring',
      exact: 'Exact score',
      exactPts: '5 pts',
      winner: 'Correct winner',
      winnerPts: '3 pts',
      wrong: 'Wrong prediction',
      wrongPts: '0 pts',
    },
    matches: {
      upcoming: 'Upcoming',
      live: 'Live now',
      finished: 'Finished',
      noMatches: 'No matches available yet.',
      predict: 'Make Prediction',
      edit: 'Edit Prediction',
      locked: 'Predictions Closed',
      yourPred: 'Your prediction',
      finalScore: 'Final',
    },
    predict: {
      title: 'Your Prediction',
      questionWinner: 'Question 1 — Who will win?',
      questionScore: 'Question 2 — Final score?',
      teamA: 'Team A',
      teamB: 'Team B',
      draw: 'Draw',
      submit: 'Lock In Prediction',
      success: 'Prediction saved!',
      already: 'Your previous prediction will be updated.',
      points: 'Points earned',
    },
    auth: {
      registerTitle: 'Join the Contest',
      registerDesc: 'Enter your name and employee ID to participate.',
      employeeId: 'Employee ID',
      name: 'Full name',
      submit: 'Start playing',
      logged: 'Welcome',
    },
    leaderboard: {
      title: 'Leaderboard',
      desc: 'Updates only after each match is officially closed by admin — no cheating.',
      rank: 'Rank',
      player: 'Player',
      points: 'Points',
      exact: 'Exact',
      correct: 'Correct',
      empty: 'No finished matches yet. Stay tuned!',
      top1: 'Champion',
      top2: 'Runner-up',
      top3: 'Third place',
    },
    admin: {
      title: 'Admin Console',
      desc: 'Enter results to close matches and update the leaderboard.',
      passwordPrompt: 'Admin password',
      enter: 'Enter',
      setResult: 'Submit Result',
      saved: 'Result saved & leaderboard updated.',
      setLive: 'Set Live',
      setUpcoming: 'Reopen',
      delete: 'Delete',
    },
    common: {
      loading: 'Loading…',
      kickoff: 'Kickoff',
      group: 'Group',
    },
  },
  ar: {
    appName: 'بطولة العناية',
    company: 'شركة العناية الوطنية',
    subtitle: 'مسابقة توقعات الموظفين',
    nav: {
      home: 'الرئيسية',
      matches: 'المباريات',
      myPredictions: 'توقعاتي',
      leaderboard: 'المتصدرون',
      admin: 'لوحة الإدارة',
      register: 'انضم للمسابقة',
      logout: 'تسجيل الخروج',
    },
    hero: {
      tagline: 'توقع. تنافس. اربح.',
      title: 'الكأس ينادي.',
      titleAccent: 'هل أنت جاهز؟',
      desc: 'توقع نتائج كل مباريات كأس العالم وتنافس مع زملاء العمل. اكسب نقاطًا على معرفة الفائز والنتيجة الدقيقة وتصدّر القائمة.',
      cta: 'ابدأ التوقع',
      ctaSecondary: 'عرض المباريات',
    },
    scoring: {
      title: 'نظام النقاط',
      exact: 'نتيجة دقيقة',
      exactPts: '٥ نقاط',
      winner: 'الفائز فقط',
      winnerPts: '٣ نقاط',
      wrong: 'توقع خاطئ',
      wrongPts: '٠ نقاط',
    },
    matches: {
      upcoming: 'القادمة',
      live: 'مباشرة',
      finished: 'منتهية',
      noMatches: 'لا توجد مباريات حالياً.',
      predict: 'توقع الآن',
      edit: 'تعديل التوقع',
      locked: 'انتهى وقت التوقع',
      yourPred: 'توقعك',
      finalScore: 'النتيجة',
    },
    predict: {
      title: 'توقعك',
      questionWinner: 'السؤال الأول — من الفائز؟',
      questionScore: 'السؤال الثاني — النتيجة كم كم؟',
      teamA: 'الفريق الأول',
      teamB: 'الفريق الثاني',
      draw: 'تعادل',
      submit: 'تثبيت التوقع',
      success: 'تم حفظ توقعك!',
      already: 'سيتم تحديث توقعك السابق.',
      points: 'النقاط المكتسبة',
    },
    auth: {
      registerTitle: 'انضم للمسابقة',
      registerDesc: 'أدخل اسمك ورقمك الوظيفي للمشاركة.',
      employeeId: 'الرقم الوظيفي',
      name: 'الاسم الكامل',
      submit: 'ابدأ اللعب',
      logged: 'مرحباً',
    },
    leaderboard: {
      title: 'لوحة المتصدرين',
      desc: 'تتحدث فقط بعد إغلاق كل مباراة من قبل الإدارة - لمنع الغش.',
      rank: 'الترتيب',
      player: 'الموظف',
      points: 'النقاط',
      exact: 'دقيقة',
      correct: 'فائز',
      empty: 'لا توجد مباريات منتهية بعد. ترقبوا!',
      top1: 'البطل',
      top2: 'الوصيف',
      top3: 'المركز الثالث',
    },
    admin: {
      title: 'لوحة الإدارة',
      desc: 'أدخل نتائج المباريات لإغلاقها وتحديث لوحة المتصدرين.',
      passwordPrompt: 'كلمة سر الإدارة',
      enter: 'دخول',
      setResult: 'حفظ النتيجة',
      saved: 'تم حفظ النتيجة وتحديث المتصدرين.',
      setLive: 'بدء المباراة',
      setUpcoming: 'إعادة فتح',
      delete: 'حذف',
    },
    common: {
      loading: 'جارٍ التحميل…',
      kickoff: 'الانطلاق',
      group: 'مجموعة',
    },
  },
};

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('ncc_lang') || 'ar');

  useEffect(() => {
    localStorage.setItem('ncc_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (path) => {
    const parts = path.split('.');
    let cur = dict[lang];
    for (const p of parts) {
      cur = cur?.[p];
      if (cur === undefined) return path;
    }
    return cur;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isAr: lang === 'ar' }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
};
