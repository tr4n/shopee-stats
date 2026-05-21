/* ─────────────────────────────────────────────────
   Main — boot, navigation, share modal, init pipeline.
   Depends on all other js/* files. Must be loaded last.
───────────────────────────────────────────────── */

/* ── Author info ─────────────────────────────── */
const authorInfoEl = document.getElementById('dashboard-author-info');
if (authorInfoEl && window.APP_CONFIG) {
  authorInfoEl.innerHTML = `${window.APP_CONFIG.authorIcon} <a href="${window.APP_CONFIG.authorLink}" target="_blank" style="color: var(--primary); text-decoration: none;">${window.APP_CONFIG.authorText}</a>`;
}

/* ── Navigation ──────────────────────────────── */
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-item[data-view]');

function switchView(name) {
  views.forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  navBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === name));
}

navBtns.forEach(btn => btn.addEventListener('click', () => switchView(btn.getAttribute('data-view'))));

/* ── Session storage ─────────────────────────── */
// Each dashboard session gets a millis-based ID stored in localStorage.
// Key schema: shopee_dash_data_<id>  →  serialised `d` object (with .cat on tiItems after classification)
const DASH_DATA_PREFIX = 'shopee_dash_data_';

function getSessionId() {
  return new URLSearchParams(location.search).get('id') || null;
}

function saveDataToStorage(d) {
  const id = getSessionId();
  if (!id) return;
  try {
    localStorage.setItem(DASH_DATA_PREFIX + id, JSON.stringify(d));
  } catch (e) {
    console.warn('[Dashboard] Storage save failed (quota?):', e.message);
  }
}

