/* ─────────────────────────────────────────────────
   Dashboard cache (localStorage)
   Key = d.ts — auto-invalidated when new scan arrives.
   Structure: { v, ev, ts, cats: { nameKey → category }, insights: { cardId → text } }
   ev = extension version — cache is invalidated when extension updates.
───────────────────────────────────────────────── */

let _dashCache = null;

function loadDashCache(ts, extVersion) {
  try {
    // 1. Try loading from new dynamic key format
    const key = `shopee_insight_cache_${ts}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const c = JSON.parse(raw);
      // Cache hit — same scan AND same extension version
      if (c.ts === ts && (!extVersion || !c.ev || c.ev === extVersion)) return c;
    }

    // 2. Legacy fallback & migration
    const legacyRaw = localStorage.getItem('shopee_insight_cache');
    if (legacyRaw) {
      const c = JSON.parse(legacyRaw);
      if (c.ts === ts && (!extVersion || !c.ev || c.ev === extVersion)) {
        localStorage.setItem(key, legacyRaw); // Migrate to new key
        localStorage.removeItem('shopee_insight_cache'); // Clean up old key
        return c;
      }
    }
  } catch { /* corrupted, ignore */ }
  return { v: 1, ev: extVersion || '', ts, cats: {}, insights: {} }; // Cache miss — fresh
}

function saveDashCache() {
  if (!_dashCache || !_dashCache.ts) return;
  try {
    const key = `shopee_insight_cache_${_dashCache.ts}`;
    localStorage.setItem(key, JSON.stringify(_dashCache));
  } catch (e) {
    console.warn('[Dashboard] Cache save failed (quota?):', e.message);
  }
}
