/* ─────────────────────────────────────────────────
   Render: Top Items view
   renderTopItems, renderTopItemsList.
   Depends on helpers.js.
 ───────────────────────────────────────────────── */

let currentTopItems = [];
let itemsChartInstance = null;
let itemsEventsInitialized = false;

function resolveCategory(itemName, rawCatId) {
  if (typeof resolveItemCategory === 'function') {
    return resolveItemCategory(itemName, rawCatId);
  }
  return resolveCatLabel({ id: rawCatId, name: rawCatId });
}

function renderTopItems(ti) {
  currentTopItems = ti || [];
  
  // Set date slider bounds dynamically based on d.ol
  const d = window.currentDashData || {};
  const orders = d.ol || [];
  
  const priceMin = document.getElementById('price-min-input');
  const priceMax = document.getElementById('price-max-input');
  const dateMin = document.getElementById('date-min-input');
  const dateMax = document.getElementById('date-max-input');
  
  // 1. Initialize Date Slider bounds
  if (orders.length > 0 && dateMin && dateMax) {
    const timestamps = orders.map(o => o.t).filter(t => t > 0);
    if (timestamps.length > 0) {
      const minTs = Math.min(...timestamps);
      const maxTs = Math.max(...timestamps);
      
      dateMin.min = minTs;
      dateMin.max = maxTs;
      dateMin.value = minTs;
      
      dateMax.min = minTs;
      dateMax.max = maxTs;
      dateMax.value = maxTs;
    }
  }
  
  // 2. Initialize Price Slider bounds
  let maxPriceVal = 5000000; // default 5M
  if (currentTopItems.length > 0) {
    const prices = currentTopItems.map(item => item.dp && item.dp > 0 ? item.dp : (item.c > 0 ? item.s / item.c : item.s));
    const highestItemPrice = Math.max(...prices, 0);
    if (highestItemPrice > 0) {
      maxPriceVal = Math.ceil(highestItemPrice / 100000) * 100000;
    }
  }
  
  if (priceMin && priceMax) {
    priceMin.min = 0;
    priceMin.max = maxPriceVal;
    priceMin.value = 0;
    
    priceMax.min = 0;
    priceMax.max = maxPriceVal;
    priceMax.value = maxPriceVal;
    
    const stepVal = maxPriceVal >= 10000000 ? 100000 : 10000;
    priceMin.step = stepVal;
    priceMax.step = stepVal;
  }
  
  populateCategorySelect();
  
  if (!itemsEventsInitialized) {
    initItemsEvents();
    itemsEventsInitialized = true;
  }
  
  updateSliderTracks();
  renderTopItemsList();
  
  reveal(document.getElementById('card-items'));
  reveal(document.getElementById('card-items-chart'));
}

