/* ─────────────────────────────────────────────────
   Render: Categories view
   renderCategories, showCatItems.
   Depends on helpers.js.
───────────────────────────────────────────────── */

let catChart = null;
let currentCatData = null;

window.currentCategorySelection = null;

window.clearCategorySelection = function() {
  window.currentCategorySelection = null;
  const card = document.getElementById('card-cat-items');
  if (card) card.style.display = 'none';
  document.querySelectorAll('#cat-bars .cat-row').forEach(r => r.classList.remove('cat-row-active'));
  
  if (currentCatData) {
    renderInsightCard('insight-categories', computeCategoryInsights(currentCatData.cs, currentCatData.total));
    if (window.triggerCategoryAIInsight) {
      const cacheKey = `insight-categories-${currentCatData.year}`;
      window.triggerCategoryAIInsight(currentCatData.cs, currentCatData.ti, currentCatData.total, cacheKey, currentCatData.year);
    }
  }
  if (catChart && currentCatData && currentCatData.cs) {
    const PALETTE = [
      '#ee4d2d', '#ff7555', '#ffa07a', '#26aa99', '#5fe8cc',
      '#4a90d9', '#a855f7', '#f59e0b', '#10b981', '#ef4444',
      '#8b5cf6', '#06b6d4'
    ];
    catChart.data.datasets[0].backgroundColor = currentCatData.cs.map((c, i) => PALETTE[i % PALETTE.length]);
    catChart.update();
  }
};

function showCatItems(catName, ti) {
  const card = document.getElementById('card-cat-items');
  const title = document.getElementById('cat-items-title');
  const list = document.getElementById('cat-items-list');

  const items = (ti || []).filter(i => {
    if (i.cat === catName) return true;
    if (resolveCatLabel({ id: i.cat }) === catName) return true;
    if (resolveCatLabel({ name: i.cat }) === catName) return true;
    if (catName === 'Khác' || catName === '🏷️ Khác') {
      if (!i.cat || i.cat === 'Khác' || i.cat === '🏷️ Khác') return true;
    }
    return false;
  }).slice(0, 100);

  // Highlight selected bar
  document.querySelectorAll('.cat-row').forEach(r => {
    r.classList.toggle('cat-row-active', r.getAttribute('data-cat') === catName);
  });

  title.innerHTML = `
    <span>${escHtml(catName)} — Top Sản Phẩm</span>
    <button class="clear-sel-btn" onclick="window.clearCategorySelection()" style="background:none; border:none; color:var(--muted); font-size:18px; cursor:pointer; margin-left:8px; vertical-align:middle;" title="Bỏ chọn">✕</button>
  `;
  card.style.display = 'block';

  if (items.length === 0) {
    list.innerHTML = '<div class="no-data">Không có sản phẩm nào trong danh mục này (thử chạy lại để cập nhật dữ liệu)</div>';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  const maxS = Math.max(...items.map(i => i.s), 1);
  list.innerHTML = items.map((item, idx) => {
    const pct = Math.round((item.s / maxS) * 100);
    const hasDiscount = item.op && item.dp && item.op > item.dp;
    const metaText = hasDiscount 
      ? `${fmtNum(item.c)} lượt · Giá mua: ${fmtVND(item.dp)} (Gốc: <span style="text-decoration: line-through; opacity: 0.7;">${fmtVND(item.op)}</span>) · Tiết kiệm: <span style="color: var(--green); font-weight: 600;">${fmtVND((item.op - item.dp) * item.c)}</span>`
      : `${fmtNum(item.c)} lượt · ${fmtVND(item.s)}`;

    return `
      <div class="top-row in">
        <div class="top-num">${idx + 1}</div>
        <div class="top-name-wrap">
          <div class="top-name">${escHtml(capFirst(item.n))}</div>
          <div class="top-bar-wrap"><div class="top-bar-fill" style="width:${pct}%"></div></div>
          <div class="top-meta">${metaText}</div>
        </div>
        <div class="top-val">${fmtVND(item.s)}</div>
      </div>`;
  }).join('');

  if (currentCatData) {
    const categoryStats = currentCatData.cs.find(c => resolveCatLabel(c) === catName || c.name === catName);
    if (categoryStats && window.computeSingleCategoryInsights) {
      const catTotal = categoryStats.s;
      const catCount = categoryStats.c;
      renderInsightCard('insight-categories', window.computeSingleCategoryInsights(catName, catTotal, catCount, items, currentCatData.total));
    }
    if (window.triggerSingleCategoryAIInsight) {
      window.triggerSingleCategoryAIInsight(currentCatData.cs, currentCatData.ti, currentCatData.total, catName, currentCatData.year, currentCatData.total);
    }
  }

  if (catChart && currentCatData && currentCatData.cs) {
    const PALETTE = [
      '#ee4d2d', '#ff7555', '#ffa07a', '#26aa99', '#5fe8cc',
      '#4a90d9', '#a855f7', '#f59e0b', '#10b981', '#ef4444',
      '#8b5cf6', '#06b6d4'
    ];
    catChart.data.datasets[0].backgroundColor = currentCatData.cs.map((c, i) => {
      const name = resolveCatLabel(c);
      const baseColor = PALETTE[i % PALETTE.length];
      return name === catName ? baseColor : baseColor + '40';
    });
    catChart.update();
  }

  reveal(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderCategories(cs, ti, total, year) {
  currentCatData = { cs, ti, total: total || (window.currentDashData ? window.currentDashData.t : 0), year: year || 'all' };
  if (!cs || cs.length === 0) {
    document.getElementById('cat-bars').innerHTML =
      '<div class="no-data">Không có dữ liệu danh mục<br><small>Shopee API có thể không trả về catid cho các đơn này</small></div>';
    return;
  }

  const maxS = Math.max(...cs.map(c => c.s), 1);
  const bars = document.getElementById('cat-bars');
  bars.innerHTML = cs.map(c => {
    const name = resolveCatLabel(c);
    const pct = Math.round((c.s / maxS) * 100);
    return `
      <div class="cat-row" data-cat="${escHtml(name)}" style="cursor:pointer" title="Click để xem sản phẩm">
        <div class="cat-label">${escHtml(name)}</div>
        <div class="cat-bar-wrap"><div class="cat-bar-fill" data-pct="${pct}"></div></div>
        <div class="cat-val">${fmtVND(c.s)}</div>
      </div>`;
  }).join('');

  bars.querySelectorAll('.cat-row').forEach(row => {
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

  // Donut chart
  const PALETTE = [
    '#ee4d2d', '#ff7555', '#ffa07a', '#26aa99', '#5fe8cc',
    '#4a90d9', '#a855f7', '#f59e0b', '#10b981', '#ef4444',
    '#8b5cf6', '#06b6d4'
  ];
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
          const baseColor = PALETTE[i % PALETTE.length];
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
