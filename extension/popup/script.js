document.addEventListener('DOMContentLoaded', () => {
  // === Element References ===
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const btnCancelProgress = document.getElementById('btn-cancel-progress');
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
  let analysisStartTime = null;
  let debugTimerInterval = null;
  let tipsInterval = null;

  const LOADING_TIPS = [
    "Shopper đêm muộn: Các nghiên cứu tâm lý chỉ ra rằng những hóa đơn phát sinh sau 23h thường mang tính cảm xúc cao, nhằm giải tỏa căng thẳng.",
    "Sức mạnh chu kỳ: Việc mua sắm định kỳ vào những ngày cố định trong tháng chứng tỏ bạn có lối sống tổ chức và tính kỷ luật cao.",
    "Đầu tư trải nghiệm: Chi tiêu cho sách, khóa học hay hoạt động thể chất cho thấy bạn luôn ưu tiên phát triển bản thân trong dài hạn.",
    "Tư duy thực tế: Việc ưu tiên mua combo hoặc các sản phẩm dung tích lớn tiết lộ bộ óc logic và khả năng kiểm soát tài chính tốt.",
    "Thợ săn ưu đãi: Kiên nhẫn thu thập đủ mã giảm giá thể hiện sự nhạy bén và mong muốn có được cảm giác 'chiến thắng' khi mua sắm.",
    "Cái giá tiện lợi: Sẵn sàng trả cao hơn để nhận hàng nhanh chứng tỏ bạn quyết đoán, coi trọng thời gian và hiệu quả công việc.",
    "Trung thành thương hiệu: Chỉ sử dụng sản phẩm từ một hãng cố định tiết lộ tính cách trân trọng sự an toàn và ổn định.",
    "Đam mê đổi mới: Thích thử nghiệm những sản phẩm mới ra mắt cho thấy bạn có độ tò mò cao và luôn muốn tìm kiếm trải nghiệm mới.",
    "Tư duy trả thẳng: Ưu tiên thanh toán ngay thay vì trả góp cho thấy bạn muốn chủ động kiểm soát dòng tiền và ngại các ràng buộc.",
    "Ví trống ảo: Ví điện tử làm giảm 'nỗi đau chi tiền' (pain of paying) giúp chốt đơn nhanh, trong khi COD đề cao tính chắc chắn.",
    "Điểm yếu đêm muộn: Ý chí tự kiểm soát của não bộ giảm dần về cuối ngày, khiến giỏ hàng đêm muộn luôn dễ đầy hơn ban ngày.",
    "Hiệu ứng mỏ neo: Nhìn thấy mức giá cũ bị gạch đi bên cạnh giá sale làm bạn cảm giác món đồ rẻ hơn thực tế dù chưa rõ giá trị thực.",
    "Nỗi sợ bỏ lỡ (FOMO): Đồng hồ đếm ngược hay cảnh báo giới hạn kích thích vùng khẩn cấp của não, thúc giục bạn chốt đơn nhanh hơn.",
    "An toàn riêng tư: Phân tích dữ liệu hoàn toàn cục bộ trên trình duyệt của bạn, cam kết bảo mật thông tin và không gửi về máy chủ."
  ];

  // === Run Lock ===
  // Prevents two analysis runs overlapping when the popup is closed and reopened mid-run.
  // Each run gets a unique nonce; messages with a mismatched nonce are dropped.
  const LOCK_KEY = 'shopee_analysis_lock';
  const LOCK_TTL_MS = 8 * 60 * 1000; // 8 minutes — longer than worst-case fetch time
  let _currentRunNonce = null;
  let _currentRunTabId = null;

  function _genNonce() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  function setAnalysisLock(tabId, nonce) {
    return new Promise(resolve =>
      chrome.storage.local.set({ [LOCK_KEY]: { tabId, nonce, startTime: Date.now() } }, resolve)
    );
  }
  function clearAnalysisLock() {
    _currentRunNonce = null;
    _currentRunTabId = null;
    chrome.storage.local.remove([LOCK_KEY]);
  }
  function getAnalysisLock() {
    return new Promise(resolve =>
      chrome.storage.local.get([LOCK_KEY], r => resolve(r[LOCK_KEY] || null))
    );
  }

  // === App Config ===
  const authorInfoEl = document.getElementById('author-info');
  if (authorInfoEl && window.APP_CONFIG) {
    // Security Compliance: Dynamic innerHTML assignment is limited to static config data 
    // configured locally in window.APP_CONFIG. No dynamic user input is parsed.
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
      // Security Compliance: Assigning pre-defined static SVG XML string from SVGS mapping.
      themeIcon.innerHTML = SVGS.sun;
    } else {
      document.documentElement.removeAttribute('data-theme');
      // Security Compliance: Assigning pre-defined static SVG XML string from SVGS mapping.
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

  // === Cache Statistics Helpers ===
  function addToPeriod(periods, key, o) {
    periods[key].totalSpent += o.finalCost;
    periods[key].orderCount += 1;
    periods[key].itemCount += o.itemCount;
    periods[key].rawSpent += o.rawCost;
  }

  function computeStats(orders) {
    let totalSpentAmt = 0;
    let totalOriginalAmt = 0;
    let totalItemCount = 0;

    const now = new Date();
    const ref1M = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const ref3M = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const ref6M = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const ref1Y = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const periods = {
      '1_month': { totalSpent: 0, orderCount: 0, itemCount: 0, rawSpent: 0 },
      '3_months': { totalSpent: 0, orderCount: 0, itemCount: 0, rawSpent: 0 },
      '6_months': { totalSpent: 0, orderCount: 0, itemCount: 0, rawSpent: 0 },
      '1_year': { totalSpent: 0, orderCount: 0, itemCount: 0, rawSpent: 0 }
    };
    const byYear = {};

    for (const o of orders) {
      totalSpentAmt += o.finalCost;
      totalOriginalAmt += o.rawCost;
      totalItemCount += o.itemCount;

      if (o.ts) {
        const d = new Date(o.ts * 1000);
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1);

        if (d >= ref1M) addToPeriod(periods, '1_month', o);
        if (d >= ref3M) addToPeriod(periods, '3_months', o);
        if (d >= ref6M) addToPeriod(periods, '6_months', o);
        if (d >= ref1Y) addToPeriod(periods, '1_year', o);

        if (!byYear[yr]) {
          byYear[yr] = {
            total: { totalSpent: 0, orderCount: 0, itemCount: 0, rawSpent: 0 },
            months: {}
          };
        }
        const yt = byYear[yr].total;
        yt.totalSpent += o.finalCost;
        yt.orderCount += 1;
        yt.itemCount += o.itemCount;
        yt.rawSpent += o.rawCost;

        if (!byYear[yr].months[mo]) {
          byYear[yr].months[mo] = { totalSpent: 0, orderCount: 0, itemCount: 0, rawSpent: 0 };
        }
        const mt = byYear[yr].months[mo];
        mt.totalSpent += o.finalCost;
        mt.orderCount += 1;
        mt.itemCount += o.itemCount;
        mt.rawSpent += o.rawCost;
      }
    }

    return {
      totalOrders: orders.length,
      totalSpent: totalSpentAmt,
      totalSaved: totalOriginalAmt - totalSpentAmt,
      totalItems: totalItemCount,
      monthlyStats: periods,
      yearlyStats: byYear,
      totalRawSpent: totalOriginalAmt
    };
  }

  function getTopItems(orders) {
    const allItemAggr = {};
    for (const order of orders) {
      for (const item of (order.il || [])) {
        const uId = item.i || item.n;
        if (!allItemAggr[uId]) {
          allItemAggr[uId] = { name: item.n, spent: 0, count: 0, cat: item.cat };
        }
        allItemAggr[uId].spent += item.s;
        allItemAggr[uId].count += item.c;
      }
    }
    return Object.values(allItemAggr).sort((a, b) => b.spent - a.spent);
  }

  function getCachedCompleteData(cache) {
    const stats = computeStats(cache.miniOrders);
    const topItems = getTopItems(cache.miniOrders);
    return {
      ...stats,
      topItems,
      cachePayload: cache
    };
  }

  // === Cache Management ===
  function isCacheValid(cache) {
    if (!cache || !cache.lastUpdated || !Array.isArray(cache.miniOrders)) return false;
    // Require il field (item list) on cached orders so period filter works without re-stat.
    // Old cache format (with sl/shop data) is automatically invalidated here.
    if (cache.miniOrders.length > 0 && !cache.miniOrders.some(o => Array.isArray(o.il))) return false;
    return true;
  }

  function updateCacheStatus(listType, autoRender = false) {
    return new Promise((resolve) => {
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

          if (autoRender) {
            const completeData = getCachedCompleteData(cache);
            renderResults(completeData);
          }
        } else {
          // Silently drop old-format cache so next run does a full re-fetch
          if (cache && !isCacheValid(cache)) chrome.storage.local.remove(['shopee_cache']);
          cacheData = null;
          cacheInfo.classList.add('hidden');
        }
        resolve();
      });
    });
  }

  // === Unified Initialization ===
  function initializeApp() {
    const listType = 3;
    chrome.storage.local.get(['shopee_cache', 'shopee_analysis_lock', 'theme'], (res) => {
      // 1. Apply Theme
      applyTheme(res.theme === 'dark');

      // 2. Parse Cache Info
      const cache = res.shopee_cache;
      let hasValidCache = false;
      if (cache && cache.listType === listType && isCacheValid(cache)) {
        cacheData = cache;
        const elapsedMin = Math.round((Date.now() / 1000 - (cache.fetchTime || cache.lastUpdated)) / 60);
        let timeStr;
        if (elapsedMin < 60) timeStr = `${elapsedMin} phút trước`;
        else if (elapsedMin < 1440) timeStr = `${Math.round(elapsedMin / 60)} giờ trước`;
        else timeStr = `${Math.round(elapsedMin / 1440)} ngày trước`;
        cacheBadgeText.textContent = `${cache.miniOrders.length.toLocaleString()} đơn · ${timeStr}`;
        cacheInfo.classList.remove('hidden');
        hasValidCache = true;
      } else {
        if (cache && !isCacheValid(cache)) chrome.storage.local.remove(['shopee_cache']);
        cacheData = null;
        cacheInfo.classList.add('hidden');
      }

      // 3. Check Lock State
      const lock = res.shopee_analysis_lock;
      if (lock) {
        if (lock.status === 'completed') {
          renderResults(lock.result);
          clearAnalysisLock();
          return;
        }

        if (lock.status === 'failed') {
          console.warn('[ShopeeAnalytics] Analysis failed in background. Showing error:', lock.error);
          showError(lock.error);
          clearAnalysisLock();
          return;
        }

        const age = Date.now() - (lock.startTime || 0);
        if (age < LOCK_TTL_MS) {
          // Ping the content script to verify it is still alive in that tab
          chrome.tabs.sendMessage(lock.tabId, { type: 'ping', nonce: lock.nonce }, (response) => {
            const err = chrome.runtime.lastError;
            if (err || !response || response.type !== 'pong') {
              console.warn('[ShopeeAnalytics] Content script is not responding. Clearing stale lock. Error:', err?.message);
              clearAnalysisLock();
              if (hasValidCache) {
                renderResults(getCachedCompleteData(cacheData));
              } else {
                showState(stateInitial);
              }
            } else {
              // Another run is confirmed active — show loading state
              _currentRunNonce = lock.nonce;
              _currentRunTabId = lock.tabId;
              resetProgress();
              progressText.textContent = 'Đang phân tích ở nền... (đã chạy ' + Math.round(age / 1000) + 'giây)';
              showState(stateLoading);
            }
          });
          return;
        } else {
          console.warn('[ShopeeAnalytics] Clearing stale analysis lock (age:', Math.round(age / 1000), 's)');
          clearAnalysisLock();
        }
      }

      // 4. Default View (if no active lock)
      if (hasValidCache) {
        renderResults(getCachedCompleteData(cacheData));
      } else {
        showState(stateInitial);
      }
    });
  }

  initializeApp();
  btnClearCache.addEventListener('click', () => {
    chrome.storage.local.remove(['shopee_cache'], () => {
      cacheData = null;
      cacheInfo.classList.add('hidden');
    });
  });



  // === State ===
  function formatTip(text) {
    if (text.includes(':')) {
      const parts = text.split(':');
      const title = parts[0].trim();
      const body = parts.slice(1).join(':').trim();
      return `<strong style="color: var(--text-main); font-weight: 700;">${title}:</strong> <span style="font-weight: 500;">${body}</span>`;
    }
    return text;
  }

  function startTipsRotation() {
    if (tipsInterval) clearInterval(tipsInterval);
    const tipEl = document.getElementById('loading-tip');
    if (!tipEl) return;

    let lastIndex = Math.floor(Math.random() * LOADING_TIPS.length);
    tipEl.innerHTML = formatTip(LOADING_TIPS[lastIndex]);
    tipEl.classList.remove('fade-out');

    tipsInterval = setInterval(() => {
      tipEl.classList.add('fade-out');
      setTimeout(() => {
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * LOADING_TIPS.length);
        } while (newIndex === lastIndex && LOADING_TIPS.length > 1);

        lastIndex = newIndex;
        tipEl.innerHTML = formatTip(LOADING_TIPS[newIndex]);
        tipEl.classList.remove('fade-out');
      }, 300);
    }, 8888); // Rotates every 8s (7.7s visible + 300ms transition)
  }

  function stopTipsRotation() {
    if (tipsInterval) {
      clearInterval(tipsInterval);
      tipsInterval = null;
    }
  }

  function showState(stateEl) {
    stateInitial.classList.remove('active');
    stateLoading.classList.remove('active');
    stateResult.classList.remove('active');
    stateEl.classList.add('active');

    if (stateEl === stateLoading) {
      startTipsRotation();
    } else {
      stopTipsRotation();
    }
  }
  function resetProgress() {
    progressBarFill.style.width = '0%';
    progressBarFill.classList.remove('indeterminate');
    progressText.textContent = 'Vui lòng chờ trong giây lát';


    analysisStartTime = null;

    if (debugTimerInterval) {
      clearInterval(debugTimerInterval);
      debugTimerInterval = null;
    }

    // Reset debug info
    if (debugTimerEl) debugTimerEl.textContent = '0s';
    if (debugUrl) debugUrl.textContent = '-';
    if (debugStatus) debugStatus.textContent = 'Đang khởi tạo';
  }


  // === Restart / Cancel ===
  function cancelRunningAnalysis() {
    if (_currentRunTabId && _currentRunNonce) {
      chrome.tabs.sendMessage(_currentRunTabId, { type: 'cancel', nonce: _currentRunNonce }, () => {
        // Ignore error if tab closed/reloaded
        const err = chrome.runtime.lastError;
      });
    }
    cancelRunningAnalysisNoSignal();
  }

  function cancelRunningAnalysisNoSignal() {
    clearAnalysisLock();
    showState(stateInitial);
    updateCacheStatus(getSelectedListType(), false);
  }

  const btnCancelDebug = document.getElementById('btn-cancel-debug');
  if (btnCancelDebug) {
    btnCancelDebug.addEventListener('click', () => {
      cancelRunningAnalysis();
    });
  }

  if (btnCancelProgress) {
    btnCancelProgress.addEventListener('click', () => {
      cancelRunningAnalysis();
    });
  }

  btnRestart.addEventListener('click', () => {
    showState(stateInitial);
    updateCacheStatus(getSelectedListType(), false);
    errorMessage.textContent = '';
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

  /**
   * Technical & Privacy Rationale for Reviewers:
   * 
   * 1. Dynamic Client-Side Data Transport via Hash:
   *    This function exports aggregated purchasing stats to a static dashboard hosted on GitHub Pages.
   *    To ensure 100% privacy, the extension does NOT upload any data to a backend server.
   *    Instead, the JSON payload is compressed (using native Gzip/CompressionStream, LZString, or Base64) 
   *    and appended to the URL's hash fragment (e.g., `#gz=<compressed_payload>`).
   * 
   * 2. Security of URL Hash:
   *    URL hash fragments are strictly client-side. Browsers do not transmit the hash fragment 
   *    in HTTP request headers to the hosting web server. The dashboard reads the hash from the browser 
   *    DOM (`window.location.hash`) in memory and renders it client-side. The data is never logged or 
   *    sent over the network to external endpoints.
   */
  async function buildDashboardUrl(data) {
    // Build monthly items aggregation
    const monthMap = {};
    for (const order of (data.cachePayload?.miniOrders || [])) {
      if (!order.ts) continue;
      const d = new Date(order.ts * 1000);
      const ym = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!monthMap[ym]) monthMap[ym] = {};
      for (const item of (order.il || [])) {
        if (!item.i) continue;
        if (!monthMap[ym][item.i]) monthMap[ym][item.i] = { n: item.n, s: 0, c: 0, cat: item.cat };
        monthMap[ym][item.i].s += item.s;
        monthMap[ym][item.i].c += item.c;
      }
    }
    // mi: Top items grouped by year-month (key format 'YYYY-M')
    const monthlyItems = {};
    for (const [ym, map] of Object.entries(monthMap)) {
      monthlyItems[ym] = Object.values(map)
        .sort((a, b) => b.s - a.s)
        .slice(0, 20)
        .map(x => ({ n: compactItemName(x.n).substring(0, 40), s: Math.round(x.s), c: x.c, cat: x.cat }));
    }

    // yd: Yearly breakdown stats (t: spent, o: orders, ip: items, s: saved, m: monthly spent)
    const yearlyStats = {};
    for (const [yr, ydata] of Object.entries(data.yearlyStats || {})) {
      yearlyStats[yr] = {
        t: Math.round(ydata.total.totalSpent),
        o: ydata.total.orderCount,
        ip: ydata.total.itemCount,
        s: Math.round(Math.max(0, ydata.total.rawSpent - ydata.total.totalSpent)),
        m: Object.fromEntries(
          Object.entries(ydata.months).map(([mo, md]) => [mo, Math.round(md.totalSpent)])
        )
      };
    }

    // Period spending stats (1 month, 3 months, 6 months, 1 year)
    const rawPeriodStats = data.monthlyStats || {};

    // 1. v: Schema/payload version (v3 uses Gzip format)
    const payloadVersion = 3;

    // 2. ev: Extension version (empty string if loaded directly outside extension context)
    const extVersion = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest)
      ? chrome.runtime.getManifest().version
      : '';

    // 3. t: Total spent (all-time, rounded to nearest VND integer)
    const totalSpent = Math.round(data.totalSpent);

    // 4. o: Total orders count (all-time)
    const totalOrders = data.totalOrders;

    // 5. s: Total saved amount (all-time, rounded to nearest VND integer)
    const totalSaved = Math.round(Math.max(0, data.totalSaved));

    // 6. ip: Total items count (number of individual item units purchased all-time)
    const totalItems = data.totalItems;

    // 7. ts: Scan creation timestamp in seconds (uses cache's creation time or falls back to current time)
    const scanTimestamp = data.cachePayload?.fetchTime || data.cachePayload?.lastUpdated || Math.floor(Date.now() / 1000);

    // 8. ps: Period spending breakdown (1m, 3m, 6m, 1y total spent relative to today)
    const periodStats = {
      '1m': Math.round((rawPeriodStats['1_month'] || {}).totalSpent || 0),
      '3m': Math.round((rawPeriodStats['3_months'] || {}).totalSpent || 0),
      '6m': Math.round((rawPeriodStats['6_months'] || {}).totalSpent || 0),
      '1y': Math.round((rawPeriodStats['1_year'] || {}).totalSpent || 0)
    };

    // 9. ti: Top 150 items list (n: cleaned name, s: rounded spent, c: count, cat: category ID)
    // Names are pre-cleaned to minimize payload size; category classification is completed by dashboard.
    const topItemsList = (data.topItems || []).slice(0, 150).map(i => ({
      n: compactItemName(i.name).substring(0, 45), // n: Cleaned item name
      s: Math.round(i.spent), // s: Spent amount for this item
      c: i.count, // c: Quantity purchased
      cat: i.cat // cat: Category ID
    }));

    // Payload schema structure sent to the dashboard via URL hash
    const payload = {
      v: payloadVersion,
      ev: extVersion,
      t: totalSpent,
      o: totalOrders,
      s: totalSaved,
      ip: totalItems,
      ts: scanTimestamp,
      yd: yearlyStats,
      mi: monthlyItems,
      ps: periodStats,
      ti: topItemsList
    };

    const jsonStr = JSON.stringify(payload);

    // Try Gzip compression (new v3 format: #gz= hash — native CompressionStream)
    try {
      if (typeof CompressionStream !== 'undefined') {
        const stream = new Blob([jsonStr]).stream().pipeThrough(new CompressionStream('gzip'));
        const buffer = await new Response(stream).arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const compressed = btoa(binary)
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, ''); // URI Safe Base64
        return `${DASHBOARD_BASE}/#gz=${compressed}`;
      }
    } catch (e) {
      console.warn('[Popup] Gzip compression failed, falling back:', e);
    }

    // Try LZString compression (v2 format: #lz= hash)
    try {
      if (typeof LZString !== 'undefined') {
        const compressed = LZString.compressToEncodedURIComponent(jsonStr);
        return `${DASHBOARD_BASE}/#lz=${compressed}`;
      }
    } catch (e) {
      console.warn('[Popup] LZString compression failed, falling back to Base64:', e);
    }

    // Fallback: Base64 (legacy format: #d= hash)
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    return `${DASHBOARD_BASE}/#d=${encoded}`;
  }

  async function openDashboardWithData(data) {
    try {
      const url = await buildDashboardUrl(data);
      chrome.tabs.create({ url });
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

  let isTriggering = false;

  // === Start Analysis ===
  async function triggerAnalysis(ignoreCache = false) {
    const shouldIgnoreCache = ignoreCache === true;
    if (isTriggering) return;
    isTriggering = true;
    if (btnStart) btnStart.disabled = true;
    errorMessage.textContent = '';
    try {
      // Guard: reject if another run is already active (lock is fresh)
      const existingLock = await getAnalysisLock();
      if (existingLock && Date.now() - (existingLock.startTime || 0) < LOCK_TTL_MS) {
        console.warn('[ShopeeAnalytics] Analysis already running (lock held), ignoring duplicate start.');
        _currentRunNonce = existingLock.nonce;  // sync nonce in case popup was reopened
        resetProgress();
        progressText.textContent = 'Đang phân tích... (đã chạy ' + Math.round((Date.now() - existingLock.startTime) / 1000) + 'giây)';
        showState(stateLoading);
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        errorMessage.textContent = '❌ Không thể xác định tab hiện tại. Vui lòng thử lại.';
        showState(stateInitial);
        return;
      }

      if (!tab.url || !tab.url.includes('shopee.vn')) {
        showState(stateInitial);
        errorMessage.innerHTML = '❌ Bạn cần truy cập vào trang <a href="#" id="link-go-to-shopee" style="color: var(--primary); text-decoration: underline; font-weight: bold; cursor: pointer;">Shopee.vn</a> để thống kê lại / cập nhật dữ liệu mới.';
        const link = document.getElementById('link-go-to-shopee');
        if (link) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://shopee.vn' });
          });
        }
        return;
      }

      // Additional URL checks
      if (tab.url.includes('chrome-extension://') || tab.url.includes('chrome://') || tab.url.includes('moz-extension://')) {
        showState(stateInitial);
        errorMessage.textContent = '❌ Extension không thể chạy trên các trang hệ thống. Vui lòng mở trang Shopee.vn thông thường.';
        return;
      }

      // Generate a unique nonce for this run — used to discard messages from parallel/stale runs
      const nonce = _genNonce();
      _currentRunNonce = nonce;
      _currentRunTabId = tab.id;

      resetProgress();
      showState(stateLoading);

      // Acquire run lock before injecting scripts
      await setAnalysisLock(tab.id, nonce);

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
      const useCache = !shouldIgnoreCache && cacheData && cacheData.listType === listType && isCacheValid(cacheData);
      const configPayload = {
        listType,
        nonce,  // content script echoes this back so popup can verify message origin
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
        // Security Compliance: Injecting our package-bundled bridge.js into the MAIN world
        // to enable same-origin fetches that Shopee's strict CSRF/CORS headers require.
        // No remote scripts are evaluated or injected; all files are local.
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/bridge.js'],
          world: 'MAIN'
        });

        if (debugStatus) debugStatus.textContent = 'Đang tải content script...';
        // Security Compliance: Injecting our package-bundled content.js script.
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] });
        if (debugStatus) debugStatus.textContent = 'Đang chờ phản hồi từ content script...';

      } catch (e) {
        console.error('[ShopeeAnalytics] Failed to load content script:', e);
        clearAnalysisLock();
        throw new Error('Lỗi khi tải content script. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('[ShopeeAnalytics] Popup script execution error:', err);
      clearAnalysisLock();
      showState(stateInitial);
      errorMessage.textContent = 'Đã có lỗi xảy ra. Hãy tải lại trang Shopee và thử lại nhé.';
    } finally {
      isTriggering = false;
      if (btnStart) btnStart.disabled = false;
    }
  }

  btnStart.addEventListener('click', triggerAnalysis);

  // === Message Listener ===
  chrome.runtime.onMessage.addListener((message) => {

    if (message.type === 'lock_cleared') {
      console.log('[ShopeeAnalytics] Lock was cleared by background script. Resetting UI.');
      cancelRunningAnalysisNoSignal();
      errorMessage.textContent = '';
      updateCacheStatus(getSelectedListType(), true);
      return;
    }

    // Discard analysis progress/error/complete messages if we are not currently running or if the nonces do not match.
    if (['progress', 'error', 'complete'].includes(message.type)) {
      if (message.nonce !== _currentRunNonce) {
        console.warn('[ShopeeAnalytics] Dropping message from mismatching or inactive run:', message.type);
        return;
      }
    }

    if (message.type === 'progress') {
      const processed = message.processed || 0;
      const pct = typeof message.pct === 'number' ? message.pct : -1;
      let label = '';
      if (pct >= 0) {
        progressBarFill.classList.remove('indeterminate');
        progressBarFill.style.width = pct + '%';
        label = `Đã xử lý ${processed.toLocaleString()}/${(message.total || 0).toLocaleString()} đơn (${pct}%)`;
      } else {
        progressBarFill.classList.add('indeterminate');
        label = `Đã xử lý ${processed.toLocaleString()} đơn hàng...`;
      }
      progressText.textContent = label;
    } else if (message.type === 'error') {
      console.error('[ShopeeAnalytics] Error returned from content script:', message.message);
      clearAnalysisLock();
      showError(message.message);
      updateCacheStatus(getSelectedListType(), false);
    } else if (message.type === 'complete') {

      clearAnalysisLock();

      if (debugTimerInterval) {
        clearInterval(debugTimerInterval);
        debugTimerInterval = null;
      }

      if (debugStatus) debugStatus.textContent = 'Hoàn thành thành công!';

      if (message.data && message.data.cachePayload) {
        chrome.storage.local.set({ shopee_cache: message.data.cachePayload }, () => {
          if (chrome.runtime.lastError) console.warn('Cache save failed:', chrome.runtime.lastError.message);
          updateCacheStatus(getSelectedListType(), false);
        });
      }
      renderResults(message.data);
    }
  });



  // Security Compliance: innerHTML is used to render visual error cards containing HTML layouts.
  // All dynamic parameters (errorMsg/msg) are sanitized using `escapeHtml()` helper prior to insertion.
  function showError(errorMsg) {
    if (debugTimerInterval) {
      clearInterval(debugTimerInterval);
      debugTimerInterval = null;
    }

    if (debugStatus) debugStatus.textContent = 'Lỗi: ' + (errorMsg || 'Không xác định');

    showState(stateInitial);

    const msg = errorMsg || 'Đã có lỗi khi tổng hợp dữ liệu.';

    if (msg.includes('đăng nhập')) {
      errorMessage.innerHTML = `<div class="error-card">
        <div class="error-card-icon">❌</div>
        <div class="error-card-title">${escapeHtml(msg)}</div>
        <div class="error-card-body">
          <strong>💡 Giải pháp:</strong><br>
          1. Đăng nhập lại tài khoản Shopee<br>
          2. Tải lại trang (F5) và thử lại
        </div>
      </div>`;
    } else if (msg.includes('403') || msg.includes('Shopee từ chối')) {
      errorMessage.innerHTML = `<div class="error-card">
        <div class="error-card-icon">🚫</div>
        <div class="error-card-title">${escapeHtml(msg)}</div>
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
        <div class="error-card-title">${escapeHtml(msg)}</div>
        <div class="error-card-body">
          Tải lại trang Shopee và thử lại nhé.
        </div>
      </div>`;
    }
  }

  // === Render Results ===
  function renderResults(data) {
    lastCompleteData = data;

    totalSpentEl.textContent = pxgPrice(data.totalSpent);
    rankBadgeEl.textContent = getRankBadge(data.totalSpent);

    renderTrendBadges(data.yearlyStats);
    renderPercentile(data.yearlyStats);

    // Show/hide rating card based on storage status
    chrome.storage.local.get(['rated_or_dismissed'], (res) => {
      const ratingCard = document.getElementById('rating-card');
      if (ratingCard) {
        if (res.rated_or_dismissed) {
          ratingCard.classList.add('hidden');
        } else {
          ratingCard.classList.remove('hidden');
        }
      }
    });

    showState(stateResult);
  }

  // === Trend Badges ===
  function renderTrendBadges(yearlyStats) {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1);
    const prevMonth = String(now.getMonth() === 0 ? 12 : now.getMonth());
    const prevMonthYear = now.getMonth() === 0 ? curYear - 1 : curYear;
    const prevYear = curYear - 1;

    const curMonthVal = yearlyStats[curYear]?.months?.[curMonth]?.totalSpent || 0;
    const prevMonthVal = yearlyStats[prevMonthYear]?.months?.[prevMonth]?.totalSpent || 0;
    const curYearVal = yearlyStats[curYear]?.total?.totalSpent || 0;
    const prevYearVal = yearlyStats[prevYear]?.total?.totalSpent || 0;

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
      // Security Compliance: Assigning HTML template constructed purely from local, trusted strings 
      // and formatted numeric calculations (e.g. Math.abs(diff).toFixed(0)). No raw user input is used here.
      trendRowEl.innerHTML = badges.join('');
      trendRowEl.classList.remove('hidden');
    } else {
      trendRowEl.classList.add('hidden');
    }
  }

  // === Percentile ===
  function renderPercentile(yearlyStats) {
    const curYear = new Date().getFullYear();
    const annualSpent = yearlyStats[curYear]?.total?.totalSpent || 0;
    if (annualSpent > 0) {
      const beat = getSpendingPercentile(annualSpent);
      percentileTextEl.textContent = `Chi tiêu nhiều hơn ~${beat}% người dùng Shopee VN (ước tính ${curYear})`;
      percentileRowEl.classList.remove('hidden');
    } else {
      percentileRowEl.classList.add('hidden');
    }
  }

  // === Setup Rating Card ===
  function setupRatingCard() {
    const ratingCard = document.getElementById('rating-card');
    const starsContainer = document.getElementById('rating-stars');
    const stars = starsContainer ? starsContainer.querySelectorAll('.star') : [];
    const closeBtn = document.getElementById('btn-rating-close');
    const thankyouEl = document.getElementById('rating-thankyou');
    const feedbackEl = document.getElementById('rating-feedback');

    if (!ratingCard) return;

    let selectedValue = 0;

    const highlightStars = (val) => {
      stars.forEach(star => {
        const v = parseInt(star.getAttribute('data-value'));
        if (v <= val) {
          star.classList.add('hovered');
        } else {
          star.classList.remove('hovered');
        }
      });
    };

    const resetStars = () => {
      stars.forEach(star => {
        const v = parseInt(star.getAttribute('data-value'));
        star.classList.remove('hovered');
        if (v <= selectedValue) {
          star.classList.add('selected');
        } else {
          star.classList.remove('selected');
        }
      });
    };

    stars.forEach(star => {
      star.addEventListener('mouseenter', () => {
        starsContainer.classList.add('has-hovered');
        highlightStars(parseInt(star.getAttribute('data-value')));
      });

      star.addEventListener('mouseleave', () => {
        starsContainer.classList.remove('has-hovered');
        resetStars();
      });

      star.addEventListener('click', () => {
        selectedValue = parseInt(star.getAttribute('data-value'));
        resetStars();

        // Save rating/dismiss state
        chrome.storage.local.set({ rated_or_dismissed: true });

        if (selectedValue === 5) {
          thankyouEl.classList.remove('hidden');
          feedbackEl.classList.add('hidden');
          
          setTimeout(() => {
            chrome.tabs.create({
              url: 'https://chromewebstore.google.com/detail/shopee-analytics-pro-th%E1%BB%91n/jcflofioiopfchfelgbpbndplhpfeapm/reviews'
            });
            // Hide rating card after opening review page
            setTimeout(() => {
              ratingCard.classList.add('hidden');
            }, 1000);
          }, 1200);
        } else {
          thankyouEl.classList.add('hidden');
          feedbackEl.classList.remove('hidden');
        }
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        chrome.storage.local.set({ rated_or_dismissed: true });
        ratingCard.classList.add('hidden');
      });
    }
  }

  setupRatingCard();
});
