/* ─────────────────────────────────────────────────
   Render: Monthly view
   renderMonthly, showMonthlyItems, renderMonthlyItemsList,
   renderYearPills.
   Depends on helpers.js.
───────────────────────────────────────────────── */

let monthlyChart = null;
let currentMonthlyItems = [];
window.currentMonthlySelection = { year: String(new Date().getFullYear()), month: null };

function renderMonthly(yd, year, d) {
  window.currentMonthlySelection.year = String(year);
  window.currentMonthlySelection.month = null;
  const ydata = yd[year];
  if (!ydata) return;
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const vals = months.map(m => ydata.m[m] || 0);

  // Group order items by timestamp to calculate unique orders per month
  const orderCounts = Array(12).fill(0);
  if (d && d.ol) {
    const targetYearNum = parseInt(year, 10);
    const monthlyOrdersMap = Array.from({ length: 12 }, () => new Set());
    
    for (const o of d.ol) {
      const ts = o.ot || o.t;
      if (!ts) continue;
      const parts = toVnParts(ts);
      if (parts.year === targetYearNum && parts.month >= 1 && parts.month <= 12) {
        monthlyOrdersMap[parts.month - 1].add(ts);
      }
    }
    
    for (let i = 0; i < 12; i++) {
      orderCounts[i] = monthlyOrdersMap[i].size;
    }
  }

  document.getElementById('monthly-chart-title').textContent =
    `📅 Chi Tiêu Tháng — Năm ${year} (Click vào cột để xem sản phẩm)`;

  const miCard = document.getElementById('card-monthly-items');
  if (miCard) miCard.style.display = 'none';

  const ctx = document.getElementById('chart-monthly').getContext('2d');
  if (monthlyChart) monthlyChart.destroy();

  // Highlight peak spending month with Cam Shopee, others get blue/gray gradient
  const peakVal = Math.max(...vals, 1);
  const barColors = vals.map(v => {
    const grad = ctx.createLinearGradient(0, 0, 0, 320);
    if (v === peakVal && v > 0) {
      grad.addColorStop(0, '#ee4d2d');
      grad.addColorStop(1, '#ff8060');
    } else {
      grad.addColorStop(0, 'rgba(238, 77, 45, 0.45)');
      grad.addColorStop(1, 'rgba(238, 77, 45, 0.1)');
    }
    return grad;
  });

  monthlyChart = new Chart(ctx, {
    data: {
      labels: months.map(m => 'T' + m),
      datasets: [
        {
          label: 'Chi tiêu',
          type: 'bar',
          data: vals,
          backgroundColor: barColors,
          borderColor: '#ee4d2d',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
          yAxisID: 'y'
        },
        {
          label: 'Đơn hàng',
          type: 'line',
          data: orderCounts,
          borderColor: '#3b82f6',
          borderWidth: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2,
          pointRadius: 4.5,
          pointHoverRadius: 6,
          tension: 0.35,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const monthStr = months[index];
          if (window.currentMonthlySelection.month === monthStr) {
            window.clearMonthlySelection(d);
          } else {
            showMonthlyItems(d, year, monthStr);
            
            // Highlight clicked column and dim other columns
            const newColors = months.map((m, i) => {
              const grad = ctx.createLinearGradient(0, 0, 0, 320);
              if (i === index) {
                grad.addColorStop(0, '#ee4d2d');
                grad.addColorStop(1, '#ff8060');
              } else {
                grad.addColorStop(0, 'rgba(203, 213, 225, 0.45)');
                grad.addColorStop(1, 'rgba(148, 163, 184, 0.18)');
              }
              return grad;
            });
            monthlyChart.data.datasets[0].backgroundColor = newColors;
            monthlyChart.update();
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
            title: ctx => 'Tháng ' + ctx[0].label.replace('T', '') + '/' + year,
            label: ctx => {
              if (ctx.datasetIndex === 0) {
                return '  Chi tiêu: ' + fmtVND(ctx.parsed.y);
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
  reveal(document.getElementById('card-monthly'));
}

function showMonthlyItems(d, year, monthStr) {
  window.currentMonthlySelection = { year: String(year), month: monthStr };
  const ym = year + '-' + monthStr;
  currentMonthlyItems = (d.mi && d.mi[ym]) || [];

  document.getElementById('monthly-items-title').innerHTML = `
    <span>🏆 Top Sản Phẩm Tháng ${monthStr}/${year}</span>
    <button class="clear-sel-btn" onclick="window.clearMonthlySelection(window.currentDashData)" style="background:none; border:none; color:var(--muted); font-size:18px; cursor:pointer; margin-left:8px; vertical-align:middle;" title="Bỏ chọn">✕</button>
  `;

  const container = document.getElementById('card-monthly-items');
  container.style.display = 'block';
  reveal(container);

  renderMonthlyItemsList();
  
  if (window.computeSingleMonthInsights) {
    renderInsightCard('insight-monthly', window.computeSingleMonthInsights(d, year, monthStr));
  }
  if (window.triggerSingleMonthAIInsight) {
    window.triggerSingleMonthAIInsight(d, year, monthStr);
  }
  
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderMonthlyItemsList() {
  const list = document.getElementById('monthly-items-list');
  const limit = parseInt(document.getElementById('monthly-limit-select').value, 10) || 20;
  const items = currentMonthlyItems.slice(0, limit);

  if (items.length === 0) {
    list.innerHTML = '<div class="no-data">Không có dữ liệu sản phẩm</div>';
    return;
  }

  const maxS = Math.max(...items.map(i => i.s), 1);
  list.innerHTML = items.map((item, idx) => {
    const rank = idx + 1;
    const pct = Math.round((item.s / maxS) * 100);
    const hasDiscount = item.op && item.dp && item.op > item.dp;
    
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

    // Styled savings tag
    const savings = hasDiscount ? (item.op - item.dp) * item.c : 0;
    const savingsHtml = savings > 0 
      ? `<span class="savings-tag">💰 Tiết kiệm ${fmtVND(savings)}</span>`
      : '';
      
    const metaText = hasDiscount 
      ? `${fmtNum(item.c)} lượt · Mua: ${fmtVND(item.dp)} (Gốc: <span style="text-decoration: line-through; opacity: 0.7;">${fmtVND(item.op)}</span>)`
      : `${fmtNum(item.c)} lượt · TB: ${fmtVND(Math.round(item.s / item.c))}/món`;

    const metaRowHtml = `
      <div class="top-meta" style="gap: 8px;">
        ${catTagHtml}
        ${discountPctHtml}
        ${savingsHtml}
        <span>${metaText}</span>
      </div>`;

    return `
      <div class="top-row in${highlightClass}">
        <div class="top-num ${rankClass}">${rank}</div>
        <div class="top-name-wrap">
          <div class="top-name" title="${escHtml(item.n)}">${escHtml(capFirst(item.n))}</div>
          <div class="top-bar-wrap"><div class="top-bar-fill" style="width:${pct}%"></div></div>
          ${metaRowHtml}
        </div>
        <div class="top-val">${fmtVND(item.s)}</div>
      </div>`;
  }).join('');
}

function renderYearPills(yd, onSelect) {
  const years = Object.keys(yd).sort((a, b) => b - a);
  const container = document.getElementById('year-pills');
  container.innerHTML = years.map((y, i) =>
    `<button class="pill${i === 0 ? ' active' : ''}" data-year="${y}">Năm ${y}</button>`
  ).join('');
  container.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      onSelect(btn.getAttribute('data-year'));
    });
  });
  if (years.length) onSelect(years[0]);
}
