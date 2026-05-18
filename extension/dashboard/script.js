document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      const targetId = 'view-' + item.getAttribute('data-view');
      viewSections.forEach(sec => {
        sec.classList.remove('active');
        if (sec.id === targetId) {
          sec.classList.add('active');
        }
      });
    });
  });

  // Load Data
  chrome.storage.local.get(['shopee_cache'], (result) => {
    const cache = result.shopee_cache;
    if (cache && Array.isArray(cache.miniOrders)) {
      renderDashboard(cache);
    } else {
      document.getElementById('cache-info').textContent = 'Chưa có dữ liệu. Hãy chạy thống kê trên tiện ích trước.';
    }
  });

  function renderDashboard(cache) {
    const orders = cache.miniOrders;
    document.getElementById('cache-info').textContent = `Dữ liệu: ${orders.length} đơn hàng`;

    let totalSpent = 0;
    let totalItems = 0;
    let totalSaved = 0;

    // We can recalculate stats to have full control
    const byYearMonth = {};
    
    orders.forEach(o => {
      totalSpent += o.finalCost;
      totalItems += o.itemCount;
      totalSaved += (o.rawCost - o.finalCost);

      if (o.ts) {
        const d = new Date(o.ts * 1000);
        const yr = d.getFullYear();
        const mo = d.getMonth() + 1;
        const key = `${yr}-${mo.toString().padStart(2, '0')}`;
        
        if (!byYearMonth[key]) byYearMonth[key] = 0;
        byYearMonth[key] += o.finalCost;
      }
    });

    document.getElementById('val-total-spent').textContent = pxgPrice(totalSpent) + 'đ';
    document.getElementById('val-total-orders').textContent = pxgPrice(orders.length);
    document.getElementById('val-total-items').textContent = pxgPrice(totalItems);
    document.getElementById('val-total-saved').textContent = pxgPrice(totalSaved > 0 ? totalSaved : 0) + 'đ';
    document.getElementById('val-rank').textContent = 'Hạng: ' + getRankBadge(totalSpent);

    // Top Items & Shops
    renderTopList('top-items-container', Object.values(cache.itemMap || {}));
    renderTopList('top-shops-container', Object.values(cache.shopMap || {}));

    // Charts
    renderCharts(byYearMonth);
  }

  function renderTopList(containerId, itemsArray) {
    const container = document.getElementById(containerId);
    if (!itemsArray || itemsArray.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted)">Không có dữ liệu</p>';
      return;
    }

    const sorted = itemsArray.sort((a, b) => b.spent - a.spent).slice(0, 50); // top 50
    container.innerHTML = sorted.map((item, idx) => {
      let rankClass = '';
      if (idx === 0) rankClass = 'item-rank-1';
      else if (idx === 1) rankClass = 'item-rank-2';
      else if (idx === 2) rankClass = 'item-rank-3';

      return `
        <div class="list-item">
          <div class="rank-num ${rankClass}">#${idx + 1}</div>
          <div class="item-info">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-meta">${escapeHtml(item.shopName || '')} • ${pxgPrice(item.count)} lượt</div>
          </div>
          <div class="item-value">${pxgPrice(item.spent)}đ</div>
        </div>
      `;
    }).join('');
  }

  let chartInstances = [];
  function renderCharts(byYearMonth) {
    // Destroy old charts
    chartInstances.forEach(c => c.destroy());
    chartInstances = [];

    // Sort keys chronologically
    const keys = Object.keys(byYearMonth).sort();
    
    // Group by Year
    const byYear = {};
    keys.forEach(k => {
      const yr = k.split('-')[0];
      if (!byYear[yr]) byYear[yr] = 0;
      byYear[yr] += byYearMonth[k];
    });

    // Yearly Chart
    const ctxYear = document.getElementById('yearlyChart').getContext('2d');
    chartInstances.push(new Chart(ctxYear, {
      type: 'bar',
      data: {
        labels: Object.keys(byYear),
        datasets: [{
          label: 'Chi tiêu (VNĐ)',
          data: Object.values(byYear),
          backgroundColor: 'rgba(6, 182, 212, 0.5)',
          borderColor: 'rgba(6, 182, 212, 1)',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: getChartOptions()
    }));

    // Monthly Chart (Last 12 months)
    const recentKeys = keys.slice(-12);
    const ctxMonth = document.getElementById('monthlyChart').getContext('2d');
    chartInstances.push(new Chart(ctxMonth, {
      type: 'line',
      data: {
        labels: recentKeys,
        datasets: [{
          label: 'Chi tiêu (VNĐ)',
          data: recentKeys.map(k => byYearMonth[k]),
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: 'rgba(16, 185, 129, 1)'
        }]
      },
      options: getChartOptions()
    }));
  }

  function getChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#94a3b8',
            callback: function(value) {
              if (value >= 1000000) return (value / 1000000) + 'M';
              if (value >= 1000) return (value / 1000) + 'K';
              return value;
            }
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        }
      }
    };
  }

  // Helpers
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

  // Export CSV
  document.getElementById('btn-export').addEventListener('click', () => {
    chrome.storage.local.get(['shopee_cache'], (result) => {
      const cache = result.shopee_cache;
      if (!cache || !cache.miniOrders) return alert('Chưa có dữ liệu');
      
      const orders = cache.miniOrders;
      const rows = [['Ngày', 'Tổng tiền', 'Sản phẩm', 'Tiết kiệm']];
      
      orders.forEach(o => {
        const d = new Date(o.ts * 1000);
        const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
        const saved = o.rawCost - o.finalCost;
        rows.push([dateStr, Math.round(o.finalCost), o.itemCount, Math.round(saved > 0 ? saved : 0)]);
      });

      const blob = new Blob(['\uFEFF' + rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'shopee_raw_orders.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  });
});
