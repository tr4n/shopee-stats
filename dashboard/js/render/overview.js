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
      <p style="color:var(--muted); font-size: 16px; line-height: 1.6; margin-bottom: 32px;">Bạn chưa có dữ liệu nào được tải lên. Vui lòng làm theo các bước sau để lấy dữ liệu từ Shopee:</p>
      
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
      
      <a href="https://chromewebstore.google.com/detail/shopee-analytics-pro-th%E1%BB%91n/jcflofioiopfchfelgbpbndplhpfeapm" target="_blank" style="display: inline-block; background: var(--primary); color: white; padding: 14px 28px; border-radius: 30px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 14px rgba(238, 77, 45, 0.4); transition: transform 0.2s, box-shadow 0.2s;">
        Thêm vào Chrome miễn phí ✨
      </a>
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
    { label: 'Tổng Chi Tiêu', val: fmtVND(d.t), cls: 'orange', sub: `${fmtNum(d.o)} đơn hàng` },
    { label: 'Sản Phẩm Đã Mua', val: fmtNum(d.ip), cls: '', sub: 'sản phẩm' },
    { label: 'Tiết Kiệm Được', val: fmtVND(d.s), cls: 'green', sub: 'từ khuyến mãi' }
  ];

  const row = document.getElementById('kpi-row');
  row.innerHTML = kpis.map((k, i) => `
    <div class="kpi" style="transition-delay:${i * 0.08}s">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value ${k.cls}" data-target="${k.val}">${k.val}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>`).join('');
  row.querySelectorAll('.kpi').forEach(el => {
    reveal(el);
    const vEl = el.querySelector('.kpi-value');
    io.observe(el);
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
  const vals = years.map(y => yd[y].t);
  const colors = years.map(y =>
    y === String(new Date().getFullYear()) ? '#ee4d2d' : 'rgba(238,77,45,0.4)'
  );

  const ctx = document.getElementById('chart-yearly').getContext('2d');
  if (yearlyChart) yearlyChart.destroy();
  yearlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: years,
      datasets: [{
        data: vals,
        backgroundColor: colors,
        borderRadius: 8,
        borderSkipped: false
      }]
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
            const newColors = years.map((y, i) => i === index ? '#ee4d2d' : 'rgba(238,77,45,0.4)');
            yearlyChart.data.datasets[0].backgroundColor = newColors;
            yearlyChart.update();
          }
        }
      },
      plugins: {
        ...CHART_CFG.plugins,
        tooltip: {
          ...CHART_CFG.plugins.tooltip,
          callbacks: {
            title: ctx => 'Năm ' + ctx[0].label,
            label: ctx => '  ' + fmtVND(ctx.parsed.y) + 'đ  (' + fmtNum(yd[ctx.label].o) + ' đơn)'
          }
        }
      }
    }
  });
  reveal(document.getElementById('card-yearly'));
}

function showYearlyTopItems(year, d) {
  const card = document.getElementById('card-yearly-items');
  const tbody = document.querySelector('#yearly-items-table tbody');
  document.getElementById('yearly-items-title').innerHTML = `
    <span>🛒 Top Sản Phẩm Năm ${year}</span>
    <button class="clear-sel-btn" onclick="window.clearYearlySelection(window.currentDashData)" style="background:none; border:none; color:var(--muted); font-size:18px; cursor:pointer; margin-left:8px; vertical-align:middle;" title="Bỏ chọn">✕</button>
  `;

  if (!d || !d.mi) return;

  const itemMap = {};
  for (const ym in d.mi) {
    if (ym.startsWith(year + '-')) {
      const items = d.mi[ym];
      for (const item of items) {
        if (!itemMap[item.n]) itemMap[item.n] = { n: item.n, s: 0, c: 0 };
        itemMap[item.n].s += item.s;
        itemMap[item.n].c += (item.c || 1);
      }
    }
  }

  const aggregatedItems = Object.values(itemMap).sort((a, b) => b.s - a.s).slice(0, 20);

  if (aggregatedItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; padding: 20px;">Không có dữ liệu mua sắm cho năm ${year}.</td></tr>`;
  } else {
    tbody.innerHTML = aggregatedItems.map(item => `
      <tr>
        <td>
          <div style="font-weight: 600; margin-bottom: 4px;">${item.n}</div>
          <div style="font-size: 12px; color: var(--muted);">${fmtNum(item.c)} lần mua</div>
        </td>
        <td style="text-align: right; font-weight: 600;">${fmtVND(item.s)}</td>
      </tr>
    `).join('');
  }

  card.style.display = 'block';
  reveal(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderPeriod(ps) {
  const items = [
    { label: '1 Tháng', val: ps['1m'] || 0 },
    { label: '3 Tháng', val: ps['3m'] || 0 },
    { label: '6 Tháng', val: ps['6m'] || 0 },
    { label: '1 Năm', val: ps['1y'] || 0 }
  ];
  const maxVal = Math.max(ps['1y'] || 1, 1);
  const container = document.getElementById('period-grid');
  container.innerHTML = items.map(item => {
    const pct = Math.round((item.val / maxVal) * 100);
    return `
      <div class="period-row">
        <div class="period-label">${item.label}</div>
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
