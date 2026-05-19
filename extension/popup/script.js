document.addEventListener('DOMContentLoaded', () => {
  // === Element References ===
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnClearCache = document.getElementById('btn-clear-cache');
  const btnShareCard = document.getElementById('btn-share-card');
  const btnShareLink = document.getElementById('btn-share-link');
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

  // Show debug panel only in development mode (Load unpacked)
  if (chrome.management && chrome.management.getSelf) {
    chrome.management.getSelf((info) => {
      if (info.installType === 'development' && debugPanel) {
        debugPanel.style.display = 'block';
      }
    });
  }

  const totalSpentEl = document.getElementById('total-spent');
  const rankBadgeEl = document.getElementById('rank-badge');
  const trendRowEl = document.getElementById('trend-row');
  const percentileRowEl = document.getElementById('percentile-row');
  const percentileTextEl = document.getElementById('percentile-text');

  // === App State ===
  let cacheData = null;
  let lastCompleteData = null;
  let analysisTimeout = null;
  let lastHeartbeat = null;
  let heartbeatCount = 0;
  let analysisStartTime = null;
  let debugTimerInterval = null;

  // === App Config ===
  const authorInfoEl = document.getElementById('author-info');
  if (authorInfoEl && window.APP_CONFIG) {
    authorInfoEl.innerHTML = `${window.APP_CONFIG.authorIcon} <a href="mailto:${window.APP_CONFIG.authorEmail}" style="color: var(--primary); text-decoration: none;">${window.APP_CONFIG.authorEmail}</a>`;
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
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' tỷ';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'tr';
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
    { max: 1000000,   beat: 10 },
    { max: 3000000,   beat: 25 },
    { max: 8000000,   beat: 45 },
    { max: 20000000,  beat: 65 },
    { max: 50000000,  beat: 82 },
    { max: 100000000, beat: 93 },
    { max: Infinity,  beat: 99 }
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
    
    // Clear any existing timeout
    if (analysisTimeout) {
      clearTimeout(analysisTimeout);
      analysisTimeout = null;
    }
    
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
  
  function startAnalysisTimeout() {
    // Set a 90-second timeout for the analysis (increased from 60s)
    console.log('[ShopeeAnalytics] Starting 90-second timeout timer');
    analysisTimeout = setTimeout(() => {
      console.warn('[ShopeeAnalytics] Analysis timed out after 90 seconds');
      
      // Try to get more debug info
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              console.log('[ShopeeAnalytics DEBUG] Current page URL:', window.location.href);
              console.log('[ShopeeAnalytics DEBUG] Shopee config exists:', !!window.__shopeeConfig);
              console.log('[ShopeeAnalytics DEBUG] Network connectivity test...');
              fetch('https://shopee.vn/api/v1/ping', { method: 'GET' })
                .then(r => console.log('[ShopeeAnalytics DEBUG] Network test result:', r.status))
                .catch(e => console.log('[ShopeeAnalytics DEBUG] Network test failed:', e));
            },
            world: 'MAIN'
          }).catch(e => console.log('[ShopeeAnalytics DEBUG] Failed to run debug script:', e));
        }
      });
      
      showState(stateInitial);
      errorMessage.innerHTML = '⏰ <strong>Quá trình thống kê đã hết thời gian chờ (10 phút).</strong><br><br>' +
        'Điều này có thể do:<br>' +
        '• <strong>Kết nối mạng chậm</strong> - Kiểm tra internet<br>' +
        '• <strong>Số lượng đơn hàng quá lớn</strong> - Quá trình có thể mất nhiều thời gian<br>' +
        '• <strong>Phiên đăng nhập Shopee hết hạn</strong> - Đăng nhập lại<br>' +
        '• <strong>Content script không chạy</strong> - Kiểm tra console (F12)<br><br>' +
        '🔍 <strong>Debug:</strong> Mở Developer Tools (F12) và kiểm tra Console tab để xem lỗi chi tiết.<br><br>' +
        'Vui lòng tải lại trang Shopee và thử lại.';
      
      analysisTimeout = null;
    }, 60000 * 10); // 10 minutes timeout (increased from 90 seconds)
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

  // === Export CSV ===
  if (btnExportCsv) btnExportCsv.addEventListener('click', () => { if (lastCompleteData) exportCSV(lastCompleteData); });
  function exportCSV(data) {
    const rows = [['Năm', 'Tháng', 'Số đơn', 'Sản phẩm', 'Tổng chi tiêu (VND)', 'Giá gốc (VND)', 'Tiết kiệm (VND)']];
    const sortedYears = Object.keys(data.thongKeTheoNam).sort((a, b) => b - a);
    for (const year of sortedYears) {
      const yData = data.thongKeTheoNam[year];
      for (const month of Object.keys(yData.months).sort((a, b) => b - a)) {
        const m = yData.months[month];
        const saved = m.tienChuaGiam - m.tongTien;
        rows.push([year, month, m.donHang, m.sanPham, Math.round(m.tongTien), Math.round(m.tienChuaGiam), Math.round(saved > 0 ? saved : 0)]);
      }
    }
    const bom = '\uFEFF';
    const blob = new Blob([bom + rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'shopee_thong_ke.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // === Share Card ===
  if (btnShareCard) btnShareCard.addEventListener('click', async () => {
    if (!lastCompleteData) return;
    const orig = btnShareCard.textContent;
    btnShareCard.textContent = 'Đang tạo...';
    btnShareCard.disabled = true;
    try {
      const dataUrl = await window.generateShareCard(lastCompleteData, getSpendingPercentile);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'shopee-analytics.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Share card error:', err);
    } finally {
      btnShareCard.textContent = orig;
      btnShareCard.disabled = false;
    }
  });

  // === Share Link & Dashboard URLs ===
  const SHARE_PAGE_BASE = 'https://tr4n.github.io/shopee-stats/share-page';
  const DASHBOARD_BASE  = 'https://tr4n.github.io/shopee-stats/dashboard';

  function buildShareLink(data) {
    const curYear = new Date().getFullYear();
    const annualData = data.thongKeTheoNam && data.thongKeTheoNam[curYear];
    const annualSpent = annualData ? annualData.total.tongTien : 0;
    const beat = getSpendingPercentile(annualSpent);
    const rankNum = data.tongtienhang <= 10000000 ? 1 : data.tongtienhang <= 50000000 ? 2 : data.tongtienhang < 80000000 ? 3 : 4;
    const topItemName = (data.topItems && data.topItems[0]) ? data.topItems[0].name.substring(0, 30) : '';

    const ydArr = Object.entries(data.thongKeTheoNam || {})
      .sort((a, b) => a[0] - b[0])
      .slice(-5)
      .map(([y, yd]) => [parseInt(y), Math.round(yd.total.tongTien)]);

    const shareData = {
      v: 2,
      t: Math.round(data.tongtienhang),
      o: data.tongDonHang,
      s: Math.round(Math.max(0, data.tongTienTietKiem)),
      ip: data.tongSanPhamDaMua,
      r: rankNum,
      p: beat,
      ts: Math.floor(Date.now() / 1000),
      ti: topItemName,
      yd: ydArr
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))));
    return `${SHARE_PAGE_BASE}/#d=${encoded}`;
  }

  function buildDashboardUrl(data) {
    const monthlyItems = {};
    if (data.cachePayload && data.cachePayload.miniOrders) {
      for (const order of data.cachePayload.miniOrders) {
        if (!order.ts) continue;
        const d_obj = new Date(order.ts * 1000);
        const y_m = d_obj.getFullYear() + '-' + (d_obj.getMonth() + 1);
        if (!monthlyItems[y_m]) monthlyItems[y_m] = {};
        for (const item of (order.il || [])) {
           if (!item.i) continue;
           if (!monthlyItems[y_m][item.i]) monthlyItems[y_m][item.i] = { n: item.n, s: 0, c: 0 };
           monthlyItems[y_m][item.i].s += item.s;
           monthlyItems[y_m][item.i].c += item.c;
        }
      }
    }
    const mi = {};
    for (const [ym, map] of Object.entries(monthlyItems)) {
      mi[ym] = Object.values(map).sort((a,b) => b.s - a.s).slice(0, 50).map(x => ({
         n: x.n.substring(0, 50),
         s: Math.round(x.s),
         c: x.c
      }));
    }

    const yd = {};
    for (const [yr, ydata] of Object.entries(data.thongKeTheoNam || {})) {
      yd[yr] = {
        t:  Math.round(ydata.total.tongTien),
        o:  ydata.total.donHang,
        ip: ydata.total.sanPham,
        s:  Math.round(Math.max(0, ydata.total.tienChuaGiam - ydata.total.tongTien)),
        m:  Object.fromEntries(
          Object.entries(ydata.months).map(([mo, md]) => [mo, Math.round(md.tongTien)])
        )
      };
    }
    const ps = data.thongKeTheoThang || {};
    const dashData = {
      v:    1,
      t:    Math.round(data.tongtienhang),
      o:    data.tongDonHang,
      s:    Math.round(Math.max(0, data.tongTienTietKiem)),
      ip:   data.tongSanPhamDaMua,
      ship: Math.round(data.tongPhiShip || 0),
      ts:   Math.floor(Date.now() / 1000),
      yd,
      mi,
      ps: {
        '1m': Math.round((ps['1_thang'] || {}).tongTien || 0),
        '3m': Math.round((ps['3_thang'] || {}).tongTien || 0),
        '6m': Math.round((ps['6_thang'] || {}).tongTien || 0),
        '1y': Math.round((ps['1_nam']   || {}).tongTien || 0)
      },
      ti: (() => {
        const allItems = data.topItems || [];
        const top100 = allItems.slice(0, 100);
        const catMap = {};
        allItems.forEach(i => {
          const cat = i.cat || 'Khác';
          if (!catMap[cat]) catMap[cat] = [];
          if (catMap[cat].length < 30) catMap[cat].push(i);
        });
        const combined = new Set([...top100]);
        Object.values(catMap).forEach(arr => arr.forEach(i => combined.add(i)));
        return Array.from(combined).map(i => ({
          n: i.name.substring(0, 50),
          s: Math.round(i.spent),
          c: i.count,
          cat: i.cat || ''
        }));
      })(),
      cs: Object.entries(data.catStats || {})
        .sort((a, b) => b[1].spent - a[1].spent)
        .slice(0, 12)
        .map(([name, v]) => ({ name, s: Math.round(v.spent), c: v.count }))
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(dashData))));
    return `${DASHBOARD_BASE}/#d=${encoded}`;
  }

  if (btnShareLink) btnShareLink.addEventListener('click', async () => {
    if (!lastCompleteData) return;
    const url = buildShareLink(lastCompleteData);
    try {
      await navigator.clipboard.writeText(url);
      const orig = btnShareLink.textContent;
      btnShareLink.textContent = '✓ Đã sao chép!';
      btnShareLink.classList.add('copied');
      setTimeout(() => { btnShareLink.textContent = orig; btnShareLink.classList.remove('copied'); }, 2500);
    } catch {
      window.open(url, '_blank');
    }
  });

  // === Open Dashboard ===
  if (btnOpenDashboard) {
    btnOpenDashboard.addEventListener('click', () => {
      const url = lastCompleteData
        ? buildDashboardUrl(lastCompleteData)
        : DASHBOARD_BASE + '/';
      chrome.tabs.create({ url });
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
      startAnalysisTimeout(); // Start the timeout timer
      
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
        itemMap: useCache && cacheData.itemMap ? cacheData.itemMap : {},
        catTree: useCache && cacheData.catTree ? cacheData.catTree : {}
      };

      if (debugStatus) debugStatus.textContent = 'Đang tải cấu hình...';
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (cfg) => { window.__shopeeConfig = cfg; },
        args: [configPayload],
        world: 'MAIN'
      });
      // Inject scripts with error handling
      try {
        if (debugStatus) debugStatus.textContent = 'Đang tải bridge script...';
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/bridge.js'] });
        console.log('[ShopeeAnalytics] Bridge script injected successfully');
      } catch (e) {
        console.error('[ShopeeAnalytics] Failed to inject bridge script:', e);
        if (debugStatus) debugStatus.textContent = 'Lỗi: Không thể tải bridge script';
        throw new Error('Lỗi khi tải bridge script. Vui lòng thử lại.');
      }
      
      try {
        if (debugStatus) debugStatus.textContent = 'Đang tải content script...';
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'], world: 'MAIN' });
        console.log('[ShopeeAnalytics] Content script injected successfully');
        if (debugStatus) debugStatus.textContent = 'Đang chờ phản hồi từ content script...';
        
        // Test if the script is actually running by checking for immediate response
        setTimeout(async () => {
          if (!lastHeartbeat && heartbeatCount === 0) {
            console.warn('[ShopeeAnalytics] No heartbeat received after 15 seconds - script may not be running');
            if (debugStatus) debugStatus.textContent = 'Cảnh báo: Không nhận được phản hồi';
            
            try {
              // Try to inject a test script to see what's happening
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                  console.log('[ShopeeAnalytics TEST] Test script running...');
                  console.log('[ShopeeAnalytics TEST] Current domain:', window.location.hostname);
                  console.log('[ShopeeAnalytics TEST] URL:', window.location.href);
                  console.log('[ShopeeAnalytics TEST] Document ready state:', document.readyState);
                  console.log('[ShopeeAnalytics TEST] Shopee config exists:', !!window.__shopeeConfig);
                  console.log('[ShopeeAnalytics TEST] jQuery exists:', !!window.$);
                  console.log('[ShopeeAnalytics TEST] React exists:', !!window.React);
                  console.log('[ShopeeAnalytics TEST] Fetch available:', !!window.fetch);
                  
                  // Check if there are any errors in console
                  if (window.console && window.console.error) {
                    console.log('[ShopeeAnalytics TEST] Console available for logging');
                  }
                  
                  // Try to send a test message
                  try {
                    window.postMessage({
                      type: 'SHOPEE_STATS_PROGRESS',
                      message: 'Test message từ debug script',
                      processed: 0,
                      total: 0,
                      pct: -1
                    }, '*');
                    console.log('[ShopeeAnalytics TEST] Test message sent successfully');
                  } catch (e) {
                    console.error('[ShopeeAnalytics TEST] Failed to send test message:', e);
                  }
                },
                world: 'MAIN'
              });
            } catch (e) {
              console.error('[ShopeeAnalytics] Failed to run debug script:', e);
              if (debugStatus) debugStatus.textContent = 'Lỗi: Không thể chạy debug script';
            }
          }
        }, 15000);
        
        // Another check after 30 seconds
        setTimeout(() => {
          if (!lastHeartbeat && heartbeatCount === 0) {
            console.error('[ShopeeAnalytics] Still no response after 30 seconds - likely a critical issue');
            if (debugStatus) debugStatus.textContent = 'Lỗi: Script không khởi chạy được';
            
            // Show more specific error message
            progressText.innerHTML = '❌ <strong>Không nhận được phản hồi từ content script</strong><br>' +
              'Có thể do:<br>' +
              '• Trang web chặn script injection<br>' +
              '• Extension permissions bị hạn chế<br>' +
              '• Trang không phải Shopee.vn hợp lệ<br><br>' +
              'Kiểm tra console (F12) để xem chi tiết.';
          }
        }, 30000);
        
      } catch (e) {
        console.error('[ShopeeAnalytics] Failed to inject content script:', e);
        throw new Error('Lỗi khi tải content script. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('[ShopeeAnalytics] Popup script execution error:', err);
      
      // Clear timeout on error
      if (analysisTimeout) {
        clearTimeout(analysisTimeout);
        analysisTimeout = null;
      }
      
      showState(stateInitial);
      errorMessage.textContent = 'Đã có lỗi xảy ra. Hãy tải lại trang Shopee và thử lại nhé.';
    }
  });

  // === Message Listener ===
  chrome.runtime.onMessage.addListener((message) => {
    console.log('[ShopeeAnalytics] Received message in popup:', message.type);
    
    // Clear timeout on any message received (shows the process is active)
    if (analysisTimeout) {
      clearTimeout(analysisTimeout);
      // Restart timeout to give more time
      startAnalysisTimeout();
    }
    
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
      
      // Clear timeout on error
      if (analysisTimeout) {
        clearTimeout(analysisTimeout);
        analysisTimeout = null;
      }
      
      if (debugTimerInterval) {
        clearInterval(debugTimerInterval);
        debugTimerInterval = null;
      }
      
      if (debugStatus) debugStatus.textContent = 'Lỗi: ' + (message.message || 'Không xác định');
      
      showState(stateInitial);
      errorMessage.textContent = message.message || 'Đã có lỗi khi tổng hợp dữ liệu.';
    } else if (message.type === 'complete') {
      // Clear timeout on successful completion
      if (analysisTimeout) {
        clearTimeout(analysisTimeout);
        analysisTimeout = null;
      }
      
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
