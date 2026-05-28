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
let ordersCurrentPage = 1;

let salesDistributionChart = null;
let salesSpendSavingsChart = null;

function isDateBlackFriday(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m !== 11) return false;
  const firstOfNov = new Date(y, 10, 1);
  const firstFridayDay = 1 + ((5 - firstOfNov.getDay() + 7) % 7);
  return d === (firstFridayDay + 21);
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
  if (window._dashCache && window._dashCache.cats) {
    if (window._dashCache.cats[key]) return window._dashCache.cats[key];
    if (window._dashCache.cats[key40]) return window._dashCache.cats[key40];
  }

  // 2. Try keyword classification
  if (typeof classifyByNameSync === 'function') {
    const kwCat = classifyByNameSync(itemName);
    if (kwCat && kwCat !== '🏷️ Khác' && kwCat !== 'Khác') return kwCat;
  }

  // 3. Fall back to raw category ID label
  return resolveCatLabel({ id: rawCatId, name: rawCatId });
}

function renderOrders(ol) {
  currentOrders = ol || [];
  ordersActiveYear = 'all';
  ordersActiveType = 'all';
  ordersCurrentPage = 1;

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
      const yr = new Date(o.t * 1000).getFullYear();
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
      ordersCurrentPage = 1;
      applyFiltersAndRender();
    });
  });
}

function applyFiltersAndRender() {
  // 1. Filter orders by selected Year
  const filteredYearOrders = currentOrders.filter(o => {
    if (ordersActiveYear !== 'all' && o.t) {
      const yr = String(new Date(o.t * 1000).getFullYear());
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
  renderSaleDaysTable(filteredYearOrders);
}

function calculateSalesStats(orders) {
  const stats = {
    double: { label: 'Ngày Đôi', spend: 0, raw: 0, orders: 0, midnightOrders: 0, categories: {} },
    mid: { label: 'Giữa Tháng', spend: 0, raw: 0, orders: 0, midnightOrders: 0, categories: {} },
    end: { label: 'Lương Về', spend: 0, raw: 0, orders: 0, midnightOrders: 0, categories: {} },
    regular: { label: 'Ngày Thường', spend: 0, raw: 0, orders: 0, midnightOrders: 0, categories: {} }
  };

  orders.forEach(o => {
    if (!o.t || o.t <= 0) return;
    const date = new Date(o.t * 1000);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const hour = date.getHours();

    let type = 'regular';
    if (day === month || isDateBlackFriday(date)) {
      type = 'double';
    } else if (day === 15) {
      type = 'mid';
    } else if (day >= 25) {
      type = 'end';
    }

    const spend = o.f || 0;
    const raw = o.r || o.f || 0;

    stats[type].spend += spend;
    stats[type].raw += raw;
    stats[type].orders += 1;

    // Golden hour: 00:00 - 02:00
    if (hour >= 0 && hour < 2) {
      stats[type].midnightOrders += 1;
    }

    // Accumulate category spending (if extension provided category 'c' or item name 'n')
    if (o.c || o.n) {
      const resolvedCat = resolveItemCategory(o.n, o.c);
      if (!stats[type].categories[resolvedCat]) {
        stats[type].categories[resolvedCat] = { spend: 0, count: 0 };
      }
      stats[type].categories[resolvedCat].spend += spend;
      stats[type].categories[resolvedCat].count += 1;
    }
  });

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

    return `
      <div class="kpi interactive${isActive ? ' active' : ''}" data-type="${k}" title="Click để lọc chi tiết">
        <div class="kpi-label">
          <span style="font-size:16px; margin-right:4px;">${cardIcon}</span>
          ${s.label}
        </div>
        <div class="kpi-value ${iconClass}">${fmtVND(s.spend)}đ</div>
        <div class="kpi-sub">
          <strong>${s.orders}</strong> đơn (${sharePct}%) · AOV: <strong>${fmtVND(aov)}</strong>
        </div>
        <div class="kpi-sub" style="color:var(--green); font-weight:600; margin-top:4px;">
          ✓ Tiết kiệm: ${fmtVND(saved)}đ (-${savingPct}%)
        </div>
        ${topCatHtml}
      </div>
    `;
  }).join('');

  // Add click listeners to cards
  row.querySelectorAll('.kpi.interactive').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.getAttribute('data-type');
      if (ordersActiveType === type) {
        ordersActiveType = 'all'; // toggle off
      } else {
        ordersActiveType = type;
      }
      ordersCurrentPage = 1;
      applyFiltersAndRender();
    });
  });

  row.querySelectorAll('.kpi').forEach(el => reveal(el));
}

