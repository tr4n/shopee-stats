document.addEventListener('DOMContentLoaded', () => {
  // === Element References ===
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const btnClearCache = document.getElementById('btn-clear-cache');
  const btnOpenDashboard = document.getElementById('btn-open-dashboard');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

  const stateInitial = document.getElementById('initial-state');
  const stateLoading = document.getElementById('loading-state');
  const stateResult = document.getElementById('result-state');

  const errorMessage = document.getElementById('error-message');
  const progressText = document.getElementById('progress-text');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const cacheInfo = document.getElementById('cache-info');
  const cacheBadgeText = document.getElementById('cache-badge-text');

  // Debug elements
  const debugPanel = document.getElementById('debug-panel');
  const debugHeartbeat = document.getElementById('debug-heartbeat');
  const debugTimerEl = document.getElementById('debug-timer');
  const debugUrl = document.getElementById('debug-url');
  const debugStatus = document.getElementById('debug-status');

  // Debug panel removed for Chrome Web Store compliance

  const totalSpentEl = document.getElementById('total-spent');
  const rankBadgeEl = document.getElementById('rank-badge');
  const trendRowEl = document.getElementById('trend-row');
  const percentileRowEl = document.getElementById('percentile-row');
  const percentileTextEl = document.getElementById('percentile-text');

  // === App State ===
  let cacheData = null;
  let lastCompleteData = null;
  let lastHeartbeat = null;
  let heartbeatCount = 0;
  let analysisStartTime = null;
  let debugTimerInterval = null;

  // === App Config ===
  const authorInfoEl = document.getElementById('author-info');
  if (authorInfoEl && window.APP_CONFIG) {
    authorInfoEl.innerHTML = `${window.APP_CONFIG.authorIcon} <a href="${window.APP_CONFIG.authorLink}" target="_blank" style="color: var(--primary); text-decoration: none;">${window.APP_CONFIG.authorText}</a>`;
  }

  // === Theme ===
  const SVGS = {
    sun: '<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.366a1 1 0 011.415 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM17 10a1 1 0 110 2h-1a1 1 0 110-2h1zm-2.414 5.657a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-5.657-2.414a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 10a1 1 0 110-2H3a1 1 0 110 2h1zm2.366-5.657a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zM10 5a5 5 0 100 10 5 5 0 000-10z" clip-rule="evenodd"></path>',
    moon: '<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>'
  };
  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeIcon.innerHTML = SVGS.sun;
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeIcon.innerHTML = SVGS.moon;
    }
  }
  chrome.storage.local.get(['theme'], (r) => applyTheme(r.theme === 'dark'));
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(!isDark);
    chrome.storage.local.set({ theme: isDark ? 'light' : 'dark' });
  });

  // === Helpers ===
  function pxgPrice(number) {
    if (isNaN(number)) return 0;
    const n = Math.round(number);
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + 'b';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'm';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'k';
    return n.toLocaleString('vi-VN');
  }
  function getRankBadge(pri) {
    if (pri <= 10000000) return 'Khách Tập Sự 👶';
    else if (pri <= 50000000) return 'Khách Quen 🤝';
    else if (pri < 80000000) return 'Tín Đồ Cuồng Nhiệt 👑';
    else return 'Cổ Đông Chiến Lược 💎';
  }
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function getSelectedListType() {
    return 3;
  }

  // === Percentile ===
  const PERCENTILE_THRESHOLDS = [
    { max: 1000000, beat: 10 },
    { max: 3000000, beat: 25 },
    { max: 8000000, beat: 45 },
    { max: 20000000, beat: 65 },
    { max: 50000000, beat: 82 },
    { max: 100000000, beat: 93 },
    { max: Infinity, beat: 99 }
  ];
  function getSpendingPercentile(annualSpent) {
    for (const t of PERCENTILE_THRESHOLDS) {
      if (annualSpent <= t.max) return t.beat;
    }
    return 99;
  }

  // === Top Items Period Filter ===
  function computeTopItemsForPeriod(miniOrders, cutoffTs) {
    const itemMap = {};
    let hasIlData = false;
    for (const order of miniOrders) {
      if (cutoffTs > 0 && order.ts < cutoffTs) continue;
      if (!Array.isArray(order.il)) continue;
      hasIlData = true;
      for (const item of order.il) {
        if (!item.i) continue;
        if (!itemMap[item.i]) itemMap[item.i] = { name: item.n, spent: 0, count: 0 };
        itemMap[item.i].spent += item.s;
        itemMap[item.i].count += item.c;
      }
    }
    const items = Object.values(itemMap).sort((a, b) => b.spent - a.spent).slice(0, 5);
    return { items, hasIlData };
  }

  // === Cache Management ===
  function isCacheValid(cache) {
    if (!cache || !cache.lastUpdated || !Array.isArray(cache.miniOrders)) return false;
    // Require il field (item list) on cached orders so period filter works without re-stat.
    // Old cache format (with sl/shop data) is automatically invalidated here.
    if (cache.miniOrders.length > 0 && !cache.miniOrders.some(o => Array.isArray(o.il))) return false;
    return true;
  }

  function checkCacheInfo(listType) {
    chrome.storage.local.get(['shopee_cache'], (result) => {
      const cache = result.shopee_cache;
      if (cache && cache.listType === listType && isCacheValid(cache)) {
        cacheData = cache;
        const elapsedMin = Math.round((Date.now() / 1000 - (cache.fetchTime || cache.lastUpdated)) / 60);
        let timeStr;
        if (elapsedMin < 60) timeStr = `${elapsedMin} phút trước`;
        else if (elapsedMin < 1440) timeStr = `${Math.round(elapsedMin / 60)} giờ trước`;
        else timeStr = `${Math.round(elapsedMin / 1440)} ngày trước`;
        cacheBadgeText.textContent = `${cache.miniOrders.length.toLocaleString()} đơn · ${timeStr}`;
        cacheInfo.classList.remove('hidden');
      } else {
        // Silently drop old-format cache so next run does a full re-fetch
        if (cache && !isCacheValid(cache)) chrome.storage.local.remove(['shopee_cache']);
        cacheData = null;
        cacheInfo.classList.add('hidden');
      }
    });
  }

  checkCacheInfo(3);
  btnClearCache.addEventListener('click', () => {
    chrome.storage.local.remove(['shopee_cache'], () => {
      cacheData = null;
      cacheInfo.classList.add('hidden');
    });
  });



  // === State ===
  function showState(stateEl) {
    stateInitial.classList.remove('active');
    stateLoading.classList.remove('active');
    stateResult.classList.remove('active');
    stateEl.classList.add('active');
  }
  function resetProgress() {
    progressBarFill.style.width = '0%';
    progressBarFill.classList.remove('indeterminate');
    progressText.textContent = 'Vui lòng chờ trong giây lát';


    // Reset heartbeat tracking
    lastHeartbeat = null;
    heartbeatCount = 0;
    analysisStartTime = null;

    if (debugTimerInterval) {
      clearInterval(debugTimerInterval);
      debugTimerInterval = null;
    }

    // Reset debug info
    if (debugHeartbeat) debugHeartbeat.textContent = 'Chưa có';
    if (debugTimerEl) debugTimerEl.textContent = '0s';
    if (debugUrl) debugUrl.textContent = '-';
    if (debugStatus) debugStatus.textContent = 'Đang khởi tạo';
  }


  // === Restart / Cancel ===
  const btnCancelDebug = document.getElementById('btn-cancel-debug');
  if (btnCancelDebug) {
    btnCancelDebug.addEventListener('click', () => {
      showState(stateInitial);
    });
  }

  btnRestart.addEventListener('click', () => {
    showState(stateInitial);
    errorMessage.textContent = '';
    checkCacheInfo(getSelectedListType());
  });

  // === Dashboard URL ===
  const DASHBOARD_BASE = 'https://tr4n.github.io/shopee-stats/dashboard';

  // === Item name cleaning — done here so dashboard receives minimal, display-ready data ===

  // Noise words sorted by length DESC (longer phrases must match before their substrings)
  const NOISE_WORDS = [
    'freeship extra plus', 'miễn phí vận chuyển', 'giao hỏa tốc 2h', 'cam kết chính hãng',
    'bảo hành trọn đời', 'hoàn xu extra', 'ship hỏa tốc', 'hỏa tốc 2h', 'freeship extra',
    'rẻ vô địch', 'giá hủy diệt', 'mua 1 tặng 1', 'flash sale', 'date mới nhất',
    'hàng nội địa', 'nguyên seal', 'chính ngạch', 'tận xưởng', 'hot trend', 'siêu hot',
    'mẫu mới', 'xịn xò', 'cực xinh',
    'khuyến mãi', 'giảm giá', 'flashsale', 'siêu sale', 'deal sốc', 'hoàn xu',
    'quà tặng', 'tặng kèm', 'kèm quà', 'thanh lý', 'xả hàng', 'xả kho',
    'giá sỉ', 'sỉ lẻ', 'chuẩn auth', 'hàng chuẩn', 'bảo hành', 'cam kết',
    'tem phụ', 'loại 1', 'giao ngay', 'siêu tốc', 'hỏa tốc', 'nowship', 'xách tay',
    'date mới', 'fullbox', 'cao cấp', 'chính hãng', 'nhập khẩu',
    'freeship', 'authentic', 'hoàn tiền', 'uy tín',
    'auth', 'real', 'fake', 'grab', 'ship', 'mới nhất', 'new', 'cũ', 'trend', 'hot', 'deal', 'sale', 'mới'
  ].sort((a, b) => b.length - a.length);

  function compactItemName(name) {
    let s = String(name || '');
    // Strip bracket content (promotional tags)
    s = s.replace(/\[.*?\]|\(.*?\)|\{.*?\}/g, ' ');
    // Strip special chars / emoji, keep letters + numbers
    s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ').toLowerCase();
    // Remove noise words (longest first to avoid partial clashes)
    for (const w of NOISE_WORDS) {
      const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      s = s.replace(new RegExp('\\b' + esc + '\\b', 'g'), ' ');
    }
    s = s.replace(/\s+/g, ' ').trim();
    // Drop single-char tokens
    const words = s.split(' ').filter(w => w.length > 1);
    const result = words.join(' ');
    // Capitalize first character for display
    return result ? result[0].toUpperCase() + result.slice(1) : '';
  }

  function buildDashboardUrl(data) {
    // Build monthly items aggregation
    const monthMap = {};
    for (const order of (data.cachePayload?.miniOrders || [])) {
      if (!order.ts) continue;
      const d = new Date(order.ts * 1000);
      const ym = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!monthMap[ym]) monthMap[ym] = {};
      for (const item of (order.il || [])) {
        if (!item.i) continue;
        if (!monthMap[ym][item.i]) monthMap[ym][item.i] = { n: item.n, s: 0, c: 0 };
        monthMap[ym][item.i].s += item.s;
        monthMap[ym][item.i].c += item.c;
      }
    }
    const mi = {};
    for (const [ym, map] of Object.entries(monthMap)) {
      mi[ym] = Object.values(map)
        .sort((a, b) => b.s - a.s)
        .slice(0, 20)
        .map(x => ({ n: compactItemName(x.n).substring(0, 40), s: Math.round(x.s), c: x.c }));
    }

    // Build yearly stats
    const yd = {};
    for (const [yr, ydata] of Object.entries(data.thongKeTheoNam || {})) {
      yd[yr] = {
        t: Math.round(ydata.total.tongTien),
        o: ydata.total.donHang,
        ip: ydata.total.sanPham,
        s: Math.round(Math.max(0, ydata.total.tienChuaGiam - ydata.total.tongTien)),
        m: Object.fromEntries(
          Object.entries(ydata.months).map(([mo, md]) => [mo, Math.round(md.tongTien)])
        )
      };
    }

    const ps = data.thongKeTheoThang || {};
    const payload = {
      v: 1,
      t: Math.round(data.tongtienhang),
      o: data.tongDonHang,
      s: Math.round(Math.max(0, data.tongTienTietKiem)),
      ip: data.tongSanPhamDaMua,
      ship: Math.round(data.tongPhiShip || 0),
      ts: Math.floor(Date.now() / 1000),
      yd,
      mi,
      ps: {
        '1m': Math.round((ps['1_thang'] || {}).tongTien || 0),
        '3m': Math.round((ps['3_thang'] || {}).tongTien || 0),
        '6m': Math.round((ps['6_thang'] || {}).tongTien || 0),
        '1y': Math.round((ps['1_nam'] || {}).tongTien || 0)
      },
      // Top 150 items — names pre-cleaned, dashboard classifies categories
      ti: (data.topItems || []).slice(0, 150).map(i => ({
        n: compactItemName(i.name).substring(0, 45),
        s: Math.round(i.spent),
        c: i.count
      }))
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return `${DASHBOARD_BASE}/#d=${encoded}`;
  }

  function openDashboardWithData(data) {
    try {
      chrome.tabs.create({ url: buildDashboardUrl(data) });
    } catch (e) {
      console.error('[Popup] Failed to build dashboard URL:', e);
      chrome.tabs.create({ url: DASHBOARD_BASE });
    }
  }

  // === Open Dashboard ===
  if (btnOpenDashboard) {
    btnOpenDashboard.addEventListener('click', () => {
      if (lastCompleteData) {
        openDashboardWithData(lastCompleteData);
      } else {
        chrome.tabs.create({ url: DASHBOARD_BASE + '/' });
      }
    });
  }

  // === Start Extractor ===
  btnStart.addEventListener('click', async () => {
    errorMessage.textContent = '';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        errorMessage.textContent = '❌ Không thể xác định tab hiện tại. Vui lòng thử lại.';
        return;
      }

      console.log('[ShopeeAnalytics] Current tab URL:', tab.url);

      if (!tab.url.includes('shopee.vn')) {
        errorMessage.innerHTML = '❌ Bạn cần truy cập vào trang <a href="#" id="link-go-to-shopee" style="color: var(--primary); text-decoration: underline; font-weight: bold; cursor: pointer;">Shopee.vn</a> để sử dụng tiện ích này.';
        document.getElementById('link-go-to-shopee').addEventListener('click', (e) => {
          e.preventDefault();
          chrome.tabs.create({ url: 'https://shopee.vn' });
        });
        return;
      }

      // Additional URL checks
      if (tab.url.includes('chrome-extension://') || tab.url.includes('chrome://') || tab.url.includes('moz-extension://')) {
        errorMessage.textContent = '❌ Extension không thể chạy trên các trang hệ thống. Vui lòng mở trang Shopee.vn thông thường.';
        return;
      }
      resetProgress();
      showState(stateLoading);

      // Start debug tracking
      analysisStartTime = Date.now();
      if (debugUrl) debugUrl.textContent = tab.url;
      if (debugStatus) debugStatus.textContent = 'Khởi tạo extension';

      // Update timer every second
      debugTimerInterval = setInterval(() => {
        if (analysisStartTime && debugTimerEl) {
          const elapsed = Math.floor((Date.now() - analysisStartTime) / 1000);
          debugTimerEl.textContent = `${elapsed}s`;
        }
      }, 1000);

      const listType = getSelectedListType();
      const useCache = cacheData && cacheData.listType === listType && isCacheValid(cacheData);
      const configPayload = {
        listType,
        lastUpdated: useCache ? (cacheData.lastUpdated || 0) : 0,
        miniOrders: useCache ? cacheData.miniOrders : [],
        itemMap: useCache && cacheData.itemMap ? cacheData.itemMap : {}
      };

      if (debugStatus) debugStatus.textContent = 'Đang lưu cấu hình...';
      await new Promise((resolve) => {
        chrome.storage.local.set({ 'shopee_temp_config': configPayload }, resolve);
      });

      try {
        if (debugStatus) debugStatus.textContent = 'Đang tải bridge script...';
        // Inject bridge first in MAIN world so fetch calls are native page requests (avoids 403)
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/bridge.js'],
          world: 'MAIN'
        });
        console.log('[ShopeeAnalytics] Bridge script injected (MAIN world)');

        if (debugStatus) debugStatus.textContent = 'Đang tải content script...';
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] });
        console.log('[ShopeeAnalytics] Content script injected successfully');
        if (debugStatus) debugStatus.textContent = 'Đang chờ phản hồi từ content script...';

      } catch (e) {
        console.error('[ShopeeAnalytics] Failed to inject content script:', e);
        throw new Error('Lỗi khi tải content script. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('[ShopeeAnalytics] Popup script execution error:', err);


      showState(stateInitial);
      errorMessage.textContent = 'Đã có lỗi xảy ra. Hãy tải lại trang Shopee và thử lại nhé.';
    }
  });

  // === Message Listener ===
  chrome.runtime.onMessage.addListener((message) => {
    console.log('[ShopeeAnalytics] Received message in popup:', message.type);


    if (message.type === 'progress') {
      const processed = message.processed || 0;
      const pct = typeof message.pct === 'number' ? message.pct : -1;
      if (pct >= 0) {
        progressBarFill.classList.remove('indeterminate');
        progressBarFill.style.width = pct + '%';
        progressText.textContent = `Đã xử lý ${processed.toLocaleString()}/${(message.total || 0).toLocaleString()} đơn (${pct}%)`;
      } else {
        progressBarFill.classList.add('indeterminate');
        const heartbeatInfo = lastHeartbeat ? ` [❤️ ${heartbeatCount}]` : '';
        progressText.textContent = `Đã xử lý ${processed.toLocaleString()} đơn hàng...${heartbeatInfo}`;
      }
    } else if (message.type === 'heartbeat') {
      // Update heartbeat info
      lastHeartbeat = Date.now();
      heartbeatCount++;
      console.log(`[ShopeeAnalytics] Heartbeat received #${heartbeatCount}`);

      // Update debug info
      if (debugHeartbeat) debugHeartbeat.textContent = `${heartbeatCount} nhịp (${new Date(lastHeartbeat).toLocaleTimeString()})`;
      if (debugStatus) debugStatus.textContent = 'Content script đang chạy bình thường';

      // Update progress text to show script is alive
      if (progressText.textContent.includes('đơn hàng')) {
        const currentText = progressText.textContent.replace(/\s*\[❤️.*?\]/, '');
        progressText.textContent = `${currentText} [❤️ ${heartbeatCount}]`;
      }
    } else if (message.type === 'error') {
      console.error('[ShopeeAnalytics] Error returned from content script:', message.message);



      if (debugTimerInterval) {
        clearInterval(debugTimerInterval);
        debugTimerInterval = null;
      }

      if (debugStatus) debugStatus.textContent = 'Lỗi: ' + (message.message || 'Không xác định');

      showState(stateInitial);

      const errorMsg = message.message || 'Đã có lỗi khi tổng hợp dữ liệu.';

      if (errorMsg.includes('đăng nhập')) {
        errorMessage.innerHTML = `<div class="error-card">
          <div class="error-card-icon">❌</div>
          <div class="error-card-title">${escapeHtml(errorMsg)}</div>
          <div class="error-card-body">
            <strong>💡 Giải pháp:</strong><br>
            1. Đăng nhập lại tài khoản Shopee<br>
            2. Tải lại trang (F5) và thử lại
          </div>
        </div>`;
      } else if (errorMsg.includes('403') || errorMsg.includes('Shopee từ chối')) {
        errorMessage.innerHTML = `<div class="error-card">
          <div class="error-card-icon">🚫</div>
          <div class="error-card-title">${escapeHtml(errorMsg)}</div>
          <div class="error-card-body">
            <strong>💡 Giải pháp:</strong><br>
            1. Tải lại trang Shopee (F5)<br>
            2. Đảm bảo đã đăng nhập Shopee<br>
            3. Bấm "Bắt Đầu Thống Kê" lại
          </div>
        </div>`;
      } else {
        errorMessage.innerHTML = `<div class="error-card">
          <div class="error-card-icon">⚠️</div>
          <div class="error-card-title">${escapeHtml(errorMsg)}</div>
          <div class="error-card-body">
            Tải lại trang Shopee và thử lại nhé.
          </div>
        </div>`;
      }
    } else if (message.type === 'complete') {

      if (debugTimerInterval) {
        clearInterval(debugTimerInterval);
        debugTimerInterval = null;
      }

      if (debugStatus) debugStatus.textContent = 'Hoàn thành thành công!';

      if (message.data && message.data.cachePayload) {
        chrome.storage.local.set({ shopee_cache: message.data.cachePayload }, () => {
          if (chrome.runtime.lastError) console.warn('Cache save failed:', chrome.runtime.lastError.message);
        });
      }
      renderResults(message.data);
    }
  });



  // === Render Results ===
  function renderResults(data) {
    lastCompleteData = data;

    totalSpentEl.textContent = pxgPrice(data.tongtienhang);
    rankBadgeEl.textContent = getRankBadge(data.tongtienhang);

    renderTrendBadges(data.thongKeTheoNam);
    renderPercentile(data.thongKeTheoNam);

    showState(stateResult);
  }

  // === Trend Badges ===
  function renderTrendBadges(thongKeTheoNam) {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1);
    const prevMonth = String(now.getMonth() === 0 ? 12 : now.getMonth());
    const prevMonthYear = now.getMonth() === 0 ? curYear - 1 : curYear;
    const prevYear = curYear - 1;

    const curMonthVal = thongKeTheoNam[curYear]?.months?.[curMonth]?.tongTien || 0;
    const prevMonthVal = thongKeTheoNam[prevMonthYear]?.months?.[prevMonth]?.tongTien || 0;
    const curYearVal = thongKeTheoNam[curYear]?.total?.tongTien || 0;
    const prevYearVal = thongKeTheoNam[prevYear]?.total?.tongTien || 0;

    const badges = [];
    if (curMonthVal > 0 && prevMonthVal > 0) {
      const diff = ((curMonthVal - prevMonthVal) / prevMonthVal) * 100;
      const up = diff >= 0;
      badges.push(`<span class="trend-badge ${up ? 'trend-up' : 'trend-down'}">${up ? '▲' : '▼'} ${Math.abs(diff).toFixed(0)}% tháng ${prevMonth}</span>`);
    }
    if (curYearVal > 0 && prevYearVal > 0) {
      const diff = ((curYearVal - prevYearVal) / prevYearVal) * 100;
      const up = diff >= 0;
      badges.push(`<span class="trend-badge ${up ? 'trend-up' : 'trend-down'}">${up ? '▲' : '▼'} ${Math.abs(diff).toFixed(0)}% năm ${prevYear}</span>`);
    }

    if (badges.length > 0) {
      trendRowEl.innerHTML = badges.join('');
      trendRowEl.classList.remove('hidden');
    } else {
      trendRowEl.classList.add('hidden');
    }
  }

  // === Percentile ===
  function renderPercentile(thongKeTheoNam) {
    const curYear = new Date().getFullYear();
    const annualSpent = thongKeTheoNam[curYear]?.total?.tongTien || 0;
    if (annualSpent > 0) {
      const beat = getSpendingPercentile(annualSpent);
      percentileTextEl.textContent = `Chi tiêu nhiều hơn ~${beat}% người dùng Shopee VN (ước tính ${curYear})`;
      percentileRowEl.classList.remove('hidden');
    } else {
      percentileRowEl.classList.add('hidden');
    }
  }
});
