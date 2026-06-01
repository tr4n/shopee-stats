/* ─────────────────────────────────────────────────
   Render: Categories view
   renderCategories, showCatItems.
   Depends on helpers.js.
───────────────────────────────────────────────── */

let catChart = null;
let catTrendChart = null;
let currentCatData = null;

let currentCategoryItems = [];
let catItemsLimit = 15;
let catItemsSearchQuery = "";
let catItemsSortOrder = "spend_desc";
let catItemsEventsBound = false;

const CATEGORY_PALETTE = [
  '#ee4d2d', '#26aa99', '#3b82f6', '#ec4899', '#f59e0b',
  '#a855f7', '#14b8a6', '#10b981', '#06b6d4', '#ef4444',
  '#8b5cf6', '#64748b'
];

window.currentCategorySelection = null;

function removeVnAccents(str) {
  return (str || '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function truncateText(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen - 1) + '…' : str;
}

function getOrderCategory(o) {
  if (typeof window.resolveItemCategory === 'function') {
    return window.resolveItemCategory(o.n, o.c);
  }
  return resolveCatLabel({ id: o.c, name: o.c });
}

window.clearCategorySelection = function() {
  window.currentCategorySelection = null;
  const detailGrid = document.getElementById('cat-detail-grid');
  if (detailGrid) detailGrid.style.display = 'none';
  
  if (catTrendChart) {
    catTrendChart.destroy();
    catTrendChart = null;
  }

  document.querySelectorAll('#cat-bars .cat-row').forEach(r => {
    r.classList.remove('cat-row-active');
    r.style.background = '';
    r.style.borderColor = '';
    r.style.boxShadow = '';
  });
  
  if (currentCatData) {
    renderInsightCard('insight-categories', computeCategoryInsights(currentCatData.cs, currentCatData.total));
    if (window.triggerCategoryAIInsight) {
      const cacheKey = `insight-categories-${currentCatData.year}`;
      window.triggerCategoryAIInsight(currentCatData.cs, currentCatData.ti, currentCatData.total, cacheKey, currentCatData.year);
    }
  }
  if (catChart && currentCatData && currentCatData.cs) {
    catChart.data.datasets[0].backgroundColor = currentCatData.cs.map((c, i) => CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]);
    catChart.update();
  }
};

function bindCatItemsEvents() {
  if (catItemsEventsBound) return;
  
  const searchInput = document.getElementById('cat-items-search-input');
  const searchClear = document.getElementById('cat-items-search-clear');
  const sortSelect = document.getElementById('cat-items-sort-select');
  const loadMoreBtn = document.getElementById('cat-items-load-more');
  
  searchInput?.addEventListener('input', (e) => {
    catItemsSearchQuery = e.target.value || "";
    if (searchClear) searchClear.style.display = catItemsSearchQuery ? 'block' : 'none';
    catItemsLimit = 15;
    renderCatItemsList();
  });
  
  searchClear?.addEventListener('click', () => {
    if (searchInput) searchInput.value = "";
    catItemsSearchQuery = "";
    if (searchClear) searchClear.style.display = 'none';
    catItemsLimit = 15;
    renderCatItemsList();
  });
  
  sortSelect?.addEventListener('change', (e) => {
    catItemsSortOrder = e.target.value || "spend_desc";
    catItemsLimit = 15;
    renderCatItemsList();
  });
  
  loadMoreBtn?.addEventListener('click', () => {
    catItemsLimit += 15;
    renderCatItemsList();
  });
  
  catItemsEventsBound = true;
}

