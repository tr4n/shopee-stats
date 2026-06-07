/* ─────────────────────────────────────────────────
   Dashboard-side classification (rule-based + AI)
   Popup only collects raw data; all categorization
   happens here — keyword first, then AI fallback.
   Depends on helpers.js, cache.js.
───────────────────────────────────────────────── */

let _categoriesData = null;
let DASH_SCORING_CATS = [];
const MIN_DASH_SCORE = 3;

let _aiToastEl = null;
let _aiToastTimeout = null;

function injectAIStatusStyles() {
  if (document.getElementById('ai-toast-styles')) return;
  const style = document.createElement('style');
  style.id = 'ai-toast-styles';
  style.textContent = `
    .ai-status-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px) saturate(180%);
      -webkit-backdrop-filter: blur(10px) saturate(180%);
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.08);
      border-radius: 12px;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 9999;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13.5px;
      color: #1e293b;
      transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      transform: translateY(20px);
      opacity: 0;
      pointer-events: none;
      font-weight: 550;
    }
    .ai-status-toast.show {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
    .ai-status-toast.success {
      border-left: 4px solid #26aa99;
      background: rgba(240, 253, 250, 0.9);
    }
    .ai-status-toast.warning {
      border-left: 4px solid #ee4d2d;
      background: rgba(254, 242, 242, 0.9);
    }
    .ai-status-toast.info {
      border-left: 4px solid #ee4d2d;
    }
    .ai-toast-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #ee4d2d;
      flex-shrink: 0;
      display: inline-block;
    }
    .ai-status-toast.success .ai-toast-dot {
      background-color: #26aa99;
    }
    .ai-status-toast.warning .ai-toast-dot {
      background-color: #ee4d2d;
    }
    .ai-toast-dot.pulse {
      animation: ai-toast-pulse 1.2s infinite ease-in-out;
    }
    @keyframes ai-toast-pulse {
      0% {
        transform: scale(0.85);
        box-shadow: 0 0 0 0 rgba(238, 77, 45, 0.4);
      }
      70% {
        transform: scale(1.1);
        box-shadow: 0 0 0 6px rgba(238, 77, 45, 0);
      }
      100% {
        transform: scale(0.85);
        box-shadow: 0 0 0 0 rgba(238, 77, 45, 0);
      }
    }
    .ai-status-toast.success .ai-toast-dot.pulse {
      animation: ai-toast-pulse-success 1.2s infinite ease-in-out;
    }
    @keyframes ai-toast-pulse-success {
      0% {
        transform: scale(0.85);
        box-shadow: 0 0 0 0 rgba(38, 170, 153, 0.4);
      }
      70% {
        transform: scale(1.1);
        box-shadow: 0 0 0 6px rgba(38, 170, 153, 0);
      }
      100% {
        transform: scale(0.85);
        box-shadow: 0 0 0 0 rgba(38, 170, 153, 0);
      }
    }
  `;
  document.head.appendChild(style);
}

function showAIChatStatus(text, type = 'info') {
  injectAIStatusStyles();
  if (!_aiToastEl) {
    _aiToastEl = document.createElement('div');
    _aiToastEl.className = 'ai-status-toast';
    document.body.appendChild(_aiToastEl);
  }
  
  if (_aiToastTimeout) {
    clearTimeout(_aiToastTimeout);
    _aiToastTimeout = null;
  }
  
  let iconHtml = '';
  if (type === 'success') {
    iconHtml = '<span class="ai-toast-dot" style="background-color: #26aa99; width: auto; height: auto; border-radius: 0; font-size: 14px;">✨</span>';
  } else if (type === 'warning') {
    iconHtml = '<span class="ai-toast-dot" style="background-color: transparent; width: auto; height: auto; border-radius: 0; font-size: 14px;">⚠️</span>';
  } else {
    iconHtml = '<span class="ai-toast-dot pulse"></span>';
  }
  
  _aiToastEl.innerHTML = `${iconHtml}<span class="ai-toast-content">${text}</span>`;
  _aiToastEl.className = `ai-status-toast ${type}`;
  
  _aiToastEl.offsetHeight;
  _aiToastEl.classList.add('show');
}

function hideAIChatStatus(delay = 0) {
  if (!_aiToastEl) return;
  if (_aiToastTimeout) clearTimeout(_aiToastTimeout);
  
  _aiToastTimeout = setTimeout(() => {
    if (_aiToastEl) _aiToastEl.classList.remove('show');
    _aiToastTimeout = setTimeout(() => {
      if (_aiToastEl && !_aiToastEl.classList.contains('show')) {
        _aiToastEl.remove();
        _aiToastEl = null;
      }
    }, 300);
  }, delay);
}

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
  DASH_SCORING_CATS = data.categories.map(cat => {
    const sortedWords = cat.keywords.sort((a, b) => b.length - a.length);
    const escapedWords = sortedWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // Use lookbehind (?<= ) and lookahead (?= ) to match space boundaries without consuming them.
    // This allows overlapping spaces to match adjacent words correctly.
    const pattern = '(?<= )(' + escapedWords.join('|') + ')(?= )';
    const regex = new RegExp(pattern, 'g'); // Already lowercased, case-insensitive is not needed if input is lowercased
    return {
      name: cat.name,
      regex: regex
    };
  });
  return DASH_SCORING_CATS;
}