function renderSalesCharts(stats) {
  const totalSpend = Object.values(stats).reduce((sum, s) => sum + s.spend, 0);

  const labels = ['Ngày Đôi', 'Giữa Tháng', 'Lương Về', 'Ngày Thường'];
  const spendData = [stats.double.spend, stats.mid.spend, stats.end.spend, stats.regular.spend];
  const savedData = [
    Math.max(0, stats.double.raw - stats.double.spend),
    Math.max(0, stats.mid.raw - stats.mid.spend),
    Math.max(0, stats.end.raw - stats.end.spend),
    Math.max(0, stats.regular.raw - stats.regular.spend)
  ];

  // Colors: Shopee Orange, Green, Blue, Dark Gray
  const PALETTE = ['#ee4d2d', '#26aa99', '#3b82f6', '#94a3b8'];

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
              callbacks: { label: ctx => '  ' + fmtVND(ctx.parsed) + 'đ' }
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

    salesSpendSavingsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Thực chi',
            data: spendData,
            backgroundColor: 'rgba(238, 77, 45, 0.85)',
            borderColor: '#ee4d2d',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Tiết kiệm',
            data: savedData,
            backgroundColor: 'rgba(38, 170, 153, 0.85)',
            borderColor: '#26aa99',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
            callbacks: { label: ctx => '  ' + ctx.dataset.label + ': ' + fmtVND(ctx.parsed.y) + 'đ' }
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
      const date = new Date(o.t * 1000);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      
      let type = 'regular';
      if (day === month || isDateBlackFriday(date)) {
        type = 'double';
      } else if (day === 15) {
        type = 'mid';
      } else if (day >= 25) {
        type = 'end';
      }

      if (ordersActiveType !== 'all' && type !== ordersActiveType) {
        return;
      }

      totalOrders++;
      const hr = date.getHours();
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

    hoursContainer.innerHTML = Object.values(hours).map(h => {
      const pct = Math.round((h.count / maxOrders) * 100);
      const sharePct = Math.round((h.count / displayTotalOrders) * 100);

      return `
        <div class="sales-adv-item">
          <div class="sales-adv-icon" style="background: ${h.bg}; color: ${h.fg};">${h.emoji}</div>
          <div class="sales-adv-body">
            <div class="sales-adv-title">${h.label}</div>
            <div class="top-bar-wrap" style="width:100%; height:5px; margin-top:4px;">
              <div class="top-bar-fill" style="width:${pct}%; height:100%; background:${h.bar}"></div>
            </div>
            <div class="sales-adv-sub">${h.count} đơn (${sharePct}%)</div>
          </div>
          <div class="sales-adv-val">${fmtVND(h.spend)}đ</div>
        </div>
      `;
    }).join('');
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

        return `
          <div class="sales-adv-item">
            <div class="sales-adv-icon" style="background: ${colors.bg}; color: ${colors.fg};">${emoji}</div>
            <div class="sales-adv-body">
              <div class="sales-adv-title">${escHtml(text)}</div>
              <div class="top-bar-wrap" style="width:100%; height:5px; margin-top:4px;">
                <div class="top-bar-fill" style="width:${pct}%; height:100%; background:${colors.fg}"></div>
              </div>
              <div class="sales-adv-sub">${c.count} lượt mua</div>
            </div>
            <div class="sales-adv-val">${fmtVND(c.spend)}đ</div>
          </div>
        `;
      }).join('');
    }
    reveal(document.getElementById('card-sales-categories'));
  }
}