function renderCatItemsList() {
  const list = document.getElementById('cat-items-list');
  const loadMoreBtn = document.getElementById('cat-items-load-more');
  if (!list) return;
  
  let filtered = currentCategoryItems;
  if (catItemsSearchQuery.trim()) {
    const q = removeVnAccents(catItemsSearchQuery);
    filtered = filtered.filter(item => removeVnAccents(item.n).includes(q));
  }
  
  filtered.sort((a, b) => {
    const avgA = a.dp && a.dp > 0 ? a.dp : (a.c > 0 ? a.s / a.c : a.s);
    const avgB = b.dp && b.dp > 0 ? b.dp : (b.c > 0 ? b.s / b.c : b.s);
    const saveA = a.op && a.dp && a.op > a.dp ? (a.op - a.dp) * a.c : 0;
    const saveB = b.op && b.dp && b.op > b.dp ? (b.op - b.dp) * b.c : 0;
    
    if (catItemsSortOrder === "spend_desc") return b.s - a.s;
    if (catItemsSortOrder === "spend_asc") return a.s - b.s;
    if (catItemsSortOrder === "count_desc") return b.c - a.c;
    if (catItemsSortOrder === "save_desc") return saveB - saveA;
    return b.s - a.s;
  });
  
  const displayItems = filtered.slice(0, catItemsLimit);
  
  if (loadMoreBtn) {
    if (filtered.length > catItemsLimit) {
      loadMoreBtn.style.display = 'inline-block';
      loadMoreBtn.textContent = `Xem thêm (còn ${filtered.length - catItemsLimit} SP)`;
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }
  
  if (displayItems.length === 0) {
    list.innerHTML = '<div class="no-data" style="padding: 20px;">Không có sản phẩm nào phù hợp bộ lọc</div>';
    return;
  }
  
  const maxS = Math.max(...displayItems.map(i => i.s), 1);
  list.innerHTML = displayItems.map((item, idx) => {
    const rank = idx + 1;
    const pct = Math.round((item.s / maxS) * 100);
    const hasDiscount = item.op && item.dp && item.op > item.dp;
    
    let rankClass = "rank-default";
    let highlightClass = "";
    if (rank === 1) { rankClass = "rank-1"; highlightClass = " highlight-rank-1"; }
    else if (rank === 2) { rankClass = "rank-2"; highlightClass = " highlight-rank-2"; }
    else if (rank === 3) { rankClass = "rank-3"; highlightClass = " highlight-rank-3"; }

    let discountPctHtml = "";
    if (hasDiscount && item.op > 0) {
      const discPct = Math.round((1 - item.dp / item.op) * 100);
      if (discPct > 0) {
        discountPctHtml = `<span class="item-discount-tag">-${discPct}%</span>`;
      }
    }

    const savings = hasDiscount ? (item.op - item.dp) * item.c : 0;
    const savingsHtml = savings > 0 
      ? `<span class="savings-tag">💰 Tiết kiệm ${fmtVND(savings)}</span>`
      : '';
      
    const metaText = hasDiscount 
      ? `${fmtNum(item.c)} lượt · Mua: ${fmtVND(item.dp)} (Gốc: <span style="text-decoration: line-through; opacity: 0.7;">${fmtVND(item.op)}</span>)`
      : `${fmtNum(item.c)} lượt · TB: ${fmtVND(Math.round(item.s / item.c))}/món`;

    const metaRowHtml = `
      <div class="top-meta" style="gap: 8px;">
        ${discountPctHtml}
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
        <div class="top-val">${fmtVND(item.s)}</div>
      </div>`;
  }).join('');
  
  list.querySelectorAll('.top-row').forEach(el => reveal(el));
}

function showCatItems(catName, ti) {
  const detailGrid = document.getElementById('cat-detail-grid');
  const title = document.getElementById('cat-items-title');
  
  currentCategoryItems = (ti || []).filter(i => {
    if (i.cat === catName) return true;
    if (resolveCatLabel({ id: i.cat }) === catName) return true;
    if (resolveCatLabel({ name: i.cat }) === catName) return true;
    if (catName === 'Khác' || catName === '🏷️ Khác') {
      if (!i.cat || i.cat === 'Khác' || i.cat === '🏷️ Khác') return true;
    }
    return false;
  });

  catItemsLimit = 15;
  catItemsSearchQuery = "";
  catItemsSortOrder = "spend_desc";

  // Reset inputs
  const searchInput = document.getElementById('cat-items-search-input');
  if (searchInput) searchInput.value = "";
  const searchClear = document.getElementById('cat-items-search-clear');
  if (searchClear) searchClear.style.display = 'none';
  const sortSelect = document.getElementById('cat-items-sort-select');
  if (sortSelect) sortSelect.value = "spend_desc";

  // Bind events if not already done
  bindCatItemsEvents();

  // Highlight selected bar with category color theme
  document.querySelectorAll('.cat-row').forEach((r, idx) => {
    const isSelected = r.getAttribute('data-cat') === catName;
    r.classList.toggle('cat-row-active', isSelected);
    if (isSelected) {
      const baseColor = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
      r.style.background = `${baseColor}18`;
      r.style.borderColor = `${baseColor}40`;
      r.style.boxShadow = `0 4px 12px ${baseColor}08`;
    } else {
      r.style.background = '';
      r.style.borderColor = '';
      r.style.boxShadow = '';
    }
  });

  title.innerHTML = `
    <span>🏷️ ${escHtml(catName)} — Top Sản Phẩm</span>
    <button class="clear-sel-btn" onclick="window.clearCategorySelection()" style="background:none; border:none; color:var(--muted); font-size:18px; cursor:pointer; margin-left:8px; vertical-align:middle;" title="Bỏ chọn">✕</button>
  `;
  
  if (detailGrid) detailGrid.style.display = 'grid';

  // Render product list
  renderCatItemsList();

  // Render line chart for monthly trend
  const orders = (window.currentDashData && window.currentDashData.ol) || [];
  const monthlyData = Array(12).fill(0);
  
  orders.forEach(o => {
    if (!o.t || !(o.f > 0)) return;
    const yr = String(getVnYear(o.t));
    if (currentCatData.year !== 'all' && yr !== currentCatData.year) return;
    
    const cat = getOrderCategory(o);
    if (cat === catName) {
      const p = toVnParts(o.t);
      if (p.month >= 1 && p.month <= 12) {
        monthlyData[p.month - 1] += o.f;
      }
    }
  });

  // Render line chart
  const trendCtx = document.getElementById('chart-cat-trend').getContext('2d');
  if (catTrendChart) catTrendChart.destroy();
  
  const trendLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
  
  // Resolve category color
  let baseColor = '#ee4d2d';
  if (currentCatData && currentCatData.cs) {
    const idx = currentCatData.cs.findIndex(c => resolveCatLabel(c) === catName || c.name === catName);
    if (idx !== -1) {
      baseColor = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
    }
  }

  catTrendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: trendLabels,
      datasets: [{
        label: 'Thực chi',
        data: monthlyData,
        borderColor: baseColor,
        backgroundColor: baseColor + '10', // ~6% opacity
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: baseColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
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
          callbacks: { label: ctx => '  ' + fmtVND(ctx.parsed.y) }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: 'rgba(30,41,59,0.6)', font: { size: 10 } } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: 'rgba(30,41,59,0.5)', font: { size: 9 }, callback: v => fmtVND(v) } }
      }
    }
  });

  if (currentCatData) {
    const categoryStats = currentCatData.cs.find(c => resolveCatLabel(c) === catName || c.name === catName);
    if (categoryStats && window.computeSingleCategoryInsights) {
      const catTotal = categoryStats.s;
      const catCount = categoryStats.c;
      renderInsightCard('insight-categories', window.computeSingleCategoryInsights(catName, catTotal, catCount, currentCategoryItems, currentCatData.total));
    }
    if (window.triggerSingleCategoryAIInsight) {
      window.triggerSingleCategoryAIInsight(currentCatData.cs, currentCatData.ti, currentCatData.total, catName, currentCatData.year, currentCatData.total);
    }
  }

  if (catChart && currentCatData && currentCatData.cs) {
    catChart.data.datasets[0].backgroundColor = currentCatData.cs.map((c, i) => {
      const name = resolveCatLabel(c);
      const baseColor = CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
      return name === catName ? baseColor : baseColor + '40';
    });
    catChart.update();
  }

  if (detailGrid) {
    reveal(detailGrid.querySelector('#card-cat-trend'));
    reveal(detailGrid.querySelector('#card-cat-items'));
    detailGrid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function renderCategories(cs, ti, total, year) {
  currentCatData = { cs, ti, total: total || (window.currentDashData ? window.currentDashData.t : 0), year: year || 'all' };
  
  if (!cs || cs.length === 0) {
    document.getElementById('cat-bars').innerHTML =
      '<div class="no-data">Không có dữ liệu danh mục<br><small>Shopee API có thể không trả về catid cho các đơn này</small></div>';
    return;
  }

  // 2. Render Bars list
  const maxS = Math.max(...cs.map(c => c.s), 1);
  const bars = document.getElementById('cat-bars');
  bars.innerHTML = cs.map((c, i) => {
    const name = resolveCatLabel(c);
    const pct = Math.round((c.s / maxS) * 100);
    const baseColor = CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
    return `
      <div class="cat-row" data-cat="${escHtml(name)}" style="cursor:pointer" title="Click để xem sản phẩm">
        <div class="cat-label">${escHtml(name)}</div>
        <div class="cat-bar-wrap">
          <div class="cat-bar-fill" data-pct="${pct}" style="background: linear-gradient(90deg, ${baseColor}, ${baseColor}80)"></div>
        </div>
        <div class="cat-val">${fmtVND(c.s)}</div>
      </div>`;
  }).join('');

  bars.querySelectorAll('.cat-row').forEach((row, i) => {
    row.addEventListener('click', () => {
      const cat = row.getAttribute('data-cat');
      if (window.currentCategorySelection === cat) {
        window.clearCategorySelection();
      } else {
        window.currentCategorySelection = cat;
        showCatItems(cat, ti);
      }
    });
  });

  // Animate bars on scroll into view
  const bObs = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    bObs.disconnect();
    bars.querySelectorAll('.cat-bar-fill').forEach((bar, i) => {
      setTimeout(() => { bar.style.width = bar.getAttribute('data-pct') + '%'; }, i * 70);
    });
  }, { threshold: 0.2 });
  bObs.observe(bars);
  reveal(document.getElementById('card-cat-bars'));

  // 3. Donut chart
  const ctx = document.getElementById('chart-cat').getContext('2d');
  if (catChart) catChart.destroy();
  catChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: cs.map(c => resolveCatLabel(c)),
      datasets: [{
        data: cs.map(c => c.s),
        backgroundColor: cs.map((c, i) => {
          const name = resolveCatLabel(c);
          const baseColor = CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
          if (!window.currentCategorySelection) return baseColor;
          return name === window.currentCategorySelection ? baseColor : baseColor + '40';
        }),
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
          const catName = resolveCatLabel(cs[index]);
          if (window.currentCategorySelection === catName) {
            window.clearCategorySelection();
          } else {
            window.currentCategorySelection = catName;
            showCatItems(catName, ti);
          }
        }
      },
      onHover: (event, activeElements) => {
        event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
      },
      plugins: {
        legend: {
          display: true, position: 'right',
          labels: { color: 'rgba(30,41,59,0.7)', font: { size: 11 }, boxWidth: 12, padding: 10 }
        },
        tooltip: {
          backgroundColor: '#ffffff',
          borderColor: 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          titleColor: '#1e293b',
          bodyColor: 'rgba(30,41,59,0.8)',
          callbacks: { label: ctx => '  ' + fmtVND(ctx.parsed) }
        }
      }
    }
  });
  reveal(document.getElementById('card-cat-pie'));
}
