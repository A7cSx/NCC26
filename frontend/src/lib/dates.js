// Bilingual date formatting helpers.
// English format: "Monday, June 15, 2026 · 10:00 PM"
// Arabic format:  "الإثنين، ١٥ يونيو ٢٠٢٦ · ١٠:٠٠ م"

const EN_LOCALE = 'en-US';
const AR_LOCALE = 'ar-SA';

export const formatFullDate = (iso, lang = 'en') => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(lang === 'ar' ? AR_LOCALE : EN_LOCALE, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
};

export const formatShortDate = (iso, lang = 'en') => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(lang === 'ar' ? AR_LOCALE : EN_LOCALE, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
};

export const formatDateOnly = (iso, lang = 'en') => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'ar' ? AR_LOCALE : EN_LOCALE, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
};

export const formatTimeOnly = (iso, lang = 'en') => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(lang === 'ar' ? AR_LOCALE : EN_LOCALE, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
};
