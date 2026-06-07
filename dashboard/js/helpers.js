/* ─────────────────────────────────────────────────
   Helpers — formatting utilities, chart config,
   IntersectionObserver animation helpers
───────────────────────────────────────────────── */

function fmtVND(n) {
  if (window.currentDashData && window.currentDashData.hideAmount) {
    return '***';
  }
  n = Math.round(n || 0);
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' tỷ';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'tr';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'k';
  return n.toLocaleString('vi-VN');
}

function fmtNum(n) { return Math.round(n || 0).toLocaleString('vi-VN'); }

function fmtDate(ts) {
  return fmtVnDateTime(ts || Math.floor(Date.now() / 1000));
}

// Shopee buyer create_time stores standard Unix UTC timestamps — use local methods to read VN wall-clock.
function toVnParts(tsSec) {
  if (typeof VnTime !== 'undefined') return VnTime.toVnParts(tsSec);
  const ts = Number(tsSec) || 0;
  if (ts <= 0) {
    return { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0, weekday: 0 };
  }
  const d = new Date(ts * 1000);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
    weekday: d.getDay()
  };
}

function isVnBlackFriday(tsSec) {
  if (typeof VnTime !== 'undefined') return VnTime.isVnBlackFriday(tsSec);
  const p = toVnParts(tsSec);
  if (p.month !== 11 || p.day < 22 || p.day > 28) return false;
  return p.weekday === 5;
}

function getSaleTypeFromTs(tsSec) {
  if (typeof VnTime !== 'undefined') return VnTime.getSaleTypeFromTs(tsSec);
  const p = toVnParts(tsSec);
  if (!p.year) return 'regular';
  if (p.day === p.month || isVnBlackFriday(tsSec)) return 'double';
  if (p.day === 15) return 'mid';
  if (p.day >= 25) return 'end';
  return 'regular';
}