function renderSalesInsights(stats) {
  const list = document.getElementById('insight-sales-list');
  const card = document.getElementById('insight-sales');
  if (!list || !card) return;

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

  // 1. Tỷ lệ oanh tạc ngày sale
  if (totalSpend > 0) {
    const salePct = Math.round((totalSaleSpend / totalSpend) * 100);
    if (salePct >= 50) {
      items.push({
        icon: '🏆',
        text: `Bạn chi **${salePct}%** tổng số tiền vào ngày sale (**${fmtVND(totalSaleSpend)}đ**). Bạn thuộc hệ **Chiến thần săn sale** chính hiệu, biết kiềm chế tiêu dùng ngày thường.`
      });
    } else {
      items.push({
        icon: '🛒',
        text: `Bạn tiêu **${Math.round((regularSpend / totalSpend) * 100)}%** vào ngày thường (**${fmtVND(regularSpend)}đ**). Bạn là **Người mua sắm ngẫu hứng**, cứ thích là chốt đơn chứ không đợi ngày sale!`
      });
    }
  }

  // 2. Ngày sale hời nhất
  const rates = [
    { label: 'Ngày Đôi', spend: doubleSpend, raw: stats.double.raw },
    { label: 'Giữa Tháng', spend: midSpend, raw: stats.mid.raw },
    { label: 'Lương Về', spend: endSpend, raw: stats.end.raw },
    { label: 'Ngày Thường', spend: regularSpend, raw: stats.regular.raw }
  ].map(x => ({
    ...x,
    rate: x.raw > 0 ? Math.round(((x.raw - x.spend) / x.raw) * 100) : 0
  })).filter(x => x.spend > 0);

  if (rates.length > 0) {
    const topRate = rates.reduce((a, b) => a.rate >= b.rate ? a : b);
    if (topRate.rate > 0) {
      items.push({
        icon: '🔥',
        text: `Chiến dịch chiết khấu hiệu quả nhất của bạn là **${topRate.label}** với tỷ lệ giảm giá trung bình lên tới **${topRate.rate}%**.`
      });
    }
  }

  // 3. Phân tích săn đêm 0h-2h
  const totalMidnightOrders = stats.double.midnightOrders + stats.mid.midnightOrders + stats.end.midnightOrders;
  const totalSaleOrders = doubleOrders + midOrders + endOrders;
  if (totalSaleOrders > 0) {
    const midnightPct = Math.round((totalMidnightOrders / totalSaleOrders) * 100);
    if (midnightPct >= 20) {
      items.push({
        icon: '🦉',
        text: `Có **${totalMidnightOrders} đơn** chốt lúc nửa đêm (**${midnightPct}%** số đơn ngày sale). Bạn cực kỳ chịu khó **canh giờ vàng 0h** để giật voucher giảm giá.`
      });
    } else if (totalMidnightOrders > 0) {
      items.push({
        icon: '☕',
        text: `Bạn chốt **${totalMidnightOrders} đơn** lúc nửa đêm. Bạn thường săn sale thong thả vào ban ngày hoặc tối hơn là thức đêm oanh tạc.`
      });
    }
  }

  list.innerHTML = items.map(item =>
    `<li><span class="ins-icon">${item.icon}</span><span>${parseBold(item.text)}</span></li>`
  ).join('');
  card.style.display = '';
  reveal(card);

  // 4. Trigger Chrome AI tarot reading if active
  if (window.triggerSalesAIInsight) {
    window.triggerSalesAIInsight(stats, totalSpend, totalOrders, ordersActiveYear, ordersActiveType);
  }
}