/* ── Parse / load data ───────────────────────── */
function parseData() {
  try {
    const params = new URLSearchParams(location.search);

    // Primary: load from storage by session ID (?id=MILLIS)
    const id = params.get('id');
    if (id) {
      const raw = localStorage.getItem(DASH_DATA_PREFIX + id);
      return raw ? JSON.parse(raw) : null;
    }

    // Legacy: URL hash (#d=BASE64) — kept for backward compat
    const match = location.hash.match(/[#&]d=([^&]+)/);
    if (!match) return null;
    return JSON.parse(decodeURIComponent(escape(atob(match[1]))));
  } catch { return null; }
}

/* ── Handle first-time data injection ────────── */
// Supports two entry formats:
//   #d=BASE64  — hash (preferred: no URL encoding issues, works with file://)
//   ?d=BASE64  — query param (fallback: URLSearchParams decodes + as space, so we fix it)
// Stores payload under a millis ID, then redirects to clean ?id=MILLIS URL.
// Returns true if a redirect was triggered (boot should be skipped).
const _hasRawDataParam = (function () {
  function tryParse(raw) {
    if (!raw) return null;
    const trimmed = raw.trim();
    // Try raw JSON first
    try { return JSON.parse(trimmed); } catch { /* noop */ }
    // Try LZString decompression (new v2 format)
    if (typeof LZString !== 'undefined') {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(trimmed);
        if (decompressed) return JSON.parse(decompressed);
      } catch { /* noop */ }
    }
    // Try base64 with TextDecoder for proper UTF-8 (Vietnamese) — legacy v1 format
    for (const s of [trimmed.replace(/ /g, '+'), trimmed]) {
      try {
        const bin = atob(s);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return JSON.parse(new TextDecoder().decode(bytes));
      } catch { /* noop */ }
    }
    return null;
  }

  // Priority 1: #lz= hash — LZString compressed (new v2 format, hash never sent to server)
  const lzMatch = location.hash.match(/[#&]lz=([^&]*)/);
  // Priority 2: #d= hash — no encoding issues, recommended for testing
  const hashMatch = location.hash.match(/[#&]d=([^&]+)/);
  // Priority 3: ?d= query param — raw extraction avoids URLSearchParams + → space issue
  const qMatch = location.search.match(/[?&]d=([^&]*)/);

  const raw = lzMatch?.[1] || hashMatch?.[1] || qMatch?.[1];
  if (!raw) return false;

  const parsed = tryParse(raw);
  if (parsed?.t) {
    const id = Date.now();
    localStorage.setItem(DASH_DATA_PREFIX + id, JSON.stringify(parsed));
    location.replace('result.html?id=' + id);
    return true;
  }

  console.error('[Dashboard] Failed to parse data from URL (hash or query param)');
  return false;
})();

/* ── Chrome AI Support Check ─────────────────── */
let chromeAISupportStatus = 'Đang kiểm tra...';
(async () => {
  try {
    if (typeof LanguageModel !== 'undefined') {
      const status = await LanguageModel.availability();
      if (status === 'readily' || status === 'available') {
        chromeAISupportStatus = 'Có hỗ trợ (Sẵn sàng sử dụng)';
      } else if (status === 'after-download' || status === 'downloadable') {
        chromeAISupportStatus = 'Có hỗ trợ (Cần tải thêm model)';
      } else if (status === 'downloading') {
        chromeAISupportStatus = 'Có hỗ trợ (Đang tải model...)';
      } else {
        chromeAISupportStatus = `Không hỗ trợ (Trạng thái: ${status})`;
      }
    } else if (typeof ai !== 'undefined' && ai.languageModel) {
      const capabilities = await ai.languageModel.capabilities();
      if (capabilities && ['available', 'readily', 'downloadable', 'after-download', 'downloading'].includes(capabilities.available)) {
        if (capabilities.available === 'readily' || capabilities.available === 'available') {
          chromeAISupportStatus = 'Có hỗ trợ (Sẵn sàng sử dụng - window.ai)';
        } else if (capabilities.available === 'after-download' || capabilities.available === 'downloadable') {
          chromeAISupportStatus = 'Có hỗ trợ (Cần tải thêm model - window.ai)';
        } else if (capabilities.available === 'downloading') {
          chromeAISupportStatus = 'Có hỗ trợ (Đang tải model... - window.ai)';
        } else {
          chromeAISupportStatus = `Không hỗ trợ (window.ai: ${capabilities.available})`;
        }
      } else {
        chromeAISupportStatus = 'Không hỗ trợ (window.ai không khả dụng)';
      }
    } else {
      chromeAISupportStatus = 'Không hỗ trợ (Trình duyệt không có API Chrome AI)';
    }
  } catch (e) {
    chromeAISupportStatus = `Không hỗ trợ (Lỗi: ${e.message})`;
  }
})();

/* ── Support Modal ───────────────────────────── */
function setupSupportButton(d) {
  const btn = document.getElementById('btn-support');
  const modal = document.getElementById('support-modal');
  const closeBtn = document.getElementById('btn-close-support');
  const sendBtn = document.getElementById('btn-send-support');

  if (!btn || !modal) return;

  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown', bVersion = '';

    const matchers = [
      [/Edg\/([\d.]+)/, 'Edge'],
      [/OPR\/([\d.]+)/, 'Opera'],
      [/Chrome\/([\d.]+)/, 'Chrome'],
      [/Firefox\/([\d.]+)/, 'Firefox'],
      [/Version\/([\d.]+).*Safari/, 'Safari'],
    ];
    for (const [re, name] of matchers) {
      const m = ua.match(re);
      if (m) { browser = name; bVersion = m[1]; break; }
    }

    let os = 'Unknown';
    if (/Windows NT 10|Windows NT 11/.test(ua)) os = 'Windows 10/11';
    else if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac OS X ([\d_]+)/.test(ua)) os = 'macOS ' + ua.match(/Mac OS X ([\d_]+)/)[1].replace(/_/g, '.');
    else if (/Android ([\d.]+)/.test(ua)) os = 'Android ' + ua.match(/Android ([\d.]+)/)[1];
    else if (/iPhone OS ([\d_]+)/.test(ua)) os = 'iOS ' + ua.match(/iPhone OS ([\d_]+)/)[1].replace(/_/g, '.');
    else if (/Linux/.test(ua)) os = 'Linux';

    let extVersion = 'Không rõ (Chạy trực tiếp)';
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        extVersion = chrome.runtime.getManifest().version;
      }
    } catch (e) { /* noop */ }
    if ((extVersion.includes('Không rõ') || !extVersion) && d && d.ev) {
      extVersion = d.ev;
    }

    return {
      browser: `${browser} ${bVersion}`.trim(),
      os,
      screen: `${screen.width}×${screen.height}`,
      dpr: window.devicePixelRatio || 1,
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      dataDate: d?.ts ? fmtDate(d.ts) : '—',
      summary: d ? `${fmtVND(d.t)} · ${fmtNum(d.o)} đơn` : '—',
      chromeAI: chromeAISupportStatus,
      extVersion: extVersion,
    };
  }

  const downloadRawBtn = document.getElementById('btn-download-raw');
  if (downloadRawBtn) {
    downloadRawBtn.addEventListener('click', () => {
      if (!d) return alert('Không tìm thấy thông tin kỹ thuật hỗ trợ. Vui lòng tải lại trang và thử lại!');
      const origText = downloadRawBtn.innerHTML;
      downloadRawBtn.innerHTML = '<span>⏳ Đang tạo file hỗ trợ...</span>';
      try {
        const jsonStr = JSON.stringify(d);
        let compressed = '';
        if (typeof LZString !== 'undefined') {
          compressed = LZString.compressToEncodedURIComponent(jsonStr);
        } else {
          // Fallback: Base64
          const bytes = new TextEncoder().encode(jsonStr);
          let bin = '';
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          compressed = btoa(bin);
        }

        const blob = new Blob([compressed], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `shopee-analytics-support-${d.ts || Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        downloadRawBtn.innerHTML = '<span>✓ Đã lưu file thành công!</span>';
      } catch (e) {
        alert('Đã xảy ra lỗi khi tạo file: ' + e.message);
        downloadRawBtn.innerHTML = '<span>❌ Đã xảy ra lỗi</span>';
      } finally {
        setTimeout(() => { downloadRawBtn.innerHTML = origText; }, 2000);
      }
    });
  }

  btn.addEventListener('click', () => {
    modal.classList.add('active');
  });

  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

  sendBtn.addEventListener('click', () => {
    const statusEl = document.getElementById('support-status');
    if (!statusEl) return;

    const descEl = document.getElementById('support-desc');
    const desc = descEl ? descEl.value.trim() : '';

    const info = getDeviceInfo();
    const deviceInfoStr = [
      `Trình duyệt : ${info.browser}`,
      `Hệ điều hành: ${info.os}`,
      `Màn hình    : ${info.screen} (DPR ${info.dpr})`,
      `Viewport    : ${info.viewport}`,
      `Dữ liệu tại : ${info.dataDate}`,
      `Tóm tắt     : ${info.summary}`,
      `Chrome AI   : ${info.chromeAI}`,
      `Phiên bản Ext: ${info.extVersion}`,
    ].join('\n');

    const baseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdtNnWUN7NV-gee7IkKGine8YbfeIuNtaV3MP8c8uL4em0OtA/viewform?usp=pp_url';
    const formUrlEmpty = `${baseUrl}&entry.1848321568=${encodeURIComponent(desc)}&entry.322741036=${encodeURIComponent(deviceInfoStr)}`;

    statusEl.innerHTML = '<span style="color: var(--green); font-weight: 600;">📋 Đang mở Google Form hỗ trợ...</span>';
    window.open(formUrlEmpty, '_blank');

    if (descEl) descEl.value = '';

    setTimeout(() => {
      statusEl.innerHTML = '';
      modal.classList.remove('active');
    }, 1500);
  });
}

/* ── Share Modal ─────────────────────────────── */
function setupShareButtons(d) {
  const modal = document.getElementById('share-modal');
  const previewImg = document.getElementById('share-preview-img');
  const themeSelect = document.getElementById('share-theme-select');
  const hideAmountCb = document.getElementById('share-hide-amount');
  const hideNamesCb = document.getElementById('share-hide-names');
  const btnCopy = document.getElementById('btn-modal-copy');
  const btnDownload = document.getElementById('btn-modal-download');

  let currentOptions = { cardType: 'overview' };
  let currentDataUrl = '';

  const getBeat = (t) => {
    if (t <= 1000000) return 10;
    if (t <= 3000000) return 25;
    if (t <= 8000000) return 45;
    if (t <= 20000000) return 65;
    if (t <= 50000000) return 82;
    if (t <= 100000000) return 93;
    return 99;
  };

  async function updatePreview() {
    if (!window.generateDashboardShareCard) return;
    const curYear = new Date().getFullYear();
    const yearlySpend = (d.yd && d.yd[curYear]) ? d.yd[curYear].t : d.t;
    const opts = {
      ...currentOptions,
      theme: themeSelect.value,
      hideAmount: hideAmountCb.checked,
      hideNames: hideNamesCb.checked,
      beat: getBeat(yearlySpend),
      year: currentOptions.year || curYear
    };
    previewImg.style.opacity = '0.5';
    try {
      currentDataUrl = await window.generateDashboardShareCard(d, opts);
      previewImg.src = currentDataUrl;
    } catch (e) { console.error(e); }
    previewImg.style.opacity = '1';
  }

  function openModal(cardType, extraOpts = {}) {
    currentOptions = { cardType, ...extraOpts };
    modal.classList.add('active');
    updatePreview();
  }

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  themeSelect.addEventListener('change', updatePreview);
  hideAmountCb.addEventListener('change', updatePreview);
  hideNamesCb.addEventListener('change', updatePreview);

  document.querySelectorAll('.btn-share-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      if (type === 'monthly') {
        const selYear = window.currentMonthlySelection.year;
        let selMonth = window.currentMonthlySelection.month;
        if (!selMonth && d.yd && d.yd[selYear] && d.yd[selYear].m) {
          const topMonth = Object.entries(d.yd[selYear].m).sort((a, b) => b[1] - a[1])[0];
          selMonth = topMonth ? topMonth[0] : null;
        }
        openModal(type, { month: selMonth, year: selYear });
      } else {
        openModal(type);
      }
    });
  });

  btnDownload.addEventListener('click', () => {
    if (!currentDataUrl) return;
    const link = document.createElement('a');
    link.href = currentDataUrl;
    link.download = `shopee-analytics-${currentOptions.cardType}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  btnCopy.addEventListener('click', async () => {
    if (!currentDataUrl) return;
    const orig = btnCopy.innerHTML;
    btnCopy.innerHTML = 'Đang copy...';
    try {
      const res = await fetch(currentDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      btnCopy.innerHTML = '✓ Đã copy!';
    } catch (err) {
      console.error(err);
      btnCopy.innerHTML = '❌ Lỗi';
    } finally {
      setTimeout(() => { btnCopy.innerHTML = orig; }, 2000);
    }
  });
}

/* ── Boot ────────────────────────────────────── */
// Skip if we're mid-redirect (?d= was detected and location.replace() was called)
if (!_hasRawDataParam) {
  const d = parseData();

  if (!d || !d.t) {
    console.warn('[Dashboard] No data or invalid data, showing no-data view');
    renderNoData();
  } else {
    _dashCache = loadDashCache(d.ts);

    let _categorizationFinished = false;
    let _activeYear = null;
    let _activeCatYear = 'all';
    window.currentYearSelection = 'all';

    const CAT_VN_TO_EN = {
      "💄 Sức khỏe & Làm đẹp": "Beauty & Health",
      "👗 Thời trang & Phụ kiện": "Fashion & Accessories",
      "💻 Điện tử & Công nghệ": "Electronics & Tech",
      "🏠 Nhà cửa & Đời sống": "Home & Living",
      "💪 Thể thao & Du lịch": "Sports & Travel",
      "📚 Giải trí & Giáo dục": "Entertainment & Education",
      "🏷️ Khác": "Others / Uncategorized"
    };

    function translateCategoryToEnglish(name) {
      const clean = String(name || '').trim();
      for (const [vn, en] of Object.entries(CAT_VN_TO_EN)) {
        if (clean.includes(vn) || vn.includes(clean)) {
          return en;
        }
      }
      let text = clean.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
      const textLower = text.toLowerCase();
      if (textLower.includes('sức khỏe') || textLower.includes('làm đẹp')) return 'Beauty & Health';
      if (textLower.includes('thời trang') || textLower.includes('phụ kiện')) return 'Fashion & Accessories';
      if (textLower.includes('điện thoại') || textLower.includes('máy tính') || textLower.includes('điện tử') || textLower.includes('công nghệ')) return 'Electronics & Tech';
      if (textLower.includes('nhà cửa') || textLower.includes('đời sống')) return 'Home & Living';
      if (textLower.includes('thể thao') || textLower.includes('du lịch')) return 'Sports & Travel';
      if (textLower.includes('giải trí') || textLower.includes('giáo dục') || textLower.includes('sách')) return 'Entertainment & Education';
      if (textLower.includes('trẻ em') || textLower.includes('đồ chơi')) return 'Kids & Toys';
      if (textLower.includes('thực phẩm') || textLower.includes('đồ uống')) return 'Food & Beverages';
      if (textLower.includes('ô tô') || textLower.includes('xe máy')) return 'Automotive';
      if (textLower.includes('đồng hồ')) return 'Watches';
      if (textLower.includes('máy ảnh')) return 'Cameras';
      return text || 'Others';
    }

    function fmtVNDEng(n) {
      n = Math.round(n || 0);
      if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' billion VND';
      if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' million VND';
      if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'k VND';
      return n.toLocaleString('en-US') + ' VND';
    }

    function triggerMonthlyAIInsight(d, yr) {
      const yearData = d.yd[yr] || {};
      const avgPerOrder = Math.round((yearData.t || 0) / Math.max(yearData.o || 1, 1));
      const monthEntries = Object.entries(yearData.m || {})
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .filter(([, v]) => v > 0);
      
      const MONTH_NAMES_EN = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthBreakdown = monthEntries.map(([m, v]) => `${MONTH_NAMES_EN[m] || 'Month ' + m}: ${fmtVNDEng(v)}`).join(', ');
      const activeMonths = monthEntries.length;
      const avgPerMonth = activeMonths > 0 ? Math.round((yearData.t || 0) / activeMonths) : 0;

      const currentYear = new Date().getFullYear();
      const yearNum = Number(yr);
      const yearDiff = currentYear - yearNum;
      const isCurrentYear = yearDiff === 0;
      const isLastYear = yearDiff === 1;

      const lastActiveMonth = monthEntries.length > 0
        ? Number(monthEntries[monthEntries.length - 1][0])
        : null;

      const contextLines = [
        `Year ${yr}: total spend ${fmtVNDEng(yearData.t || 0)} across ${fmtNum(yearData.o || 0)} orders, average of ${fmtVNDEng(avgPerOrder)} per order.`,
        `Monthly breakdown: ${monthBreakdown || 'no data'}.`,
        `Average spend per month: ${fmtVNDEng(avgPerMonth)} (${activeMonths} active months).`
      ];

      if (isCurrentYear) {
        const recent1m = fmtVNDEng(d.ps?.['1m'] || 0);
        const recent3m = fmtVNDEng(d.ps?.['3m'] || 0);
        contextLines.push(`Recent spending: last 1 month: ${recent1m}, last 3 months: ${recent3m}.`);
        if (lastActiveMonth) {
          contextLines.push(`Current year is ${currentYear}. Latest active month in data is Month ${lastActiveMonth}.`);
        }
      } else {
        contextLines.push(`Note: This is historical data from ${yr} (${yearDiff} years ago, current year is ${currentYear}).`);
        if (lastActiveMonth) {
          contextLines.push(`Last active month in year ${yr} was Month ${lastActiveMonth}.`);
        }
      }

      let specificPrompt;
      if (isCurrentYear) {
        specificPrompt = `This is your spend data for THIS current year (${yr}):
1. Identify your exact month with the highest total spend. Predict your shopping mood, consumer psychology, or what emotional/lifestyle factor might have triggered this spending peak during that specific time of the year.
2. Characterize your spending personality based on this peak. Do NOT give budget/saving advice.
Requirements: Output in VIETNAMESE. Keep it concise (maximum of 3 sentences total). You MUST explicitly mention the specific year/period (e.g., "Trong năm ${yr}...", "Trong giai đoạn này...") in your response. Use **bold** for the month name and key personality traits.`;
      } else if (isLastYear) {
        specificPrompt = `This is your spend data for LAST year (${yr}):
1. Identify your month with the highest total spend. Predict your consumer mindset and lifestyle state during that peak month last year.
2. Highlight a pattern of how your emotional shopping habits have evolved or carried over to this year. Do NOT give saving/budgeting tips.
Requirements: Output in VIETNAMESE. Keep it concise (maximum of 3 sentences total). You MUST explicitly mention the specific year/period (e.g., "Trong năm ${yr}...", "Trong giai đoạn này...") in your response. Use **bold** for the month name and main psychology remarks.`;
      } else {
        specificPrompt = `This is your spend data from ${yearDiff} years ago (${yr}):
1. Identify your month with the highest spend and predict what kind of shopping mood or lifestyle phase you were in during that period.
2. Reflect on the seasonal changes or nostalgia of your consumer personality back then. Do NOT give saving/budgeting advice.
Requirements: Output in VIETNAMESE. Keep it concise (maximum of 3 sentences total). You MUST explicitly mention the specific year/period (e.g., "Trong năm ${yr}...", "Trong giai đoạn này...") in your response. Use **bold** for the month name and psychological observations.`;
      }

      enrichWithAI('insight-monthly',
        contextLines.filter(Boolean).join(' '),
        specificPrompt,
        `insight-monthly-${yr}`
      );
    }
    window.triggerMonthlyAIInsight = triggerMonthlyAIInsight;

    function triggerSingleMonthAIInsight(d, year, monthStr) {
      const ym = `${year}-${monthStr}`;
      const monthItems = (d.mi && d.mi[ym]) || [];
      const monthTotal = (d.yd[year] && d.yd[year].m && d.yd[year].m[monthStr]) || 0;
      const totalItemsCount = monthItems.reduce((sum, item) => sum + (item.c || 1), 0);

      const MONTH_NAMES_EN = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const enMonth = MONTH_NAMES_EN[Number(monthStr)] || `Month ${monthStr}`;
      
      const context = `Month ${enMonth}/${year}: total spend ${fmtVNDEng(monthTotal)} across ${totalItemsCount} purchases.`;
      
      const specificPrompt = `This is your Shopee spend data for ${enMonth} of Year ${year}:
1. Analyze your total spend of ${fmtVNDEng(monthTotal)} across ${totalItemsCount} purchases.
2. Predict your shopping mood, mental state, or lifestyle priorities that drove your shopping behavior during this specific month and year. Do NOT give saving or spending control advice.
Requirements: Output in VIETNAMESE. Keep it concise (maximum of 3 sentences total). You MUST explicitly mention the specific month/year/period (e.g., "Vào tháng ${monthStr}/${year}...", "Trong giai đoạn này...") in your response. Use **bold** for the month/year and key psychological findings.`;

      enrichWithAI('insight-monthly', context, specificPrompt, `insight-monthly-${year}-${monthStr}`);
    }
    window.triggerSingleMonthAIInsight = triggerSingleMonthAIInsight;

    function getItemsForYear(mi, year, tiItems) {
      const prefix = year + '-';

      const catLookup = {};
      for (const item of (tiItems || [])) {
        if (item.cat && !isInvalidCat(item.cat)) {
          const k = item.n.toLowerCase().substring(0, 40);
          catLookup[k] = item.cat;
        }
      }

      const map = {};
      for (const key of Object.keys(mi || {})) {
        if (!key.startsWith(prefix)) continue;
        for (const item of (mi[key] || [])) {
          const k = item.n.toLowerCase().substring(0, 120);
          const k40 = item.n.toLowerCase().substring(0, 40);
          if (!map[k]) {
            map[k] = { n: item.n, s: 0, c: 0 };
            let cat = item.cat;
            if (cat && LEGACY_CAT_NAMES[cat]) {
              cat = LEGACY_CAT_NAMES[cat];
            }
            if (cat && !isInvalidCat(cat)) {
              map[k].cat = cat;
            } else if (catLookup[k40]) {
              map[k].cat = catLookup[k40];
            } else if (_dashCache.cats[k] || _dashCache.cats[k40]) {
              map[k].cat = _dashCache.cats[k] || _dashCache.cats[k40];
            } else {
              const kwCat = classifyByNameSync(item.n);
              if (kwCat !== '🏷️ Khác') map[k].cat = kwCat;
            }
          }
          map[k].s += item.s || 0;
          map[k].c += item.c || 0;
        }
      }
      return Object.values(map).sort((a, b) => b.s - a.s);
    }

    function categorizeMiItems(d, tiItems) {
      if (!d.mi) return;
      const catLookup = {};
      for (const item of (tiItems || [])) {
        if (item.cat && !isInvalidCat(item.cat)) {
          const k = item.n.toLowerCase().substring(0, 40);
          catLookup[k] = item.cat;
        }
      }

      for (const key of Object.keys(d.mi)) {
        for (const item of (d.mi[key] || [])) {
          if (item.cat && LEGACY_CAT_NAMES[item.cat]) {
            item.cat = LEGACY_CAT_NAMES[item.cat];
          }
          if (item.cat && !isInvalidCat(item.cat)) continue;

          const k = item.n.toLowerCase().substring(0, 120);
          const k40 = item.n.toLowerCase().substring(0, 40);

          if (catLookup[k40]) {
            item.cat = catLookup[k40];
          } else if (_dashCache.cats[k] || _dashCache.cats[k40]) {
            item.cat = _dashCache.cats[k] || _dashCache.cats[k40];
          } else {
            const kwCat = classifyByNameSync(item.n);
            item.cat = kwCat || '🏷️ Khác';
          }
        }
      }
    }
    window.categorizeMiItems = categorizeMiItems;

    function triggerCategoryAIInsight(cs, ti, total, cacheKey, year) {
      const activeYear = year || 'all';
      const periodText = activeYear === 'all' ? 'all-time' : `year ${activeYear}`;
      const filteredCs = (cs || []).filter(c => c.name !== '🏷️ Khác' && c.name !== 'Khác');
      if (!filteredCs.length) return;
      const analyzedTotal = cs.reduce((sum, c) => sum + c.s, 0) || total || 1;
      const catLines = filteredCs.map(c => {
        const pct = Math.round((c.s / analyzedTotal) * 100);
        const enCatName = translateCategoryToEnglish(c.name);
        return `${enCatName}: ${fmtVNDEng(c.s)} (${pct}%, ${c.c} purchases)`;
      }).join('; ');
      
      enrichWithAI('insight-categories',
        `Spending breakdown by category for the period (${periodText}): ${catLines}.`,
        `This is the spend data for the period (${periodText}). Ignore the category 'Others / Uncategorized' entirely:
1. Find the category with your highest percentage (%) of total spend. Label this category and explain what it reveals about your dominant consumer personality, lifestyle priority, or psychological desires.
2. Explain how this category distribution defines your lifestyle archetype (e.g., tech-enthusiast, self-care addict, homebody). Do NOT give financial advice or brake rules.
Requirements: Output in VIETNAMESE. Keep it concise (maximum of 3 sentences total). You MUST explicitly mention the specific period (e.g., "Trong giai đoạn này...", "Trong năm ${activeYear}...") in your response. Use **bold** for category names and their lifestyle archetype.`,
        cacheKey
      );
    }
    window.triggerCategoryAIInsight = triggerCategoryAIInsight;

    function triggerSingleCategoryAIInsight(cs, ti, total, catName, year, overallTotal) {
      const categoryStats = cs.find(c => resolveCatLabel(c) === catName || c.name === catName);
      if (!categoryStats) return;
      
      const catTotal = categoryStats.s;
      const catCount = categoryStats.c;

      const enCat = translateCategoryToEnglish(catName);
      const overallText = overallTotal > 0 ? ` (which is ${Math.round((catTotal / overallTotal) * 100)}% of total period spend of ${fmtVNDEng(overallTotal)})` : '';
      const periodText = year === 'all' ? 'all-time' : `year ${year}`;

      const context = `Category "${enCat}" (${periodText}): total spent ${fmtVNDEng(catTotal)}${overallText} across ${catCount} item purchases.`;
      
      const specificPrompt = `This is your Shopee spend data for the category "${enCat}" in ${periodText}:
1. You spent a total of ${fmtVNDEng(catTotal)} across ${catCount} purchases in this category.
2. Provide a humorous, honest diagnostic of your shopping psychology or personality traits driven by this specific category (e.g., appearance-obsessed, retail therapist, shiny object syndrome). Do NOT give saving or personal finance advice.
Requirements: Output in VIETNAMESE. Keep it concise (maximum of 3 sentences total). You MUST explicitly mention the specific period (e.g., "Trong giai đoạn này...", "Trong năm ${year}...") in your response. Use **bold** for the category name and key consumer personality trait.`;

      enrichWithAI('insight-categories', context, specificPrompt, `insight-categories-${year}-${catName}`);
    }
    window.triggerSingleCategoryAIInsight = triggerSingleCategoryAIInsight;

    function triggerYearlyAIInsight(d, year) {
      if (year === 'all') {
        runAIInsightsNarrative(d);
        return;
      }
      
      const yearData = d.yd[year] || {};
      const avgOrderValue = Math.round((yearData.t || 0) / Math.max(yearData.o || 1, 1));
      const topItems = getItemsForYear(d.mi, year, d.ti).slice(0, 5);
      const itemsStr = topItems.map(i => `"${i.n}" (${fmtVNDEng(i.s)})`).join(', ');

      const context = `Year ${year}: total spend ${fmtVNDEng(yearData.t || 0)} across ${fmtNum(yearData.o || 0)} orders, average of ${fmtVNDEng(avgOrderValue)} per order. Top products: ${itemsStr}.`;
      
      const specificPrompt = `This is your Shopee spend data for the year ${year}:
1. Analyze your total spend and order count. Name your top product(s) of this year: ${itemsStr}.
2. Predict your spending habits, lifestyle archetype, or consumer personality profile that defined your year ${year}. Do NOT suggest any financial tips, budgets, or rules to curb spending.
Requirements: Output in VIETNAMESE. Keep it concise (maximum of 3 sentences total). You MUST explicitly mention the specific year/period (e.g., "Trong năm ${year}...", "Trong giai đoạn này...") in your response. Use **bold** for product names, spend amounts, and personality profile name.`;

      enrichWithAI('insight-yearly', context, specificPrompt, `insight-yearly-${year}`);
    }
    window.triggerYearlyAIInsight = triggerYearlyAIInsight;

    window.computeSingleMonthInsights = function(d, year, monthStr) {
      const items = [];
      const ym = `${year}-${monthStr}`;
      const monthItems = (d.mi && d.mi[ym]) || [];
      if (!monthItems.length) return items;

      const monthTotal = (d.yd[year] && d.yd[year].m && d.yd[year].m[monthStr]) || 0;
      items.push({ icon: '📅', text: `Tổng chi tiêu trong **Tháng ${monthStr}/${year}** là **${fmtVND(monthTotal)}**.` });

      const yearData = d.yd[year] || {};
      const monthEntries = Object.entries(yearData.m || {}).filter(([, v]) => v > 0);
      if (monthEntries.length > 1) {
        const avg = (yearData.t || 0) / monthEntries.length;
        const diffPct = Math.round(((monthTotal - avg) / avg) * 100);
        if (diffPct > 0) {
          items.push({ icon: '🔥', text: `Mức chi tiêu này **cao hơn ${diffPct}%** so với trung bình tháng của năm ${year} (**${fmtVND(Math.round(avg))}**).` });
        } else if (diffPct < 0) {
          items.push({ icon: '✓', text: `Mức chi tiêu này **thấp hơn ${Math.abs(diffPct)}%** so với trung bình tháng của năm ${year} (**${fmtVND(Math.round(avg))}**).` });
        }
      }

      const topItem = monthItems[0];
      if (topItem) {
        const pct = Math.round((topItem.s / Math.max(monthTotal, 1)) * 100);
        items.push({ icon: '★', text: `Sản phẩm chi nhiều nhất: **"${topItem.n}"** — **${fmtVND(topItem.s)}** (chiếm **${pct}%** của tháng).` });
      }

      const totalLuot = monthItems.reduce((s, i) => s + (i.c || 1), 0);
      items.push({ icon: '🛒', text: `Tổng cộng bạn đã mua **${totalLuot} lượt sản phẩm** trong tháng này.` });

      return items;
    };

    window.computeSingleCategoryInsights = function(catName, catTotal, catCount, catItems, overallTotal) {
      const items = [];
      items.push({ icon: '🏷️', text: `Tổng chi tiêu cho danh mục **${catName}** là **${fmtVND(catTotal)}** (${catCount} lượt mua).` });

      if (overallTotal > 0) {
        const pct = Math.round((catTotal / overallTotal) * 100);
        items.push({ icon: '📊', text: `Danh mục này chiếm **${pct}%** tổng chi tiêu của bạn trong kỳ được chọn.` });
      }

      if (catItems.length > 0) {
        const top1 = catItems[0];
        const pctTop1 = Math.round((top1.s / Math.max(catTotal, 1)) * 100);
        items.push({ icon: '★', text: `Sản phẩm chi nhiều nhất: **"${top1.n}"** — **${fmtVND(top1.s)}** (${pctTop1}% của danh mục).` });
      }

      const avgPrice = Math.round(catTotal / Math.max(catCount, 1));
      items.push({ icon: '💸', text: `Giá trị trung bình mỗi lượt mua trong danh mục này là **${fmtVND(avgPrice)}/món**.` });

      return items;
    };

    window.clearYearlySelection = function(d) {
      window.currentYearSelection = 'all';
      
      const card = document.getElementById('card-yearly-items');
      if (card) card.style.display = 'none';
      
      if (yearlyChart) {
        const years = Object.keys(d.yd || {}).sort();
        const colors = years.map(y =>
          y === String(new Date().getFullYear()) ? '#ee4d2d' : 'rgba(238,77,45,0.4)'
        );
        yearlyChart.data.datasets[0].backgroundColor = colors;
        yearlyChart.update();
      }
      
      renderInsightCard('insight-yearly', computeYearlyInsights(d.yd || {}, d));
      triggerYearlyAIInsight(d, 'all');
    };

    window.clearMonthlySelection = function(d) {
      if (window.currentMonthlySelection) {
        window.currentMonthlySelection.month = null;
      }
      
      const miCard = document.getElementById('card-monthly-items');
      if (miCard) miCard.style.display = 'none';
      
      const yr = (window.currentMonthlySelection && window.currentMonthlySelection.year) || Object.keys(d.yd || {}).sort((a,b)=>b-a)[0];
      renderInsightCard('insight-monthly', computeMonthlyInsights(d.yd, yr));
      triggerMonthlyAIInsight(d, yr);
    };

    function switchCategoryYear(year, d, tiItems) {
      _activeCatYear = year;

      let cs, ti, total;
      if (year === 'all') {
        cs = d.cs;
        ti = tiItems;
        total = d.t;
        const sub = document.getElementById('cat-subtitle');
        if (sub) sub.textContent = 'Phân bổ chi tiêu theo từng danh mục Shopee';
      } else {
        ti = getItemsForYear(d.mi, year, tiItems);
        for (const item of ti) {
          if (!item.cat) item.cat = '🏷️ Khác';
        }
        cs = buildCsFromTi(ti);
        total = (d.yd[year] || {}).t || 0;
        const sub = document.getElementById('cat-subtitle');
        if (sub) sub.textContent = `Danh mục năm ${year} · dữ liệu top 20 sản phẩm/tháng`;
      }

      document.getElementById('card-cat-items').style.display = 'none';
      document.querySelectorAll('#cat-bars .cat-row').forEach(r => r.classList.remove('cat-row-active'));

      renderCategories(cs, ti, total, year);
      renderInsightCard('insight-categories', computeCategoryInsights(cs, total));

      if (_categorizationFinished) {
        const key = year === 'all' ? 'insight-categories-all' : `insight-categories-${year}`;
        triggerCategoryAIInsight(cs, ti, total, key, year);
      }
    }

    function renderCatYearPills(d, tiItems) {
      const years = Object.keys(d.yd || {}).sort((a, b) => b - a);
      if (!years.length) return;
      const container = document.getElementById('cat-year-pills');
      if (!container) return;
      const allPills = ['all', ...years];
      container.innerHTML = allPills.map((y, i) =>
        `<button class="pill${i === 0 ? ' active' : ''}" data-catyear="${y}">${y === 'all' ? 'Tất cả' : 'Năm ' + y}</button>`
      ).join('');
      container.querySelectorAll('.pill').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          switchCategoryYear(btn.getAttribute('data-catyear'), d, tiItems);
        });
      });
    }

    function runAIInsightsNarrative(d) {
      window.runAIInsightsNarrative = runAIInsightsNarrative;
      const years = Object.keys(d.yd || {}).map(Number).sort((a, b) => b - a);
      const curYear = years[0];
      const prevYear = years[1];
      const avgOrderValue = Math.round((d.t || 0) / Math.max(d.o || 1, 1));
      const savingsRate = Math.round(((d.s || 0) / Math.max((d.t || 0) + (d.s || 0), 1)) * 100);

      let yoyLine = '';
      if (curYear && prevYear && d.yd[prevYear]?.t > 0) {
        const pct = Math.round(((d.yd[curYear].t - d.yd[prevYear].t) / d.yd[prevYear].t) * 100);
        yoyLine = `Year ${curYear} ${pct >= 0 ? 'increased' : 'decreased'} by ${Math.abs(pct)}% compared to year ${prevYear}.`;
      }

      // 1. Yearly overview AI insight
      const yearSummaryLines = Object.entries(d.yd || {})
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([yr, yd]) => {
          const saved = Math.round(Math.max(0, (yd.s || 0)));
          const total = yd.t || 0;
          const saveRatePct = total > 0 ? Math.round((saved / (total + saved)) * 100) : 0;
          return `Year ${yr}: spent ${fmtVNDEng(total)} / ${fmtNum(yd.o || 0)} orders / saved ${fmtVNDEng(saved)} (${saveRatePct}% of original price)`;
        });
      enrichWithAI('insight-yearly',
        [
          `Total spend: ${fmtVNDEng(d.t)} across ${fmtNum(d.o)} orders. Average spend per order: ${fmtVNDEng(avgOrderValue)}.`,
          `Voucher savings: ${fmtVNDEng(d.s)} (${savingsRate}% of original price).`,
          `Yearly history: ${yearSummaryLines.join('; ')}.`,
          yoyLine
        ].filter(Boolean).join(' '),
        `Based on your total spend, order count, and voucher savings data:
1. Compare your year with the highest spend against the other years, and predict the shift in your shopping mindset or lifestyle between those periods.
2. Diagnose your overall shopping personality archetype (e.g. dopamine chaser, voucher hunter, impulse buyer) based on the balance of orders, total spend, and voucher savings. Do NOT suggest saving rules or order bundling methods.
Requirements: Output in VIETNAMESE. Keep it concise (maximum of 3 sentences total). You MUST explicitly mention the specific period/milestone (e.g., "Trong giai đoạn này...", "Trong những năm qua...") in your response. Use **bold** for key periods, amounts, and your shopping archetype.`
      );

      // 2. Items AI insight
      const top10 = (d.ti || []).slice(0, 10);
      const itemNames = top10.map(i => `"${i.n}"`).join(', ');
      enrichWithAI('insight-items',
        `Top purchased products: ${itemNames}.`,
        `Review the list of your top purchased product names: ${itemNames}.
Based solely on these product names, predict your consumer personality, lifestyle archetype, hobbies, or mood. Provide a humorous, friendly psychological analysis. Do NOT give saving suggestions or financial advice.
Requirements: Output in VIETNAMESE. Keep it concise (maximum of 3 sentences total). Use **bold** for product names and key personality traits.`
      );

      // 3. Categories AI insight — only for 'all' view; year-specific handled by switchCategoryYear
      if (_activeCatYear === 'all') {
        triggerCategoryAIInsight(d.cs, d.ti, d.t, 'insight-categories-all', 'all');
      }

      // 4. Monthly insight for current active year
      if (_activeYear) {
        triggerMonthlyAIInsight(d, _activeYear);
      }
    }

    async function initDashboard() {
      window.currentDashData = d;
      // Load categories first so keyword classification is ready!
      await initializeCategories();

      // Fallback: if ti is absent from the export, derive it by aggregating mi (monthly items)
      if (!d.ti || !d.ti.length) {
        const miMap = {};
        for (const key of Object.keys(d.mi || {})) {
          for (const item of (d.mi[key] || [])) {
            const k = item.n.toLowerCase().substring(0, 120);
            if (!miMap[k]) miMap[k] = { n: item.n, s: 0, c: 0 };
            miMap[k].s += item.s || 0;
            miMap[k].c += item.c || 0;
          }
        }
        d.ti = Object.values(miMap).sort((a, b) => b.s - a.s);
        console.log('[Dashboard] ti derived from mi:', d.ti.length, 'items');
      }

      const tiItems = d.ti || [];

      // Convert raw legacy numeric category IDs first
      for (const item of tiItems) {
        if (item.cat && LEGACY_CAT_NAMES[item.cat]) {
          item.cat = LEGACY_CAT_NAMES[item.cat];
        }
      }

      // 1. Apply cached AI overrides from previous sessions
      for (const item of tiItems) {
        if (!isInvalidCat(item.cat)) continue;
        const key = item.n.toLowerCase().substring(0, 120);
        if (_dashCache.cats[key]) item.cat = _dashCache.cats[key];
      }

      // 2. Initialize with default category for unclassified items
      for (const item of tiItems) {
        if (isInvalidCat(item.cat)) item.cat = '🏷️ Khác';
      }

      // 2b. Categorize mi items with whatever is currently available (cached / keyword)
      categorizeMiItems(d, tiItems);

      // 3. Build initial catStats from classified ti
      d.cs = buildCsFromTi(tiItems);

      // 4. Render layout synchronously so UI appears instantly
      document.title = `Dashboard — ${fmtVND(d.t)} · Shopee Analytics`;
      document.getElementById('data-date').textContent = fmtDate(d.ts);
      document.getElementById('subtitle-overview').textContent =
        `${fmtVND(d.t)} tổng chi tiêu · ${fmtNum(d.o)} đơn hàng`;

      renderKpi(d);
      renderYearlyChart(d.yd || {}, d);
      renderPeriod(d.ps || {});

      renderYearPills(d.yd || {}, yr => {
        _activeYear = yr;
        renderMonthly(d.yd, yr, d);
        const monthlyItems = computeMonthlyInsights(d.yd, yr);
        renderInsightCard('insight-monthly', monthlyItems);

        if (_categorizationFinished) {
          triggerMonthlyAIInsight(d, yr);
        }
      });

      renderTopItems(tiItems);
      renderCategories(d.cs, tiItems);
      renderCatYearPills(d, tiItems);

      // Render static insight cards
      renderInsightCard('insight-yearly', computeYearlyInsights(d.yd || {}, d));
      renderInsightCard('insight-items', computeItemInsights(tiItems, d.t));
      renderInsightCard('insight-categories', computeCategoryInsights(d.cs, d.t));

      // Render monthly insight for default year
      const defaultYears = Object.keys(d.yd || {}).map(Number).sort((a, b) => b - a);
      if (defaultYears.length) {
        renderInsightCard('insight-monthly', computeMonthlyInsights(d.yd, defaultYears[0]));
      }

      // Add listeners for limits
      document.getElementById('items-limit-select')?.addEventListener('change', renderTopItemsList);
      document.getElementById('monthly-limit-select')?.addEventListener('change', renderMonthlyItemsList);

      setupShareButtons(d);
      setupSupportButton(d);

      // 5. Run async keyword classification (background)
      const alreadyCategorized = tiItems.every(item => !isInvalidCat(item.cat));
      if (!alreadyCategorized) {
        try {
          let hasUpdates = false;
          for (const item of tiItems) {
            if (isInvalidCat(item.cat)) {
              const newCat = await classifyByNameDash(item.n);
              if (newCat !== '🏷️ Khác') {
                item.cat = newCat;
                hasUpdates = true;
              }
            }
          }

          if (hasUpdates) {
            d.cs = buildCsFromTi(tiItems);
            renderCategories(d.cs, tiItems);
            renderTopItems(tiItems);
            // Clear cached AI insights since categorization changed
            if (_dashCache && _dashCache.insights) {
              _dashCache.insights = {};
              saveDashCache();
            }
            // Persist progress so partial results survive a page refresh
            saveDataToStorage(d);
            runAIInsightsNarrative(d);
          }
        } catch (error) {
          console.error('[Dashboard] Error in async keyword classification:', error);
        }

        // 6. Run AI category classification if any remaining uncategorized items
        const uncategorizedCount = tiItems.filter(item => isInvalidCat(item.cat)).length;
        if (uncategorizedCount > 0) {
          try {
            await classifyKharItems(tiItems, d);
          } catch (e) {
            console.error('[Dashboard] AI category classification failed:', e);
          }
        }
      } else {
        // Skip classification if already loaded from storage
      }

      // 7. Categorization is now 100% finished — update final state
      _categorizationFinished = true;
      categorizeMiItems(d, tiItems);
      d.cs = buildCsFromTi(tiItems);

      // Persist final classified data so next load skips all classification steps
      saveDataToStorage(d);

      renderTopItems(tiItems);

      // Re-render static rule-based cards with final categorized data
      renderInsightCard('insight-yearly', computeYearlyInsights(d.yd || {}, d));
      renderInsightCard('insight-items', computeItemInsights(tiItems, d.t));

      // Re-render categories respecting the active year filter
      if (_activeCatYear !== 'all') {
        switchCategoryYear(_activeCatYear, d, tiItems);
      } else {
        renderCategories(d.cs, tiItems);
        renderInsightCard('insight-categories', computeCategoryInsights(d.cs, d.t));
      }

      // 8. Set up AI insight buttons (user must click to trigger analysis)
      runAIInsightsNarrative(d);
    }

    initDashboard();
  }
}