function _scoreByKeywords(name) {
  const n = String(name || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const paddedN = ' ' + n + ' ';
  let bestCat = '🏷️ Khác';
  let maxScore = 0;
  for (const cat of DASH_SCORING_CATS) {
    let score = 0;
    cat.regex.lastIndex = 0;
    let match;
    while ((match = cat.regex.exec(paddedN)) !== null) {
      score += match[0].length;
      if (match.index === cat.regex.lastIndex) {
        cat.regex.lastIndex++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestCat = cat.name;
    }
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

function getCatIdByName(catName) {
  if (_categoriesData && _categoriesData.categories) {
    const cleanName = catName.trim().toLowerCase();
    const cleanNoEmoji = cleanName.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]/gu, '');
    const cat = _categoriesData.categories.find(c => {
      const cName = c.name.trim().toLowerCase();
      if (cName === cleanName) return true;
      const cNoEmoji = cName.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]/gu, '');
      return cNoEmoji === cleanNoEmoji;
    });
    if (cat) return cat.id;
  }
  return null;
}
window.getCatIdByName = getCatIdByName;

let _dashCatSession = null;
let _dashCatDisabled = false;

async function getDashCatSession() {
  if (_dashCatDisabled) return null;
  if (_dashCatSession) return _dashCatSession;
  try {
    const status = await getSystemAIAvailability();
    const isAvail = ['available', 'readily'].includes(status);
    if (!isAvail) return null;
    await initializeCategories();
    const categoriesDesc = _categoriesData.categories.map(cat =>
      `${cat.id}=${cat.name.replace(/[🎯💄👗💻🏠💪📚🍔 ]/g, '')}`
    ).join(', ');
    _dashCatSession = await createAISession({
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

let _isClassifying = false;

// Optimized AI classification with batching and resource management
async function classifyKharItems(ti, d) {
  if (_isClassifying) return;
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

  // Verify that Chrome AI is active/ready before displaying status loader or locking state
  const session = await getDashCatSession();
  if (!session) return;

  _isClassifying = true;
  showAIChatStatus('🧹 Chrome AI đang tối ưu hóa hiển thị danh mục (0%)...', 'info');

  try {
    const BATCH_SIZE = 8; // Reduced to minimize AI memory usage
    const MAX_ITEMS = 32; // Total limit to prevent overwhelming AI

    if (toClassify.length > MAX_ITEMS) {
      // Prioritize high-spend items for classification
      toClassify.sort((a, b) => (b.item.s || 0) - (a.item.s || 0));
      toClassify.splice(MAX_ITEMS);
    }

    let totalPatched = 0;

    for (let i = 0; i < toClassify.length; i += BATCH_SIZE) {
      try {
        // Yield to browser between batches to prevent main thread blocking (increased to 150ms for slower systems)
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 150));

        const progress = Math.round((i / toClassify.length) * 100);
        showAIChatStatus(`🧹 Chrome AI đang tối ưu hóa hiển thị danh mục (${progress}%)...`, 'info');

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

        if (batchPatched > 0) {
          totalPatched += batchPatched;

          // Clear cached AI insights since categorization changed
          if (_dashCache && _dashCache.insights) {
            _dashCache.insights = {};
          }
          if (window.resolveCategoryCache) {
            window.resolveCategoryCache.clear();
          }
          saveDashCache();

          // Render UI updates progressively per batch (immediate feedback)
          if (window.updateDashboardUIAfterClassification) {
            window.updateDashboardUIAfterClassification();
          } else {
            if (window.categorizeMiItems) {
              window.categorizeMiItems(d, ti);
            }
            d.cs = buildCsFromTi(ti);
            if (window.saveDataToStorage) {
              window.saveDataToStorage(d);
            }
            requestAnimationFrame(() => {
              renderTopItems(ti);
              renderCategories(d.cs, ti);
              if (window.renderOrders) {
                window.renderOrders(d.ol || []);
              }
              if (window.runAIInsightsNarrative) {
                window.runAIInsightsNarrative(d);
              }
            });
          }
        }

      } catch (e) {
        console.warn(`[Dashboard] Batch ${Math.floor(i / BATCH_SIZE) + 1} classification failed:`, e);
        if (isAIFatalError(e)) {
          showAIChatStatus('⚠️ Gặp sự cố kết nối với Chrome AI!', 'warning');
          hideAIChatStatus(4000);
          _dashCatDisabled = true;
          _dashCatSession = null;
          break;
        }
      }
    }

    if (totalPatched > 0) {
      showAIChatStatus(`✨ Đã tối ưu hóa danh mục hiển thị thành công!`, 'success');
      hideAIChatStatus(3000);
      console.log(`[Dashboard] AI classified ${totalPatched} items`);
    } else {
      hideAIChatStatus(0);
    }
  } catch (err) {
    console.error('[Dashboard] Error in classifyKharItems:', err);
    hideAIChatStatus(0);
  } finally {
    _isClassifying = false;
  }
}
