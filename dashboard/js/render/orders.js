/* ─────────────────────────────────────────────────
   Render: Sale Day Statistics view
   Replaces the old Order History view with interactive
   kpis, charts, hour analytics, category breakdowns,
   and AI insights.
   Depends on helpers.js.
───────────────────────────────────────────────── */

let currentOrders = [];
let ordersActiveYear = 'all';
let ordersActiveType = 'all'; // 'all', 'double', 'mid', 'end', 'regular'
let ordersActiveHour = null;  // null | 'midnight'|'early'|'morning'|'noon'|'afternoon'|'night'
let ordersActiveCat = null;   // null | category name string
let ordersCurrentPage = 1;

let ordersSearchQuery = "";
let ordersCatFilter = "all";
let ordersEventsBound = false;
let ordersActiveDateFilter = null; // 'YYYY-MM-DD' | null — set by clicking heatmap

let salesDistributionChart = null;
let salesSpendSavingsChart = null;

// Stats memoization — cleared on new data load, keyed by active year
let _statsCache = null;
let _statsCacheYear = null;

function removeVnAccents(str) {
  return (str || '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function isDateBlackFriday(tsSec) {
  return isVnBlackFriday(tsSec);
}

function getSaleType(tsSec) {
  return getSaleTypeFromTs(tsSec);
}

function getSaleTypeLabel(type, tsSec) {
  if (type === 'regular') return '';
  if (type === 'mid') return 'Giữa Tháng';
  if (type === 'end') return 'Lương Về';
  return isVnBlackFriday(tsSec) ? 'Black Friday' : 'Ngày Đôi';
}

function getSaleDayLabel(type, tsSec) {
  const p = toVnParts(tsSec);
  if (type === 'regular') return `Ngày thường ${p.day}/${p.month}`;
  if (type === 'mid') return `Giữa Tháng 15/${p.month}`;
  if (type === 'end') return `Lương Về ${p.day}/${p.month}`;
  return isVnBlackFriday(tsSec) ? `Black Friday ${p.day}/${p.month}` : `Ngày Đôi ${p.day}/${p.month}`;
}

function parseCategoryName(catName) {
  const emojiRegex = /^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])\s*/u;
  const match = catName.match(emojiRegex);
  if (match) {
    const emoji = match[1];
    const text = catName.replace(emojiRegex, '');
    return { emoji, text };
  }
  return { emoji: '🏷️', text: catName };
}

function getCategoryColor(catName) {
  let catId = null;
  if (typeof getCatIdByName === 'function') {
    catId = getCatIdByName(catName);
  }

  if (catId) {
    if (catId === 'tech') return { bg: 'rgba(59, 130, 246, 0.12)', fg: '#3b82f6' };
    if (catId === 'fashion') return { bg: 'rgba(238, 77, 45, 0.12)', fg: '#ee4d2d' };
    if (catId === 'beauty_health') return { bg: 'rgba(236, 72, 153, 0.12)', fg: '#ec4899' };
    if (catId === 'home') return { bg: 'rgba(16, 185, 129, 0.12)', fg: '#10b981' };
    if (catId === 'edu') return { bg: 'rgba(20, 184, 166, 0.12)', fg: '#14b8a6' };
    if (catId === 'sport') return { bg: 'rgba(168, 85, 247, 0.12)', fg: '#a855f7' };
  }

  // Fallback: substring matching for legacy or custom categories
  const nameLower = catName.toLowerCase();
  if (nameLower.includes('điện thoại') || nameLower.includes('máy tính') || nameLower.includes('điện tử') || nameLower.includes('camera') || nameLower.includes('ảnh') || nameLower.includes('đồng hồ') || nameLower.includes('tech')) {
    return { bg: 'rgba(59, 130, 246, 0.12)', fg: '#3b82f6' };
  }
  if (nameLower.includes('thời trang') || nameLower.includes('quần áo') || nameLower.includes('giày') || nameLower.includes('túi') || nameLower.includes('fashion')) {
    return { bg: 'rgba(238, 77, 45, 0.12)', fg: '#ee4d2d' };
  }
  if (nameLower.includes('sức khỏe') || nameLower.includes('làm đẹp') || nameLower.includes('mỹ phẩm') || nameLower.includes('skincare') || nameLower.includes('son') || nameLower.includes('beauty') || nameLower.includes('health')) {
    return { bg: 'rgba(236, 72, 153, 0.12)', fg: '#ec4899' };
  }
  if (nameLower.includes('nhà cửa') || nameLower.includes('đời sống') || nameLower.includes('decor') || nameLower.includes('gia dụng') || nameLower.includes('home') || nameLower.includes('living')) {
    return { bg: 'rgba(16, 185, 129, 0.12)', fg: '#10b981' };
  }
  if (nameLower.includes('sách') || nameLower.includes('văn phòng') || nameLower.includes('học tập') || nameLower.includes('edu') || nameLower.includes('giáo dục')) {
    return { bg: 'rgba(20, 184, 166, 0.12)', fg: '#14b8a6' };
  }
  if (nameLower.includes('thể thao') || nameLower.includes('du lịch') || nameLower.includes('sport') || nameLower.includes('phượt')) {
    return { bg: 'rgba(168, 85, 247, 0.12)', fg: '#a855f7' };
  }
  if (nameLower.includes('thực phẩm') || nameLower.includes('ăn vặt') || nameLower.includes('bách hóa') || nameLower.includes('food')) {
    return { bg: 'rgba(245, 158, 11, 0.12)', fg: '#f59e0b' };
  }
  return { bg: 'rgba(100, 116, 139, 0.12)', fg: '#64748b' };
}

function resolveItemCategory(itemName, rawCatId) {
  if (!itemName) {
    return resolveCatLabel({ id: rawCatId, name: rawCatId });
  }

  const key = itemName.toLowerCase().substring(0, 120);
  const key40 = itemName.toLowerCase().substring(0, 40);

  // 1. Check cached classification (from previous sessions or AI)
  if (_dashCache && _dashCache.cats) {
    if (_dashCache.cats[key]) return _dashCache.cats[key];
    if (_dashCache.cats[key40]) return _dashCache.cats[key40];
  }

  // 2. Try keyword classification
  if (typeof classifyByNameSync === 'function') {
    const kwCat = classifyByNameSync(itemName);
    if (kwCat && kwCat !== '🏷️ Khác' && kwCat !== 'Khác') return kwCat;
  }

  // 3. Fall back to raw category ID label
  return resolveCatLabel({ id: rawCatId, name: rawCatId });
}

window.resolveItemCategory = resolveItemCategory;

function renderOrders(ol) {
  currentOrders = (ol || []).map(o => ({
    ...o,
    t: o.ot || o.t
  }));
  ordersActiveYear = 'all';
  ordersActiveType = 'all';
  ordersActiveHour = null;
  ordersActiveCat = null;
  ordersActiveDateFilter = null;
  ordersCurrentPage = 1;
  
  ordersSearchQuery = "";
  ordersCatFilter = "all";
  
  const searchInput = document.getElementById('orders-search-input');
  if (searchInput) searchInput.value = "";
  const searchClear = document.getElementById('orders-search-clear');
  if (searchClear) searchClear.style.display = 'none';
  const catSelect = document.getElementById('orders-cat-select');
  if (catSelect) catSelect.value = "all";

  _statsCache = null;
  _statsCacheYear = null;

  // Update subtitle with data summary
  const subtitle = document.getElementById('orders-subtitle');
  if (subtitle) {
    if (currentOrders.length > 0) {
      const years = new Set();
      let minTs = Infinity, maxTs = -Infinity;
      currentOrders.forEach(o => {
        if (!o.t) return;
        years.add(getVnYear(o.t));
        if (o.t < minTs) minTs = o.t;
        if (o.t > maxTs) maxTs = o.t;
      });
      const fmtMonthYear = ts => {
        return `${toVnParts(ts).month}/${getVnYear(ts)}`;
      };
      const yearCount = years.size;
      const totalCount = window._totalOrderCount || 0;
      const loadedCount = currentOrders.length;
      const isTruncated = totalCount > 0 && loadedCount < totalCount;

      // Base info: date range + year count
      let text = `${yearCount} năm dữ liệu · từ ${fmtMonthYear(minTs)} đến ${fmtMonthYear(maxTs)}`;

      if (isTruncated) {
        // Distinguish: stats are complete (from oss), detail list is partial
        const hasOss = !!window._oss;
        if (hasOss) {
          text = `Thống kê từ ${totalCount} đơn (đầy đủ) · hiển thị ${loadedCount} đơn gần nhất · ${text}`;
        } else {
          text = `${loadedCount}/${totalCount} đơn · ${text}`;
        }
      } else {
        text = `${loadedCount} đơn hàng · ${text}`;
      }
      subtitle.textContent = text;
    } else {
      subtitle.textContent = 'Phân tích hành vi chi tiêu và hiệu quả săn sale của bạn';
    }
  }

  // Setup Year Pills
  renderOrdersYearPills();

  // Setup Limit Listener once
  const limitSelect = document.getElementById('orders-limit-select');
  if (limitSelect && !limitSelect.dataset.hasListener) {
    limitSelect.addEventListener('change', () => {
      ordersCurrentPage = 1;
      applyFiltersAndRender();
    });
    limitSelect.dataset.hasListener = 'true';
  }

  applyFiltersAndRender();
}