function fmtVnDate(tsSec) {
  if (typeof VnTime !== 'undefined') return VnTime.fmtVnDate(tsSec);
  const p = toVnParts(tsSec);
  if (!p.year) return '';
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`;
}

function fmtVnTime(tsSec) {
  if (typeof VnTime !== 'undefined') return VnTime.fmtVnTime(tsSec);
  const p = toVnParts(tsSec);
  if (!p.year) return '';
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

function fmtVnDateTime(tsSec) {
  if (typeof VnTime !== 'undefined') return VnTime.fmtVnDateTime(tsSec);
  const date = fmtVnDate(tsSec);
  const time = fmtVnTime(tsSec);
  return date && time ? `${date} ${time}` : '';
}

function getVnYear(tsSec) {
  return toVnParts(tsSec).year;
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function capFirst(s) {
  if (!s) return s;
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

function renderAnalyzeButton(cardId) {
  return `<div class="ai-analyze-wrap">
    <button type="button" class="ai-analyze-btn" data-ai-card="${escHtml(cardId)}">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
        <path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z"></path>
        <path d="M19 3 L19.8 5.2 L22 6 L19.8 6.8 L19 9 L18.2 6.8 L16 6 L18.2 5.2 Z"></path>
        <path d="M5 17 L5.5 18.5 L7 19 L5.5 19.5 L5 21 L4.5 19.5 L3 19 L4.5 18.5 Z"></path>
      </svg>
      🔮 BẢN NGÃ CHỐT ĐƠN
    </button>
    <span class="ai-analyze-hint">Giải mã "bản ngã" và tâm lý mua sắm ẩn giấu của bạn</span>
  </div>`;
}

function parseBold(raw) {
  return escHtml(raw).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

const _AI_ICON_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;vertical-align:middle;margin-right:4px"><path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z"></path><path d="M19 3 L19.8 5.2 L22 6 L19.8 6.8 L19 9 L18.2 6.8 L16 6 L18.2 5.2 Z"></path><path d="M5 17 L5.5 18.5 L7 19 L5.5 19.5 L5 21 L4.5 19.5 L3 19 L4.5 18.5 Z"></path></svg>`;

function renderSentencesHTML(text) {
  const sentences = text
    .split(/\n+/)
    .flatMap(p => p.split(/(?<=[.!?])\s+/))
    .map(s => {
      let cleaned = s.trim();
      // Remove leading list markdown elements like *, -, •, +
      cleaned = cleaned.replace(/^[\*\-\+•]\s*/, '');
      // Remove leading "Nhận xét:" or "AI nhận xét:" or similar prefixes
      cleaned = cleaned.replace(/^(Nhận xét|AI nhận xét|Nhận xét AI|Vũ trụ phán|Kết quả)\s*:\s*/i, '');
      return cleaned.trim();
    })
    .filter(s => s.length > 0 && /\p{L}|\d/u.test(s));
  return sentences.map(s =>
    `<div class="insight-ai-sentence"><span class="ai-bullet">•</span><span>${parseBold(s)}</span></div>`
  ).join('');
}

// renderAIInsight(text, cardId, profile) — full card for overview/AI sections
// text: AI narrative string | null
// profile: PersonalityProfile | null
function renderAIInsight(text, cardId, profile) {
  if (cardId === 'tarot-card') {
    // 1. Populate the details panel
    const detailsPanel = document.getElementById('tarot-details-panel');
    if (detailsPanel) {
      if (profile) {
        // Show result content, hide empty state
        const emptyEl = detailsPanel.querySelector('.tarot-details-empty');
        const contentEl = detailsPanel.querySelector('.tarot-details-content');
        if (emptyEl) emptyEl.style.display = 'none';
        if (contentEl) {
          contentEl.style.display = 'block';
          
          // Set Archetype tag
          const tagEl = document.getElementById('tarot-res-archetype-tag');
          if (tagEl) {
            tagEl.innerHTML = `<span style="font-size:22px;margin-right:8px">${escHtml(profile.archetype.icon)}</span><span>${escHtml(profile.archetype.label)}</span>`;
          }
          
          // Set Traits list
          const traitsEl = document.getElementById('tarot-res-traits-list');
          if (traitsEl && profile.traits) {
            traitsEl.innerHTML = profile.traits.map(t => `
              <div class="tarot-trait-row">
                <span class="trait-icon">${escHtml(t.icon)}</span>
                <div class="trait-content-wrap">
                  <span class="trait-text">${escHtml(t.description || t.label)}</span>
                  <span class="trait-evidence">· ${escHtml(t.evidence)}</span>
                </div>
              </div>
            `).join('');
          }
          
          // Set Narrative (Vũ trụ phán)
          const narrativeEl = document.getElementById('tarot-res-narrative-text');
          if (narrativeEl) {
            if (text) {
              narrativeEl.innerHTML = renderSentencesHTML(text);
            } else {
              narrativeEl.innerHTML = '<span class="ai-narrative-loading">Đang lắng nghe thông điệp từ vũ trụ...</span>';
            }
          }
        }
      }
    }
    
    // 2. Return card front content
    if (!profile || !profile.archetype) return '';
    const a = profile.archetype;
    
    // Define sub-labels in English for a premium tarot feeling
    const subLabels = {
      reformed: 'THE REFORMED',
      night_owl: 'THE NIGHT OWL',
      fashion_healer: 'THE EMOTIONAL HEALER',
      bargain_hunter: 'THE BARGAIN HUNTER',
      emotional: 'THE IMPULSIVE SOUL',
      premium_curator: 'THE PREMIUM CURATOR',
      rising_addict: 'THE SHOPPING ENTHUSIAST',
      morning_planner: 'THE disciplined PLANNER',
      seasonal: 'THE SEASONAL EXPLORER',
      beauty_selfcare: 'THE SELF-CARE LOVER',
      tech_optimizer: 'THE TECH OPTIMIZER',
      home_nester: 'THE NEST BUILDER',
      food_lover: 'THE CONNOISSEUR',
      family_center: 'THE PROVIDER',
      free_spirit: 'THE FREE SPIRIT'
    };
    const sub = subLabels[a.key] || 'THE SEEKER';

    const cleanText = text
      ? text.replace(/<\/?[^>]+(>|$)/g, '').replace(/\*\*/g, '').trim()
      : 'Đang lắng nghe thông điệp từ vũ trụ...';

    return `
      <div class="holo-sweep"></div>
      <div class="tarot-card-header">✦ SHOPEE COSMIC TAROT ✦</div>
      <div class="tarot-card-main">
        <div class="tarot-frame-outer">
          <div class="tarot-frame-glow"></div>
          <span class="tarot-card-emoji">${escHtml(a.icon)}</span>
        </div>
        <h3 class="tarot-card-title">${escHtml(a.label.toUpperCase())}</h3>
        <span class="tarot-card-subtitle">${sub}</span>
        <div class="tarot-card-ornaments">✦ &nbsp;✵&nbsp; ✦</div>
        <div class="tarot-card-narrative">"${escHtml(cleanText)}"</div>
      </div>
      <div class="tarot-card-footer">✦ &nbsp;${new Date().getFullYear()}&nbsp; ✦</div>
    `;
  }

  const copyBtn = (cardId && text)
    ? `<button type="button" class="ai-copy-btn" onclick="copyAIInsight('${escHtml(cardId)}')" title="Sao chép nhận xét">
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
       </button>`
    : '';

  const refreshBtn = cardId
    ? `<button type="button" class="ai-refresh-btn" data-ai-card="${escHtml(cardId)}" data-ai-action="rerun" title="Phân tích lại" style="display:none">
        <svg class="refresh-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
       </button>`
    : '';

  // Legacy layout: no profile, just text
  if (!profile) {
    return `<div class="insight-ai-header"><span class="insight-ai-badge">${_AI_ICON_SVG}AI Insight</span><span class="insight-ai-title">Giải mã Bản Ngã Chốt Đơn</span>${copyBtn}${refreshBtn}</div><div class="insight-ai-body">${renderSentencesHTML(text || '')}</div>`;
  }

  const a = profile.archetype;
  const archetypeHtml = a
    ? `<div class="ai-archetype"><span class="ai-archetype-icon">${escHtml(a.icon)}</span><span class="ai-archetype-label">${escHtml(a.label)}</span></div>`
    : '';

  const traitsHtml = (profile.traits && profile.traits.length > 0)
    ? `<div class="ai-traits-label">Đặc điểm nhận ra</div><div class="ai-traits">${profile.traits.map(t =>
      `<div class="ai-trait-item"><span class="ai-trait-icon">${escHtml(t.icon)}</span><span class="ai-trait-label">${escHtml(t.description || (t.label + ' · ' + t.evidence))}</span></div>`
    ).join('')
    }</div>`
    : '';

  const narrativeHtml = (text && text.trim())
    ? `<div class="ai-narrative"><div class="ai-narrative-label">Vũ trụ phán</div><div class="ai-narrative-body">${renderSentencesHTML(text)}</div></div>`
    : '';

  const orderNote = profile.totalOrders > 0
    ? `<div class="ai-order-note">Dựa trên ${profile.totalOrders.toLocaleString('vi-VN')} đơn hàng</div>`
    : '';

  const header = `<div class="insight-ai-header insight-ai-header--full"><span class="insight-ai-badge">${_AI_ICON_SVG}Bản Ngã Chốt Đơn</span>${orderNote}${copyBtn}${refreshBtn}</div>`;

  return `${header}${archetypeHtml}${traitsHtml}${narrativeHtml}`;
}

// renderCompactProfile(profile) — compact card for non-AI sections (monthly, categories, sales, items)
function renderCompactProfile(profile) {
  if (!profile || !profile.archetype) return '';
  const a = profile.archetype;

  const archetypeHtml = `<div class="ai-archetype ai-archetype--compact"><span class="ai-archetype-icon">${escHtml(a.icon)}</span><span class="ai-archetype-label">${escHtml(a.label)}</span></div>`;

  const traitsHtml = (profile.traits && profile.traits.length > 0)
    ? `<div class="ai-traits ai-traits--compact">${profile.traits.slice(0, 2).map(t =>
      `<div class="ai-trait-item"><span class="ai-trait-icon">${escHtml(t.icon)}</span><span class="ai-trait-label">${escHtml(t.label)}</span><span class="ai-trait-evidence">· ${escHtml(t.evidence)}</span></div>`
    ).join('')
    }</div>`
    : '';

  return `<div class="insight-ai-header insight-ai-header--compact"><span class="insight-ai-badge insight-ai-badge--rule">${_AI_ICON_SVG}Bản ngã chốt đơn</span></div>${archetypeHtml}${traitsHtml}`;
}

// Shell rendered immediately when streaming starts (legacy no-profile path)
function renderAIInsightShell(cardId) {
  const refreshBtn = cardId
    ? `<button type="button" class="ai-refresh-btn" data-ai-card="${escHtml(cardId)}" data-ai-action="rerun" title="Phân tích lại" style="display:none">
        <svg class="refresh-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
       </button>`
    : '';
  return `<div class="insight-ai-header"><span class="insight-ai-badge">${_AI_ICON_SVG}AI Insight</span><span class="insight-ai-title">Đang phân tích...</span>${refreshBtn}</div><div class="insight-ai-body insight-ai-body--streaming"></div>`;
}

// Legacy category name map for backward compatibility with old dashboard URLs (format: { id, s, c })
const LEGACY_CAT_NAMES = {
  '11000001': '📱 Điện Thoại & Phụ Kiện',
  '11000027': '💻 Máy Tính & Laptop',
  '11000003': '🔌 Thiết Bị Điện Tử',
  '11000028': '👔 Thời Trang Nam',
  '11000004': '👗 Thời Trang Nữ',
  '11000006': '🏠 Nhà Cửa & Đời Sống',
  '11000007': '💊 Sức Khỏe & Làm Đẹp',
  '11000010': '🏠 Nhà cửa & Đời sống',
  '11000011': '📚 Sách & Văn Phòng',
  '11000008': '⚽ Thể Thao & Du Lịch',
  '11000005': '🧸 Đồ Trẻ Em & Đồ Chơi',
  '11000009': '🚗 Ô Tô & Xe Máy',
  '11000013': '⌚ Đồng Hồ',
  '11000012': '📷 Máy Ảnh'
};

function resolveCatLabel(c) {
  const nameOrId = c.name || c.id;
  if (!nameOrId) return 'Khác';

  if (typeof getDashCatCodes === 'function') {
    const codes = getDashCatCodes();
    if (codes[nameOrId]) return codes[nameOrId];
  }

  if (LEGACY_CAT_NAMES[nameOrId]) {
    return LEGACY_CAT_NAMES[nameOrId];
  }

  if (!isNaN(Number(nameOrId))) {
    return 'Danh mục #' + nameOrId;
  }

  return nameOrId;
}

function isInvalidCat(cat) {
  if (!cat || cat === '🏷️ Khác' || cat === 'Khác') return true;
  if (!isNaN(Number(cat))) {
    if (LEGACY_CAT_NAMES[cat]) return false;
    return true;
  }
  return false;
}

const CHART_CFG = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#ffffff',
      borderColor: 'rgba(0,0,0,0.1)',
      borderWidth: 1,
      titleColor: '#1e293b',
      bodyColor: 'rgba(30,41,59,0.8)',
      padding: 12,
      callbacks: { label: ctx => '  ' + fmtVND(ctx.parsed.y || ctx.parsed) }
    }
  },
  scales: {
    x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: 'rgba(30,41,59,0.5)', font: { size: 12 } } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: 'rgba(30,41,59,0.5)', font: { size: 11 }, callback: v => fmtVND(v) } }
  }
};

