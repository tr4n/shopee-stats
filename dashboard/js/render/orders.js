/* ─────────────────────────────────────────────────
   Render: Order History view
   renderOrders, renderOrdersList, renderOrdersYearPills.
   Depends on helpers.js.
 ───────────────────────────────────────────────── */

let currentOrders = [];
let filteredOrders = [];
let ordersCurrentPage = 1;
let ordersActiveYear = 'all';

function renderOrders(ol) {
  currentOrders = ol || [];
  ordersCurrentPage = 1;
  ordersActiveYear = 'all';

  // Setup Year Pills
  renderOrdersYearPills();

  // Setup Limit & Search Listeners once
  const searchInput = document.getElementById('orders-search');
  if (searchInput) {
    // Clear search value when changing dataset
    searchInput.value = '';
    
    // Remove existing event listener if any (by replacing node or standard listener)
    if (!searchInput.dataset.hasListener) {
      searchInput.addEventListener('input', () => {
        ordersCurrentPage = 1;
        applyFiltersAndRender();
      });
      searchInput.dataset.hasListener = 'true';
    }
  }

  const limitSelect = document.getElementById('orders-limit-select');
  if (limitSelect && !limitSelect.dataset.hasListener) {
    limitSelect.addEventListener('change', () => {
      ordersCurrentPage = 1;
      applyFiltersAndRender();
    });
    limitSelect.dataset.hasListener = 'true';
  }

  applyFiltersAndRender();
  reveal(document.getElementById('card-orders'));
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
      ordersCurrentPage = 1;
      applyFiltersAndRender();
    });
  });
}

function applyFiltersAndRender() {
  const searchVal = (document.getElementById('orders-search')?.value || '').trim();
  const searchNum = parseInt(searchVal.replace(/[^\d]/g, ''), 10);

  filteredOrders = currentOrders.filter(o => {
    // 1. Year Filter
    if (ordersActiveYear !== 'all' && o.t) {
      const yr = String(new Date(o.t * 1000).getFullYear());
      if (yr !== ordersActiveYear) return false;
    }

    // 2. Search Filter (matches date string or numeric price thresholds)
    if (searchVal) {
      const dateStr = o.t ? new Date(o.t * 1000).toLocaleString('vi-VN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      }) : 'Không rõ ngày';
      
      const dateMatches = dateStr.includes(searchVal);
      
      let numberMatches = false;
      if (!isNaN(searchNum)) {
        const finalCost = o.f || 0;
        const rawCost = o.r || 0;
        const saving = Math.max(0, rawCost - finalCost);
        if (finalCost >= searchNum || rawCost >= searchNum || saving >= searchNum) {
          numberMatches = true;
        }
      }
      
      if (!dateMatches && !numberMatches) {
        return false;
      }
    }

    return true;
  });

  renderOrdersList();
}

function renderOrdersList() {
  const tbody = document.querySelector('#orders-table tbody');
  const pagination = document.getElementById('orders-pagination');
  const limitSelect = document.getElementById('orders-limit-select');
  const pageSize = parseInt(limitSelect?.value, 10) || 20;

  if (!tbody) return;

  // Backward compatibility warning check
  if (currentOrders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="padding: 0;">
          <div class="no-data" style="padding: 40px 20px; text-align: center; color: var(--muted); line-height: 1.6;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <div style="font-weight: 700; font-size: 16px; color: var(--text); margin-bottom: 8px;">Dữ liệu chưa sẵn sàng</div>
            <div style="max-width: 480px; margin: 0 auto; font-size: 13px;">
              Tính năng xem Lịch sử đơn hàng yêu cầu dữ liệu từ Tiện ích Shopee Analytics phiên bản mới nhất.<br>
              Vui lòng đợi tiện ích tự động cập nhật trên Chrome Web Store và thực hiện <strong>quét (scan) lại dữ liệu</strong> để sử dụng tính năng này.
            </div>
          </div>
        </td>
      </tr>
    `;
    if (pagination) pagination.innerHTML = '';
    return;
  }

  if (filteredOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="no-data" style="text-align: center; padding: 40px;">Không tìm thấy đơn hàng phù hợp</td></tr>`;
    if (pagination) pagination.innerHTML = '';
    return;
  }

  // Paginate
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  
  // Guard current page
  if (ordersCurrentPage > totalPages) ordersCurrentPage = totalPages;
  if (ordersCurrentPage < 1) ordersCurrentPage = 1;

  const startIdx = (ordersCurrentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const pageItems = filteredOrders.slice(startIdx, endIdx);

  tbody.innerHTML = pageItems.map(o => {
    const rawCost = o.r || o.f || 0;
    const finalCost = o.f || 0;
    const saving = Math.max(0, rawCost - finalCost);
    const savingPct = rawCost > 0 ? Math.round((saving / rawCost) * 100) : 0;

    const dateStr = o.t ? new Date(o.t * 1000).toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }) : 'Không rõ ngày';

    const savingLabel = saving > 0 
      ? `<span style="font-weight:700; color:var(--green);">${fmtVND(saving)}đ</span> <span style="font-size:11px; opacity:0.8; background:var(--green-dim); color:var(--green); padding:2px 6px; border-radius:4px; font-weight:600; margin-left:4px;">-${savingPct}%</span>`
      : `<span style="color:var(--muted);">—</span>`;

    return `
      <tr class="order-row-item">
        <td>
          <div style="font-weight: 600; color: var(--text);">${dateStr}</div>
          <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">Shopee Order</div>
        </td>
        <td style="text-align: right; font-weight: 500; font-variant-numeric: tabular-nums;">
          ${rawCost > finalCost ? `<span style="text-decoration: line-through; opacity: 0.6;">${fmtVND(rawCost)}đ</span>` : `${fmtVND(rawCost)}đ`}
        </td>
        <td style="text-align: right; font-weight: 700; color: var(--primary); font-variant-numeric: tabular-nums;">
          ${fmtVND(finalCost)}đ
        </td>
        <td style="text-align: right; font-variant-numeric: tabular-nums;">
          ${savingLabel}
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

      // Page numbers (simple slice around current page)
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
          renderOrdersList();
          document.getElementById('card-orders').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      });
    }
  }
}