function renderOrdersYearPills() {
  const container = document.getElementById('orders-year-pills');
  if (!container) return;

  if (currentOrders.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Extract years
  const yearsSet = new Set();
  currentOrders.forEach(o => {
    if (o.t) {
      const yr = getVnYear(o.t);
      yearsSet.add(String(yr));
    }
  });

  const years = Array.from(yearsSet).sort((a, b) => b - a);
  const allPills = ['all', ...years];

  container.innerHTML = allPills
    .map((y, i) => `<button class="pill${y === ordersActiveYear ? ' active' : ''}" data-orderyear="${y}">${y === 'all' ? 'Tất cả' : 'Năm ' + y}</button>`)
    .join('');

  container.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      ordersActiveYear = btn.getAttribute('data-orderyear');
      ordersActiveType = 'all'; // Reset interactive card filter
      ordersActiveHour = null;
      ordersActiveCat = null;
      ordersActiveDateFilter = null; // Reset heatmap date filter
      // Clear heatmap selection highlight
      document.querySelectorAll('.heatmap-day--selected').forEach(el => el.classList.remove('heatmap-day--selected'));
      ordersCurrentPage = 1;
      applyFiltersAndRender();
    });
  });
}

function applyFiltersAndRender() {
  // 1. Filter orders by selected Year
  const filteredYearOrders = currentOrders.filter(o => {
    if (ordersActiveYear !== 'all' && o.t) {
      const yr = String(getVnYear(o.t));
      if (yr !== ordersActiveYear) return false;
    }
    return true;
  });

  // 2. Process data for KPI, Charts, Advanced Analytics
  const stats = calculateSalesStats(filteredYearOrders);

  // 3. Render elements
  renderSalesKPIs(stats);
  renderSalesCharts(stats);
  renderAdvancedAnalytics(filteredYearOrders, stats);
  renderSalesInsights(stats);
  renderSalesProductList(filteredYearOrders);
  
  // Heatmap and Shopper profile upgrades
  renderSalesHeatmap(filteredYearOrders);
  renderSalesProfileCard(stats);
  
  renderSaleDaysTable(filteredYearOrders);

  // Reveal the hidden cards using the IntersectionObserver
  reveal(document.getElementById('card-sales-heatmap'));
  reveal(document.getElementById('card-orders'));
}

function calculateSalesStats(orders) {
  // Return cached result when year filter hasn't changed (avoids re-iterating on every filter interaction)
  if (_statsCache && _statsCacheYear === ordersActiveYear) return _statsCache;

  const stats = {
    double: { label: 'Ngày Đôi', spend: 0, raw: 0, orders: 0, midnightOrders: 0, categories: {} },
    mid: { label: 'Giữa Tháng', spend: 0, raw: 0, orders: 0, midnightOrders: 0, categories: {} },
    end: { label: 'Lương Về', spend: 0, raw: 0, orders: 0, midnightOrders: 0, categories: {} },
    regular: { label: 'Ngày Thường', spend: 0, raw: 0, orders: 0, midnightOrders: 0, categories: {} }
  };

  // ── Accurate numerical stats from pre-aggregated oss (complete, never truncated) ──
  if (window._oss) {
    const yearsToUse = ordersActiveYear === 'all'
      ? Object.keys(window._oss)
      : (window._oss[ordersActiveYear] ? [ordersActiveYear] : []);

    for (const yr of yearsToUse) {
      for (const type of ['double', 'mid', 'end', 'regular']) {
        const e = window._oss[yr]?.[type];
        if (!e) continue;
        stats[type].spend += e[0] || 0;
        stats[type].raw += e[1] || 0;
        stats[type].orders += e[2] || 0;
        stats[type].midnightOrders += e[3] || 0;
      }
    }
  }

  // ── Directional category breakdown from available orders (may be partial subset) ──
  // Categories are used for pattern-insight only; they come from ol[] which can be
  // a recent-N subset. Spend/raw/orders numbers above override from oss when available.
  orders.forEach(o => {
    if (!o.t || o.t <= 0 || !(o.f > 0)) return;
    const type = getSaleType(o.t);
    const spend = o.f;

    // When oss is NOT available (old extension payload), fall back to computing from ol[]
    if (!window._oss) {
      const raw = o.r > 0 ? o.r : o.f;
      stats[type].spend += spend;
      stats[type].raw += raw;
      stats[type].orders += 1;
      if (toVnParts(o.t).hour < 2) stats[type].midnightOrders += 1;
    }

    // Always accumulate categories (used for pattern display, acceptable with partial data)
    if (o.c || o.n) {
      const resolvedCat = resolveItemCategory(o.n, o.c);
      if (!stats[type].categories[resolvedCat]) {
        stats[type].categories[resolvedCat] = { spend: 0, count: 0 };
      }
      stats[type].categories[resolvedCat].spend += spend;
      stats[type].categories[resolvedCat].count += 1;
    }
  });

  _statsCache = stats;
  _statsCacheYear = ordersActiveYear;
  return stats;
}

function renderSalesKPIs(stats) {
  const row = document.getElementById('sales-kpi-row');
  if (!row) return;

  const totalSpend = Object.values(stats).reduce((sum, s) => sum + s.spend, 0);

  const keys = ['double', 'mid', 'end', 'regular'];
  row.innerHTML = keys.map(k => {
    const s = stats[k];
    const saved = Math.max(0, s.raw - s.spend);
    const savingPct = s.raw > 0 ? Math.round((saved / s.raw) * 100) : 0;
    const sharePct = totalSpend > 0 ? Math.round((s.spend / totalSpend) * 100) : 0;
    const aov = s.orders > 0 ? Math.round(s.spend / s.orders) : 0;
    const isActive = ordersActiveType === k;
    let cardIcon = '📅';
    let iconClass = '';

    if (k === 'double') { cardIcon = '🎁'; iconClass = 'orange'; }
    else if (k === 'mid') { cardIcon = '🌓'; iconClass = 'green'; }
    else if (k === 'end') { cardIcon = '💰'; iconClass = 'blue'; }

    // Find dynamic top category for this campaign card
    const sortedCats = Object.entries(s.categories)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.spend - a.spend);
    const topCatName = sortedCats.length > 0 ? sortedCats[0].name : '';
    let topCatHtml = '';
    if (topCatName) {
      topCatHtml = `<div class="kpi-sub" style="font-size:11.5px; margin-top:4px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Săn nhiều nhất: ${topCatName}">
        🛍️ Săn nhiều: <strong>${topCatName}</strong>
      </div>`;
    } else {
      topCatHtml = `<div class="kpi-sub" style="font-size:11.5px; margin-top:4px; color:var(--muted);">
        🛍️ Săn nhiều: <em>Không có dữ liệu</em>
      </div>`;
    }

    let hoverTitle = "Click để lọc chi tiết";
    if (k === 'double') hoverTitle = "Đợt siêu sale Ngày Đôi (ngày trùng tháng 1/1, 2/2... hoặc Black Friday). Click để lọc chi tiết.";
    else if (k === 'mid') hoverTitle = "Đợt sale Giữa Tháng (ngày 15 hàng tháng). Click để lọc chi tiết.";
    else if (k === 'end') hoverTitle = "Đợt sale Lương Về (từ ngày 25 đến cuối tháng). Click để lọc chi tiết.";
    else if (k === 'regular') hoverTitle = "Các ngày thường không có lịch sale lớn. Click để lọc chi tiết.";

    return `
      <div class="kpi interactive${isActive ? ' active' : ''}" data-type="${k}" title="${hoverTitle}">
        <div class="kpi-label">
          <span style="font-size:16px; margin-right:4px;">${cardIcon}</span>
          ${s.label}
        </div>
        <div class="kpi-value ${iconClass}">${fmtVND(s.spend)}</div>
        <div class="kpi-sub">
          <strong>${s.orders}</strong> đơn (${sharePct}%) · TB/đơn: <strong>${fmtVND(aov)}</strong>
        </div>
        <div class="kpi-sub" style="color:var(--green); font-weight:600; margin-top:4px;">
          ✓ Tiết kiệm: ${fmtVND(saved)} (-${savingPct}%)
        </div>
        ${topCatHtml}
      </div>
    `;
  }).join('');

  // Add click + keyboard listeners to cards
  row.querySelectorAll('.kpi.interactive').forEach(card => {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');

    const toggle = () => {
      const type = card.getAttribute('data-type');
      ordersActiveType = ordersActiveType === type ? 'all' : type;
      ordersCurrentPage = 1;
      applyFiltersAndRender();
    };

    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  row.querySelectorAll('.kpi').forEach(el => reveal(el));
}

function renderSalesCharts(stats) {
  const totalSpend = Object.values(stats).reduce((sum, s) => sum + s.spend, 0);

  const labels = ['Ngày Đôi', 'Giữa Tháng', 'Lương Về', 'Ngày Thường'];
  const spendData = [stats.double.spend, stats.mid.spend, stats.end.spend, stats.regular.spend];
  const orderCounts = [stats.double.orders, stats.mid.orders, stats.end.orders, stats.regular.orders];
  const savedData = [
    Math.max(0, stats.double.raw - stats.double.spend),
    Math.max(0, stats.mid.raw - stats.mid.spend),
    Math.max(0, stats.end.raw - stats.end.spend),
    Math.max(0, stats.regular.raw - stats.regular.spend)
  ];

  // Colors: Shopee Orange, Green, Blue, Dark Gray
  const basePalette = ['#ee4d2d', '#26aa99', '#3b82f6', '#94a3b8'];
  const typeKeys = ['double', 'mid', 'end', 'regular'];
  const activeIndex = typeKeys.indexOf(ordersActiveType);
  const PALETTE = activeIndex === -1
    ? basePalette
    : basePalette.map((c, i) => i === activeIndex ? c : c + '40'); // Dim non-active segments (25% opacity)

  // 1. Doughnut Chart (Distribution)
  const distCtx = document.getElementById('chart-sales-distribution');
  if (distCtx) {
    const ctx = distCtx.getContext('2d');
    if (salesDistributionChart) salesDistributionChart.destroy();

    if (totalSpend === 0) {
      ctx.clearRect(0, 0, distCtx.width, distCtx.height);
    } else {
      salesDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: spendData,
            backgroundColor: PALETTE,
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          onClick: (event, activeElements) => {
            if (activeElements && activeElements.length > 0) {
              const index = activeElements[0].index;
              const clickedType = typeKeys[index];
              if (ordersActiveType === clickedType) {
                ordersActiveType = 'all';
              } else {
                ordersActiveType = clickedType;
              }
              ordersCurrentPage = 1;
              applyFiltersAndRender();
              const ordersCard = document.getElementById('card-orders');
              if (ordersCard) {
                scrollToSalesDetail();
              }
            }
          },
          onHover: (event, activeElements) => {
            event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
          },
          plugins: {
            legend: {
              display: true,
              position: 'right',
              labels: { color: 'rgba(30,41,59,0.7)', font: { size: 11 }, boxWidth: 12, padding: 8 }
            },
            tooltip: {
              backgroundColor: '#ffffff',
              borderColor: 'rgba(0,0,0,0.1)',
              borderWidth: 1,
              titleColor: '#1e293b',
              bodyColor: 'rgba(30,41,59,0.8)',
              callbacks: {
                label: ctx => {
                  const spend = ctx.parsed;
                  const pct = totalSpend > 0 ? Math.round((spend / totalSpend) * 100) : 0;
                  const orders = orderCounts[ctx.dataIndex] || 0;
                  return ['  ' + fmtVND(spend), '  ' + orders + ' đơn · ' + pct + '%'];
                }
              }
            }
          }
        }
      });
    }
    reveal(document.getElementById('card-sales-distribution'));
  }

  // 2. Grouped Bar Chart (Spend vs Savings)
  const ssCtx = document.getElementById('chart-sales-spend-savings');
  if (ssCtx) {
    const ctx = ssCtx.getContext('2d');
    if (salesSpendSavingsChart) salesSpendSavingsChart.destroy();

    // Create dynamic premium gradients for Spend and Savings
    const spendGradients = typeKeys.map((k, i) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 250);
      if (activeIndex === -1) {
        grad.addColorStop(0, '#ee4d2d');
        grad.addColorStop(1, '#ff8060');
      } else if (i === activeIndex) {
        grad.addColorStop(0, '#ee4d2d');
        grad.addColorStop(1, '#ff8060');
      } else {
        grad.addColorStop(0, 'rgba(238, 77, 45, 0.15)');
        grad.addColorStop(1, 'rgba(238, 77, 45, 0.05)');
      }
      return grad;
    });

    const savingsGradients = typeKeys.map((k, i) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 250);
      if (activeIndex === -1) {
        grad.addColorStop(0, '#26aa99');
        grad.addColorStop(1, '#5fe8cc');
      } else if (i === activeIndex) {
        grad.addColorStop(0, '#26aa99');
        grad.addColorStop(1, '#5fe8cc');
      } else {
        grad.addColorStop(0, 'rgba(38, 170, 153, 0.15)');
        grad.addColorStop(1, 'rgba(38, 170, 153, 0.05)');
      }
      return grad;
    });

    salesSpendSavingsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Thực chi',
            data: spendData,
            backgroundColor: spendGradients,
            borderColor: activeIndex === -1
              ? '#ee4d2d'
              : typeKeys.map((k, i) => i === activeIndex ? '#ee4d2d' : 'rgba(238, 77, 45, 0.25)'),
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Tiết kiệm',
            data: savedData,
            backgroundColor: savingsGradients,
            borderColor: activeIndex === -1
              ? '#26aa99'
              : typeKeys.map((k, i) => i === activeIndex ? '#26aa99' : 'rgba(38, 170, 153, 0.25)'),
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, activeElements) => {
          if (activeElements && activeElements.length > 0) {
            const index = activeElements[0].index;
            const clickedType = typeKeys[index];
            if (ordersActiveType === clickedType) {
              ordersActiveType = 'all';
            } else {
              ordersActiveType = clickedType;
            }
            ordersCurrentPage = 1;
            applyFiltersAndRender();
            const ordersCard = document.getElementById('card-orders');
            if (ordersCard) {
              scrollToSalesDetail();
            }
          }
        },
        onHover: (event, activeElements) => {
          event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: 'rgba(30,41,59,0.7)', font: { size: 11 }, boxWidth: 12 }
          },
          tooltip: {
            backgroundColor: '#ffffff',
            borderColor: 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            titleColor: '#1e293b',
            bodyColor: 'rgba(30,41,59,0.8)',
            callbacks: { label: ctx => '  ' + ctx.dataset.label + ': ' + fmtVND(ctx.parsed.y) }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: 'rgba(30,41,59,0.6)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: 'rgba(30,41,59,0.5)', font: { size: 10 }, callback: v => fmtVND(v) } }
        }
      }
    });
    reveal(document.getElementById('card-sales-spend-savings'));
  }
}

