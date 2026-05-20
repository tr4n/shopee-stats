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
    console.log('[Dashboard] Data persisted to storage (id:', id, ')');
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
    // Try base64 with TextDecoder for proper UTF-8 (Vietnamese)
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

  // Priority 1: #d= hash — no encoding issues, recommended for testing
  const hashMatch = location.hash.match(/[#&]d=([^&]+)/);
  // Priority 2: ?d= query param — raw extraction avoids URLSearchParams + → space issue
  const qMatch = location.search.match(/[?&]d=([^&]*)/);

  const raw = hashMatch?.[1] || qMatch?.[1];
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
      if (status === 'readily') {
        chromeAISupportStatus = 'Có hỗ trợ (Sẵn sàng sử dụng)';
      } else if (status === 'after-download') {
        chromeAISupportStatus = 'Có hỗ trợ (Cần tải thêm model)';
      } else {
        chromeAISupportStatus = `Không hỗ trợ (Trạng thái: ${status})`;
      }
    } else if (typeof ai !== 'undefined' && ai.languageModel) {
      const capabilities = await ai.languageModel.capabilities();
      if (capabilities && capabilities.available !== 'no') {
        if (capabilities.available === 'readily') {
          chromeAISupportStatus = 'Có hỗ trợ (Sẵn sàng sử dụng - window.ai)';
        } else if (capabilities.available === 'after-download') {
          chromeAISupportStatus = 'Có hỗ trợ (Cần tải thêm model - window.ai)';
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
  const descEl = document.getElementById('support-desc');
  const emailEl = document.getElementById('support-email');
  const noteEl = document.getElementById('support-note');

  if (!btn || !modal) return;

  let screenshotBase64 = '';
  let screenshotFile = null;

  if (emailEl) {
    emailEl.value = localStorage.getItem('support_email') || '';
  }

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

  // Build a compact base64 payload (key stats only, keeps email size small)
  function buildSupportPayload() {
    if (!d) return '';
    try {
      const payload = {
        t: d.t,
        o: d.o,
        s: d.s,
        ts: d.ts,
        yd: Object.fromEntries(
          Object.entries(d.yd || {}).map(([y, v]) => [y, { t: v.t, o: v.o }])
        ),
        ti: (d.ti || []).slice(0, 10).map(i => ({ n: i.n, s: i.s, c: i.c })),
        cs: (d.cs || []).slice(0, 5).map(c => ({ name: c.name, s: c.s, c: c.c })),
      };
      // Include extension version in data payload too, if we have it
      const info = getDeviceInfo();
      if (info.extVersion && !info.extVersion.includes('Không rõ')) {
        payload.ev = info.extVersion;
      }
      const json = JSON.stringify(payload);
      const bytes = new TextEncoder().encode(json);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    } catch {
      return '';
    }
  }

  // Helper to compress image before attaching to keep email URL length small
  function compressImage(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as JPEG with low quality (0.4) to keep it extremely small (~2-4KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
        callback(compressedDataUrl);
      };
    };
  }

  // Screenshot Upload Box Event Listeners
  const uploadBox = document.getElementById('screenshot-upload-box');
  const fileInput = document.getElementById('support-screenshot');
  const previewContainer = document.getElementById('screenshot-preview-container');
  const previewImg = document.getElementById('screenshot-preview');
  const clearBtn = document.getElementById('btn-clear-screenshot');

  if (uploadBox && fileInput) {
    uploadBox.addEventListener('click', () => fileInput.click());

    uploadBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadBox.style.borderColor = 'var(--primary)';
    });

    uploadBox.addEventListener('dragleave', () => {
      uploadBox.style.borderColor = 'var(--border)';
    });

    uploadBox.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadBox.style.borderColor = 'var(--border)';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    });

    function handleFile(file) {
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chỉ chọn tệp hình ảnh!');
        return;
      }
      screenshotFile = file;
      compressImage(file, (compressedBase64) => {
        screenshotBase64 = compressedBase64;
        if (previewImg) previewImg.src = compressedBase64;
        if (previewContainer) previewContainer.style.display = 'block';
        if (clearBtn) clearBtn.style.display = 'inline-block';
        const span = uploadBox.querySelector('span');
        if (span) span.textContent = `📸 Đã chọn: ${file.name}`;
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.value = '';
        screenshotFile = null;
        screenshotBase64 = '';
        if (previewImg) previewImg.src = '';
        if (previewContainer) previewContainer.style.display = 'none';
        clearBtn.style.display = 'none';
        const span = uploadBox.querySelector('span');
        if (span) span.textContent = '📸 Chọn ảnh hoặc kéo thả vào đây';
      });
    }
  }

  btn.addEventListener('click', () => {
    const info = getDeviceInfo();
    const b64 = buildSupportPayload();

    document.getElementById('support-device-info').innerHTML = [
      `Trình duyệt : ${escHtml(info.browser)}`,
      `Hệ điều hành: ${escHtml(info.os)}`,
      `Màn hình    : ${escHtml(info.screen)} (DPR ${info.dpr})`,
      `Viewport    : ${escHtml(info.viewport)}`,
      `Dữ liệu tại : ${escHtml(info.dataDate)}`,
      `Tóm tắt     : ${escHtml(info.summary)}`,
      `Chrome AI   : ${escHtml(info.chromeAI)}`,
      `Phiên bản Ext: ${escHtml(info.extVersion)}`,
    ].join('<br>');

    const previewEl = document.getElementById('support-data-preview');
    previewEl.textContent = b64
      ? b64.substring(0, 300) + (b64.length > 300 ? ' …' : '')
      : '(Không có dữ liệu)';

    const email = window.APP_CONFIG?.email || '';
    noteEl.innerHTML = email
      ? `Yêu cầu hỗ trợ sẽ được gửi trực tiếp tới hòm thư của nhà phát triển (<strong>${escHtml(email)}</strong>). Chúng tôi sẽ phản hồi lại bạn sớm nhất có thể.`
      : 'Không tìm thấy địa chỉ email hỗ trợ.';

    modal.classList.add('active');
    setTimeout(() => {
      if (emailEl && !emailEl.value) {
        emailEl.focus();
      } else {
        descEl.focus();
      }
    }, 150);
  });

  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

  sendBtn.addEventListener('click', () => {
    const userEmail = emailEl ? emailEl.value.trim() : '';
    const desc = descEl.value.trim();
    const adminEmail = window.APP_CONFIG?.email || 'quanghuytran.hust@gmail.com';
    const statusEl = document.getElementById('support-status');

    if (!statusEl) return;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!userEmail || !emailRegex.test(userEmail)) {
      statusEl.innerHTML = '<span style="color: var(--primary); font-weight: bold;">⚠️ Vui lòng nhập địa chỉ email liên hệ hợp lệ.</span>';
      if (emailEl) emailEl.focus();
      return;
    }

    // Validate description
    if (!desc) {
      statusEl.innerHTML = '<span style="color: var(--primary); font-weight: bold;">⚠️ Vui lòng mô tả vấn đề gặp phải.</span>';
      descEl.focus();
      return;
    }

    // Clear previous status
    statusEl.innerHTML = '<span style="color: var(--muted);">⏳ Đang gửi yêu cầu hỗ trợ, vui lòng đợi...</span>';

    // Disable form inputs during sending
    sendBtn.disabled = true;
    const originalBtnHTML = sendBtn.innerHTML;
    sendBtn.innerHTML = '⏳ Đang gửi...';
    if (emailEl) emailEl.disabled = true;
    descEl.disabled = true;

    // Prepare form data for FormSubmit
    const info = getDeviceInfo();
    const b64 = buildSupportPayload();
    const subject = `[Shopee Analytics] Yêu cầu hỗ trợ — ${info.browser} / ${info.os}`;
    
    const messageBody = [
      `Email liên hệ: ${userEmail}`,
      `Mô tả vấn đề:\n${desc}`,
      `\n─────────────────────────────────────`,
      `THÔNG TIN THIẾT BỊ:`,
      `• Trình duyệt : ${info.browser}`,
      `• Hệ điều hành: ${info.os}`,
      `• Màn hình    : ${info.screen} (DPR ${info.dpr})`,
      `• Viewport    : ${info.viewport}`,
      `• Dữ liệu tại : ${info.dataDate}`,
      `• Tóm tắt     : ${info.summary}`,
      `• Chrome AI   : ${info.chromeAI}`,
      `• Phiên bản Ext: ${info.extVersion}`,
    ].join('\n');

    const formData = new FormData();
    formData.append('email', userEmail);
    formData.append('_subject', subject);
    formData.append('message', messageBody);
    
    if (b64) {
      formData.append('raw_data_base64', b64);
    }
    
    if (screenshotFile) {
      // FormSubmit accepts attachments in the "attachment" parameter
      formData.append('attachment', screenshotFile);
    }

    // Post to FormSubmit AJAX endpoint
    fetch(`https://formsubmit.co/ajax/${encodeURIComponent(adminEmail)}`, {
      method: 'POST',
      body: formData
    })
    .then(res => {
      if (!res.ok) throw new Error(`Mã phản hồi HTTP: ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (data.success === 'true' || data.success === true) {
        statusEl.innerHTML = '<span style="color: var(--green); font-weight: bold;">✅ Gửi hỗ trợ thành công! Chúng tôi sẽ phản hồi sớm.</span>';
        
        // Save email for next time
        localStorage.setItem('support_email', userEmail);

        // Clear description and reset uploaded file preview
        descEl.value = '';
        const clearBtn = document.getElementById('btn-clear-screenshot');
        if (clearBtn) clearBtn.click();

        // Close support modal after a short delay
        setTimeout(() => {
          modal.classList.remove('active');
          statusEl.innerHTML = '';
        }, 2200);
      } else {
        throw new Error(data.message || 'Lỗi không xác định từ máy chủ FormSubmit.');
      }
    })
    .catch(err => {
      console.error('Lỗi FormSubmit:', err);
      statusEl.innerHTML = `<span style="color: var(--primary); font-weight: bold;">❌ Gửi thất bại: ${err.message}.</span><br><span style="font-size: 11px; color: var(--muted);">Bạn có thể gửi email trực tiếp tới: ${adminEmail}</span>`;
    })
    .finally(() => {
      // Re-enable form fields
      sendBtn.disabled = false;
      sendBtn.innerHTML = originalBtnHTML;
      if (emailEl) emailEl.disabled = false;
      descEl.disabled = false;
    });
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
        const selYear = currentMonthlySelection.year;
        let selMonth = currentMonthlySelection.month;
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
  console.log('[Dashboard] Parsed data:', {
    hasData: !!d,
    sessionId: getSessionId(),
    totalSpend: d?.t,
    topItemsCount: (d?.ti || []).length,
    categoriesCount: (d?.cs || []).length
  });

  if (!d || !d.t) {
    console.warn('[Dashboard] No data or invalid data, showing no-data view');
    renderNoData();
  } else {
    _dashCache = loadDashCache(d.ts);
    console.log(`[Dashboard] Cache ${Object.keys(_dashCache.cats).length} categories, ${Object.keys(_dashCache.insights).length} insights`);

    let _categorizationFinished = false;
    let _activeYear = null;
    let _activeCatYear = 'all';

    function triggerMonthlyAIInsight(d, yr) {
      const yearData = d.yd[yr] || {};
      const avgPerOrder = Math.round((yearData.t || 0) / Math.max(yearData.o || 1, 1));
      const monthEntries = Object.entries(yearData.m || {})
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .filter(([, v]) => v > 0);
      const monthBreakdown = monthEntries.map(([m, v]) => `T${m}:${fmtVND(v)}`).join(', ');
      const activeMonths = monthEntries.length;
      const avgPerMonth = activeMonths > 0 ? Math.round((yearData.t || 0) / activeMonths) : 0;

      let peakMonthItems = '';
      if (monthEntries.length > 0) {
        const peakEntry = monthEntries.reduce((a, b) => a[1] >= b[1] ? a : b);
        const peakKey = `${yr}-${peakEntry[0]}`;
        const peakItems = (d.mi || {})[peakKey] || [];
        if (peakItems.length > 0) {
          peakMonthItems = `Sản phẩm mua trong tháng ${peakEntry[0]}: ${peakItems.slice(0, 5).map(i => `"${i.n}" ${fmtVND(i.s)}`).join(', ')}.`;
        }
      }

      const currentYear = new Date().getFullYear();
      const yearNum = Number(yr);
      const yearDiff = currentYear - yearNum;
      const isCurrentYear = yearDiff === 0;
      const isLastYear = yearDiff === 1;

      const lastActiveMonth = monthEntries.length > 0
        ? Number(monthEntries[monthEntries.length - 1][0])
        : null;
      const currentMonth = new Date().getMonth() + 1;

      const contextLines = [
        `Năm ${yr}: tổng ${fmtVND(yearData.t || 0)} / ${fmtNum(yearData.o || 0)} đơn / trung bình ${fmtVND(avgPerOrder)}/đơn.`,
        `Chi theo tháng: ${monthBreakdown || 'không có dữ liệu'}.`,
        `Trung bình ${fmtVND(avgPerMonth)}/tháng (${activeMonths} tháng có mua sắm).`,
        peakMonthItems
      ];

      if (isCurrentYear) {
        const recent1m = fmtVND(d.ps?.['1m'] || 0);
        const recent3m = fmtVND(d.ps?.['3m'] || 0);
        contextLines.push(`Gần đây: 1 tháng qua ${recent1m}, 3 tháng qua ${recent3m}.`);
        if (lastActiveMonth) {
          contextLines.push(`Tháng hiện tại: tháng ${currentMonth}/${currentYear}. Tháng gần nhất có dữ liệu: tháng ${lastActiveMonth}.`);
        }
      } else {
        contextLines.push(`Lưu ý: Đây là dữ liệu của năm ${yr}, cách đây ${yearDiff} năm (năm hiện tại là ${currentYear}).`);
        if (lastActiveMonth) {
          contextLines.push(`Tháng cuối cùng có dữ liệu trong năm ${yr}: tháng ${lastActiveMonth}.`);
        }
      }

      let specificPrompt;
      if (isCurrentYear) {
        specificPrompt = `This is the spend data for THIS current year (${yr}):
1. Identify the exact month with the highest total spend. Based on the monthly total and order count, analyze whether they went broke due to purchasing 1-2 high-value items (like tech gadgets) or due to an addiction to ordering dozens of micro-items. Name 1 representative product bought in that month.
2. Propose advice on setting a specific budget limit for months with similar characteristics (such as mega-sale months, birthday months) to avoid repeating this mistake.
Requirements: Output in VIETNAMESE. Structure into 2 paragraphs: Paragraph 1 analyzes the peak month, Paragraph 2 gives budget limits advice. Use **bold** for the month name, product name, and budget numbers.`;
      } else if (isLastYear) {
        specificPrompt = `This is the spend data for LAST year (${yr}):
1. Identify the exact month with the highest total spend. Analyze if the high spend was due to high-value purchases or ordering dozens of micro-items. Name 1 representative product from that month.
2. Draw a concrete lesson for this year (${currentYear})—are there seasonal/holiday shopping habits where they should set budget limits in advance?
Requirements: Output in VIETNAMESE. Structure into 2 paragraphs. Use **bold** for the month name, product name, and main advice.`;
      } else {
        specificPrompt = `This is the spend data from ${yearDiff} years ago (${yr}):
1. Identify the month with the highest spend, and analyze the root cause (major purchase vs. micro-orders). Name 1 representative product.
2. Reflect on the seasonal patterns in their shopping behavior back then, and suggest whether this habit might be repeating in recent years.
Requirements: Output in VIETNAMESE. Write in 2 clear paragraphs. Use **bold** for the month name and important observations.`;
      }

      enrichWithAI('insight-monthly',
        contextLines.filter(Boolean).join(' '),
        specificPrompt,
        `insight-monthly-${yr}`
      );
    }

    function getItemsForYear(mi, year, tiItems) {
      const prefix = year + '-';

      // Build name→cat lookup from the already-classified global tiItems.
      // mi item names are truncated to 40 chars at source; ti names to 45 chars.
      // Use a 40-char prefix as key so both sides align on the same substring.
      const catLookup = {};
      for (const item of (tiItems || [])) {
        if (item.cat && item.cat !== '🏷️ Khác') {
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
            // 1. Prefer tiItems classification (matched on 40-char prefix)
            if (catLookup[k40]) {
              map[k].cat = catLookup[k40];
            // 2. Fallback to cache (try both full key and 40-char prefix)
            } else if (_dashCache.cats[k] || _dashCache.cats[k40]) {
              map[k].cat = _dashCache.cats[k] || _dashCache.cats[k40];
            // 3. Keyword classification for items not in tiItems top list
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

    function triggerCategoryAIInsight(cs, ti, total, cacheKey) {
      const filteredCs = (cs || []).filter(c => c.name !== '🏷️ Khác' && c.name !== 'Khác');
      if (!filteredCs.length) return;
      const catLines = filteredCs.map(c => {
        const pct = Math.round((c.s / Math.max(total || 1, 1)) * 100);
        const catItems = (ti || []).filter(i => i.cat === c.name).slice(0, 2);
        const catItemStr = catItems.length > 0 ? ` (vd: ${catItems.map(i => `"${i.n}"`).join(', ')})` : '';
        return `${c.name}: ${fmtVND(c.s)} (${pct}%, ${c.c} lượt)${catItemStr}`;
      }).join('; ');
      enrichWithAI('insight-categories',
        `Phân bổ chi tiêu theo danh mục: ${catLines}.`,
        `Ignore the category '🏷️ Khác' entirely:
1. Find the category with the highest percentage (%) of total spend and label it as the 'spending trap'.
2. You MUST cite the exact names of 2 specific products purchased under this category as evidence of overspending.
3. Based on the nature of these 2 products (essential need vs. impulse buy for fun), suggest a financial brake rule (e.g., the 24-hour waiting rule before checking out).
Requirements: Output in VIETNAMESE. Format into 2 paragraphs: Paragraph 1 identifies the spending trap with product evidence, Paragraph 2 proposes the financial brake rule. Use **bold** for category names, product names, and rule names.`,
        cacheKey
      );
    }

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

      renderCategories(cs, ti);
      renderInsightCard('insight-categories', computeCategoryInsights(cs, total));

      if (_categorizationFinished) {
        const key = year === 'all' ? 'insight-categories-all' : `insight-categories-${year}`;
        triggerCategoryAIInsight(cs, ti, total, key);
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
      console.log('[Dashboard] Setting up AI insight buttons...');
      const years = Object.keys(d.yd || {}).map(Number).sort((a, b) => b - a);
      const curYear = years[0];
      const prevYear = years[1];
      const avgOrderValue = Math.round((d.t || 0) / Math.max(d.o || 1, 1));
      const savingsRate = Math.round(((d.s || 0) / Math.max((d.t || 0) + (d.s || 0), 1)) * 100);

      let yoyLine = '';
      if (curYear && prevYear && d.yd[prevYear]?.t > 0) {
        const pct = Math.round(((d.yd[curYear].t - d.yd[prevYear].t) / d.yd[prevYear].t) * 100);
        yoyLine = `Năm ${curYear} ${pct >= 0 ? 'tăng' : 'giảm'} ${Math.abs(pct)}% so với năm ${prevYear}.`;
      }

      // 1. Yearly overview AI insight
      const yearSummaryLines = Object.entries(d.yd || {})
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([yr, yd]) => {
          const saved = Math.round(Math.max(0, (yd.s || 0)));
          const total = yd.t || 0;
          const saveRatePct = total > 0 ? Math.round((saved / (total + saved)) * 100) : 0;
          return `Năm ${yr}: chi ${fmtVND(total)} / ${fmtNum(yd.o || 0)} đơn / tiết kiệm ${fmtVND(saved)} (${saveRatePct}% giá gốc)`;
        });
      enrichWithAI('insight-yearly',
        [
          `Tổng chi: ${fmtVND(d.t)} / ${fmtNum(d.o)} đơn / trung bình ${fmtVND(avgOrderValue)}/đơn.`,
          `Tiết kiệm voucher toàn lịch sử: ${fmtVND(d.s)} (${savingsRate}% giá gốc).`,
          `Lịch sử từng năm: ${yearSummaryLines.join('; ')}.`,
          yoyLine
        ].filter(Boolean).join(' '),
        `Based on the total spend, order count, and voucher savings data:
1. Compare the year with the highest spend against the other historical years.
2. Evaluate the purchasing efficiency: if the order count is extremely high but total savings (from vouchers) is a tiny fraction of the total spend, criticize the habit of buying minor items frequently without utilizing discount codes.
3. Propose a specific order bundling rule to increase the savings rate for the upcoming year.
Requirements: Output in VIETNAMESE. Write in distinct paragraphs. Use **bold** for key numbers and major remarks.`
      );

      // 2. Items AI insight
      const top10 = (d.ti || []).slice(0, 10);
      const top5sum = top10.slice(0, 5).reduce((s, i) => s + i.s, 0);
      const concentration = Math.round((top5sum / Math.max(d.t || 1, 1)) * 100);
      const itemLines = top10.map(i => {
        const avgP = i.c > 0 ? Math.round(i.s / i.c) : i.s;
        return `"${i.n}": tổng ${fmtVND(i.s)}, ${i.c} lần mua (~${fmtVND(avgP)}/lần)`;
      }).join('; ');
      const mostRepeat = [...top10].sort((a, b) => b.c - a.c)[0];
      const repeatNote = mostRepeat && mostRepeat.c > 2
        ? `Mua lặp nhiều nhất: "${mostRepeat.n}" (${mostRepeat.c} lần).`
        : '';
      enrichWithAI('insight-items',
        [
          `Danh sách sản phẩm đã mua: ${itemLines}.`,
          `Top 5 chiếm ${concentration}% tổng chi.`,
          repeatNote
        ].filter(Boolean).join(' '),
        `Scan the top spend products list:
1. Explicitly name the product with the highest total spend. Evaluate whether this was a worthy investment or an impulsive purchase.
2. Identify the product with the highest repeat purchase count. Satirize the habit of buying this item in separate small orders. Instruct them to switch to buying in combos/bulk or choosing a larger volume/capacity to optimize the average cost per purchase.
Requirements: Output in VIETNAMESE. Structure the analysis into 2 separate paragraphs. Use **bold** for product names and key numbers.`
      );

      // 3. Categories AI insight — only for 'all' view; year-specific handled by switchCategoryYear
      if (_activeCatYear === 'all') {
        triggerCategoryAIInsight(d.cs, d.ti, d.t, 'insight-categories-all');
      }

      // 4. Monthly insight for current active year
      if (_activeYear) {
        triggerMonthlyAIInsight(d, _activeYear);
      }
    }

    async function initDashboard() {
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

      // 1. Apply cached AI overrides from previous sessions
      for (const item of tiItems) {
        if (item.cat) continue;
        const key = item.n.toLowerCase().substring(0, 120);
        if (_dashCache.cats[key]) item.cat = _dashCache.cats[key];
      }

      // 2. Initialize with default category for unclassified items
      for (const item of tiItems) {
        if (!item.cat) item.cat = '🏷️ Khác';
      }

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
      const alreadyCategorized = tiItems.every(item => item.cat !== '🏷️ Khác');
      if (!alreadyCategorized) {
        try {
          let hasUpdates = false;
          for (const item of tiItems) {
            if (item.cat === '🏷️ Khác') {
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
            // Persist progress so partial results survive a page refresh
            saveDataToStorage(d);
            console.log('[Dashboard] Categories updated after async keyword classification');
          }
        } catch (error) {
          console.error('[Dashboard] Error in async keyword classification:', error);
        }

        // 6. Run AI category classification if any remaining '🏷️ Khác' items
        const uncategorizedCount = tiItems.filter(item => item.cat === '🏷️ Khác').length;
        if (uncategorizedCount > 0) {
          console.log(`[Dashboard] Running AI category classification for ${uncategorizedCount} items...`);
          try {
            await classifyKharItems(tiItems, d);
          } catch (e) {
            console.error('[Dashboard] AI category classification failed:', e);
          }
        }
      } else {
        console.log('[Dashboard] All items already categorized (loaded from storage) — skipping classification');
      }

      // 7. Categorization is now 100% finished — update final state
      _categorizationFinished = true;
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
