/* ─────────────────────────────────────────────────
   Render: Overview view
   renderNoData, renderKpi, renderYearlyChart,
   showYearlyTopItems, renderPeriod.
   Depends on helpers.js.
───────────────────────────────────────────────── */

function renderNoData() {
  document.querySelector('.main').innerHTML = `
    <div class="no-data" style="margin-top:10vh; max-width: 600px; margin-left: auto; margin-right: auto; padding: 40px; background: #fff; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); text-align: center;">
      <div style="font-size:64px;margin-bottom:16px; animation: float 3s ease-in-out infinite;">🛒</div>
      <h2 style="font-size:28px;font-weight:800;color:var(--text);margin-bottom:12px">Bắt đầu thống kê chi tiêu!</h2>
      <p style="color:var(--muted); font-size: 16px; line-height: 1.6; margin-bottom: 32px;">Chưa có dữ liệu thống kê. Vui lòng làm theo các bước sau để thiết lập báo cáo chi tiêu Shopee:</p>
      
      <div style="display: flex; flex-direction: column; gap: 16px; text-align: left; margin-bottom: 32px;">
        <div style="display: flex; align-items: flex-start; gap: 16px; background: var(--surface); padding: 16px; border-radius: 16px;">
          <div style="background: var(--primary); color: white; width: 32px; height: 32px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">1</div>
          <div>
            <h4 style="margin: 0 0 4px 0; font-weight: 700; color: var(--text);">Cài đặt tiện ích</h4>
            <p style="margin: 0; font-size: 14px; color: var(--muted);">Thêm Shopee Analytics vào trình duyệt Chrome của bạn.</p>
          </div>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 16px; background: var(--surface); padding: 16px; border-radius: 16px;">
          <div style="background: var(--primary); color: white; width: 32px; height: 32px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">2</div>
          <div>
            <h4 style="margin: 0 0 4px 0; font-weight: 700; color: var(--text);">Mở Shopee & Tiện ích</h4>
            <p style="margin: 0; font-size: 14px; color: var(--muted);">Đăng nhập vào Shopee.vn, nhấn vào biểu tượng tiện ích ở góc trên phải và chọn "Bắt Đầu Quét".</p>
          </div>
        </div>
        <div style="display: flex; align-items: flex-start; gap: 16px; background: var(--surface); padding: 16px; border-radius: 16px;">
          <div style="background: var(--primary); color: white; width: 32px; height: 32px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">3</div>
          <div>
            <h4 style="margin: 0 0 4px 0; font-weight: 700; color: var(--text);">Xem báo cáo</h4>
            <p style="margin: 0; font-size: 14px; color: var(--muted);">Sau khi quét xong, nhấn "Mở Dashboard" để xem thống kê chi tiết của bạn.</p>
          </div>
        </div>
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <a href="https://chromewebstore.google.com/detail/shopee-analytics-pro-th%E1%BB%91n/jcflofioiopfchfelgbpbndplhpfeapm" target="_blank" style="display: inline-block; background: var(--primary); color: white; padding: 14px 28px; border-radius: 30px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 14px rgba(238, 77, 45, 0.4); transition: transform 0.2s, box-shadow 0.2s;">
          Thêm vào Chrome miễn phí ✨
        </a>
      </div>
    </div>
    <style>
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
      }
    </style>
  `;

  // Hide sidebar on no data screen for better focus
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.style.display = 'none';
  document.querySelector('.main').style.marginLeft = '0';
}