function animateCounter(el, target, duration) {
  const match = String(target).match(/^([\d,\.]+)(.*)$/);
  if (!match) { el.textContent = target; return; }
  const num = parseFloat(match[1].replace(/,/g, ''));
  const suffix = match[2];
  const start = performance.now();
  const step = now => {
    const p = Math.min((now - start) / duration, 1);
    const v = num * (1 - Math.pow(1 - p, 3));
    el.textContent = Math.round(v).toLocaleString('vi-VN') + suffix;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.1 });

function reveal(el) { if (el) io.observe(el); }

/* ── Unified AI API Utilities ────────────────── */
// Chrome Prompt API only supports en/es/ja language codes — use "en" for API
// attestation; system prompts still instruct Vietnamese output.
const AI_LANGUAGE_MODEL_OPTIONS = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }]
};

function mergeAISessionOptions(options = {}) {
  return {
    ...AI_LANGUAGE_MODEL_OPTIONS,
    ...options,
    expectedInputs: options.expectedInputs || AI_LANGUAGE_MODEL_OPTIONS.expectedInputs,
    expectedOutputs: options.expectedOutputs || AI_LANGUAGE_MODEL_OPTIONS.expectedOutputs
  };
}

async function getSystemAIAvailability(options = AI_LANGUAGE_MODEL_OPTIONS) {
  const availOptions = mergeAISessionOptions(options);
  if (typeof LanguageModel !== 'undefined' && typeof LanguageModel.availability === 'function') {
    try {
      return await LanguageModel.availability(availOptions);
    } catch (e) {
      console.warn('[AI Helpers] LanguageModel.availability() failed:', e);
    }
  }
  if (typeof ai !== 'undefined' && ai.languageModel && typeof ai.languageModel.capabilities === 'function') {
    try {
      const caps = await ai.languageModel.capabilities();
      return caps?.available || 'no';
    } catch (e) {
      console.warn('[AI Helpers] ai.languageModel.capabilities() failed:', e);
    }
  }
  return 'no';
}

