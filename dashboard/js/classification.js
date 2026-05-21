/* ─────────────────────────────────────────────────
   Dashboard-side classification (rule-based + AI)
   Popup only collects raw data; all categorization
   happens here — keyword first, then AI fallback.
   Depends on helpers.js, cache.js.
───────────────────────────────────────────────── */

let _categoriesData = null;
let DASH_SCORING_CATS = [];
const MIN_DASH_SCORE = 3;

async function loadCategories() {
  if (_categoriesData) return _categoriesData;
  try {
    const response = await fetch('./categories.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    _categoriesData = await response.json();
    return _categoriesData;
  } catch (error) {
    console.error('Failed to load categories:', error);
    _categoriesData = { categories: [{ id: 'other', name: '🏷️ Khác', keywords: [] }] };
    return _categoriesData;
  }
}

async function initializeCategories() {
  const data = await loadCategories();
  DASH_SCORING_CATS = data.categories.map(cat => ({
    name: cat.name,
    words: cat.keywords.sort((a, b) => b.length - a.length)
  }));
  return DASH_SCORING_CATS;
}

function _scoreByKeywords(name) {
  const n = String(name || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const paddedN = ' ' + n + ' ';
  let bestCat = '🏷️ Khác';
  let maxScore = 0;
  for (const cat of DASH_SCORING_CATS) {
    let score = 0;
    let temp = paddedN;
    for (const w of cat.words) {
      const target = ' ' + w + ' ';
      let idx = temp.indexOf(target);
      while (idx !== -1) {
        score += w.length;
        temp = temp.substring(0, idx) + ' ' + temp.substring(idx + target.length - 1);
        idx = temp.indexOf(target);
      }
    }
    if (score > maxScore) { maxScore = score; bestCat = cat.name; }
  }
  return maxScore >= MIN_DASH_SCORE ? bestCat : '🏷️ Khác';
}

// Sync version — returns '🏷️ Khác' if categories not yet loaded (safe to call anytime)
function classifyByNameSync(name) {
  if (DASH_SCORING_CATS.length === 0) return '🏷️ Khác';
  return _scoreByKeywords(name);
}

async function classifyByNameDash(name) {
  if (DASH_SCORING_CATS.length === 0) await initializeCategories();
  return _scoreByKeywords(name);
}

function buildCsFromTi(ti) {
  const map = {};
  for (const item of (ti || [])) {
    const cat = item.cat || '🏷️ Khác';
    if (!map[cat]) map[cat] = { name: cat, s: 0, c: 0 };
    map[cat].s += item.s || 0;
    map[cat].c += item.c || 0;
  }
  return Object.values(map).sort((a, b) => b.s - a.s);
}

function getDashCatCodes() {
  const codes = {};
  if (_categoriesData && _categoriesData.categories) {
    _categoriesData.categories.forEach(cat => {
      codes[cat.id] = cat.name;
    });
  }
  return codes;
}

let _dashCatSession = null;
let _dashCatDisabled = false;

async function getDashCatSession() {
  if (_dashCatDisabled) return null;
  if (_dashCatSession) return _dashCatSession;
  if (typeof LanguageModel === 'undefined') return null;
  try {
    const status = await LanguageModel.availability();
    const isAvail = ['available', 'readily', 'downloadable', 'after-download', 'downloading'].includes(status);
    if (!isAvail) return null;
    await initializeCategories();
    const categoriesDesc = _categoriesData.categories.map(cat =>
      `${cat.id}=${cat.name.replace(/[🎯💄👗💻🏠💪📚 ]/g, '')}`
    ).join(', ');
    _dashCatSession = await LanguageModel.create({
      initialPrompts: [{
        role: 'system', content:
          `Classify Vietnamese products. Categories: ${categoriesDesc}. Return one code per line.`
      }],
      temperature: 0.05
    });
    return _dashCatSession;
  } catch (e) {
    if (isAIFatalError(e)) _dashCatDisabled = true;
    return null;
  }
}

// Optimized AI classification with batching and resource management
async function classifyKharItems(ti, d) {
  if (!ti || !ti.length || !_dashCache) return;

  // Apply cached overrides first (fastest path)
  for (const item of ti) {
    if (!isInvalidCat(item.cat)) continue;
    const key = item.n.toLowerCase().substring(0, 120);
    if (_dashCache.cats[key]) item.cat = _dashCache.cats[key];
  }

  // Collect uncategorized items with smart limits for performance
  const toClassify = [];
  const seen = new Set();
  for (const item of ti) {
    if (!isInvalidCat(item.cat)) continue;
    const key = item.n.toLowerCase().substring(0, 120);
    if (!seen.has(key)) {
      seen.add(key);
      toClassify.push({ item, key });
    }
  }

  if (!toClassify.length) return;

  const BATCH_SIZE = 8; // Reduced to minimize AI memory usage
  const MAX_ITEMS = 32; // Total limit to prevent overwhelming AI

  if (toClassify.length > MAX_ITEMS) {
    // Prioritize high-spend items for classification
    toClassify.sort((a, b) => (b.item.s || 0) - (a.item.s || 0));
    toClassify.splice(MAX_ITEMS);
  }

  const session = await getDashCatSession();
  if (!session) return;

  let totalPatched = 0;

  for (let i = 0; i < toClassify.length; i += BATCH_SIZE) {
    try {
      // Yield to browser between batches for smooth UI
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 50));

      const batch = toClassify.slice(i, i + BATCH_SIZE);
      const names = batch.map(x => x.item.n).join('\n');
      const raw = await session.prompt(`Classify (one code per line):\n${names}`);
      const lines = String(raw).split('\n')
        .map(l => l.trim().toLowerCase().replace(/[^a-z_]/g, ''))
        .filter(Boolean);

      let batchPatched = 0;
      const dashCatCodes = getDashCatCodes();

      for (let j = 0; j < batch.length && j < lines.length; j++) {
        const resolved = dashCatCodes[lines[j]];
        if (!resolved) continue;
        const { key } = batch[j];
        for (const item of ti) {
          if (isInvalidCat(item.cat) && item.n.toLowerCase().substring(0, 120) === key) {
            item.cat = resolved;
            batchPatched++;
          }
        }
        _dashCache.cats[key] = resolved;
      }

      totalPatched += batchPatched;

    } catch (e) {
      console.warn(`[Dashboard] Batch ${Math.floor(i / BATCH_SIZE) + 1} classification failed:`, e);
      if (isAIFatalError(e)) {
        _dashCatDisabled = true;
        _dashCatSession = null;
        break;
      }
    }
  }

  if (totalPatched > 0) {
    // Clear cached AI insights since categorization changed
    if (_dashCache && _dashCache.insights) {
      _dashCache.insights = {};
    }
    saveDashCache();
    if (window.categorizeMiItems) {
      window.categorizeMiItems(d, ti);
    }
    d.cs = buildCsFromTi(ti);
    requestAnimationFrame(() => {
      renderTopItems(ti);
      renderCategories(d.cs, ti);
      if (window.runAIInsightsNarrative) {
        window.runAIInsightsNarrative(d);
      }
    });
    console.log(`[Dashboard] AI classified ${totalPatched} items`);
  }
}
