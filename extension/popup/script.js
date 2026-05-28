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
    "Tần số chốt đơn 0h: Việc tìm kiếm những món đồ lúc đêm muộn thường là cách bạn trò chuyện và xoa dịu phần nội tâm nhạy cảm sau một ngày dài.",
    "Thông điệp vũ trụ: Giỏ hàng đầy ắp không chỉ là ý định mua sắm, mà là nơi bạn gửi gắm những hy vọng và kế hoạch cho một ngày mai tốt đẹp hơn.",
    "Hệ tâm linh săn sale: Kiên nhẫn tích lũy từng ưu đãi thể hiện bản năng trân quý thành quả lao động và mong muốn tối ưu hóa mọi giá trị cuộc sống.",
    "Tần số đơn đêm muộn: Bạn thường có xu hướng lo lắng cho người khác trước, và chốt đơn đêm muộn là lúc bạn tập trung chăm sóc chính mình.",
    "Luân xa ăn uống: Đầu tư cho ẩm thực cho thấy bạn trân trọng sự kết nối của các giác quan và coi ăn ngon là liều thuốc chữa lành tinh tế nhất.",
    "Năng lượng hệ hỏa: Thích trang phục cá tính tiết lộ khát vọng tự do, khao khát khẳng định cái tôi và không muốn bị đóng khung bởi định kiến.",
    "Tư duy gom combo: Xu hướng mua combo cho thấy bạn coi trọng sự trọn vẹn, luôn tìm kiếm sự an tâm trong những giải pháp lâu dài và toàn diện.",
    "Hệ ship hỏa tốc: Coi trọng tốc độ phản ánh phong cách sống quyết đoán, trân trọng thời gian và mong muốn nhìn thấy kết quả nỗ lực ngay lập tức.",
    "Duyên phận shop quen: Chỉ mua đồ ở shop quen phản ánh tâm lý coi trọng sự tin cậy, ưu tiên chiều sâu và tính cam kết trong các mối quan hệ.",
    "Phương pháp COD: Nhận hàng mới trả tiền phản ánh sự cẩn trọng của một người từng trải, luôn muốn kiểm chứng thực tế trước khi trao niềm tin.",
    "Đam mê trải nghiệm mới: Thích thử sản phẩm độc lạ chứng tỏ bạn sở hữu tư duy mở, khao khát học hỏi và coi cuộc đời là những khám phá không giới hạn.",
    "Sao Thủy nghịch hành: Những lúc dừng lại nhìn lại chi tiêu chính là thời điểm bạn nhìn lại chặng đường đã qua để thấu hiểu bản thân sâu sắc hơn.",
    "Năng lượng hệ thổ: Thói quen đầu tư vào đồ trang trí nhà cửa phản ánh nhu cầu xây dựng một 'ốc đảo' an toàn để tái tạo năng lượng tinh thần.",
    "Luân xa tri thức: Chi tiêu cho sách và học tập chứng tỏ bạn luôn hướng thượng, coi trọng sự phát triển trí tuệ và khát khao tự hoàn thiện bản thân.",
    "Luân xa sức khỏe: Tìm mua đồ tập thể thao hay thực phẩm bổ dưỡng cho thấy bạn bắt đầu lắng nghe cơ thể, trân trọng sinh mệnh sau những bộn bề.",
    "Hệ mua sắm tặng quà: Chọn quà cho người thân yêu chứng tỏ bạn có tâm hồn ấm áp, tìm thấy hạnh phúc lớn nhất khi mang lại niềm vui cho người khác.",
    "Giải mã giỏ hàng: Chủ động lọc bớt các món đồ trong giỏ phản ánh tinh thần dũng cảm, biết buông bỏ những thứ không thực sự phù hợp với mình.",
    "Năng lượng hệ thủy: Thích sản phẩm thư giãn như nến thơm, trà hoa tiết lộ tâm hồn nhạy cảm của bạn đang cần sự dịu dàng và cân bằng cảm xúc.",
    "Tần số mua định kỳ: Mua sắm có kế hoạch cụ thể chứng tỏ bạn có kỷ luật tự giác cao, chủ động làm chủ cuộc sống và ít bị dao động bởi ngoại cảnh.",
    "Tư duy tinh gọn: Thích tìm các dụng cụ thông minh thể hiện óc sáng tạo, muốn tối giản hóa cuộc sống để tập trung vào những giá trị cốt lõi.",
    "Duyên phận hoài niệm: Tìm kiếm đồ cổ hay phong cách vintage cho thấy bạn là người giàu tình cảm, trân trọng những giá trị thời gian và lịch sử.",
    "Năng lượng hệ khí: Thích sắm đồ du lịch hay dã ngoại tiết lộ bạn có tâm hồn tự do, khao khát kết nối với thiên nhiên và những chân trời mới.",
    "Tư duy phản biện: Kiên nhẫn đọc kỹ các nhận xét từ người mua trước phản ánh sự tỉnh táo, không dễ bị lung lay bởi những lời hoa mỹ.",
    "Tần số giờ vàng: Tận dụng ưu đãi ẩn giờ vàng chứng tỏ bạn có khả năng quan sát nhạy bén, biết cách phân bổ và tối ưu hóa nguồn lực cá nhân.",
    "Thống kê TMĐT: Chi tiêu mua sắm trực tuyến bình quân đầu người tại Việt Nam hiện đã đạt mức ~400 USD (khoảng 10,5 triệu đồng) mỗi năm.",
    "Doanh số thị trường: Người tiêu dùng Việt Nam chi tiêu tới hơn 1.177 tỷ đồng mỗi ngày cho việc chốt đơn trên các sàn TMĐT lớn.",
    "Thị phần mua sắm: Shopee hiện đang dẫn đầu thị trường TMĐT Việt Nam khi nắm giữ khoảng 56% tổng giá trị giao dịch toàn ngành.",
    "Xu hướng di động: Khoảng 73% giao dịch mua sắm trực tuyến của người Việt được thực hiện nhanh chóng thông qua các thiết bị di động.",
    "Phân khúc phổ biến: Các sản phẩm có tầm giá 100.000đ - 200.000đ là phân khúc được người tiêu dùng Shopee lựa chọn mua nhiều nhất.",
    "Bảo mật tuyệt đối: Tiện ích chạy offline 100%, bảo mật dữ liệu tuyệt đối ngay trên thiết bị của bạn. An tâm trải nghiệm!"
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

  // === Percentile Configuration ===
  // CẬP NHẬT ĐỊNH KỲ (Cứ mỗi 6 tháng - Lần cuối: Tháng 5/2026)
  // Nguồn dữ liệu tham khảo: Báo cáo TMĐT Việt Nam năm 2025/2026 (Metric, VECOM)
  // Chi tiêu trung bình TMĐT đầu người khoảng 10.5M VNĐ/năm, trung vị khoảng 6.5M - 7M VNĐ/năm.
  const PERCENTILE_THRESHOLDS = [
    { max: 1500000, beat: 15 },    // Nhóm mua sắm trải nghiệm / cực ít
    { max: 4000000, beat: 35 },    // Nhóm mua sắm thỉnh thoảng
    { max: 7000000, beat: 50 },    // Ngưỡng trung vị (Median Shopper)
    { max: 15000000, beat: 65 },   // Bắt đầu chi tiêu nhiều (Beat ~65% Shopee VN)
    { max: 35000000, beat: 80 },   // Tín đồ mua sắm thực thụ
    { max: 70000000, beat: 90 },   // Siêu cấp chốt đơn
    { max: 120000000, beat: 95 },  // Khách hàng VIP
    { max: 250000000, beat: 98 },  // Siêu VIP
    { max: Infinity, beat: 99 }    // Whale / Cổ Đông Chiến Lược
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
        const vn = VnTime.toVnParts(o.ts);
        const yr = vn.year;
        const mo = String(vn.month);
        const orderDate = new Date(o.ts * 1000);

        if (orderDate >= ref1M) addToPeriod(periods, '1_month', o);
        if (orderDate >= ref3M) addToPeriod(periods, '3_months', o);
        if (orderDate >= ref6M) addToPeriod(periods, '6_months', o);
        if (orderDate >= ref1Y) addToPeriod(periods, '1_year', o);

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
          allItemAggr[uId] = { name: item.n, spent: 0, count: 0, cat: item.cat, op: item.op || 0, dp: item.dp || 0 };
        }
        allItemAggr[uId].spent += item.s;
        allItemAggr[uId].count += item.c;
        allItemAggr[uId].op = allItemAggr[uId].op || item.op || 0;
        allItemAggr[uId].dp = allItemAggr[uId].dp || item.dp || 0;
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
    // Invalidate old caches that do not have the timezone/derived creation time fix (v2)
    if (cache.v !== 2) return false;
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
              progressText.textContent = 'Đang chuẩn bị ở nền... (đã chạy ' + Math.round(age / 1000) + 'giây)';
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
    if (debugStatus) debugStatus.textContent = 'Đang kết nối';
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

  // Pre-compile noise words regexes for maximum performance (case-insensitive & Unicode-boundary aware)
  const NOISE_REGEXP_LIST = NOISE_WORDS.map(w => {
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?<![\\p{L}\\p{N}])' + esc + '(?![\\p{L}\\p{N}])', 'giu');
  });

  function compactItemName(name) {
    let s = String(name || '');
    // Strip bracket content (promotional tags)
    s = s.replace(/\[.*?\]|\(.*?\)|\{.*?\}/g, ' ');
    // Strip special chars / emoji, keep letters + numbers, preserve case!
    s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ');
    // Remove noise words (longest first) using pre-compiled regexes case-insensitively
    for (const re of NOISE_REGEXP_LIST) {
      s = s.replace(re, ' ');
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
    const shortCatMap = {
      'beauty_health': 'b',
      'fashion': 'f',
      'tech': 't',
      'home': 'h',
      'sport': 's',
      'edu': 'e'
    };

    // Build monthly items aggregation
    const monthMap = {};
    for (const order of (data.cachePayload?.miniOrders || [])) {
      if (!order.ts) continue;
      const ym = `${VnTime.getVnYear(order.ts)}-${VnTime.getVnMonth(order.ts)}`;
      if (!monthMap[ym]) monthMap[ym] = {};
      for (const item of (order.il || [])) {
        if (!item.i) continue;
        if (!monthMap[ym][item.i]) {
          monthMap[ym][item.i] = { n: item.n, s: 0, c: 0, cat: item.cat, op: item.op || 0, dp: item.dp || 0 };
        }
        monthMap[ym][item.i].s += item.s;
        monthMap[ym][item.i].c += item.c;
        monthMap[ym][item.i].op = monthMap[ym][item.i].op || item.op || 0;
        monthMap[ym][item.i].dp = monthMap[ym][item.i].dp || item.dp || 0;
      }
    }
    // mi: Top items grouped by year-month (key format 'YYYY-M')
    // We serialize as compact arrays [n, s, c, cat, op, dp] to keep URL compact
    const monthlyItems = {};
    for (const [ym, map] of Object.entries(monthMap)) {
      monthlyItems[ym] = Object.values(map)
        .sort((a, b) => b.s - a.s)
        .slice(0, 20)
        .map(x => {
          const catCode = shortCatMap[x.cat] || x.cat || '';
          return [
            compactItemName(x.n).substring(0, 40),
            Math.round(x.s),
            x.c,
            catCode,
            Math.round(x.op || 0),
            Math.round(x.dp || 0)
          ];
        });
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

    // 9. ti: Top 150 items list: compact array [n, s, c, cat, op, dp] to keep URL compact
    const topItemsList = (data.topItems || []).slice(0, 150).map(i => {
      const catCode = shortCatMap[i.cat] || i.cat || '';
      return [
        compactItemName(i.name).substring(0, 45), // n
        Math.round(i.spent), // s
        i.count, // c
        catCode, // cat
        Math.round(i.op || 0), // op
        Math.round(i.dp || 0)  // dp
      ];
    });

    const allMiniOrders = data.cachePayload?.miniOrders || [];

    // Pre-aggregate COMPLETE order stats by year + sale type.
    // This is computed from ALL orders (before any truncation) so KPI numbers in the
    // dashboard are always 100% accurate regardless of how many ol[] detail entries we include.
    // Structure: { "YYYY": { "double"|"mid"|"end"|"regular": [spend, raw, orders, midnightOrders] } }
    const ossMap = {};
    for (const o of allMiniOrders) {
      const tUse = o.ots || o.ts;
      if (!tUse || !(o.finalCost > 0)) continue;
      const yr = String(VnTime.getVnYear(tUse));
      const type = VnTime.getSaleTypeFromTs(tUse);
      if (!ossMap[yr]) ossMap[yr] = {};
      if (!ossMap[yr][type]) ossMap[yr][type] = [0, 0, 0, 0];
      const e = ossMap[yr][type];
      e[0] += Math.round(o.finalCost);
      e[1] += Math.round(o.rawCost > 0 ? o.rawCost : o.finalCost);
      e[2] += 1;
      if (VnTime.getVnHour(tUse) < 2) e[3] += 1;
    }
    const orderStatsSummary = Object.keys(ossMap).length > 0 ? ossMap : undefined;

    // Build compact order history list for dashboard view: array format [ts, finalCost, rawCost, cat, name, ots]
    // Excludes zero-value orders (voucher 100%, data errors) from the detail list.
    const orderHistoryList = allMiniOrders
      .filter(o => o.finalCost > 0)
      .map(o => {
        let mainCat = '';
        let mainItemName = '';
        if (Array.isArray(o.il) && o.il.length > 0) {
          let maxSpent = -1;
          for (const item of o.il) {
            const itemSpent = item.s || 0;
            if (itemSpent > maxSpent) {
              maxSpent = itemSpent;
              mainCat = item.cat || '';
              mainItemName = item.n || '';
            }
          }
        }
        const catCode = shortCatMap[mainCat] || mainCat;
        return [
          o.ts,
          Math.round(o.finalCost),
          Math.round(o.rawCost > 0 ? o.rawCost : o.finalCost),
          catCode,
          mainItemName.substring(0, 60),
          o.ots || o.ts
        ];
      });

    // Sort by timestamp descending (most recent first) and cap for URL size budget.
    // Payload size estimate: 2000 entries × ~100 bytes = ~200 KB uncompressed → ~30–50 KB gzipped
    // → ~40–67 KB base64 URL chars — well within Chrome's effective ~2 MB URL hash limit.
    // Stats accuracy is guaranteed by oss (above); ol[] is used for detail/category views only.
    orderHistoryList.sort((a, b) => b[0] - a[0]);
    const OL_MAX = 2000;
    if (orderHistoryList.length > OL_MAX) {
      console.warn(`[Popup] ol[] truncated from ${orderHistoryList.length} to ${OL_MAX} entries. KPI stats remain accurate via oss field.`);
      orderHistoryList.splice(OL_MAX);
    }

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
      ti: topItemsList,
      ol: orderHistoryList,
      oss: orderStatsSummary  // complete aggregated stats for accurate KPIs
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
        errorMessage.innerHTML = `
          <div class="info-card">
            <div class="info-card-title" style="display: flex; align-items: center; gap: 6px;">
              <span>💡</span>
              <span>Cần kết nối với Shopee.vn</span>
            </div>
            <div class="info-card-body">
              Vui lòng truy cập <a href="#" id="link-go-to-shopee" style="color: var(--primary); text-decoration: underline; font-weight: bold; cursor: pointer;">Shopee.vn</a> và <strong>đăng nhập</strong> tài khoản, sau đó mở lại công cụ và bấm <strong>"Bắt đầu thống kê ngay"</strong>.
              <div style="margin-top: 8px; border-top: 1px dashed var(--border-color); padding-top: 6px; font-size: 11px; opacity: 0.9;">
                * Muốn quét lại từ đầu? <a href="#" id="link-clear-cache-error" style="color: var(--primary); text-decoration: underline; font-weight: bold; cursor: pointer;">Xóa dữ liệu cũ</a>
              </div>
            </div>
          </div>
        `;
        const link = document.getElementById('link-go-to-shopee');
        if (link) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://shopee.vn' });
          });
        }
        const linkClearCache = document.getElementById('link-clear-cache-error');
        if (linkClearCache) {
          linkClearCache.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.storage.local.remove(['shopee_cache'], () => {
              cacheData = null;
              cacheInfo.classList.add('hidden');
              linkClearCache.outerHTML = '<span style="color: var(--green); font-weight: bold;">đã xóa dữ liệu thành công!</span>';
            });
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
      if (debugStatus) debugStatus.textContent = 'Đang chuẩn bị tiện ích';

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

      if (debugStatus) debugStatus.textContent = 'Đang áp dụng thiết lập...';
      await new Promise((resolve) => {
        chrome.storage.local.set({ 'shopee_temp_config': configPayload }, resolve);
      });

      try {
        if (debugStatus) debugStatus.textContent = 'Đang chuẩn bị kết nối...';
        // Security Compliance: Injecting our package-bundled bridge.js into the MAIN world
        // to enable same-origin fetches that Shopee's strict CSRF/CORS headers require.
        // No remote scripts are evaluated or injected; all files are local.
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/bridge.js'],
          world: 'MAIN'
        });

        if (debugStatus) debugStatus.textContent = 'Đang đồng bộ tiện ích...';
        // Security Compliance: Injecting our package-bundled content.js script.
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['vn-time.js', 'content/content.js'] });
        if (debugStatus) debugStatus.textContent = 'Đang chờ kết nối...';

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
        label = `Đang chuẩn bị báo cáo: ${pct}%`;
      } else {
        progressBarFill.classList.add('indeterminate');
        label = `Đang chuẩn bị hiển thị...`;
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

    const msg = errorMsg || 'Đã có lỗi xảy ra.';

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
    const now = new Date();
    const curYear = now.getFullYear();
    const annualSpent = yearlyStats[curYear]?.total?.totalSpent || 0;
    if (annualSpent > 0) {
      const monthsElapsed = now.getMonth() + 1;
      const extrapolatedAnnualSpent = annualSpent * (12 / monthsElapsed);
      const beat = getSpendingPercentile(extrapolatedAnnualSpent);
      percentileTextEl.textContent = `Chi tiêu nhiều hơn ~${beat}% người dùng Shopee VN (dự kiến cả năm ${curYear})`;
      percentileRowEl.classList.remove('hidden');
    } else {
      percentileRowEl.classList.add('hidden');
    }
  }

});
