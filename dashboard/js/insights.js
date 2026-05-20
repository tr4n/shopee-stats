/* ─────────────────────────────────────────────────
   Insight Engine — Rule-based analysis functions
   and insight card renderer. Depends on helpers.js.
───────────────────────────────────────────────── */

function computeYearlyInsights(yd, d) {
  const items = [];
  const years = Object.keys(yd || {}).map(Number).sort((a, b) => a - b);
  if (!years.length) return items;

  // Year with highest spend
  let maxYear = years[0], maxVal = 0;
  for (const y of years) {
    if ((yd[y].t || 0) > maxVal) { maxVal = yd[y].t; maxYear = y; }
  }
  items.push({ icon: '★', text: `Năm ${maxYear} là năm chi tiêu nhiều nhất — ${fmtVND(maxVal)}` });

  // YoY change for latest 2 years
  if (years.length >= 2) {
    const lastY = years[years.length - 1];
    const prevY = years[years.length - 2];
    const last = yd[lastY].t || 0;
    const prev = yd[prevY].t || 0;
    if (prev > 0) {
      const pct = Math.round(((last - prev) / prev) * 100);
      const icon = pct >= 0 ? '↑' : '↓';
      const label = pct >= 0 ? 'tăng' : 'giảm';
      items.push({ icon, text: `Năm ${lastY} ${label} ${Math.abs(pct)}% so với năm ${prevY} (${fmtVND(prev)} → ${fmtVND(last)})` });
    }
  }

  // Savings rate
  const totalSpend = d.t || 0;
  const totalSaved = d.s || 0;
  if (totalSpend > 0 && totalSaved > 0) {
    const savePct = Math.round((totalSaved / (totalSpend + totalSaved)) * 100);
    items.push({ icon: '→', text: `Tiết kiệm được ${fmtVND(totalSaved)} từ khuyến mãi (${savePct}% giá gốc)` });
  }

  // Average spend per order
  if (d.o > 0) {
    items.push({ icon: '→', text: `Trung bình mỗi đơn hàng: ${fmtVND(Math.round(totalSpend / d.o))}` });
  }

  return items;
}

function computeMonthlyInsights(yd, year) {
  const items = [];
  const monthData = (yd || {})[year]?.m || {};
  const months = Object.entries(monthData)
    .map(([m, v]) => ({ m: parseInt(m, 10), v }))
    .filter(x => x.v > 0)
    .sort((a, b) => a.m - b.m);
  if (!months.length) return items;

  const total = months.reduce((s, x) => s + x.v, 0);
  const peak = months.reduce((a, b) => a.v >= b.v ? a : b);
  const low = months.reduce((a, b) => a.v <= b.v ? a : b);

  const MONTH_NAMES = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  const peakPct = Math.round((peak.v / total) * 100);
  items.push({ icon: '★', text: `${MONTH_NAMES[peak.m]} là tháng chi tiêu cao nhất — ${fmtVND(peak.v)} (${peakPct}% cả năm)` });

  if (low.m !== peak.m) {
    items.push({ icon: '↓', text: `${MONTH_NAMES[low.m]} chi tiêu thấp nhất — ${fmtVND(low.v)}` });
  }

  // Q4 detection (Oct-Nov-Dec)
  const q4Total = [10, 11, 12].reduce((s, m) => s + (monthData[m] || 0), 0);
  if (q4Total > 0 && total > 0) {
    const q4Pct = Math.round((q4Total / total) * 100);
    if (q4Pct >= 30) {
      items.push({ icon: '↑', text: `Quý 4 (Tháng 10–12) chiếm ${q4Pct}% chi tiêu cả năm — mùa mua sắm cuối năm` });
    }
  }

  // Average per active month
  if (months.length > 1) {
    items.push({ icon: '→', text: `Trung bình ${fmtVND(Math.round(total / months.length))} / tháng có mua sắm (${months.length} tháng)` });
  }

  return items;
}

