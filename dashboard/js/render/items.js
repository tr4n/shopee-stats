/* ─────────────────────────────────────────────────
   Render: Top Items view
   renderTopItems, renderTopItemsList.
   Depends on helpers.js.
 ───────────────────────────────────────────────── */

let currentTopItems = [];
let itemsChartInstance = null;
let itemsEventsInitialized = false;
let itemsSearchQuery = "";
let itemsLimit = 25;

function resolveCategory(itemName, rawCatId) {
  if (typeof resolveItemCategory === 'function') {
    return resolveItemCategory(itemName, rawCatId);
  }
  return resolveCatLabel({ id: rawCatId, name: rawCatId });
}

function removeVnAccents(str) {
  return (str || '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function getCategoryTagClass(catLabel) {
  const label = (catLabel || '').toLowerCase();
  if (label.includes('sức khỏe') || label.includes('làm đẹp') || label.includes('beauty')) return 'cat-tag-beauty';
  if (label.includes('thời trang') || label.includes('phụ kiện') || label.includes('fashion') || label.includes('quần áo') || label.includes('giày') || label.includes('túi')) return 'cat-tag-fashion';
  if (label.includes('điện thoại') || label.includes('máy tính') || label.includes('điện tử') || label.includes('công nghệ') || label.includes('tech') || label.includes('electronic')) return 'cat-tag-tech';
  if (label.includes('nhà cửa') || label.includes('đời sống') || label.includes('home') || label.includes('living') || label.includes('bách hóa') || label.includes('grocery')) return 'cat-tag-home';
  if (label.includes('thể thao') || label.includes('du lịch') || label.includes('sport')) return 'cat-tag-sport';
  if (label.includes('giải trí') || label.includes('giáo dục') || label.includes('sách') || label.includes('edu')) return 'cat-tag-edu';
  return 'cat-tag-other';
}

function renderTopItems(ti) {
  currentTopItems = ti || [];
  itemsLimit = 25;
  itemsSearchQuery = "";
  
  const searchInput = document.getElementById('items-search-input');
  if (searchInput) searchInput.value = "";
  const searchClear = document.getElementById('items-search-clear');
  if (searchClear) searchClear.style.display = 'none';

  // Reset custom toggle button states
  const discountBtn = document.getElementById('btn-filter-discount');
  if (discountBtn) discountBtn.classList.remove('active');
  const discountCheckbox = document.getElementById('items-discount-checkbox');
  if (discountCheckbox) discountCheckbox.checked = false;

  const toggleAdvancedBtn = document.getElementById('btn-toggle-advanced');
  if (toggleAdvancedBtn) toggleAdvancedBtn.classList.remove('active');
  const advancedPanel = document.getElementById('advanced-filters-panel');
  if (advancedPanel) advancedPanel.classList.remove('show');

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
  const discountBtn = document.getElementById('btn-filter-discount');
  
  const toggleAdvancedBtn = document.getElementById('btn-toggle-advanced');
  const advancedPanel = document.getElementById('advanced-filters-panel');
  
  const priceMin = document.getElementById('price-min-input');
  const priceMax = document.getElementById('price-max-input');
  const dateMin = document.getElementById('date-min-input');
  const dateMax = document.getElementById('date-max-input');
  
  const searchInput = document.getElementById('items-search-input');
  const searchClear = document.getElementById('items-search-clear');
  const loadMoreBtn = document.getElementById('items-load-more');
  
  const triggerReRender = () => {
    itemsLimit = 25;
    renderTopItemsList();
  };
  
  catSelect?.addEventListener('change', triggerReRender);
  sortSelect?.addEventListener('change', triggerReRender);
  discountCheckbox?.addEventListener('change', triggerReRender);
  
  // Custom discount button toggler
  discountBtn?.addEventListener('click', () => {
    discountBtn.classList.toggle('active');
    if (discountCheckbox) {
      discountCheckbox.checked = discountBtn.classList.contains('active');
      discountCheckbox.dispatchEvent(new Event('change'));
    }
  });

  // Advanced filters collapsible toggler
  toggleAdvancedBtn?.addEventListener('click', () => {
    toggleAdvancedBtn.classList.toggle('active');
    advancedPanel?.classList.toggle('show');
  });

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

  if (searchInput) {
    let searchDebounceTimeout = null;
    searchInput.addEventListener('input', (e) => {
      itemsSearchQuery = e.target.value;
      if (searchClear) {
        searchClear.style.display = itemsSearchQuery ? 'block' : 'none';
      }
      
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
        itemsLimit = 25;
        renderTopItemsList();
      }, 150);
    });
  }
  
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = "";
      }
      itemsSearchQuery = "";
      searchClear.style.display = 'none';
      triggerReRender();
    });
  }
  
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      itemsLimit += 25;
      renderTopItemsList();
    });
  }
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

  // 2.2 Text Search Filter (accent-insensitive)
  if (itemsSearchQuery.trim()) {
    const q = removeVnAccents(itemsSearchQuery);
    filtered = filtered.filter(item => {
      return removeVnAccents(item.n).includes(q);
    });
  }
  
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

  // 4. Slice to itemsLimit
  const displayItems = filtered.slice(0, itemsLimit);
  
  // Render quick stats
  const quickStatsEl = document.getElementById('items-quick-stats');
  if (quickStatsEl) {
    quickStatsEl.textContent = `Hiện ${fmtNum(displayItems.length)}/${fmtNum(filtered.length)} sản phẩm`;
  }

  // Load More button display
  const loadMoreBtn = document.getElementById('items-load-more');
  if (loadMoreBtn) {
    if (filtered.length > itemsLimit) {
      loadMoreBtn.style.display = 'block';
      loadMoreBtn.textContent = `Xem thêm (còn ${filtered.length - itemsLimit} SP)`;
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }
  
  if (displayItems.length === 0) {
    list.innerHTML = '<div class="no-data">Không có dữ liệu sản phẩm phù hợp bộ lọc</div>';
    return;
  }
  
  const maxS = Math.max(...displayItems.map(i => i.s), 1);
  
  list.innerHTML = displayItems.map((item, idx) => {
    const rank = idx + 1;
    const pct = Math.round((item.s / maxS) * 100);
    const hasDiscount = item.op && item.dp && item.op > item.dp;
    
    // Category Tag
    const resolvedCat = resolveCategory(item.n, item.cat) || "🏷️ Khác";
    const catClass = getCategoryTagClass(resolvedCat);
    const catTagHtml = `<span class="item-category-tag ${catClass}">${escHtml(resolvedCat)}</span>`;
    
    // Rank Badge Class
    let rankClass = "rank-default";
    if (rank === 1) rankClass = "rank-1";
    else if (rank === 2) rankClass = "rank-2";
    else if (rank === 3) rankClass = "rank-3";

    // Discount percentage
    let discountPctHtml = "";
    if (hasDiscount && item.op > 0) {
      const discPct = Math.round((1 - item.dp / item.op) * 100);
      if (discPct > 0) {
        discountPctHtml = `<span class="item-discount-tag">-${discPct}%</span>`;
      }
    }

    const savings = hasDiscount ? (item.op - item.dp) * item.c : 0;
    const savingsText = savings > 0 
      ? ` · Tiết kiệm: <span style="color: var(--green); font-weight: 600;">${fmtVND(savings)}</span>`
      : '';
      
    const metaText = hasDiscount 
      ? `${fmtNum(item.c)} lượt · Mua: ${fmtVND(item.dp)} (Gốc: <span style="text-decoration: line-through; opacity: 0.7;">${fmtVND(item.op)}</span>)${savingsText}`
      : `${fmtNum(item.c)} lượt · TB: ${fmtVND(Math.round(item.s / item.c))}/món`;

    const metaRowHtml = `
      <div class="top-meta">
        ${catTagHtml}
        ${discountPctHtml}
        <span>${metaText}</span>
      </div>`;

    return `
      <div class="top-row in">
        <div class="top-num ${rankClass}">${rank}</div>
        <div class="top-name-wrap">
          <div class="top-name" title="${escHtml(item.n)}">${escHtml(capFirst(item.n))}</div>
          <div class="top-bar-wrap"><div class="top-bar-fill" style="width: ${pct}%"></div></div>
          ${metaRowHtml}
        </div>
        <div class="top-val">${fmtVND(item.s)}</div>
      </div>`;
  }).join('');
  
}

function updateTopItemsChart(chartItems) {
  // Chart has been removed from Top Products tab as per design updates
}
