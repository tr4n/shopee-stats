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
  const d = new Date((ts || Date.now() / 1000) * 1000);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
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
      Phân tích
    </button>
    <span class="ai-analyze-hint">Nhấn để phân tích bằng Chrome AI</span>
  </div>`;
}

function parseBold(raw) {
  return escHtml(raw).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function renderAIInsight(text, cardId) {
  const paragraphs = text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  const bullets = ['💡', '⚡', '🎯', '💰', '📌'];
  const items = paragraphs.map((p, i) =>
    `<div class="insight-ai-sentence"><span class="ai-bullet">${bullets[i % bullets.length]}</span><span>${parseBold(p)}</span></div>`
  ).join('');
  const refreshBtn = cardId
    ? `<button class="ai-refresh-btn" onclick="rerunAIInsight('${cardId}')" title="Phân tích lại" style="display: none">
        <svg class="refresh-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        <span>Phân tích lại</span>
       </button>`
    : '';
  return `<div class="insight-ai-header"><span class="insight-ai-badge">🤖 AI Insight</span><span class="insight-ai-title">Phân tích bởi Chrome AI</span>${refreshBtn}</div><div class="insight-ai-body">${items}</div>`;
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
  '11000010': '🍜 Thực Phẩm & Đồ Uống',
  '11000011': '📚 Sách & Văn Phòng',
  '11000008': '⚽ Thể Thao & Du Lịch',
  '11000005': '🧸 Đồ Trẻ Em & Đồ Chơi',
  '11000009': '🚗 Ô Tô & Xe Máy',
  '11000013': '⌚ Đồng Hồ',
  '11000012': '📷 Máy Ảnh'
};

function resolveCatLabel(c) {
  if (c.name) {
    if (!isNaN(Number(c.name)) && LEGACY_CAT_NAMES[c.name]) {
      return LEGACY_CAT_NAMES[c.name];
    }
    if (!isNaN(Number(c.name))) {
      return 'Danh mục #' + c.name;
    }
    return c.name;
  }
  if (c.id) return LEGACY_CAT_NAMES[c.id] || 'Danh mục #' + c.id;
  return 'Khác';
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