function renderSaleDaysTable(filteredYearOrders) {
  const tbody = document.querySelector('#orders-table tbody');
  const pagination = document.getElementById('orders-pagination');
  const limitSelect = document.getElementById('orders-limit-select');
  const pageSize = parseInt(limitSelect?.value, 10) || 10;

  if (!tbody) return;

  if (filteredYearOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="no-data" style="text-align: center; padding: 40px;">Không có dữ liệu đơn hàng trong năm này</td></tr>`;
    if (pagination) pagination.innerHTML = '';
    return;
  }

  // Group orders by date (YYYY-MM-DD)
  const dateGroups = {};
  filteredYearOrders.forEach(o => {
    if (!o.t || o.t <= 0) return;
    const date = new Date(o.t * 1000);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const isBF = isDateBlackFriday(date);
    let type = 'regular';
    let label = `Ngày thường ${day}/${month}`;
    if (day === month || isBF) {
      type = 'double';
      label = isBF ? `Black Friday ${day}/${month}` : `Ngày Đôi ${day}/${month}`;
    } else if (day === 15) {
      type = 'mid';
      label = `Giữa Tháng 15/${month}`;
    } else if (day >= 25) {
      type = 'end';
      label = `Lương Về ${day}/${month}`;
    }

    // Filter by KPI active type
    if (ordersActiveType !== 'all' && type !== ordersActiveType) {
      return;
    }

    if (!dateGroups[key]) {
      dateGroups[key] = {
        key,
        label,
        type,
        isBlackFriday: isBF,
        orders: 0,
        spend: 0,
        raw: 0,
        t: o.t
      };
    }

    dateGroups[key].orders += 1;
    dateGroups[key].spend += o.f || 0;
    dateGroups[key].raw += o.r || o.f || 0;
  });

  const saleDaysList = Object.values(dateGroups).sort((a, b) => b.t - a.t);

  // Update detailed list header name based on active filter
  const detailTitle = document.getElementById('sales-detail-title');
  if (detailTitle) {
    let filterName = 'Tất Cả Ngày';
    if (ordersActiveType === 'double') filterName = 'Ngày Đôi';
    else if (ordersActiveType === 'mid') filterName = 'Giữa Tháng';
    else if (ordersActiveType === 'end') filterName = 'Lương Về';
    else if (ordersActiveType === 'regular') filterName = 'Ngày Thường';
    detailTitle.textContent = `📅 Chi Tiết Chi Tiêu: ${filterName}`;
  }

  if (saleDaysList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="no-data" style="text-align: center; padding: 40px;">Không tìm thấy đợt mua sắm phù hợp với bộ lọc</td></tr>`;
    if (pagination) pagination.innerHTML = '';
    return;
  }

  // Paginate
  const totalItems = saleDaysList.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  if (ordersCurrentPage > totalPages) ordersCurrentPage = totalPages;
  if (ordersCurrentPage < 1) ordersCurrentPage = 1;

  const startIdx = (ordersCurrentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const pageItems = saleDaysList.slice(startIdx, endIdx);

  tbody.innerHTML = pageItems.map(item => {
    const date = new Date(item.t * 1000);
    const dateFormatted = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const saved = Math.max(0, item.raw - item.spend);
    const discountPct = item.raw > 0 ? Math.round((saved / item.raw) * 100) : 0;

    let typeTag = '';
    if (item.isBlackFriday) {
      typeTag = `<span style="font-size:11px; font-weight:700; color:#ffffff; background:#1e293b; padding:2px 8px; border-radius:12px; margin-left:8px; border: 1px solid rgba(255,255,255,0.1);">Black Friday</span>`;
    } else if (item.type === 'double') {
      typeTag = `<span style="font-size:11px; font-weight:700; color:#ee4d2d; background:rgba(238,77,45,0.08); padding:2px 8px; border-radius:12px; margin-left:8px;">Ngày Đôi</span>`;
    } else if (item.type === 'mid') {
      typeTag = `<span style="font-size:11px; font-weight:700; color:#26aa99; background:var(--green-dim); padding:2px 8px; border-radius:12px; margin-left:8px;">Giữa Tháng</span>`;
    } else if (item.type === 'end') {
      typeTag = `<span style="font-size:11px; font-weight:700; color:#3b82f6; background:rgba(59,130,246,0.08); padding:2px 8px; border-radius:12px; margin-left:8px;">Lương Về</span>`;
    }

    const efficiencyLabel = saved > 0
      ? `<span style="color:var(--green); font-weight:600;">-${discountPct}%</span>`
      : `<span style="color:var(--muted);">—</span>`;

    return `
      <tr class="order-row-item">
        <td>
          <div style="font-weight: 600; color: var(--text);">${dateFormatted}${typeTag}</div>
          <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">${item.label}</div>
        </td>
        <td style="text-align: right; font-weight: 600; font-variant-numeric: tabular-nums;">
          ${item.orders} đơn
        </td>
        <td style="text-align: right; font-weight: 700; color: var(--primary); font-variant-numeric: tabular-nums;">
          ${fmtVND(item.spend)}đ
        </td>
        <td style="text-align: right; font-weight: 500; font-variant-numeric: tabular-nums;">
          ${saved > 0 ? `${fmtVND(saved)}đ` : '—'}
        </td>
        <td style="text-align: right; font-variant-numeric: tabular-nums;">
          ${efficiencyLabel}
        </td>
      </tr>
    `;
  }).join('');

  // Render Pagination
  if (pagination) {
    if (totalPages <= 1) {
      pagination.innerHTML = '';
    } else {
      let pagesHtml = '';
      
      // Prev Button
      pagesHtml += `<button class="pill${ordersCurrentPage === 1 ? ' disabled' : ''}" data-page="${ordersCurrentPage - 1}" ${ordersCurrentPage === 1 ? 'disabled' : ''}>← Trước</button>`;

      // Page numbers
      const maxPagesToShow = 5;
      let startPage = Math.max(1, ordersCurrentPage - 2);
      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
      
      if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      if (startPage > 1) {
        pagesHtml += `<button class="pill" data-page="1">1</button>`;
        if (startPage > 2) pagesHtml += `<span style="color:var(--muted); align-self:center;">...</span>`;
      }

      for (let p = startPage; p <= endPage; p++) {
        pagesHtml += `<button class="pill${p === ordersCurrentPage ? ' active' : ''}" data-page="${p}">${p}</button>`;
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pagesHtml += `<span style="color:var(--muted); align-self:center;">...</span>`;
        pagesHtml += `<button class="pill" data-page="${totalPages}">${totalPages}</button>`;
      }

      // Next Button
      pagesHtml += `<button class="pill${ordersCurrentPage === totalPages ? ' disabled' : ''}" data-page="${ordersCurrentPage + 1}" ${ordersCurrentPage === totalPages ? 'disabled' : ''}>Sau →</button>`;

      pagination.innerHTML = pagesHtml;

      // Add click listeners to pagination buttons
      pagination.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          ordersCurrentPage = parseInt(btn.getAttribute('data-page'), 10);
          renderSaleDaysTable(filteredYearOrders);
          document.getElementById('card-orders').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      });
    }
  }
}