function renderAdvancedAnalytics(filteredOrders, stats) {
  // 1. Render Golden Hours list
  const hoursContainer = document.getElementById('sales-hours-container');
  if (hoursContainer) {
    // Group all filtered orders by hour ranges
    const hours = {
      midnight: { label: 'Săn đêm (00h - 02h)', count: 0, spend: 0, emoji: '🦉', bg: 'rgba(238, 77, 45, 0.12)', fg: '#ee4d2d', bar: '#ee4d2d' },
      early: { label: 'Sáng sớm (02h - 08h)', count: 0, spend: 0, emoji: '🌅', bg: 'rgba(168, 85, 247, 0.12)', fg: '#a855f7', bar: '#a855f7' },
      morning: { label: 'Giờ sáng (08h - 12h)', count: 0, spend: 0, emoji: '☀️', bg: 'rgba(59, 130, 246, 0.12)', fg: '#3b82f6', bar: '#3b82f6' },
      noon: { label: 'Nghỉ trưa (12h - 13h)', count: 0, spend: 0, emoji: '🥪', bg: 'rgba(38, 170, 153, 0.12)', fg: '#26aa99', bar: '#26aa99' },
      afternoon: { label: 'Chiều làm (13h - 18h)', count: 0, spend: 0, emoji: '☕', bg: 'rgba(245, 158, 11, 0.12)', fg: '#f59e0b', bar: '#f59e0b' },
      night: { label: 'Tối muộn (18h - 24h)', count: 0, spend: 0, emoji: '🌃', bg: 'rgba(100, 116, 139, 0.12)', fg: '#64748b', bar: '#64748b' }
    };

    let totalOrders = 0;
    filteredOrders.forEach(o => {
      if (!o.t || o.t <= 0) return;

      // Filter by active KPI card type
      if (ordersActiveType !== 'all' && getSaleType(o.t) !== ordersActiveType) return;

      totalOrders++;
      const hr = toVnParts(o.t).hour;
      const s = o.f || 0;
      if (hr >= 0 && hr < 2) { hours.midnight.count++, hours.midnight.spend += s; }
      else if (hr >= 2 && hr < 8) { hours.early.count++, hours.early.spend += s; }
      else if (hr >= 8 && hr < 12) { hours.morning.count++, hours.morning.spend += s; }
      else if (hr >= 12 && hr < 13) { hours.noon.count++, hours.noon.spend += s; }
      else if (hr >= 13 && hr < 18) { hours.afternoon.count++, hours.afternoon.spend += s; }
      else { hours.night.count++, hours.night.spend += s; }
    });

    const maxOrders = Math.max(...Object.values(hours).map(h => h.count), 1);
    const displayTotalOrders = totalOrders || 1;

    hoursContainer.innerHTML = Object.entries(hours).map(([key, h]) => {
      const pct = Math.round((h.count / maxOrders) * 100);
      const sharePct = Math.round((h.count / displayTotalOrders) * 100);
      const isActive = ordersActiveHour === key;
      const activeStyle = isActive ? `box-shadow:0 0 0 2px ${h.fg};border-radius:10px;background:${h.bg};` : '';

      return `
        <div class="sales-adv-item" data-hourkey="${key}" title="Click để xem đơn trong khung giờ này" style="cursor:pointer;transition:all 0.18s;${activeStyle}">
          <div class="sales-adv-icon" style="background:${h.bg};color:${h.fg};">${h.emoji}</div>
          <div class="sales-adv-body">
            <div class="sales-adv-title">${h.label}</div>
            <div class="top-bar-wrap" style="width:100%;height:5px;margin-top:4px;">
              <div class="top-bar-fill" style="width:${pct}%;height:100%;background:${h.bar}"></div>
            </div>
            <div class="sales-adv-sub">${h.count} đơn (${sharePct}%)</div>
          </div>
          <div class="sales-adv-val">${fmtVND(h.spend)}</div>
        </div>
      `;
    }).join('');

    hoursContainer.querySelectorAll('[data-hourkey]').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.getAttribute('data-hourkey');
        if (ordersActiveHour === key) {
          ordersActiveHour = null;
        } else {
          ordersActiveHour = key;
          ordersActiveCat = null;
        }
        ordersCurrentPage = 1;
        applyFiltersAndRender();
        scrollToSalesDetail();
      });
    });
    reveal(document.getElementById('card-sales-hours'));
  }

  // 2. Render Top Categories on Sales
  const catsContainer = document.getElementById('sales-categories-container');
  if (catsContainer) {
    // Combine categories from Double, Mid, and End sale days
    const combinedCats = {};
    const saleKeys = ['double', 'mid', 'end'];

    // If active KPI is set, only use that type's categories
    const activeKeys = ordersActiveType === 'all'
      ? saleKeys
      : (ordersActiveType === 'regular' ? ['regular'] : [ordersActiveType]);

    activeKeys.forEach(k => {
      const s = stats[k];
      Object.entries(s.categories).forEach(([name, data]) => {
        if (!combinedCats[name]) {
          combinedCats[name] = { spend: 0, count: 0 };
        }
        combinedCats[name].spend += data.spend;
        combinedCats[name].count += data.count;
      });
    });

    const sortedCats = Object.entries(combinedCats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    if (sortedCats.length === 0) {
      catsContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--muted); font-size: 13px;">
          Không có dữ liệu phân bổ danh mục ngày sale.<br>
          <small style="opacity:0.8;">(Dữ liệu quét từ extension phiên bản cũ hoặc chưa quét đơn hàng mới)</small>
        </div>
      `;
    } else {
      const maxSpend = Math.max(...sortedCats.map(c => c.spend), 1);
      catsContainer.innerHTML = sortedCats.map(c => {
        const pct = Math.round((c.spend / maxSpend) * 100);
        const { emoji, text } = parseCategoryName(c.name);
        const colors = getCategoryColor(c.name);
        const isActive = ordersActiveCat === c.name;
        const activeStyle = isActive ? `box-shadow:0 0 0 2px ${colors.fg};border-radius:10px;background:${colors.bg};` : '';

        return `
          <div class="sales-adv-item" data-catname="${escHtml(c.name)}" title="Click để xem đơn trong danh mục này" style="cursor:pointer;transition:all 0.18s;${activeStyle}">
            <div class="sales-adv-icon" style="background:${colors.bg};color:${colors.fg};">${emoji}</div>
            <div class="sales-adv-body">
              <div class="sales-adv-title">${escHtml(text)}</div>
              <div class="top-bar-wrap" style="width:100%;height:5px;margin-top:4px;">
                <div class="top-bar-fill" style="width:${pct}%;height:100%;background:${colors.fg}"></div>
              </div>
              <div class="sales-adv-sub">${c.count} lượt mua</div>
            </div>
            <div class="sales-adv-val">${fmtVND(c.spend)}</div>
          </div>
        `;
      }).join('');

      catsContainer.querySelectorAll('[data-catname]').forEach(el => {
        el.addEventListener('click', () => {
          const catName = el.getAttribute('data-catname');
          if (ordersActiveCat === catName) {
            ordersActiveCat = null;
          } else {
            ordersActiveCat = catName;
            ordersActiveHour = null;
          }
          ordersCurrentPage = 1;
          applyFiltersAndRender();
          scrollToSalesDetail();
        });
      });
    }
    reveal(document.getElementById('card-sales-categories'));
  }
}

function scrollToSalesDetail() {
  const target = (ordersActiveType !== 'all' || ordersActiveHour !== null || ordersActiveCat !== null)
    ? document.getElementById('card-sales-products')
    : document.getElementById('card-orders');
  target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getFilteredSaleOrders(filteredYearOrders) {
  return filteredYearOrders.filter(o => {
    if (!o.t || o.t <= 0 || !(o.f > 0)) return false;
    if (ordersActiveType !== 'all' && getSaleType(o.t) !== ordersActiveType) return false;

    if (ordersActiveHour !== null && getHourKey(toVnParts(o.t).hour) !== ordersActiveHour) return false;

    if (ordersActiveCat !== null) {
      const resolvedCat = resolveItemCategory(o.n, o.c);
      if (resolvedCat !== ordersActiveCat) return false;
    }

    // Apply date filter from heatmap click
    if (ordersActiveDateFilter !== null) {
      const p = toVnParts(o.t);
      const dayKey = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
      if (dayKey !== ordersActiveDateFilter) return false;
    }

    // Apply table search filter
    if (ordersSearchQuery.trim()) {
      const q = removeVnAccents(ordersSearchQuery);
      if (!removeVnAccents(o.n || "").includes(q)) return false;
    }

    // Apply table category filter
    if (ordersCatFilter !== "all") {
      const resolvedCat = resolveItemCategory(o.n, o.c);
      if (resolvedCat !== ordersCatFilter) return false;
    }

    return true;
  });
}

function aggregateSaleProducts(orders) {
  const map = {};
  orders.forEach(o => {
    const rawName = (o.n || '').trim();
    const key = rawName ? rawName.toLowerCase().substring(0, 120) : '__unknown__';
    if (!map[key]) {
      map[key] = { n: rawName || 'Không rõ tên sản phẩm', count: 0, spend: 0, raw: 0, cat: resolveItemCategory(o.n, o.c) };
    }
    map[key].count += 1;
    map[key].spend += o.f || 0;
    map[key].raw += o.r > 0 ? o.r : (o.f || 0);
  });
  return Object.values(map).sort((a, b) => b.spend - a.spend);
}

function renderSalesProductList(filteredYearOrders) {
  const container = document.getElementById('sales-products-list');
  const card = document.getElementById('card-sales-products');
  if (!container || !card) return;

  const isDetailMode = ordersActiveType !== 'all' || ordersActiveHour !== null || ordersActiveCat !== null;
  if (!isDetailMode) {
    card.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const filtered = getFilteredSaleOrders(filteredYearOrders);
  const products = aggregateSaleProducts(filtered).slice(0, 20);

  card.style.display = 'block';
  reveal(card);

  const titleEl = document.getElementById('sales-products-title');
  if (titleEl) {
    const parts = ['Top Sản Phẩm Săn Sale'];
    const typeLabels = { double: 'Ngày Đôi', mid: 'Giữa Tháng', end: 'Lương Về', regular: 'Ngày Thường' };
    if (ordersActiveType !== 'all' && typeLabels[ordersActiveType]) parts.push(typeLabels[ordersActiveType]);
    if (ordersActiveHour && HOUR_LABELS[ordersActiveHour]) parts.push(HOUR_LABELS[ordersActiveHour]);
    if (ordersActiveCat) parts.push(ordersActiveCat);
    titleEl.textContent = parts.join(' · ');
  }

  if (products.length === 0) {
    container.innerHTML = '<div class="no-data" style="padding:20px;text-align:center;">Không có sản phẩm phù hợp với bộ lọc hiện tại</div>';
    return;
  }

  const maxS = Math.max(...products.map(p => p.spend), 1);
  container.innerHTML = products.map((item, idx) => {
    const rank = idx + 1;
    const pct = Math.round((item.spend / maxS) * 100);
    const saved = Math.max(0, item.raw - item.spend);
    
    // Rank Highlight & Badge Class
    let rankClass = "rank-default";
    let highlightClass = "";
    if (rank === 1) {
      rankClass = "rank-1";
      highlightClass = " highlight-rank-1";
    } else if (rank === 2) {
      rankClass = "rank-2";
      highlightClass = " highlight-rank-2";
    } else if (rank === 3) {
      rankClass = "rank-3";
      highlightClass = " highlight-rank-3";
    }

    // Category Tag
    const resolvedCat = item.cat || "🏷️ Khác";
    const catClass = (typeof getCategoryTagClass === 'function') ? getCategoryTagClass(resolvedCat) : 'cat-tag-other';
    const catTagHtml = `<span class="item-category-tag ${catClass}">${escHtml(resolvedCat)}</span>`;

    // Styled savings tag
    const savingsHtml = saved > 0 
      ? `<span class="savings-tag">💰 Tiết kiệm ${fmtVND(saved)}</span>`
      : '';
      
    const metaText = `${fmtNum(item.count)} lượt mua`;

    const metaRowHtml = `
      <div class="top-meta" style="gap: 8px;">
        ${catTagHtml}
        ${savingsHtml}
        <span>${metaText}</span>
      </div>`;

    return `
      <div class="top-row in${highlightClass}">
        <div class="top-num ${rankClass}">${rank}</div>
        <div class="top-name-wrap">
          <div class="top-name" title="${escHtml(item.n)}">${escHtml(capFirst(item.n))}</div>
          <div class="top-bar-wrap"><div class="top-bar-fill" style="width: ${pct}%"></div></div>
          ${metaRowHtml}
        </div>
        <div class="top-val">${fmtVND(item.spend)}</div>
      </div>`;
  }).join('');
}

function renderSalesInsights(stats) {
  const card = document.getElementById('insight-sales');
  if (!card) return;

  const items = [];

  const doubleSpend = stats.double.spend;
  const midSpend = stats.mid.spend;
  const endSpend = stats.end.spend;
  const regularSpend = stats.regular.spend;

  const totalSaleSpend = doubleSpend + midSpend + endSpend;
  const totalSpend = totalSaleSpend + regularSpend;

  const doubleOrders = stats.double.orders;
  const midOrders = stats.mid.orders;
  const endOrders = stats.end.orders;
  const regularOrders = stats.regular.orders;
  const totalOrders = doubleOrders + midOrders + endOrders + regularOrders;
  const totalSaleOrders = doubleOrders + midOrders + endOrders;

  if (totalSpend <= 0 || totalOrders <= 0) {
    const list = document.getElementById('insight-sales-list');
    if (list) list.innerHTML = '<li style="color:var(--muted);text-align:center;padding:20px;">Chưa có đủ dữ liệu để phân tích</li>';
    card.style.display = '';
    return;
  }

  const salePct = Math.round((totalSaleSpend / totalSpend) * 100);
  const regularPct = Math.round((regularSpend / totalSpend) * 100);

  if (salePct >= 60) {
    items.push({ text: `**Chiến thần săn sale**: **${salePct}%** chi tiêu vào ngày sale (**${fmtVND(totalSaleSpend)}**), còn **${regularPct}%** ngày thường.` });
  } else if (salePct >= 30) {
    items.push({ text: `**Mua sắm cân bằng**: **${regularPct}%** ngày thường (**${fmtVND(regularSpend)}**), **${salePct}%** ngày sale.` });
  } else {
    items.push({ text: `**Mua sắm tự do**: **${regularPct}%** chi tiêu ngày thường — ưu tiên tiện lợi hơn chờ khuyến mãi.` });
  }

  const campaigns = [
    { label: 'Ngày Đôi', spend: doubleSpend, raw: stats.double.raw, orders: doubleOrders },
    { label: 'Giữa Tháng', spend: midSpend, raw: stats.mid.raw, orders: midOrders },
    { label: 'Lương Về', spend: endSpend, raw: stats.end.raw, orders: endOrders },
    { label: 'Ngày Thường', spend: regularSpend, raw: stats.regular.raw, orders: regularOrders }
  ]
    .map(x => ({ ...x, rate: x.raw > 0 ? Math.round(((x.raw - x.spend) / x.raw) * 100) : 0, saved: Math.max(0, x.raw - x.spend) }))
    .filter(x => x.spend > 0)
    .sort((a, b) => b.rate - a.rate);

  if (campaigns.length >= 2 && campaigns[0].rate > 0) {
    const best = campaigns[0];
    items.push({ text: `**${best.label}** hiệu quả nhất: chiết khấu **${best.rate}%**, tiết kiệm **${fmtVND(best.saved)}** trên **${best.orders}** đơn.` });

    const withAvg = campaigns.map(c => ({ ...c, avg: c.orders > 0 ? Math.round(c.spend / c.orders) : 0 })).filter(c => c.avg > 0);
    if (withAvg.length >= 2) {
      withAvg.sort((a, b) => b.avg - a.avg);
      const high = withAvg[0];
      const low = withAvg[withAvg.length - 1];
      if (high.avg >= low.avg * 1.5) {
        items.push({ text: `**Giá TB/đơn**: **${high.label}** cao nhất (**${fmtVND(high.avg)}/đơn**), gấp **${(high.avg / low.avg).toFixed(1)}** lần **${low.label}** (**${fmtVND(low.avg)}/đơn**).` });
      }
    }
  }

  const totalMidnightOrders = stats.double.midnightOrders + stats.mid.midnightOrders + stats.end.midnightOrders;
  if (totalSaleOrders > 0 && totalMidnightOrders > 0) {
    const saleMidnightPct = Math.round((totalMidnightOrders / totalSaleOrders) * 100);
    if (saleMidnightPct >= 15) {
      items.push({ text: `**Săn đêm**: **${saleMidnightPct}%** đơn ngày sale (**${totalMidnightOrders}** đơn) chốt lúc **0h–2h**.` });
    }
  }

  const allCategories = {};
  ['double', 'mid', 'end', 'regular'].forEach(type => {
    Object.entries(stats[type].categories || {}).forEach(([cat, data]) => {
      if (!allCategories[cat]) allCategories[cat] = { spend: 0, count: 0 };
      allCategories[cat].spend += data.spend;
      allCategories[cat].count += data.count;
    });
  });

  const topCategories = Object.entries(allCategories)
    .map(([name, data]) => ({ name, ...data }))
    .filter(c => c.spend > 0)
    .sort((a, b) => b.spend - a.spend);

  if (topCategories.length > 0) {
    const topCat = topCategories[0];
    const topCatShare = Math.round((topCat.spend / totalSpend) * 100);
    if (topCatShare >= 25) {
      items.push({ text: `**Danh mục săn nhiều nhất**: **${topCat.name}** — **${topCatShare}%** tổng chi (**${fmtVND(topCat.spend)}**, **${topCat.count}** lượt).` });
    }
  }

  if (totalOrders >= 20) {
    const avgOrderValue = Math.round(totalSpend / totalOrders);
    items.push({ text: `**Quy mô mua sắm**: **${fmtNum(totalOrders)}** đơn, giá TB/đơn **${fmtVND(avgOrderValue)}**.` });
  }

  renderInsightCard('insight-sales', items.slice(0, 5));

  if (allCategories && Object.keys(allCategories).length > 0) {
    window._lastCategories = topCategories;
  }
}

function getHourKey(hr) {
  if (hr >= 0 && hr < 2) return 'midnight';
  if (hr >= 2 && hr < 8) return 'early';
  if (hr >= 8 && hr < 12) return 'morning';
  if (hr >= 12 && hr < 13) return 'noon';
  if (hr >= 13 && hr < 18) return 'afternoon';
  return 'night';
}

const HOUR_LABELS = {
  midnight: 'Săn đêm (00h–02h)',
  early: 'Sáng sớm (02h–08h)',
  morning: 'Giờ sáng (08h–12h)',
  noon: 'Nghỉ trưa (12h–13h)',
  afternoon: 'Chiều làm (13h–18h)',
  night: 'Tối muộn (18h–24h)'
};

function renderSaleDaysTable(filteredYearOrders) {
  const tbody = document.querySelector('#orders-table tbody');
  const thead = document.querySelector('#orders-table thead');
  const pagination = document.getElementById('orders-pagination');
  const limitSelect = document.getElementById('orders-limit-select');
  const pageSize = parseInt(limitSelect?.value, 10) || 10;
  const detailTitle = document.getElementById('sales-detail-title');

  if (!tbody) return;

  const isDetailMode = ordersActiveType !== 'all' || ordersActiveHour !== null || ordersActiveCat !== null || ordersActiveDateFilter !== null;

  // Show/Hide table filters row and bind event listeners
  const filtersRow = document.getElementById('orders-filters-row');
  if (filtersRow) {
    if (isDetailMode) {
      filtersRow.style.display = 'block';
      populateOrdersCatSelect(filteredYearOrders);
      bindOrdersFiltersEvents(filteredYearOrders);
    } else {
      filtersRow.style.display = 'none';
    }
  }

  // ── Build dynamic title with filter badges + clear button ──
  if (detailTitle) {
    let titleHtml = '📅 Chi Tiết Chi Tiêu';
    const badges = [];

    const typeInfo = { double: ['#ee4d2d', 'rgba(238,77,45,0.12)', 'Ngày Đôi'], mid: ['#26aa99', 'rgba(38,170,153,0.12)', 'Giữa Tháng'], end: ['#3b82f6', 'rgba(59,130,246,0.12)', 'Lương Về'], regular: ['#64748b', 'rgba(100,116,139,0.12)', 'Ngày Thường'] };
    if (ordersActiveType !== 'all' && typeInfo[ordersActiveType]) {
      const [fg, bg, label] = typeInfo[ordersActiveType];
      badges.push(`<span class="filter-badge" style="display:inline-flex;align-items:center;background:${bg};color:${fg};font-size:11px;padding:3px 10px;border-radius:10px;font-weight:600;line-height:1;">${label}</span>`);
    }
    if (ordersActiveHour) {
      badges.push(`<span class="filter-badge" style="display:inline-flex;align-items:center;background:rgba(238,77,45,0.12);color:#ee4d2d;font-size:11px;padding:3px 10px;border-radius:10px;font-weight:600;line-height:1;">⚡ ${HOUR_LABELS[ordersActiveHour] || ordersActiveHour}</span>`);
    }
    if (ordersActiveCat) {
      const colors = getCategoryColor(ordersActiveCat);
      badges.push(`<span class="filter-badge" style="display:inline-flex;align-items:center;background:${colors.bg};color:${colors.fg};font-size:11px;padding:3px 10px;border-radius:10px;font-weight:600;line-height:1;">🏷️ ${escHtml(ordersActiveCat)}</span>`);
    }
    if (ordersActiveDateFilter) {
      // Format YYYY-MM-DD → DD/MM/YYYY
      const [fy, fm, fd] = ordersActiveDateFilter.split('-');
      const dateDisp = `${fd}/${fm}/${fy}`;
      badges.push(`<span class="filter-badge" style="display:inline-flex;align-items:center;background:rgba(238,77,45,0.10);color:#ee4d2d;font-size:11px;padding:3px 10px;border-radius:10px;font-weight:600;line-height:1;">📅 ${dateDisp}</span>`);
    }

    if (badges.length > 0) {
      titleHtml += ': ' + badges.join(' ');
      titleHtml += ' <button id="btn-clear-orders-filter" style="font-size:11px;padding:2px 9px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--muted);cursor:pointer;margin-left:4px;vertical-align:middle;" title="Xóa tất cả bộ lọc">✕ Xóa lọc</button>';
    }
    detailTitle.innerHTML = titleHtml;

    const clearBtn = document.getElementById('btn-clear-orders-filter');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        ordersActiveHour = null;
        ordersActiveCat = null;
        ordersActiveType = 'all';
        ordersActiveDateFilter = null;
        ordersCurrentPage = 1;
        ordersSearchQuery = "";
        ordersCatFilter = "all";
        const searchInput = document.getElementById('orders-search-input');
        if (searchInput) searchInput.value = "";
        const searchClear = document.getElementById('orders-search-clear');
        if (searchClear) searchClear.style.display = 'none';
        const catSelect = document.getElementById('orders-cat-select');
        if (catSelect) catSelect.value = "all";
        // Also clear heatmap selection highlight
        document.querySelectorAll('.heatmap-day--selected').forEach(el => el.classList.remove('heatmap-day--selected'));
        applyFiltersAndRender();
      });
    }
  }

  // ── Update table headers for current mode ──
  if (thead) {
    if (isDetailMode) {
      thead.innerHTML = `<tr>
        <th>Thời Gian / Đợt Sale</th>
        <th>Sản Phẩm &amp; Danh Mục</th>
        <th style="text-align:right">Thực Chi</th>
        <th style="text-align:right;color:var(--green);">Tiết Kiệm</th>
        <th style="text-align:right">Hiệu Quả</th>
      </tr>`;
    } else {
      thead.innerHTML = `<tr>
        <th>Ngày / Đợt Sale</th>
        <th style="text-align:right">Số Đơn Hàng</th>
        <th style="text-align:right">Thực Chi</th>
        <th style="text-align:right;color:var(--green);">Tiết Kiệm</th>
        <th style="text-align:right">Hiệu Quả</th>
      </tr>`;
    }
  }

  if (filteredYearOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="no-data" style="text-align:center;padding:40px;">Không có dữ liệu đơn hàng trong năm này</td></tr>`;
    if (pagination) pagination.innerHTML = '';
    return;
  }

  // Update dropdown label to match current mode
  if (limitSelect) {
    const modeWord = isDetailMode ? 'đơn hàng' : 'ngày';
    limitSelect.querySelectorAll('option').forEach(opt => {
      opt.textContent = `Hiện ${opt.value} ${modeWord}`;
    });
  }

  // ══════════════════════════════════════════
  //  DETAIL MODE — individual orders
  // ══════════════════════════════════════════
  if (isDetailMode) {
    const individualOrders = getFilteredSaleOrders(filteredYearOrders).sort((a, b) => b.t - a.t);

    if (individualOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="no-data" style="text-align:center;padding:40px;">Không tìm thấy đơn hàng phù hợp với bộ lọc này</td></tr>`;
      if (pagination) pagination.innerHTML = '';
      return;
    }

    const totalItems = individualOrders.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    if (ordersCurrentPage > totalPages) ordersCurrentPage = totalPages;
    if (ordersCurrentPage < 1) ordersCurrentPage = 1;

    const startIdx = (ordersCurrentPage - 1) * pageSize;
    const pageItems = individualOrders.slice(startIdx, startIdx + pageSize);

    const TYPE_COLORS = { double: '#ee4d2d', mid: '#26aa99', end: '#3b82f6', regular: '#64748b' };

    tbody.innerHTML = pageItems.map(o => {
      const vn = toVnParts(o.t);
      const timeStr = fmtVnTime(o.t);
      const dateStr = fmtVnDate(o.t);

      const type = getSaleType(o.t);
      const typeLabel = getSaleTypeLabel(type, o.t);

      const typeTag = typeLabel
        ? `<span style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;color:${TYPE_COLORS[type]};background:rgba(0,0,0,0.05);padding:2px 7px;border-radius:7px;margin-left:4px;line-height:1.4;vertical-align:middle;">${typeLabel}</span>`
        : '';

      const catName = resolveItemCategory(o.n, o.c);
      const colors = getCategoryColor(catName);
      const { emoji } = parseCategoryName(catName);
      const catTag = catName
        ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;padding:2px 7px;border-radius:8px;background:${colors.bg};color:${colors.fg};margin-top:3px;line-height:1.4;">${emoji} ${escHtml(catName)}</span>`
        : '';

      const spend = o.f || 0;
      const raw = o.r || o.f || 0;
      const saved = Math.max(0, raw - spend);
      const discountPct = raw > 0 ? Math.round((saved / raw) * 100) : 0;
      const efficiencyLabel = saved > 0
        ? `<span style="color:var(--green);font-weight:600;">-${discountPct}%</span>`
        : `<span style="color:var(--muted);">—</span>`;

      const rawName = o.n || '';
      const itemName = rawName.length > 48
        ? escHtml(rawName.substring(0, 48)) + '…'
        : escHtml(rawName) || '<span style="color:var(--muted);">Không rõ</span>';

      return `
        <tr class="order-row-item">
          <td style="white-space:nowrap;">
            <div style="font-weight:600;color:var(--text);font-variant-numeric:tabular-nums;">${timeStr} · ${dateStr}${typeTag}</div>
          </td>
          <td>
            <div style="font-size:12.5px;color:var(--text);line-height:1.5;" title="${escHtml(rawName)}">${itemName}</div>
            ${catTag}
          </td>
          <td style="text-align:right;font-weight:700;color:var(--primary);font-variant-numeric:tabular-nums;white-space:nowrap;">
            ${fmtVND(spend)}
          </td>
          <td style="text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;">
            ${saved > 0 ? fmtVND(saved) : '—'}
          </td>
          <td style="text-align:right;font-variant-numeric:tabular-nums;">
            ${efficiencyLabel}
          </td>
        </tr>
      `;
    }).join('');

    renderOrdersTablePagination(pagination, totalPages, filteredYearOrders);
    return;
  }

  // ══════════════════════════════════════════
  //  SUMMARY MODE — grouped by date (default)
  // ══════════════════════════════════════════
  const dateGroups = {};
  filteredYearOrders.forEach(o => {
    if (!o.t || o.t <= 0 || !(o.f > 0)) return;
    const vn = toVnParts(o.t);
    const key = `${vn.year}-${String(vn.month).padStart(2, '0')}-${String(vn.day).padStart(2, '0')}`;

    const type = getSaleType(o.t);
    const label = getSaleDayLabel(type, o.t);
    const isBlackFriday = type === 'double' && isDateBlackFriday(o.t);

    if (ordersActiveType !== 'all' && type !== ordersActiveType) return;

    if (!dateGroups[key]) {
      dateGroups[key] = { key, label, type, isBlackFriday, orders: 0, spend: 0, raw: 0, t: o.t };
    }
    dateGroups[key].orders += 1;
    dateGroups[key].spend += o.f || 0;
    dateGroups[key].raw += o.r > 0 ? o.r : (o.f || 0);
  });

  const saleDaysList = Object.values(dateGroups).sort((a, b) => b.t - a.t);

  if (saleDaysList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="no-data" style="text-align:center;padding:40px;">Không tìm thấy đợt mua sắm phù hợp với bộ lọc</td></tr>`;
    if (pagination) pagination.innerHTML = '';
    return;
  }

  const totalItems = saleDaysList.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  if (ordersCurrentPage > totalPages) ordersCurrentPage = totalPages;
  if (ordersCurrentPage < 1) ordersCurrentPage = 1;

  const startIdx = (ordersCurrentPage - 1) * pageSize;
  const pageItems = saleDaysList.slice(startIdx, startIdx + pageSize);

  tbody.innerHTML = pageItems.map(item => {
    const dateFormatted = fmtVnDate(item.t);
    const saved = Math.max(0, item.raw - item.spend);
    const discountPct = item.raw > 0 ? Math.round((saved / item.raw) * 100) : 0;

    let typeTag = '';
    if (item.isBlackFriday) {
      typeTag = `<span style="display:inline-flex;align-items:center;font-size:11px;font-weight:700;color:#ffffff;background:#1e293b;padding:2px 8px;border-radius:12px;margin-left:8px;border:1px solid rgba(255,255,255,0.1);line-height:1.4;">Black Friday</span>`;
    } else if (item.type === 'double') {
      typeTag = `<span style="display:inline-flex;align-items:center;font-size:11px;font-weight:700;color:#ee4d2d;background:rgba(238,77,45,0.08);padding:2px 8px;border-radius:12px;margin-left:8px;line-height:1.4;">Ngày Đôi</span>`;
    } else if (item.type === 'mid') {
      typeTag = `<span style="display:inline-flex;align-items:center;font-size:11px;font-weight:700;color:#26aa99;background:var(--green-dim);padding:2px 8px;border-radius:12px;margin-left:8px;line-height:1.4;">Giữa Tháng</span>`;
    } else if (item.type === 'end') {
      typeTag = `<span style="display:inline-flex;align-items:center;font-size:11px;font-weight:700;color:#3b82f6;background:rgba(59,130,246,0.08);padding:2px 8px;border-radius:12px;margin-left:8px;line-height:1.4;">Lương Về</span>`;
    }

    const efficiencyLabel = saved > 0
      ? `<span style="color:var(--green);font-weight:600;">-${discountPct}%</span>`
      : `<span style="color:var(--muted);">—</span>`;

    return `
      <tr class="order-row-item">
        <td>
          <div style="font-weight:600;color:var(--text);">${dateFormatted}${typeTag}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">${item.label}</div>
        </td>
        <td style="text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">${item.orders} đơn</td>
        <td style="text-align:right;font-weight:700;color:var(--primary);font-variant-numeric:tabular-nums;">${fmtVND(item.spend)}</td>
        <td style="text-align:right;font-weight:500;font-variant-numeric:tabular-nums;">${saved > 0 ? fmtVND(saved) : "—"}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums;">${efficiencyLabel}</td>
      </tr>
    `;
  }).join("");

  // Total row across all filtered data (not just current page)
  const sumOrders = saleDaysList.reduce((s, i) => s + i.orders, 0);
  const sumSpend = saleDaysList.reduce((s, i) => s + i.spend, 0);
  const sumRaw = saleDaysList.reduce((s, i) => s + i.raw, 0);
  const sumSaved = Math.max(0, sumRaw - sumSpend);
  const sumDisPct = sumRaw > 0 ? Math.round((sumSaved / sumRaw) * 100) : 0;
  const table = document.getElementById('orders-table');
  if (table) {
    const existingTfoot = table.querySelector('tfoot');
    if (existingTfoot) existingTfoot.remove();
    const tfoot = document.createElement('tfoot');
    tfoot.innerHTML = `<tr style="font-weight:700;border-top:2px solid var(--border);background:var(--surface-2,var(--surface));">
      <td style="padding:10px 12px;color:var(--text);">Tổng cộng <span style="font-weight:400;color:var(--muted);font-size:12px;">(${saleDaysList.length} ngày)</span></td>
      <td style="text-align:right;padding:10px 12px;font-variant-numeric:tabular-nums;">${sumOrders} đơn</td>
      <td style="text-align:right;padding:10px 12px;color:var(--primary);font-variant-numeric:tabular-nums;">${fmtVND(sumSpend)}</td>
      <td style="text-align:right;padding:10px 12px;font-variant-numeric:tabular-nums;">${sumSaved > 0 ? fmtVND(sumSaved) : '—'}</td>
      <td style="text-align:right;padding:10px 12px;">${sumSaved > 0 ? '<span style="color:var(--green);">-' + sumDisPct + '%</span>' : '<span style="color:var(--muted);">—</span>'}</td>
    </tr>`;
    table.appendChild(tfoot);
  }

  renderOrdersTablePagination(pagination, totalPages, filteredYearOrders);
}

function renderOrdersTablePagination(pagination, totalPages, filteredYearOrders) {
  if (!pagination) return;
  if (totalPages <= 1) { pagination.innerHTML = ""; return; }

  let pagesHtml = "";
  pagesHtml += `<button class="pill${ordersCurrentPage === 1 ? " disabled" : ""}" data-page="${ordersCurrentPage - 1}" ${ordersCurrentPage === 1 ? "disabled" : ""}>← Trước</button>`;

  const maxPagesToShow = 5;
  let startPage = Math.max(1, ordersCurrentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  if (endPage - startPage + 1 < maxPagesToShow) startPage = Math.max(1, endPage - maxPagesToShow + 1);

  if (startPage > 1) {
    pagesHtml += `<button class="pill" data-page="1">1</button>`;
    if (startPage > 2) pagesHtml += `<span style="color:var(--muted);align-self:center;">...</span>`;
  }
  for (let p = startPage; p <= endPage; p++) {
    pagesHtml += `<button class="pill${p === ordersCurrentPage ? " active" : ""}" data-page="${p}">${p}</button>`;
  }
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pagesHtml += `<span style="color:var(--muted);align-self:center;">...</span>`;
    pagesHtml += `<button class="pill" data-page="${totalPages}">${totalPages}</button>`;
  }

  pagesHtml += `<button class="pill${ordersCurrentPage === totalPages ? " disabled" : ""}" data-page="${ordersCurrentPage + 1}" ${ordersCurrentPage === totalPages ? "disabled" : ""}>Sau →</button>`;
  pagination.innerHTML = pagesHtml;

  pagination.querySelectorAll("button[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      ordersCurrentPage = parseInt(btn.getAttribute("data-page"), 10);
      renderSaleDaysTable(filteredYearOrders);
      document.getElementById("card-orders")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
}

// Expose for classification.js fallback re-render path
window.renderOrders = renderOrders;

function populateOrdersCatSelect(filteredYearOrders) {
  const catSelect = document.getElementById('orders-cat-select');
  if (!catSelect) return;
  
  const savedValue = catSelect.value || "all";
  const categoriesSet = new Set();
  
  filteredYearOrders.forEach(o => {
    if (o.c || o.n) {
      const resolved = resolveItemCategory(o.n, o.c);
      if (resolved && resolved !== 'Khác' && resolved !== '🏷️ Khác') {
        categoriesSet.add(resolved);
      }
    }
  });
  
  const sortedCategories = Array.from(categoriesSet).sort();
  let html = `<option value="all">Tất cả danh mục</option>`;
  sortedCategories.forEach(cat => {
    html += `<option value="${escHtml(cat)}">${escHtml(cat)}</option>`;
  });
  html += `<option value="🏷️ Khác">🏷️ Khác</option>`;
  
  catSelect.innerHTML = html;
  if (Array.from(catSelect.options).some(opt => opt.value === savedValue)) {
    catSelect.value = savedValue;
  } else {
    catSelect.value = "all";
  }
}

function bindOrdersFiltersEvents(filteredYearOrders) {
  if (ordersEventsBound) return;
  
  const searchInput = document.getElementById('orders-search-input');
  const searchClear = document.getElementById('orders-search-clear');
  const catSelect = document.getElementById('orders-cat-select');
  
  searchInput?.addEventListener('input', (e) => {
    ordersSearchQuery = e.target.value || "";
    if (searchClear) searchClear.style.display = ordersSearchQuery ? 'block' : 'none';
    ordersCurrentPage = 1;
    renderSaleDaysTable(filteredYearOrders);
  });
  
  searchClear?.addEventListener('click', () => {
    if (searchInput) searchInput.value = "";
    ordersSearchQuery = "";
    if (searchClear) searchClear.style.display = 'none';
    ordersCurrentPage = 1;
    renderSaleDaysTable(filteredYearOrders);
  });
  
  catSelect?.addEventListener('change', (e) => {
    ordersCatFilter = e.target.value || "all";
    ordersCurrentPage = 1;
    renderSaleDaysTable(filteredYearOrders);
  });
  
  ordersEventsBound = true;
}

function renderSalesHeatmap(orders) {
  const container = document.getElementById('sales-calendar-heatmap');
  if (!container) return;

  // ── Build day → count and day → spend maps ──
  const dayMap = {};
  const spendMap = {};
  orders.forEach(o => {
    if (!o.t || o.t <= 0 || !(o.f > 0)) return;
    const p = toVnParts(o.t);
    const key = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
    dayMap[key] = (dayMap[key] || 0) + 1;
    spendMap[key] = (spendMap[key] || 0) + (o.f || 0);
  });

  const maxCount = Math.max(1, ...Object.values(dayMap));

  // ── Calculate start/end dates ──
  let startDate, endDate;
  if (ordersActiveYear !== 'all') {
    const yearNum = parseInt(ordersActiveYear, 10);
    startDate = new Date(yearNum, 0, 1, 0, 0, 0, 0);
    endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);
  } else {
    const timestamps = orders.map(o => o.t).filter(t => t > 0);
    let maxTs = timestamps.length > 0 ? Math.max(...timestamps) : Math.floor(Date.now() / 1000);
    endDate = new Date(maxTs * 1000);
    endDate.setHours(23, 59, 59, 999);
    startDate = new Date(endDate.getTime() - 364 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  }

  // ── Compute Mini Stats ──
  const allDayKeys = Object.keys(dayMap);
  const activeDays = allDayKeys.length;
  let specialDays = 0;
  allDayKeys.forEach(k => {
    // parse YYYY-MM-DD
    const [y, m, d] = k.split('-').map(Number);
    const fakeTs = Math.floor(new Date(y, m - 1, d, 12).getTime() / 1000);
    const t = getSaleTypeFromTs(fakeTs);
    if (t === 'double' || t === 'mid' || t === 'end') specialDays++;
  });

  // Longest streak (consecutive active days)
  let maxStreak = 0, streak = 0;
  const sortedKeys = allDayKeys.slice().sort();
  for (let i = 0; i < sortedKeys.length; i++) {
    if (i === 0) { streak = 1; }
    else {
      const prev = new Date(sortedKeys[i - 1]);
      const cur = new Date(sortedKeys[i]);
      const diff = Math.round((cur - prev) / 86400000);
      streak = diff === 1 ? streak + 1 : 1;
    }
    if (streak > maxStreak) maxStreak = streak;
  }

  // Average days with orders per week (over the visible range)
  const totalDays = Math.round((endDate - startDate) / 86400000) + 1;
  const totalWeeks = Math.max(1, totalDays / 7);
  const avgPerWeek = (activeDays / totalWeeks).toFixed(1);

  // Render mini stats bar
  const miniStatsEl = document.getElementById('heatmap-mini-stats');
  if (miniStatsEl) {
    miniStatsEl.innerHTML = [
      `<span class="heatmap-stat-chip chip-highlight">
        <span class="chip-label">🔥 Ngày có đơn</span>
        <span class="chip-val">${activeDays}</span>
      </span>`,
      specialDays > 0 ? `<span class="heatmap-stat-chip chip-highlight">
        <span class="chip-label">⚡ Ngày sale đặc biệt</span>
        <span class="chip-val">${specialDays}</span>
      </span>` : '',
      maxStreak >= 2 ? `<span class="heatmap-stat-chip chip-green">
        <span class="chip-label">🌊 Streak dài nhất</span>
        <span class="chip-val">${maxStreak} ngày</span>
      </span>` : '',
      `<span class="heatmap-stat-chip chip-blue">
        <span class="chip-label">📅 Trung bình</span>
        <span class="chip-val">${avgPerWeek} ngày/tuần</span>
      </span>`,
    ].join('');
  }

  // ── Adjust startDate to start on Sunday ──
  const startDayOfWeek = startDate.getDay();
  let cur = new Date(startDate.getTime());
  cur.setHours(0, 0, 0, 0);
  cur.setDate(cur.getDate() - startDayOfWeek);

  const weeks = [];
  let currentWeek = [];

  while (cur <= endDate || currentWeek.length > 0) {
    if (currentWeek.length === 0) {
      weeks.push(currentWeek);
    }

    const isWithinRange = cur >= startDate && cur <= endDate;
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    const dd = String(cur.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const count = isWithinRange ? (dayMap[key] || 0) : 0;
    const spend = isWithinRange ? (spendMap[key] || 0) : 0;
    const ts = Math.floor(cur.getTime() / 1000);
    const saleType = isWithinRange ? getSaleTypeFromTs(ts) : 'regular';
    const isSpecial = isWithinRange && (saleType === 'double' || saleType === 'mid' || saleType === 'end');

    // Vietnamese day of week label
    const DOW_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dowLabel = DOW_VI[cur.getDay()];

    currentWeek.push({
      key, count, spend,
      dateLabel: `${dd}/${mm}/${yyyy}`,
      dowLabel,
      isSpecial,
      saleType,
      isWithinRange,
      dayOfWeek: cur.getDay()
    });

    if (currentWeek.length === 7) {
      currentWeek = [];
    }

    cur.setDate(cur.getDate() + 1);
  }

  // ── Month label spans ──
  const monthSpans = [];
  let currentMonthName = '';
  let currentSpan = 0;
  const MONTH_NAMES = ['Thg 1','Thg 2','Thg 3','Thg 4','Thg 5','Thg 6','Thg 7','Thg 8','Thg 9','Thg 10','Thg 11','Thg 12'];

  weeks.forEach((wk, index) => {
    const middleDay = wk.find(d => d.isWithinRange) || wk[3] || wk[0];
    const dateParts = middleDay.dateLabel.split('/');
    const monthNum = parseInt(dateParts[1], 10);
    const monthName = MONTH_NAMES[monthNum - 1] || 'Không rõ';

    if (monthName !== currentMonthName) {
      if (currentSpan > 0) monthSpans.push({ name: currentMonthName, span: currentSpan });
      currentMonthName = monthName;
      currentSpan = 1;
    } else {
      currentSpan++;
    }
    if (index === weeks.length - 1) monthSpans.push({ name: currentMonthName, span: currentSpan });
  });

  // Cell width: 14px cell + 4px gap = 18px per week column
  const CELL_W = 18;

  let monthsHtml = '<div class="heatmap-months-row">';
  monthSpans.forEach(m => {
    monthsHtml += `<div class="heatmap-month-label" style="width: ${m.span * CELL_W}px;">${m.name}</div>`;
  });
  monthsHtml += '</div>';

  let gridHtml = '<div class="heatmap-grid-row">';
  weeks.forEach(wk => {
    gridHtml += '<div class="heatmap-week">';
    wk.forEach(day => {
      if (!day.isWithinRange) {
        gridHtml += '<div class="heatmap-day" style="visibility: hidden;"></div>';
        return;
      }

      let level = 0;
      if (day.count > 0) {
        if (maxCount === 1) level = 4;
        else if (maxCount === 2) level = day.count === 1 ? 2 : 4;
        else if (maxCount === 3) level = day.count === 1 ? 1 : day.count === 2 ? 3 : 4;
        else if (maxCount === 4) level = day.count;
        else {
          const ratio = day.count / maxCount;
          if (ratio <= 0.25) level = 1;
          else if (ratio <= 0.5) level = 2;
          else if (ratio <= 0.75) level = 3;
          else level = 4;
        }
      }

      const specialClass = day.isSpecial ? ' special-day' : '';
      const saleTypeAttr = day.isSpecial ? ` data-sale-type="${day.saleType}"` : '';
      const isSelected = ordersActiveDateFilter === day.key ? ' heatmap-day--selected' : '';

      gridHtml += `<div class="heatmap-day lvl-${level}${specialClass}${isSelected}" data-date="${day.key}" data-count="${day.count}" data-spend="${day.spend}"${saleTypeAttr}></div>`;
    });
    gridHtml += '</div>';
  });
  gridHtml += '</div>';

  let html = '<div class="heatmap-scroll-wrap">';
  html += monthsHtml;
  html += gridHtml;
  html += '</div>';
  container.innerHTML = html;

  // ── Rich Tooltip + Click handler ──
  const SALE_TYPE_CONFIG = {
    double: { label: '🎁 Ngày Đôi', color: '#ee4d2d', bg: 'rgba(238,77,45,0.25)' },
    mid:    { label: '🌗 Giữa Tháng', color: '#26aa99', bg: 'rgba(38,170,153,0.25)' },
    end:    { label: '💰 Lương Về', color: '#3b82f6', bg: 'rgba(59,130,246,0.25)' },
  };

  const daysEls = container.querySelectorAll('.heatmap-day[data-date]');
  daysEls.forEach(el => {
    const dateKey = el.getAttribute('data-date');
    const count = parseInt(el.getAttribute('data-count') || '0', 10);
    const spend = parseInt(el.getAttribute('data-spend') || '0', 10);
    const saleType = el.getAttribute('data-sale-type');
    const saleConf = SALE_TYPE_CONFIG[saleType];

    // Parse dateKey → display label
    const [y, m, d] = dateKey.split('-');
    const dateObj = new Date(+y, +m - 1, +d);
    const DOW_FULL = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
    const dateDisplayLabel = `${d}/${m}/${y} · ${DOW_FULL[dateObj.getDay()]}`;

    // ── Hover: show rich tooltip ──
    el.addEventListener('mouseenter', (e) => {
      let tooltip = document.getElementById('heatmap-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'heatmap-tooltip';
        tooltip.className = 'heatmap-tooltip';
        document.body.appendChild(tooltip);
      }

      let html = `<div class="tt-date">${dateDisplayLabel}</div>`;

      if (count === 0) {
        html += `<div class="tt-row"><span class="tt-icon">📭</span> Không có đơn hàng</div>`;
      } else {
        html += `<div class="tt-row"><span class="tt-icon">🛍️</span> <strong>${count}</strong> đơn hàng</div>`;
        if (spend > 0) {
          html += `<div class="tt-row"><span class="tt-icon">💰</span> ${fmtVND(spend)}</div>`;
        }
      }

      if (saleConf) {
        html += `<div class="tt-tag" style="background:${saleConf.bg};color:${saleConf.color};">${saleConf.label}</div>`;
      }

      tooltip.innerHTML = html;
      tooltip.style.display = 'block';

      const rect = el.getBoundingClientRect();
      // Position above the cell, centred
      tooltip.style.left = (rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2)) + 'px';
      tooltip.style.top = (rect.top + window.scrollY - tooltip.offsetHeight - 8) + 'px';
    });

    el.addEventListener('mouseleave', () => {
      const tooltip = document.getElementById('heatmap-tooltip');
      if (tooltip) tooltip.style.display = 'none';
    });

    // ── Click: filter table by this date ──
    el.addEventListener('click', () => {
      // Toggle off if clicking already-selected date
      if (ordersActiveDateFilter === dateKey) {
        ordersActiveDateFilter = null;
        el.classList.remove('heatmap-day--selected');
      } else {
        // Remove previous selection
        container.querySelectorAll('.heatmap-day--selected').forEach(prev => prev.classList.remove('heatmap-day--selected'));
        ordersActiveDateFilter = dateKey;
        el.classList.add('heatmap-day--selected');
      }

      // Reset pagination and re-render table only (not full re-render)
      ordersCurrentPage = 1;
      ordersActiveType = 'all';
      ordersActiveHour = null;
      ordersActiveCat = null;

      const filteredYearOrders = currentOrders.filter(o => {
        if (ordersActiveYear !== 'all' && o.t) {
          return String(getVnYear(o.t)) === ordersActiveYear;
        }
        return true;
      });

      renderSaleDaysTable(filteredYearOrders);

      // Scroll to orders table
      const ordersCard = document.getElementById('card-orders');
      if (ordersCard) ordersCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

function renderSalesProfileCard(stats) {
  const profileCard = document.getElementById('card-sales-profile');
  const profileContent = document.getElementById('sales-profile-content');
  
  if (ordersActiveType === 'all') {
    if (profileCard) profileCard.style.display = 'none';
    return;
  }
  
  if (!profileCard || !profileContent) return;
  
  profileCard.style.display = 'block';
  reveal(profileCard);
  
  const s = stats[ordersActiveType];
  const saved = Math.max(0, s.raw - s.spend);
  const savingPct = s.raw > 0 ? Math.round((saved / s.raw) * 100) : 0;
  const aov = s.orders > 0 ? Math.round(s.spend / s.orders) : 0;
  const midnightPct = s.orders > 0 ? Math.round((s.midnightOrders / s.orders) * 100) : 0;
  
  const sortedCats = Object.entries(s.categories)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.spend - a.spend);
  const topCatName = sortedCats.length > 0 ? sortedCats[0].name : 'Không có';
  
  let personaIcon = '🛍️';
  let personaName = 'Khách Hàng Thân Thiết';
  let personaDesc = 'Bạn có thói quen mua sắm đa dạng trên Shopee.';
  
  if (ordersActiveType === 'double') {
    if (midnightPct >= 20) {
      personaIcon = '🦉';
      personaName = 'Thợ Săn Đêm Chuyên Nghiệp';
      personaDesc = 'Bạn cực kỳ kiên nhẫn săn voucher lúc nửa đêm (00h-02h) của các ngày đôi. Bạn chốt đơn rất nhanh trước khi các voucher hot hết lượt sử dụng!';
    } else {
      personaIcon = '🎁';
      personaName = 'Chiến Thần Siêu Sale Ngày Đôi';
      personaDesc = 'Bạn là khách hàng trung thành của các đợt Siêu Sale Ngày Đôi trùng tháng. Chi tiêu tập trung và tiết kiệm được lượng tiền rất lớn.';
    }
  } else if (ordersActiveType === 'mid') {
    personaIcon = '🌗';
    personaName = 'Người Săn Sale Ngẫu Hứng';
    personaDesc = 'Bạn xem các đợt Giữa Tháng (ngày 15) là thời điểm thích hợp để bổ sung nhu yếu phẩm gia đình, tận dụng các mã freeship và hoàn xu vừa phải.';
  } else if (ordersActiveType === 'end') {
    personaIcon = '💸';
    personaName = 'Tín Đồ Chi Tiêu Tự Thưởng';
    personaDesc = 'Lương vừa về là thời khắc bạn tự thưởng bản thân. Bạn chốt đơn thoải mái hơn, tập trung vào mặt hàng giá trị lớn hoặc chăm sóc cá nhân.';
  } else if (ordersActiveType === 'regular') {
    personaIcon = '⚖️';
    personaName = 'Người Tiêu Dùng Thực Tế';
    personaDesc = 'Bạn mua sắm dựa trên nhu cầu thực sự phát sinh hàng ngày. Bạn không quan tâm nhiều đến việc chờ đợi các chiến dịch sale lớn, đặt tiện lợi làm ưu tiên hàng đầu.';
  }
  
  profileContent.innerHTML = `
    <div class="sales-profile-grid">
      <div class="profile-persona-box">
        <div class="profile-persona-icon">${personaIcon}</div>
        <div class="profile-persona-name">${personaName}</div>
        <div class="profile-persona-desc">${personaDesc}</div>
      </div>
      <div class="profile-stats-box">
        <div class="profile-stat-row">
          <span class="profile-stat-label">Tổng thực chi:</span>
          <span class="profile-stat-value" style="color: var(--primary); font-size: 15px;">${fmtVND(s.spend)}</span>
        </div>
        <div class="profile-stat-row">
          <span class="profile-stat-label">Tổng số đơn hàng:</span>
          <span class="profile-stat-value">${s.orders} đơn</span>
        </div>
        <div class="profile-stat-row">
          <span class="profile-stat-label">Giá trị trung bình đơn:</span>
          <span class="profile-stat-value">${fmtVND(aov)} / đơn</span>
        </div>
        <div class="profile-stat-row">
          <span class="profile-stat-label">Số tiền tiết kiệm được:</span>
          <span class="profile-stat-value" style="color: var(--green); font-weight: 600;">${fmtVND(saved)} (-${savingPct}%)</span>
        </div>
        <div class="profile-stat-row">
          <span class="profile-stat-label">Đơn chốt lúc nửa đêm (00h-02h):</span>
          <span class="profile-stat-value">${s.midnightOrders} đơn (${midnightPct}%)</span>
        </div>
        <div class="profile-stat-row">
          <span class="profile-stat-label">Danh mục chi tiêu nhiều nhất:</span>
          <span class="profile-stat-value" style="font-weight: 600;">${escHtml(topCatName)}</span>
        </div>
      </div>
    </div>
  `;
}
