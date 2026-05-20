/* ─────────────────────────────────────────────────
   Dashboard cache (localStorage)
   Key = d.ts — auto-invalidated when new scan arrives.
   Structure: { v, ts, cats: { nameKey → category }, insights: { cardId → text } }
───────────────────────────────────────────────── */

const DASH_CACHE_KEY = 'shopee_insight_cache';
let _dashCache = null;

function loadDashCache(ts) {
  try {
    const raw = localStorage.getItem(DASH_CACHE_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (c.ts === ts) return c; // Cache hit — same scan
    }
  } catch { /* corrupted, ignore */ }
  return { v: 1, ts, cats: {}, insights: {} }; // Cache miss — fresh
}

function saveDashCache() {
  if (!_dashCache) return;
  try {
    localStorage.setItem(DASH_CACHE_KEY, JSON.stringify(_dashCache));
  } catch (e) {
    console.warn('[Dashboard] Cache save failed (quota?):', e.message);
  }
}