function computeCategoryInsights(cs, totalSpend) {
  const items = [];
  if (!cs || !cs.length) return items;

  const sorted = [...cs].sort((a, b) => b.s - a.s);
  const total = sorted.reduce((s, c) => s + c.s, 0) || totalSpend || 1;

  const top1 = sorted[0];
  const top1Pct = Math.round((top1.s / total) * 100);
  const top1Name = top1.name || resolveCatLabel(top1);
  items.push({ icon: '★', text: `${top1Name} dẫn đầu với ${fmtVND(top1.s)} (${top1Pct}% tổng chi tiêu)` });

  if (sorted.length >= 2) {
    const top2 = sorted[1];
    const top2Pct = Math.round((top2.s / total) * 100);
    const top2Name = top2.name || resolveCatLabel(top2);
    const combined = top1Pct + top2Pct;
    items.push({ icon: '→', text: `${top1Name} + ${top2Name} chiếm ${combined}% tổng chi tiêu` });
  }

  // Smallest category
  const last = sorted[sorted.length - 1];
  if (last !== top1 && last.s > 0) {
    const lastName = last.name || resolveCatLabel(last);
    const lastPct = Math.round((last.s / total) * 100);
    items.push({ icon: '↓', text: `Danh mục ít nhất: ${lastName} — ${fmtVND(last.s)} (${lastPct}%)` });
  }

  // Count of items per category
  const topByCount = [...cs].sort((a, b) => b.c - a.c)[0];
  if (topByCount && topByCount.c > 0) {
    const topCountName = topByCount.name || resolveCatLabel(topByCount);
    items.push({ icon: '→', text: `Mua nhiều lượt nhất: ${topCountName} — ${fmtNum(topByCount.c)} lượt` });
  }

  return items;
}

function computeItemInsights(ti, totalSpend) {
  const items = [];
  if (!ti || !ti.length) return items;

  const total = totalSpend || ti.reduce((s, i) => s + i.s, 0) || 1;

  // Top by spend
  const topSpend = [...ti].sort((a, b) => b.s - a.s)[0];
  if (topSpend) {
    const pct = Math.round((topSpend.s / total) * 100);
    items.push({ icon: '★', text: `Chi nhiều nhất: "${topSpend.n}" — ${fmtVND(topSpend.s)} (${pct}% tổng)` });
  }

  // Top by count
  const topCount = [...ti].sort((a, b) => b.c - a.c)[0];
  if (topCount && topCount.c > 1) {
    items.push({ icon: '→', text: `Mua nhiều lần nhất: "${topCount.n}" — ${fmtNum(topCount.c)} lần` });
  }

  // Top 5 concentration
  const top5 = [...ti].sort((a, b) => b.s - a.s).slice(0, 5);
  const top5Sum = top5.reduce((s, i) => s + i.s, 0);
  if (top5Sum > 0 && top5.length === 5) {
    const pct = Math.round((top5Sum / total) * 100);
    items.push({ icon: '↑', text: `Top 5 sản phẩm chiếm ${pct}% tổng chi tiêu` });
  }

  // Unique products count
  items.push({ icon: '→', text: `${fmtNum(ti.length)} sản phẩm khác nhau đã mua` });

  return items;
}

function renderInsightCard(id, insightItems) {
  const card = document.getElementById(id);
  const list = document.getElementById(id + '-list');

  console.log(`[Dashboard] renderInsightCard('${id}')`, {
    card: !!card,
    list: !!list,
    itemCount: insightItems?.length || 0,
    items: insightItems?.slice(0, 2) || []
  });

  if (!card || !list || !insightItems || !insightItems.length) return;

  list.innerHTML = insightItems.map(item =>
    `<li><span class="ins-icon">${item.icon}</span><span>${escHtml(item.text)}</span></li>`
  ).join('');
  card.style.display = '';
  reveal(card);

  console.log(`[Dashboard] ✅ Insight card '${id}' rendered with ${insightItems.length} items`);
}
