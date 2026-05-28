/* ─────────────────────────────────────────────────
   Helpers — formatting utilities, chart config,
   IntersectionObserver animation helpers
───────────────────────────────────────────────── */

function fmtVND(n) {
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

// Vietnam timezone helpers — order times always use Asia/Ho_Chi_Minh (UTC+7)
const VN_TZ = 'Asia/Ho_Chi_Minh';
const VN_WD_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function toVnParts(tsSec) {
  if (typeof VnTime !== 'undefined') return VnTime.toVnParts(tsSec);
  const ts = Number(tsSec) || 0;
  if (ts <= 0) {
    return { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0, weekday: 0 };
  }
  const d = new Date(ts * 1000);
  const parts = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: VN_TZ,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
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
    weekday: VN_WD_MAP[wdStr] ?? 0
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
    <button class="ai-analyze-btn" onclick="runAIInsight('${cardId}')">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
        <path d="M12 8v4l3 3"></path>
      </svg>
      Xem AI "phán" 🔮
    </button>
    <span class="ai-analyze-hint">Xem Chrome AI bóc phốt ví tiền của bạn</span>
  </div>`;
}

function parseBold(raw) {
  return escHtml(raw).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function renderAIInsight(text, cardId) {
  // Split by newlines first, then split each paragraph into individual sentences.
  const sentences = text
    .split(/\n+/)
    .flatMap(p => p.split(/(?<=[.!?])\s+/))
    .map(s => s.trim())
    .filter(s => s.length > 0);
  const items = sentences.map(s =>
    `<div class="insight-ai-sentence"><span class="ai-bullet">•</span><span>${parseBold(s)}</span></div>`
  ).join('');
  const refreshBtn = cardId
    ? `<button class="ai-refresh-btn" onclick="rerunAIInsight('${cardId}')" title="Xin quẻ mới" style="display: none">
        <svg class="refresh-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        <span>Xin quẻ mới</span>
       </button>`
    : '';
  return `<div class="insight-ai-header"><span class="insight-ai-badge">AI Đọc Vị</span><span class="insight-ai-title">Chrome AI phán xét...</span>${refreshBtn}</div><div class="insight-ai-body">${items}</div>`;
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
async function getSystemAIAvailability() {
  if (typeof LanguageModel !== 'undefined' && typeof LanguageModel.availability === 'function') {
    try {
      return await LanguageModel.availability();
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

async function createAISession(options) {
  if (typeof LanguageModel !== 'undefined' && typeof LanguageModel.create === 'function') {
    return await LanguageModel.create(options);
  }
  if (typeof ai !== 'undefined' && ai.languageModel && typeof ai.languageModel.create === 'function') {
    return await ai.languageModel.create(options);
  }
  throw new Error('AI LanguageModel API not supported');
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
