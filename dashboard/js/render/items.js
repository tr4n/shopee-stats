/* ─────────────────────────────────────────────────
   Render: Top Items view
   renderTopItems, renderTopItemsList.
   Depends on helpers.js.
 ───────────────────────────────────────────────── */

let currentTopItems = [];
let itemsCurrentPage = 1;
let itemsPerPage = 20;
let itemsChartInstance = null;
let itemsEventsInitialized = false;

function renderTopItems(ti) {
  currentTopItems = ti || [];
  
  // Dynamically populate categories in the select element
  populateCategorySelect();
  
  if (!itemsEventsInitialized) {
    initItemsEvents();
    itemsEventsInitialized = true;
  }
  
  renderTopItemsList();
  
  reveal(document.getElementById('card-items'));
  reveal(document.getElementById('card-items-chart'));
}

function populateCategorySelect() {
  const catSelect = document.getElementById('items-cat-select');
  if (!catSelect) return;
  
  const savedValue = catSelect.value || "all";
  
  // Gather unique category labels
  const categoriesSet = new Set();
  currentTopItems.forEach(item => {
    if (item.cat) {
      const resolved = resolveCatLabel({ name: item.cat, id: item.cat });
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
  
  // Append Uncategorized / Others option at the bottom if applicable
  html += `<option value="🏷️ Khác">🏷️ Khác</option>`;
  
  catSelect.innerHTML = html;
  
  // Restore previous selection if valid
  if (Array.from(catSelect.options).some(opt => opt.value === savedValue)) {
    catSelect.value = savedValue;
  } else {
    catSelect.value = "all";
  }
}

function initItemsEvents() {
  const catSelect = document.getElementById('items-cat-select');
  const priceSelect = document.getElementById('items-price-select');
  const sortSelect = document.getElementById('items-sort-select');
  const limitSelect = document.getElementById('items-limit-select');
  const discountCheckbox = document.getElementById('items-discount-checkbox');
  
  const triggerReRender = () => {
    itemsCurrentPage = 1;
    renderTopItemsList();
  };
  
  catSelect?.addEventListener('change', triggerReRender);
  priceSelect?.addEventListener('change', triggerReRender);
  sortSelect?.addEventListener('change', triggerReRender);
  limitSelect?.addEventListener('change', (e) => {
    itemsPerPage = parseInt(e.target.value, 10) || 20;
    triggerReRender();
  });
  discountCheckbox?.addEventListener('change', triggerReRender);
}

function renderTopItemsList() {
  const list = document.getElementById('items-list');
  if (!list) return;

  const catSelect = document.getElementById('items-cat-select');
  const priceSelect = document.getElementById('items-price-select');
  const sortSelect = document.getElementById('items-sort-select');
  const limitSelect = document.getElementById('items-limit-select');
  const discountCheckbox = document.getElementById('items-discount-checkbox');
  
  const category = catSelect ? catSelect.value : "all";
  const priceRange = priceSelect ? priceSelect.value : "all";
  const sortOrder = sortSelect ? sortSelect.value : "spend_desc";
  const limit = parseInt(limitSelect ? limitSelect.value : "20", 10) || 20;
  const onlyDiscount = discountCheckbox ? discountCheckbox.checked : false;
  
  // 1. Filter dataset in-memory
  let filtered = currentTopItems.filter(item => {
    // Category Filter
    if (category !== "all") {
      const resolved = resolveCatLabel({ name: item.cat, id: item.cat });
      if (resolved !== category) return false;
    }
    
    // Price segment Filter based on average purchased price
    const avgPrice = item.dp && item.dp > 0 ? item.dp : (item.c > 0 ? item.s / item.c : item.s);
    if (priceRange === "under100k" && avgPrice >= 100000) return false;
    if (priceRange === "100k-500k" && (avgPrice < 100000 || avgPrice >= 500000)) return false;
    if (priceRange === "500k-2m" && (avgPrice < 500000 || avgPrice >= 2000000)) return false;
    if (priceRange === "over2m" && avgPrice < 2000000) return false;
    
    // Discount Filter
    if (onlyDiscount) {
      const hasDiscount = item.op && item.dp && item.op > item.dp;
      if (!hasDiscount) return false;
    }
    
    return true;
  });
  
  // 2. Sort dataset in-memory
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
    
    return b.s - a.s; // default
  });
  
  // 3. Render quick statistics
  const quickStatsEl = document.getElementById('items-quick-stats');
  if (quickStatsEl) {
    const totalSpendFiltered = filtered.reduce((sum, item) => sum + item.s, 0);
    quickStatsEl.textContent = `Tổng: ${fmtNum(filtered.length)} SP · Chi tiêu: ${fmtVND(totalSpendFiltered)}`;
  }
  
  // 4. Handle pagination slicing
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / limit);
  
  if (itemsCurrentPage > totalPages) itemsCurrentPage = totalPages;
  if (itemsCurrentPage < 1) itemsCurrentPage = 1;
  
  const startIdx = (itemsCurrentPage - 1) * limit;
  const pageItems = filtered.slice(startIdx, startIdx + limit);
  
  if (pageItems.length === 0) {
    list.innerHTML = '<div class="no-data">Không có dữ liệu sản phẩm phù hợp bộ lọc</div>';
    const paginationEl = document.getElementById('items-pagination');
    if (paginationEl) paginationEl.innerHTML = '';
    updateTopItemsChart([]);
    return;
  }
  
  // Determine maximum spending in the filtered subset to normalize the bar width
  const maxS = Math.max(...filtered.map(i => i.s), 1);
  
  list.innerHTML = pageItems.map((item, idx) => {
    const absoluteRank = startIdx + idx + 1;
    const pct = Math.round((item.s / maxS) * 100);
    const hasDiscount = item.op && item.dp && item.op > item.dp;
    
    // Save metric
    const savings = hasDiscount ? (item.op - item.dp) * item.c : 0;
    const savingsText = savings > 0 
      ? ` · Tiết kiệm: <span style="color: var(--green); font-weight: 600;">${fmtVND(savings)}</span>`
      : '';
      
    const metaText = hasDiscount 
      ? `${fmtNum(item.c)} lượt · Mua: ${fmtVND(item.dp)} (Gốc: <span style="text-decoration: line-through; opacity: 0.7;">${fmtVND(item.op)}</span>)${savingsText}`
      : `${fmtNum(item.c)} lượt · TB: ${fmtVND(Math.round(item.s / item.c))}/món`;

    return `
      <div class="top-row in">
        <div class="top-num">${absoluteRank}</div>
        <div class="top-name-wrap">
          <div class="top-name" title="${escHtml(item.n)}">${escHtml(capFirst(item.n))}</div>
          <div class="top-bar-wrap"><div class="top-bar-fill" style="width: ${pct}%"></div></div>
          <div class="top-meta">${metaText}</div>
        </div>
        <div class="top-val">${fmtVND(item.s)}</div>
      </div>`;
  }).join('');
  
  // Render pagination buttons
  const paginationEl = document.getElementById('items-pagination');
  renderItemsTablePagination(paginationEl, totalPages, limit);
  
  // 5. Update top 10 chart based on filtered list
  const chartItems = filtered.slice(0, 10);
  updateTopItemsChart(chartItems);
}

