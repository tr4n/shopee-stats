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

  const totalSpentEl = document.getElementById('total-spent');
  const rankBadgeEl = document.getElementById('rank-badge');
  const trendRowEl = document.getElementById('trend-row');
  const percentileRowEl = document.getElementById('percentile-row');
  const percentileTextEl = document.getElementById('percentile-text');
  const totalOrdersEl = document.getElementById('total-orders');
  const totalItemsEl = document.getElementById('total-items');
  const totalSavedEl = document.getElementById('total-saved');
  const totalShippingEl = document.getElementById('total-shipping');

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContentTime = document.getElementById('tab-time');
  const tabContentYear = document.getElementById('tab-year');

  const subTabBtns = document.querySelectorAll('.sub-tab-btn');
  const subItemsEl = document.getElementById('sub-items');
  const subShopsEl = document.getElementById('sub-shops');

  const periodPills = document.querySelectorAll('.period-pill');

  // === App State ===
  let cacheData = null;
  let lastCompleteData = null;

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
    return number.toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
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
    const checked = document.querySelector('input[name="list_type"]:checked');
    return checked ? parseInt(checked.value) : 3;
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

  // === Top Shops Period Filter ===
  function computeTopShopsForPeriod(miniOrders, cutoffTs) {
    const shopMap = {};
    for (const order of miniOrders) {
      if (cutoffTs && order.ts < cutoffTs) continue;
      if (!Array.isArray(order.sl)) continue;
      for (const shop of order.sl) {
        if (!shop.i) continue;
        if (!shopMap[shop.i]) shopMap[shop.i] = { name: shop.n, spent: 0, count: 0 };
        shopMap[shop.i].spent += shop.s;
        shopMap[shop.i].count += 1;
      }
    }
    return Object.values(shopMap).sort((a, b) => b.spent - a.spent).slice(0, 5);
  }

  // === Cache Management ===
  function checkCacheInfo(listType) {
    chrome.storage.local.get(['shopee_cache'], (result) => {
      const cache = result.shopee_cache;
      if (cache && cache.listType === listType && cache.lastUpdated > 0 && Array.isArray(cache.miniOrders)) {
        cacheData = cache;
        const elapsedMin = Math.round((Date.now() / 1000 - cache.lastUpdated) / 60);
        let timeStr;
        if (elapsedMin < 60) timeStr = `${elapsedMin} phút trước`;
        else if (elapsedMin < 1440) timeStr = `${Math.round(elapsedMin / 60)} giờ trước`;
        else timeStr = `${Math.round(elapsedMin / 1440)} ngày trước`;
        cacheBadgeText.textContent = `Cache: ${cache.miniOrders.length.toLocaleString()} đơn · ${timeStr}`;
        cacheInfo.classList.remove('hidden');
      } else {
        cacheData = null;
        cacheInfo.classList.add('hidden');
      }
    });
  }

  checkCacheInfo(3);
  document.querySelectorAll('input[name="list_type"]').forEach(r =>
    r.addEventListener('change', () => checkCacheInfo(parseInt(r.value)))
  );
  btnClearCache.addEventListener('click', () => {
    chrome.storage.local.remove(['shopee_cache'], () => {
      cacheData = null;
      cacheInfo.classList.add('hidden');
    });
  });

  // === Tab Switching ===
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
      document.getElementById(btn.getAttribute('data-target')).classList.remove('hidden');
    });
  });
  subTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.sub-tab-content').forEach(tc => tc.classList.add('hidden'));
      document.getElementById(btn.getAttribute('data-subtarget')).classList.remove('hidden');
    });
  });

  // === Period Filter (Top Section) ===
  periodPills.forEach(pill => {
    pill.addEventListener('click', () => {
      periodPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      if (!lastCompleteData) return;
      const period = pill.getAttribute('data-period');
      const miniOrders = lastCompleteData.cachePayload && lastCompleteData.cachePayload.miniOrders;

      if (!miniOrders || miniOrders.length === 0) return;

      const now = Date.now() / 1000;
      const cutoffs = { all: 0, '1y': now - 365 * 24 * 3600, '3m': now - 90 * 24 * 3600, '1m': now - 30 * 24 * 3600 };
      const cutoff = cutoffs[period] || 0;

      const filtered = computeTopShopsForPeriod(miniOrders, cutoff);

      if (period === 'all') {
        renderTopShops(lastCompleteData.topShops || [], false);
        renderTopItems(lastCompleteData.topItems || [], false);
      } else {
        const hasSl = miniOrders.some(o => Array.isArray(o.sl));
        if (!hasSl) {
          subShopsEl.innerHTML = '<div class="empty-msg">Hãy thống kê lại để lọc theo thời gian</div>';
        } else {
          renderTopShops(filtered, true);
        }
        renderTopItems(lastCompleteData.topItems || [], true);
      }
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
  }

  // === Restart ===
  btnRestart.addEventListener('click', () => {
    showState(stateInitial);
    errorMessage.textContent = '';
    checkCacheInfo(getSelectedListType());
  });

  // === Export CSV ===
  btnExportCsv.addEventListener('click', () => { if (lastCompleteData) exportCSV(lastCompleteData); });
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
  btnShareCard.addEventListener('click', async () => {
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

  // === Share Link ===
  // Replace [YOUR_GITHUB_USERNAME] with your actual GitHub Pages URL after deploying share-page/
  const SHARE_PAGE_BASE = 'https://[YOUR_GITHUB_USERNAME].github.io/shopee-stats/share-page';

  function buildShareLink(data) {
    const curYear = new Date().getFullYear();
    const annualSpent = (data.thongKeTheoNam && data.thongKeTheoNam[curYear])
      ? data.thongKeTheoNam[curYear].total.tongTien : 0;
    const rankNum = data.tongtienhang <= 10000000 ? 1 : data.tongtienhang <= 50000000 ? 2 : data.tongtienhang < 80000000 ? 3 : 4;
    const topShopName = (data.topShops && data.topShops[0]) ? data.topShops[0].name.substring(0, 25) : '';
    const shareData = {
      v: 1,
      t: Math.round(data.tongtienhang),
      o: data.tongDonHang,
      s: Math.round(Math.max(0, data.tongTienTietKiem)),
      ip: data.tongSanPhamDaMua,
      r: rankNum,
      p: getSpendingPercentile(annualSpent),
      ts: Math.floor(Date.now() / 1000),
      sh: topShopName
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(shareData))));
    return `${SHARE_PAGE_BASE}/#d=${encoded}`;
  }

  btnShareLink.addEventListener('click', async () => {
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
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') });
    });
  }

  // === Start Extractor ===
  btnStart.addEventListener('click', async () => {
    errorMessage.textContent = '';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url.includes('shopee.vn')) {
        errorMessage.textContent = '❌ Bạn cần truy cập vào trang Shopee.vn để sử dụng tiện ích này.';
        return;
      }
      resetProgress();
      showState(stateLoading);

      const listType = getSelectedListType();
      const configPayload = {
        listType,
        lastUpdated: (cacheData && cacheData.listType === listType) ? (cacheData.lastUpdated || 0) : 0,
        miniOrders: (cacheData && cacheData.listType === listType && Array.isArray(cacheData.miniOrders)) ? cacheData.miniOrders : [],
        shopMap: (cacheData && cacheData.listType === listType && cacheData.shopMap) ? cacheData.shopMap : {},
        itemMap: (cacheData && cacheData.listType === listType && cacheData.itemMap) ? cacheData.itemMap : {}
      };

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (cfg) => { window.__shopeeConfig = cfg; },
        args: [configPayload],
        world: 'MAIN'
      });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/bridge.js'] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'], world: 'MAIN' });
    } catch (err) {
      console.error(err);
      showState(stateInitial);
      errorMessage.textContent = 'Đã có lỗi xảy ra. Hãy tải lại trang Shopee và thử lại nhé.';
    }
  });

  // === Message Listener ===
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'progress') {
      const processed = message.processed || 0;
      const pct = typeof message.pct === 'number' ? message.pct : -1;
      if (pct >= 0) {
        progressBarFill.classList.remove('indeterminate');
        progressBarFill.style.width = pct + '%';
        progressText.textContent = `Đã xử lý ${processed.toLocaleString()}/${(message.total || 0).toLocaleString()} đơn (${pct}%)`;
      } else {
        progressBarFill.classList.add('indeterminate');
        progressText.textContent = `Đã xử lý ${processed.toLocaleString()} đơn hàng...`;
      }
    } else if (message.type === 'error') {
      showState(stateInitial);
      errorMessage.textContent = message.message || 'Đã có lỗi khi thu thập dữ liệu.';
    } else if (message.type === 'complete') {
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

    totalSpentEl.textContent = pxgPrice(data.tongtienhang) + 'đ';
    rankBadgeEl.textContent = getRankBadge(data.tongtienhang);
    totalOrdersEl.textContent = pxgPrice(data.tongDonHang);
    totalItemsEl.textContent = pxgPrice(data.tongSanPhamDaMua);
    totalSavedEl.textContent = pxgPrice(data.tongTienTietKiem) + 'đ';
    totalShippingEl.textContent = pxgPrice(data.tongPhiShip || 0) + 'đ';

    renderTrendBadges(data.thongKeTheoNam);
    renderPercentile(data.thongKeTheoNam);
    renderTopItems(data.topItems || [], false);
    renderTopShops(data.topShops || [], false);
    renderTimeData(data.thongKeTheoThang);
    renderYearData(data.thongKeTheoNam);

    // Reset all UI controls to defaults
    tabBtns.forEach(b => b.classList.remove('active'));
    tabBtns[0].classList.add('active');
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
    tabContentTime.classList.remove('hidden');

    subTabBtns.forEach(b => b.classList.remove('active'));
    subTabBtns[0].classList.add('active');
    document.querySelectorAll('.sub-tab-content').forEach(tc => tc.classList.add('hidden'));
    subItemsEl.classList.remove('hidden');

    periodPills.forEach(p => p.classList.remove('active'));
    periodPills[0].classList.add('active');

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

  // === Render Top Items ===
  function renderTopItems(topItems, isPeriodFiltered) {
    if (topItems && topItems.length > 0) {
      const maxSpent = Math.max(...topItems.map(i => i.spent), 1);
      const note = isPeriodFiltered ? '<div class="top-period-note">Sản phẩm: toàn thời gian</div>' : '';
      subItemsEl.innerHTML = note + topItems.map((item, idx) => {
        const pct = Math.round((item.spent / maxSpent) * 100);
        return `
          <div class="top-item">
            <div class="top-rank">${idx + 1}</div>
            <div class="top-info">
              <span class="top-name">${escapeHtml(item.name)}</span>
              <span class="top-meta">${escapeHtml(item.shopName)} · ${pxgPrice(item.count)} lượt</span>
              <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%"></div></div>
            </div>
            <span class="top-value">${pxgPrice(item.spent)}đ</span>
          </div>`;
      }).join('');
    } else {
      subItemsEl.innerHTML = '<div class="empty-msg">Không có dữ liệu sản phẩm</div>';
    }
  }

  // === Render Top Shops ===
  function renderTopShops(topShops, isPeriodFiltered) {
    if (topShops && topShops.length > 0) {
      const maxSpent = Math.max(...topShops.map(s => s.spent), 1);
      subShopsEl.innerHTML = topShops.map((shop, idx) => {
        const pct = Math.round((shop.spent / maxSpent) * 100);
        return `
          <div class="top-item">
            <div class="top-rank">${idx + 1}</div>
            <div class="top-info">
              <span class="top-name">${escapeHtml(shop.name)}</span>
              <span class="top-meta">${pxgPrice(shop.count)} đơn hàng</span>
              <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%"></div></div>
            </div>
            <span class="top-value">${pxgPrice(shop.spent)}đ</span>
          </div>`;
      }).join('');
    } else {
      subShopsEl.innerHTML = '<div class="empty-msg">Không có dữ liệu cửa hàng</div>';
    }
  }

  // === Render Time Data ===
  function renderTimeData(thongKeTheoThang) {
    const mapKeys = [
      { key: '1_thang', label: '1 Tháng Gần Nhất' },
      { key: '3_thang', label: '3 Tháng Gần Nhất' },
      { key: '6_thang', label: '6 Tháng Gần Nhất' },
      { key: '1_nam', label: '1 Năm Gần Nhất' }
    ];
    const valid = mapKeys.filter(item => {
      const d = thongKeTheoThang[item.key];
      return d && (d.tongTien > 0 || d.donHang > 0);
    });
    if (!valid.length) {
      tabContentTime.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Không có dữ liệu trong thời gian gần đây</div>';
      return;
    }
    const maxSpent = Math.max(...valid.map(item => thongKeTheoThang[item.key].tongTien), 1);
    tabContentTime.innerHTML = valid.map(item => {
      const d = thongKeTheoThang[item.key];
      const saved = d.tienChuaGiam - d.tongTien;
      const pct = Math.round((d.tongTien / maxSpent) * 100);
      return `
        <div class="list-item">
          <div class="list-item-left">
            <span class="list-title">${item.label}</span>
            <span class="list-desc">${pxgPrice(d.donHang)} Đơn / ${pxgPrice(d.sanPham)} Sản phẩm</span>
            <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%"></div></div>
          </div>
          <div style="text-align:right;margin-left:12px">
            <span class="list-value">${pxgPrice(d.tongTien)}đ</span>
            ${saved > 0 ? `<span class="list-value-saved">Giảm ${pxgPrice(saved)}đ</span>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  // === Render Year Data ===
  function renderYearData(thongKeTheoNam) {
    const sortedYears = Object.keys(thongKeTheoNam).sort((a, b) => b - a);
    if (!sortedYears.length) {
      tabContentYear.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Chưa có dữ liệu theo năm</div>';
      return;
    }
    const maxSpent = Math.max(...sortedYears.map(y => thongKeTheoNam[y].total.tongTien), 1);
    tabContentYear.innerHTML = sortedYears.map(year => {
      const d = thongKeTheoNam[year].total;
      const saved = d.tienChuaGiam - d.tongTien;
      const pct = Math.round((d.tongTien / maxSpent) * 100);
      return `
        <div class="list-item">
          <div class="list-item-left">
            <span class="list-title">Năm ${year}</span>
            <span class="list-desc">${pxgPrice(d.donHang)} Đơn / ${pxgPrice(d.sanPham)} Sản phẩm</span>
            <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%"></div></div>
          </div>
          <div style="text-align:right;margin-left:12px">
            <span class="list-value">${pxgPrice(d.tongTien)}đ</span>
            ${saved > 0 ? `<span class="list-value-saved">Giảm ${pxgPrice(saved)}đ</span>` : ''}
          </div>
        </div>`;
    }).join('');
  }
});