async function createAISession(options = {}) {
  const sessionOptions = mergeAISessionOptions(options);
  if (typeof LanguageModel !== 'undefined' && typeof LanguageModel.create === 'function') {
    return await LanguageModel.create(sessionOptions);
  }
  if (typeof ai !== 'undefined' && ai.languageModel && typeof ai.languageModel.create === 'function') {
    return await ai.languageModel.create(sessionOptions);
  }
  throw new Error('AI LanguageModel API not supported');
}

async function destroyAISession(session) {
  if (!session) return;
  try {
    if (typeof session.destroy === 'function') {
      await session.destroy();
    } else if (typeof session.close === 'function') {
      await session.close();
    }
  } catch (e) {
    console.warn('[AI Helpers] Failed to destroy AI session:', e);
  }
}

/* ── Normalization Utilities for Bypassed Item Names ── */
const HOMOGLYPH_MAP = {
  // Cyrillic
  'а': 'a', 'А': 'A',
  'в': 'v', 'В': 'B',
  'е': 'e', 'Е': 'E',
  'ѕ': 's', 'Ѕ': 'S',
  'і': 'i', 'І': 'I',
  'ј': 'j', 'Ј': 'J',
  'к': 'k', 'К': 'K',
  'м': 'm', 'М': 'M',
  'н': 'h', 'Н': 'H',
  'о': 'o', 'О': 'O',
  'р': 'p', 'Р': 'P',
  'с': 'c', 'С': 'C',
  'т': 't', 'Т': 'T',
  'у': 'y', 'У': 'Y',
  'х': 'x', 'Х': 'X',
  'ԁ': 'd',
  'ш': 'w',
  'ђ': 'đ', 'Ђ': 'Đ',

  // Greek
  'α': 'a', 'Α': 'A',
  'β': 'b', 'Β': 'B',
  'γ': 'y',
  'ε': 'e', 'Ε': 'E',
  'ζ': 'z', 'Ζ': 'Z',
  'η': 'h', 'Η': 'H',
  'ι': 'i', 'Ι': 'I',
  'κ': 'k', 'Κ': 'K',
  'μ': 'm', 'Μ': 'M',
  'ν': 'v', 'Ν': 'N',
  'ο': 'o', 'О': 'O',
  'ρ': 'p', 'Ρ': 'P',
  'σ': 's', 'ς': 's',
  'τ': 't', 'Τ': 'T',
  'υ': 'y', 'Υ': 'Y',
  'χ': 'x', 'Χ': 'X',
  'ω': 'w', 'Ω': 'O',

  // Cherokee
  'Ꭰ': 'A', 'Ꭱ': 'R', 'Ꭲ': 'I', 'Ꮇ': 'M', 'Ꮎ': 'H', 'Ꮜ': 'U',
  'Ꮣ': 'D', 'Ꮤ': 'T', 'Ꮩ': 'V', 'Ꮹ': 'W', 'Ꮿ': 'Y', 'Ᏼ': 'B',
  'Ꮋ': 'H', 'Ꭻ': 'J', 'Ꮶ': 'K', 'Ꮡ': 'S', 'Ꮞ': '4', 'Ꮠ': 'O',
  'Ꮸ': 'V', 'Ꮺ': 'W'
};