function renderItemsTablePagination(pagination, totalPages, limit) {
  if (!pagination) return;
  if (totalPages <= 1) { pagination.innerHTML = ""; return; }

  let pagesHtml = "";
  pagesHtml += `<button class="pill${itemsCurrentPage === 1 ? " disabled" : ""}" data-page="${itemsCurrentPage - 1}" ${itemsCurrentPage === 1 ? "disabled" : ""}>← Trước</button>`;

  const maxPagesToShow = 5;
  let startPage = Math.max(1, itemsCurrentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  if (endPage - startPage + 1 < maxPagesToShow) startPage = Math.max(1, endPage - maxPagesToShow + 1);

  if (startPage > 1) {
    pagesHtml += `<button class="pill" data-page="1">1</button>`;
    if (startPage > 2) pagesHtml += `<span style="color:var(--muted);align-self:center;">...</span>`;
  }
  for (let p = startPage; p <= endPage; p++) {
    pagesHtml += `<button class="pill${p === itemsCurrentPage ? " active" : ""}" data-page="${p}">${p}</button>`;
  }
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pagesHtml += `<span style="color:var(--muted);align-self:center;">...</span>`;
    pagesHtml += `<button class="pill" data-page="${totalPages}">${totalPages}</button>`;
  }

  pagesHtml += `<button class="pill${itemsCurrentPage === totalPages ? " disabled" : ""}" data-page="${itemsCurrentPage + 1}" ${itemsCurrentPage === totalPages ? "disabled" : ""}>Sau →</button>`;
  pagination.innerHTML = pagesHtml;

  pagination.querySelectorAll("button[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      itemsCurrentPage = parseInt(btn.getAttribute("data-page"), 10);
      renderTopItemsList();
      document.getElementById("card-items")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
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
  
  // Capitalize first letter and truncate names to look neat in chart labels
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
  
  // Custom orange gradient theme consistent with Shopee style
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
      indexAxis: 'y', // Makes it a horizontal bar chart
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