function populateCategorySelect() {
  const catSelect = document.getElementById('items-cat-select');
  if (!catSelect) return;
  
  const savedValue = catSelect.value || "all";
  
  const categoriesSet = new Set();
  currentTopItems.forEach(item => {
    if (item.cat) {
      const resolved = resolveCategory(item.n, item.cat);
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

function initItemsEvents() {
  const catSelect = document.getElementById('items-cat-select');
  const sortSelect = document.getElementById('items-sort-select');
  const discountCheckbox = document.getElementById('items-discount-checkbox');
  
  const priceMin = document.getElementById('price-min-input');
  const priceMax = document.getElementById('price-max-input');
  const dateMin = document.getElementById('date-min-input');
  const dateMax = document.getElementById('date-max-input');
  
  const triggerReRender = () => {
    renderTopItemsList();
  };
  
  catSelect?.addEventListener('change', triggerReRender);
  sortSelect?.addEventListener('change', triggerReRender);
  discountCheckbox?.addEventListener('change', triggerReRender);
  
  priceMin?.addEventListener('input', () => {
    updateSliderTracks();
    triggerReRender();
  });
  priceMax?.addEventListener('input', () => {
    updateSliderTracks();
    triggerReRender();
  });
  dateMin?.addEventListener('input', () => {
    updateSliderTracks();
    triggerReRender();
  });
  dateMax?.addEventListener('input', () => {
    updateSliderTracks();
    triggerReRender();
  });
}

function updateSliderTracks() {
  const priceMin = document.getElementById('price-min-input');
  const priceMax = document.getElementById('price-max-input');
  const priceRange = document.getElementById('price-slider-range');
  
  if (priceMin && priceMax && priceRange) {
    const minVal = parseInt(priceMin.value, 10);
    const maxVal = parseInt(priceMax.value, 10);
    const maxLimit = parseInt(priceMin.max, 10) || 1;
    
    if (minVal > maxVal) {
      priceMin.value = maxVal;
    }
    
    const leftPct = (priceMin.value / maxLimit) * 100;
    const rightPct = 100 - (priceMax.value / maxLimit) * 100;
    priceRange.style.left = leftPct + '%';
    priceRange.style.right = rightPct + '%';
    
    document.getElementById('price-range-label').textContent = `${fmtVND(priceMin.value)} - ${fmtVND(priceMax.value)}`;
  }

  const dateMin = document.getElementById('date-min-input');
  const dateMax = document.getElementById('date-max-input');
  const dateRange = document.getElementById('date-slider-range');
  
  if (dateMin && dateMax && dateRange) {
    const minVal = parseInt(dateMin.value, 10);
    const maxVal = parseInt(dateMax.value, 10);
    const minLimit = parseInt(dateMin.min, 10);
    const maxLimit = parseInt(dateMin.max, 10);
    const range = maxLimit - minLimit || 1;
    
    if (minVal > maxVal) {
      dateMin.value = maxVal;
    }
    
    const leftPct = ((dateMin.value - minLimit) / range) * 100;
    const rightPct = 100 - ((dateMax.value - minLimit) / range) * 100;
    dateRange.style.left = leftPct + '%';
    dateRange.style.right = rightPct + '%';
    
    document.getElementById('date-range-label').textContent = `${fmtVnDate(dateMin.value)} - ${fmtVnDate(dateMax.value)}`;
  }
}

function getFilteredAndAggregatedItems() {
  const d = window.currentDashData || {};
  const orders = d.ol || [];
  
  const dateMinEl = document.getElementById('date-min-input');
  const dateMaxEl = document.getElementById('date-max-input');
  
  if (orders.length > 0 && dateMinEl && dateMaxEl) {
    const minTs = parseInt(dateMinEl.value, 10);
    const maxTs = parseInt(dateMaxEl.value, 10);
    
    const filteredOrders = orders.filter(o => o.t && o.t >= minTs && o.t <= maxTs && o.f > 0);
    
    const map = {};
    const localCatCache = {};
    for (const o of filteredOrders) {
      const name = o.n || "Sản phẩm không tên";
      const key = name.toLowerCase().substring(0, 120);
      if (!map[key]) {
        if (!localCatCache[key]) {
          localCatCache[key] = resolveCategory(name, o.c);
        }
        const cat = localCatCache[key];
        
        map[key] = {
          n: name,
          s: 0,
          c: 0,
          cat: cat,
          op: o.r || o.f,
          dp: o.f
        };
      }
      map[key].s += o.f || 0;
      map[key].c += 1;
      
      if (o.f < map[key].dp) {
        map[key].dp = o.f;
        map[key].op = o.r || o.f;
      }
    }
    return Object.values(map);
  }
  
  return currentTopItems;
}

function renderTopItemsList() {
  const list = document.getElementById('items-list');
  if (!list) return;

  const catSelect = document.getElementById('items-cat-select');
  const sortSelect = document.getElementById('items-sort-select');
  const discountCheckbox = document.getElementById('items-discount-checkbox');
  
  const priceMinEl = document.getElementById('price-min-input');
  const priceMaxEl = document.getElementById('price-max-input');
  
  const category = catSelect ? catSelect.value : "all";
  const sortOrder = sortSelect ? sortSelect.value : "spend_desc";
  const onlyDiscount = discountCheckbox ? discountCheckbox.checked : false;
  
  const minPrice = priceMinEl ? parseInt(priceMinEl.value, 10) : 0;
  const maxPrice = priceMaxEl ? parseInt(priceMaxEl.value, 10) : Infinity;
  
  // 1. Dynamically retrieve aggregated items based on date slider range
  const activeItems = getFilteredAndAggregatedItems();
  
  // 2. Filter aggregated items
  let filtered = activeItems.filter(item => {
    // Category Filter
    if (category !== "all") {
      const resolved = resolveCategory(item.n, item.cat);
      if (resolved !== category) return false;
    }
    
    // Price Range Filter
    const avgPrice = item.dp && item.dp > 0 ? item.dp : (item.c > 0 ? item.s / item.c : item.s);
    if (avgPrice < minPrice || avgPrice > maxPrice) return false;
    
    // Discount Filter
    if (onlyDiscount) {
      const hasDiscount = item.op && item.dp && item.op > item.dp;
      if (!hasDiscount) return false;
    }
    
    return true;
  });
  
  // 3. Sort filtered items
  filtered.sort((a, b) => {
    const avgA = a.dp && a.dp > 0 ? a.dp : (a.c > 0 ? a.s / a.c : a.s);
    const avgB = b.dp && b.dp > 0 ? b.dp : (b.c > 0 ? b.s / b.c : b.s);
    const saveA = a.op && a.dp && a.op > a.dp ? (a.op - a.dp) * a.c : 0;
    const saveB = b.op && b.dp && b.op > b.dp ? (b.op - b.dp) * b.c : 0;
    
    if (sortOrder === "spend_desc") return b.s - a.s;
    if (sortOrder === "spend_asc") return a.s - b.s;
    if (sortOrder === "count_desc") return b.c - a.c;
    if (sortOrder === "avg_desc") return avgB - avgA;
    if (sortOrder === "save_desc") return saveB - saveA;
    
    return b.s - a.s;
  });
  
  // 4. Slice to fixed Top 25 products
  const displayItems = filtered.slice(0, 25);
  
  // Render quick stats
  const quickStatsEl = document.getElementById('items-quick-stats');
  if (quickStatsEl) {
    const totalSpendFiltered = displayItems.reduce((sum, item) => sum + item.s, 0);
    quickStatsEl.textContent = `Hiện ${fmtNum(displayItems.length)}/${fmtNum(filtered.length)} SP · Chi tiêu: ${fmtVND(totalSpendFiltered)}`;
  }
  
  if (displayItems.length === 0) {
    list.innerHTML = '<div class="no-data">Không có dữ liệu sản phẩm phù hợp bộ lọc</div>';
    updateTopItemsChart([]);
    return;
  }
  
  const maxS = Math.max(...displayItems.map(i => i.s), 1);
  
  list.innerHTML = displayItems.map((item, idx) => {
    const rank = idx + 1;
    const pct = Math.round((item.s / maxS) * 100);
    const hasDiscount = item.op && item.dp && item.op > item.dp;
    
    const savings = hasDiscount ? (item.op - item.dp) * item.c : 0;
    const savingsText = savings > 0 
      ? ` · Tiết kiệm: <span style="color: var(--green); font-weight: 600;">${fmtVND(savings)}</span>`
      : '';
      
    const metaText = hasDiscount 
      ? `${fmtNum(item.c)} lượt · Mua: ${fmtVND(item.dp)} (Gốc: <span style="text-decoration: line-through; opacity: 0.7;">${fmtVND(item.op)}</span>)${savingsText}`
      : `${fmtNum(item.c)} lượt · TB: ${fmtVND(Math.round(item.s / item.c))}/món`;

    return `
      <div class="top-row in">
        <div class="top-num">${rank}</div>
        <div class="top-name-wrap">
          <div class="top-name" title="${escHtml(item.n)}">${escHtml(capFirst(item.n))}</div>
          <div class="top-bar-wrap"><div class="top-bar-fill" style="width: ${pct}%"></div></div>
          <div class="top-meta">${metaText}</div>
        </div>
        <div class="top-val">${fmtVND(item.s)}</div>
      </div>`;
  }).join('');
  
  // 5. Update top 10 chart based on displayItems
  const chartItems = displayItems.slice(0, 10);
  updateTopItemsChart(chartItems);
}

function updateTopItemsChart(chartItems) {
  const canvas = document.getElementById('chart-top-items');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (itemsChartInstance) {
    itemsChartInstance.destroy();
    itemsChartInstance = null;
  }
  
  if (chartItems.length === 0) {
    return;
  }
  
  const labels = chartItems.map(item => {
    const name = capFirst(item.n);
    return name.length > 25 ? name.substring(0, 25) + '...' : name;
  });
  
  const sortSelect = document.getElementById('items-sort-select');
  const sortOrder = sortSelect ? sortSelect.value : "spend_desc";
  
  let dataVal = [];
  let labelText = "Thực chi";
  let valFormatter = fmtVND;
  
  if (sortOrder === "count_desc") {
    dataVal = chartItems.map(item => item.c);
    labelText = "Số lượt mua";
    valFormatter = fmtNum;
  } else if (sortOrder === "avg_desc") {
    dataVal = chartItems.map(item => item.dp && item.dp > 0 ? item.dp : (item.c > 0 ? item.s / item.c : item.s));
    labelText = "Đơn giá TB";
    valFormatter = fmtVND;
  } else if (sortOrder === "save_desc") {
    dataVal = chartItems.map(item => item.op && item.dp && item.op > item.dp ? (item.op - item.dp) * item.c : 0);
    labelText = "Tiết kiệm";
    valFormatter = fmtVND;
  } else {
    dataVal = chartItems.map(item => item.s);
    labelText = "Thực chi";
    valFormatter = fmtVND;
  }
  
  const colors = [
    'rgba(238, 77, 45, 0.85)',
    'rgba(238, 77, 45, 0.80)',
    'rgba(238, 77, 45, 0.75)',
    'rgba(238, 77, 45, 0.70)',
    'rgba(238, 77, 45, 0.65)',
    'rgba(238, 77, 45, 0.60)',
    'rgba(238, 77, 45, 0.55)',
    'rgba(238, 77, 45, 0.50)',
    'rgba(238, 77, 45, 0.45)',
    'rgba(238, 77, 45, 0.40)'
  ];
  
  const borderColors = colors.map(c => c.replace('0.', '1.'));
  
  itemsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: labelText,
        data: dataVal,
        backgroundColor: colors.slice(0, chartItems.length),
        borderColor: borderColors.slice(0, chartItems.length),
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
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
          padding: 10,
          callbacks: {
            label: ctx => '  ' + labelText + ': ' + valFormatter(ctx.parsed.x)
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            color: 'rgba(30,41,59,0.5)',
            font: { size: 10 },
            callback: v => valFormatter(v)
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: 'rgba(30,41,59,0.7)',
            font: { size: 11, weight: '600' }
          }
        }
      }
    }
  });
}