// Pre-compile regex for fast detection of homoglyphs, zero-width spaces, math script, fullwidth characters, etc.
const SPECIAL_CHAR_REGEX = /[\u0370-\u03FF\u0400-\u04FF\u13A0-\u13FF\u200B-\u200D\uFEFF\u200E\u200F\u2060\u2100-\u214F\uFF00-\uFFEF]|\ud835[\udc00-\udfff]/;

function cleanHomoglyphsAndFonts(text) {
  if (!text) return '';

  // Fast path: if the text doesn't contain any target bypass characters, skip normalization & translation entirely.
  // This is a major optimization for Vietnamese text because normalize("NFKD") decomposes accents,
  // which takes significant CPU time when done on thousands of items.
  if (!SPECIAL_CHAR_REGEX.test(text)) {
    return text;
  }

  const decomp = text.normalize("NFKD");

  let result = '';
  for (const char of decomp) {
    result += HOMOGLYPH_MAP[char] || char;
  }

  result = result.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u2060]/g, '');

  return result.normalize("NFC");
}

function formatItemNameForDisplay(name) {
  let s = String(name || '');
  s = cleanHomoglyphsAndFonts(s);
  s = s.replace(/\[.*?\]|\(.*?\)|\{.*?\}/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

window.copyListProductNames = function(listId, btn) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;
  const nameEls = listEl.querySelectorAll('.top-name');
  if (nameEls.length === 0) return;
  
  const names = Array.from(nameEls).map(el => el.getAttribute('title') || el.textContent).filter(Boolean);
  const textToCopy = names.join('\n');
  
  navigator.clipboard.writeText(textToCopy).then(() => {
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('copied');
    }, 1800);
  }).catch(err => {
    console.error('Failed to copy list: ', err);
  });
};

