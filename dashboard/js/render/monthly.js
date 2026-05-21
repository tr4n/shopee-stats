/* ─────────────────────────────────────────────────
   Render: Monthly view
   renderMonthly, showMonthlyItems, renderMonthlyItemsList,
   renderYearPills.
   Depends on helpers.js.
───────────────────────────────────────────────── */

let monthlyChart = null;
let currentMonthlyItems = [];
let currentMonthlySelection = { year: String(new Date().getFullYear()), month: null };

function renderMonthly(yd, year, d) {
  currentMonthlySelection.year = String(year);
  currentMonthlySelection.month = null;
  const ydata = yd[year];
  if (!ydata) return;
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const vals = months.map(m => ydata.m[m] || 0);

  document.getElementById('monthly-chart-title').textContent =
    `📅 Chi Tiêu Tháng — Năm ${year} (Click vào cột để xem sản phẩm)`;

  const miCard = document.getElementById('card-monthly-items');
  if (miCard) miCard.style.display = 'none';

  const ctx = document.getElementById('chart-monthly').getContext('2d');
  if (monthlyChart) monthlyChart.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, 'rgba(238,77,45,0.4)');
  gradient.addColorStop(1, 'rgba(238,77,45,0.02)');

  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(m => 'T' + m),
      datasets: [{
        data: vals,
        backgroundColor: gradient,
        borderColor: '#ee4d2d',
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      ...CHART_CFG,
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const monthStr = months[index];
          showMonthlyItems(d, year, monthStr);
        }
      }
    }
  });
  reveal(document.getElementById('card-monthly'));
}

function showMonthlyItems(d, year, monthStr) {
  currentMonthlySelection = { year: String(year), month: monthStr };
  const ym = year + '-' + monthStr;
  currentMonthlyItems = (d.mi && d.mi[ym]) || [];

  document.getElementById('monthly-items-title').textContent =
    `🏆 Top Sản Phẩm Tháng ${monthStr}/${year}`;

  const container = document.getElementById('card-monthly-items');
  container.style.display = 'block';
  reveal(container);

  renderMonthlyItemsList();
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
    const pct = Math.round((item.s / maxS) * 100);
    return `
      <div class="top-row in">
        <div class="top-num">${idx + 1}</div>
        <div class="top-name-wrap">
          <div class="top-name">${escHtml(capFirst(item.n))}</div>
          <div class="top-bar-wrap"><div class="top-bar-fill" style="width:${pct}%"></div></div>
          <div class="top-meta">${fmtNum(item.c)} lượt · ${fmtVND(item.s)}</div>
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
