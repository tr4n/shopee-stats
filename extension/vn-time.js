/* Vietnam timezone (UTC+7) helpers for Shopee order unix timestamps (seconds). */
(function (root) {
  const VN_TZ = 'Asia/Ho_Chi_Minh';
  const WD_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function toVnParts(tsSec) {
    const ts = Number(tsSec) || 0;
    if (ts <= 0) {
      return { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0, weekday: 0 };
    }
    const d = new Date(ts * 1000);
    const parts = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: VN_TZ,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    }).formatToParts(d).forEach(p => {
      if (p.type !== 'literal') parts[p.type] = parseInt(p.value, 10);
    });
    if (parts.hour === 24) parts.hour = 0;
    const wdStr = new Intl.DateTimeFormat('en-US', { timeZone: VN_TZ, weekday: 'short' }).format(d);
    return {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second,
      weekday: WD_MAP[wdStr] ?? 0
    };
  }

  function isVnBlackFriday(tsSec) {
    const p = toVnParts(tsSec);
    if (p.month !== 11 || p.day < 22 || p.day > 28) return false;
    return p.weekday === 5;
  }

  function getSaleTypeFromTs(tsSec) {
    const p = toVnParts(tsSec);
    if (!p.year) return 'regular';
    if (p.day === p.month || isVnBlackFriday(tsSec)) return 'double';
    if (p.day === 15) return 'mid';
    if (p.day >= 25) return 'end';
    return 'regular';
  }

  function fmtVnDate(tsSec) {
    const p = toVnParts(tsSec);
    if (!p.year) return '';
    return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`;
  }

  function fmtVnTime(tsSec) {
    const p = toVnParts(tsSec);
    if (!p.year) return '';
    return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
  }

  function fmtVnDateTime(tsSec) {
    const date = fmtVnDate(tsSec);
    const time = fmtVnTime(tsSec);
    return date && time ? `${date} ${time}` : '';
  }

  function getVnYear(tsSec) {
    return toVnParts(tsSec).year;
  }

  function getVnMonth(tsSec) {
    return toVnParts(tsSec).month;
  }

  function getVnHour(tsSec) {
    return toVnParts(tsSec).hour;
  }

  root.VnTime = {
    VN_TZ,
    toVnParts,
    isVnBlackFriday,
    getSaleTypeFromTs,
    fmtVnDate,
    fmtVnTime,
    fmtVnDateTime,
    getVnYear,
    getVnMonth,
    getVnHour
  };
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : self);