function renderKpi(d) {
  const kpis = [
    { 
      label: 'Tổng Chi Tiêu', 
      val: fmtVND(d.t), 
      cls: 'orange', 
      sub: `${fmtNum(d.o)} đơn hàng`,
      icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`
    },
    { 
      label: 'Sản Phẩm Đã Mua', 
      val: fmtNum(d.ip), 
      cls: 'blue', 
      sub: 'sản phẩm',
      icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`
    },
    { 
      label: 'Tiết Kiệm Được', 
      val: fmtVND(d.s), 
      cls: 'green', 
      sub: 'từ khuyến mãi',
      icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`
    }
  ];

  const row = document.getElementById('kpi-row');
  row.innerHTML = kpis.map((k, i) => `
    <div class="kpi-card ${k.cls}" style="transition-delay:${i * 0.08}s">
      <div class="kpi-card-icon-wrap">${k.icon}</div>
      <div class="kpi-card-content">
        <div class="kpi-card-label">${k.label}</div>
        <div class="kpi-card-value" data-target="${k.val}">${k.val}</div>
        <div class="kpi-card-sub">${k.sub}</div>
      </div>
    </div>`).join('');
    
  row.querySelectorAll('.kpi-card').forEach(el => {
    reveal(el);
    const vEl = el.querySelector('.kpi-card-value');
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      animateCounter(vEl, vEl.getAttribute('data-target'), 900);
    });
    obs.observe(el);
  });
}

let yearlyChart = null;

function renderYearlyChart(yd, d) {
  const years = Object.keys(yd).sort();
  const spendData = years.map(y => yd[y].t);
  const orderData = years.map(y => yd[y].o);
  const currentYearStr = d && d.ts ? String(toVnParts(d.ts).year) : String(new Date().getFullYear());

  const ctx = document.getElementById('chart-yearly').getContext('2d');
  
  // Create beautiful vertical gradients for spending columns
  const spendGradients = years.map(y => {
    const grad = ctx.createLinearGradient(0, 0, 0, 300);
    if (y === currentYearStr) {
      grad.addColorStop(0, '#ee4d2d');
      grad.addColorStop(1, '#ff8060');
    } else {
      grad.addColorStop(0, 'rgba(203, 213, 225, 0.95)');
      grad.addColorStop(1, 'rgba(148, 163, 184, 0.45)');
    }
    return grad;
  });

  if (yearlyChart) yearlyChart.destroy();
  yearlyChart = new Chart(ctx, {
    data: {
      labels: years,
      datasets: [
        {
          label: 'Chi tiêu',
          type: 'bar',
          data: spendData,
          backgroundColor: spendGradients,
          borderRadius: 6,
          borderSkipped: false,
          yAxisID: 'y',
          order: 2
        },
        {
          label: 'Đơn hàng',
          type: 'line',
          data: orderData,
          borderColor: '#3b82f6',
          borderWidth: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2,
          pointRadius: 4.5,
          pointHoverRadius: 6,
          tension: 0.35,
          yAxisID: 'y1',
          order: 1
        }
      ]
    },
    options: {
      onClick: (e, elements) => {
        if (elements && elements.length > 0) {
          const index = elements[0].index;
          const year = years[index];
          if (window.currentYearSelection === year) {
            window.clearYearlySelection(d);
          } else {
            window.currentYearSelection = year;
            showYearlyTopItems(year, d);
            
            // Highlight clicked column and dim other columns
            const newGradients = years.map((y, i) => {
              const grad = ctx.createLinearGradient(0, 0, 0, 300);
              if (i === index) {
                grad.addColorStop(0, '#ee4d2d');
                grad.addColorStop(1, '#ff8060');
              } else {
                grad.addColorStop(0, 'rgba(203, 213, 225, 0.4)');
                grad.addColorStop(1, 'rgba(148, 163, 184, 0.18)');
              }
              return grad;
            });
            yearlyChart.data.datasets[0].backgroundColor = newGradients;
            yearlyChart.update();
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
          labels: {
            boxWidth: 12,
            font: { size: 11, weight: 'bold' },
            color: 'rgba(30,41,59,0.7)'
          }
        },
        tooltip: {
          backgroundColor: '#ffffff',
          borderColor: 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          titleColor: '#1e293b',
          titleFont: { weight: 'bold' },
          bodyColor: 'rgba(30,41,59,0.8)',
          padding: 12,
          callbacks: {
            title: ctx => 'Năm ' + ctx[0].label,
            label: ctx => {
              if (ctx.datasetIndex === 0) {
                return '  Chi tiêu: ' + fmtVND(ctx.parsed.y) + ' (' + fmtNum(yd[ctx.label].o) + ' đơn)';
              } else {
                return '  Số đơn: ' + fmtNum(ctx.parsed.y) + ' đơn';
              }
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(30,41,59,0.6)', font: { size: 12 } }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            color: 'rgba(30,41,59,0.6)',
            font: { size: 10 },
            callback: v => fmtVND(v)
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { display: false },
          ticks: {
            color: '#3b82f6',
            font: { size: 10 },
            callback: v => fmtNum(v) + ' đơn'
          }
        }
      }
    }
  });
  reveal(document.getElementById('card-yearly'));
}

function showYearlyTopItems(year, d) {
  const card = document.getElementById('card-yearly-items');
  const list = document.getElementById('yearly-items-list');
  document.getElementById('yearly-items-title').innerHTML = `
    <span>🛒 Top Sản Phẩm Năm ${year}</span>
    <button class="clear-sel-btn" onclick="window.clearYearlySelection(window.currentDashData)" style="background:none; border:none; color:var(--muted); font-size:18px; cursor:pointer; margin-left:8px; vertical-align:middle;" title="Bỏ chọn">✕</button>
    <button type="button" class="btn-copy-list" onclick="window.copyListProductNames('yearly-items-list', this)" title="Sao chép toàn bộ tên sản phẩm đang hiển thị" style="margin-left: auto;">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
    </button>
  `;

  if (!d || !d.mi) return;

  const itemMap = {};
  for (const ym in d.mi) {
    if (ym.startsWith(year + '-')) {
      const items = d.mi[ym];
      for (const item of items) {
        if (!itemMap[item.n]) {
          itemMap[item.n] = { n: item.n, s: 0, c: 0, op: item.op || 0, dp: item.dp || 0, cat: item.cat || '' };
        }
        itemMap[item.n].s += item.s;
        itemMap[item.n].c += (item.c || 1);
        itemMap[item.n].op = itemMap[item.n].op || item.op || 0;
        itemMap[item.n].dp = itemMap[item.n].dp || item.dp || 0;
        if (!itemMap[item.n].cat && item.cat) {
          itemMap[item.n].cat = item.cat;
        }
      }
    }
  }

  const aggregatedItems = Object.values(itemMap).sort((a, b) => b.s - a.s).slice(0, 20);

  if (aggregatedItems.length === 0) {
    list.innerHTML = `<div class="no-data">Không có dữ liệu mua sắm cho năm ${year}.</div>`;
  } else {
    const maxS = Math.max(...aggregatedItems.map(i => i.s), 1);
    list.innerHTML = aggregatedItems.map((item, idx) => {
      const rank = idx + 1;
      const pct = Math.round((item.s / maxS) * 100);
      const hasDiscount = item.op && item.dp && item.op > item.dp;
      
      // Rank Badge
      let rankClass = "rank-default";
      if (rank === 1) rankClass = "rank-1";
      else if (rank === 2) rankClass = "rank-2";
      else if (rank === 3) rankClass = "rank-3";

      // Category Tag
      const resolvedCat = (typeof resolveCategory === 'function') 
        ? resolveCategory(item.n, item.cat) 
        : (typeof resolveCatLabel === 'function' ? resolveCatLabel({ id: item.cat, name: item.cat }) : (item.cat || "🏷️ Khác"));
      const catClass = (typeof getCategoryTagClass === 'function') ? getCategoryTagClass(resolvedCat) : 'cat-tag-other';
      const catTagHtml = `<span class="item-category-tag ${catClass}">${escHtml(resolvedCat)}</span>`;

      // Discount Tag
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

      return `
        <div class="top-row in">
          <div class="top-num ${rankClass}">${rank}</div>
          <div class="top-name-wrap">
            <div class="top-name" title="${escHtml(item.n)}">${escHtml(capFirst(item.n))}</div>
            <div class="top-bar-wrap"><div class="top-bar-fill" style="width: ${pct}%"></div></div>
            <div class="top-meta">
              ${catTagHtml}
              ${discountPctHtml}
              <span>${metaText}</span>
            </div>
          </div>
          <div class="top-val">${fmtVND(item.s)}</div>
        </div>
      `;
    }).join('');
  }

  card.style.display = 'block';
  reveal(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderPeriod(ps) {
  const items = [
    { label: '1 Tháng', val: ps['1m'] || 0, months: 1 },
    { label: '3 Tháng', val: ps['3m'] || 0, months: 3 },
    { label: '6 Tháng', val: ps['6m'] || 0, months: 6 },
    { label: '1 Năm', val: ps['1y'] || 0, months: 12 }
  ];
  const maxVal = Math.max(ps['1y'] || 1, 1);
  const container = document.getElementById('period-grid');
  container.innerHTML = items.map(item => {
    const pct = Math.round((item.val / maxVal) * 100);
    const avgVal = item.val / item.months;
    const avgText = item.months > 1 
      ? `<span class="period-subtext">TB: ${fmtVND(avgVal)}/tháng</span>`
      : '';
    return `
      <div class="period-row">
        <div style="display: flex; flex-direction: column; width: 90px; flex-shrink: 0;">
          <div class="period-label" style="width: auto;">${item.label}</div>
          ${avgText}
        </div>
        <div class="period-bar-wrap">
          <div class="period-bar-fill" data-pct="${pct}" style="width: 0%"></div>
        </div>
        <div class="period-val">${fmtVND(item.val)}</div>
      </div>`;
  }).join('');

  setTimeout(() => {
    container.querySelectorAll('.period-bar-fill').forEach(bar => {
      bar.style.width = bar.getAttribute('data-pct') + '%';
    });
  }, 50);

  reveal(document.getElementById('card-period'));
}
