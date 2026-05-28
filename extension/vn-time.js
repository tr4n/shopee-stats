/* Shopee buyer API time helpers for order unix timestamps (seconds).
 *
 * Shopee v4 buyer `create_time` encodes Vietnam wall-clock in UTC date fields
 * (e.g. order at 00:30 VN is stored as ...T00:30:00Z, not true UTC).
 * Use getUTC* to read hour/day — do NOT apply Asia/Ho_Chi_Minh (+7) again. */
(function (root) {
  function toVnParts(tsSec) {
    const ts = Number(tsSec) || 0;
    if (ts <= 0) {
      return { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0, weekday: 0 };
    }
    const d = new Date(ts * 1000);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
      weekday: d.getUTCDay()
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
