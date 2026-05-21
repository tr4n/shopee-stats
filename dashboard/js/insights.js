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
  items.push({ icon: '★', text: `Năm **${maxYear}** là năm chi tiêu nhiều nhất — **${fmtVND(maxVal)}**` });

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
      items.push({ icon, text: `Năm **${lastY}** **${label} ${Math.abs(pct)}%** so với năm **${prevY}** (**${fmtVND(prev)}** → **${fmtVND(last)}**)` });
    }
  }

  // Phân tích xu hướng chi tiêu qua nhiều năm
  if (years.length >= 3) {
    let isIncreasing = true;
    let isDecreasing = true;
    for (let i = 1; i < years.length; i++) {
      const prevSpend = yd[years[i - 1]].t || 0;
      const currSpend = yd[years[i]].t || 0;
      if (currSpend <= prevSpend) isIncreasing = false;
      if (currSpend >= prevSpend) isDecreasing = false;
    }
    if (isIncreasing) {
      items.push({ icon: '📈', text: `Chi tiêu của bạn đang **tăng trưởng liên tục** qua các năm, hãy chú ý quản lý ngân sách chặt chẽ hơn.` });
    } else if (isDecreasing) {
      items.push({ icon: '📉', text: `Xu hướng chi tiêu đang **giảm dần** qua từng năm, một tín hiệu thắt chặt tài chính rất tích cực!` });
    } else {
      items.push({ icon: '↔️', text: `Mức chi tiêu **dao động không đều** qua các năm, không có xu hướng tăng/giảm rõ rệt.` });
    }
  }

  // Năm chốt đơn nhiều nhất
  let maxOrderYear = years[0], maxOrderVal = 0;
  for (const y of years) {
    const orderCount = yd[y].o || 0;
    if (orderCount > maxOrderVal) { maxOrderVal = orderCount; maxOrderYear = y; }
  }
  if (maxOrderVal > 0) {
    items.push({ icon: '🛒', text: `Năm chốt đơn nhiều nhất: **Năm ${maxOrderYear}** với **${fmtNum(maxOrderVal)} đơn hàng**.` });
  }

  // Năm có đơn hàng trung bình giá trị lớn nhất
  let maxAvgYear = years[0], maxAvgVal = 0;
  for (const y of years) {
    const orders = yd[y].o || 0;
    const spend = yd[y].t || 0;
    if (orders > 0) {
      const avg = spend / orders;
      if (avg > maxAvgVal) { maxAvgVal = avg; maxAvgYear = y; }
    }
  }
  if (maxAvgVal > 0) {
    items.push({ icon: '💎', text: `Năm **${maxAvgYear}** mua các món đồ có giá trị trung bình cao nhất: **${fmtVND(maxAvgVal)}/đơn**.` });
  }

  // Savings rate & Hunter Level
  const totalSpend = d.t || 0;
  const totalSaved = d.s || 0;
  if (totalSpend > 0 && totalSaved > 0) {
    const savePct = Math.round((totalSaved / (totalSpend + totalSaved)) * 100);
    items.push({ icon: '💰', text: `Tổng tích lũy tiết kiệm **${fmtVND(totalSaved)}** từ khuyến mãi (**${savePct}%** giá gốc).` });

    let hunterLevel = '';
    let hunterIcon = '💡';
    if (savePct >= 20) {
      hunterLevel = `Bạn thuộc nhóm **"Thợ Săn Voucher Chuyên Nghiệp"** khi giảm thiểu được đến **${savePct}%** chi phí mua hàng bằng mã giảm giá.`;
      hunterIcon = '🏆';
    } else if (savePct >= 8) {
      hunterLevel = `Tỷ lệ tiết kiệm **${savePct}%** cho thấy bạn biết tận dụng tốt các chương trình ưu đãi để tối ưu hóa ví tiền.`;
      hunterIcon = '✨';
    } else {
      hunterLevel = `Bạn ít khi săn mã giảm giá (chỉ tiết kiệm **${savePct}%**). Hãy áp thêm mã freeship/hoàn xu ở đơn sau để tiết kiệm thêm nhé.`;
      hunterIcon = '⚠️';
    }
    items.push({ icon: hunterIcon, text: hunterLevel });
  }

  // Average spend per order
  if (d.o > 0) {
    items.push({ icon: '→', text: `Trung bình mỗi đơn hàng lịch sử trị giá: **${fmtVND(Math.round(totalSpend / d.o))}**.` });
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
  items.push({ icon: '★', text: `**${MONTH_NAMES[peak.m]}** là tháng chi tiêu cao nhất — **${fmtVND(peak.v)}** (**${peakPct}%** cả năm).` });

  if (low.m !== peak.m) {
    items.push({ icon: '↓', text: `**${MONTH_NAMES[low.m]}** chi tiêu thấp nhất — **${fmtVND(low.v)}**.` });
  }

  // So sánh chênh lệch tháng đỉnh điểm với trung bình các tháng
  const avg = total / months.length;
  if (peak.v > 1.8 * avg && months.length > 1) {
    const ratio = (peak.v / avg).toFixed(1);
    items.push({ icon: '🔥', text: `Chi tiêu tháng cao điểm (**${MONTH_NAMES[peak.m]}**) gấp **${ratio} lần** mức trung bình tháng của năm.` });
  }

  // Đánh giá tần suất mua sắm trong năm
  if (months.length === 12) {
    items.push({ icon: '📅', text: `Bạn duy trì thói quen mua sắm đều đặn cả **12/12 tháng** trong năm, không bỏ lỡ tháng nào.` });
  } else if (months.length <= 3) {
    items.push({ icon: '📅', text: `Bạn chỉ tập trung mua sắm vào **${months.length} tháng** trong năm, các tháng khác hầu như không chi tiêu.` });
  }

  // Đo lường biến động (cao nhất vs thấp nhất)
  if (low.v > 0 && peak.v > 2.5 * low.v) {
    const ratio = (peak.v / low.v).toFixed(1);
    items.push({ icon: '⚡', text: `Chi tiêu giữa các tháng biến động rất lớn: tháng cao nhất gấp **${ratio} lần** tháng thấp nhất.` });
  }

  // Phát hiện chi tiêu mùa Tết (Tháng 1 & 2)
  const tetTotal = (monthData[1] || 0) + (monthData[2] || 0);
  if (tetTotal > 0 && total > 0) {
    const tetPct = Math.round((tetTotal / total) * 100);
    if (tetPct >= 20) {
      items.push({ icon: '🧧', text: `Mùa mua sắm Tết (Tháng 1 & 2) chiếm đến **${tetPct}%** tổng chi tiêu cả năm.` });
    }
  }

  // Q4 detection (Oct-Nov-Dec)
  const q4Total = [10, 11, 12].reduce((s, m) => s + (monthData[m] || 0), 0);
  if (q4Total > 0 && total > 0) {
    const q4Pct = Math.round((q4Total / total) * 100);
    if (q4Pct >= 30) {
      items.push({ icon: '↑', text: `Quý 4 (Tháng 10–12) chiếm **${q4Pct}%** chi tiêu cả năm — mùa hội mua sắm cuối năm.` });
    }
  }

  // Average per active month
  if (months.length > 1) {
    items.push({ icon: '→', text: `Trung bình **${fmtVND(Math.round(total / months.length))}/tháng** có phát sinh mua sắm (${months.length} tháng).` });
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
  items.push({ icon: '★', text: `**${top1Name}** dẫn đầu với **${fmtVND(top1.s)}** (**${top1Pct}%** tổng chi tiêu).` });

  if (sorted.length >= 2) {
    const top2 = sorted[1];
    const top2Pct = Math.round((top2.s / total) * 100);
    const top2Name = top2.name || resolveCatLabel(top2);
    const combined = top1Pct + top2Pct;
    items.push({ icon: '→', text: `**${top1Name}** + **${top2Name}** chiếm **${combined}%** tổng chi tiêu.` });
  }

  // Smallest category
  const last = sorted[sorted.length - 1];
  if (last !== top1 && last.s > 0) {
    const lastName = last.name || resolveCatLabel(last);
    const lastPct = Math.round((last.s / total) * 100);
    items.push({ icon: '↓', text: `Danh mục ít nhất: **${lastName}** — **${fmtVND(last.s)}** (**${lastPct}%**).` });
  }

  // Count of items per category
  const topByCount = [...cs].sort((a, b) => b.c - a.c)[0];
  if (topByCount && topByCount.c > 0) {
    const topCountName = topByCount.name || resolveCatLabel(topByCount);
    items.push({ icon: '→', text: `Mua nhiều lượt nhất: **${topCountName}** — **${fmtNum(topByCount.c)} lượt**.` });
  }

  // Đánh giá độ đa dạng danh mục chi tiêu
  const activeCats = sorted.filter(c => c.s > 0).length;
  if (activeCats >= 8) {
    items.push({ icon: '🛍️', text: `Nhu cầu mua sắm cực kỳ đa dạng khi bạn chi tiền trên **${activeCats} danh mục** khác nhau.` });
  } else if (activeCats > 0 && activeCats <= 3) {
    items.push({ icon: '🎯', text: `Chi tiêu của bạn rất tập trung, chỉ phát sinh giao dịch trên **${activeCats} danh mục** chính.` });
  }

  // Danh mục có đơn giá sản phẩm cao nhất
  let highCat = null, maxAvgPrice = 0;
  for (const c of cs) {
    if (c.c > 0) {
      const avgP = c.s / c.c;
      if (avgP > maxAvgPrice) {
        maxAvgPrice = avgP;
        highCat = c;
      }
    }
  }
  if (highCat) {
    const highCatName = highCat.name || resolveCatLabel(highCat);
    items.push({ icon: '💎', text: `Danh mục có giá trị trung bình mỗi món cao nhất: **${highCatName}** với **${fmtVND(maxAvgPrice)}/món**.` });
  }

  // Danh mục chứa nhiều đơn hàng nhỏ lẻ (bẫy đồ lặt vặt)
  let microCat = null;
  for (const c of cs) {
    const catName = c.name || resolveCatLabel(c);
    if (catName.includes('Khác') || catName.includes('khác')) continue;
    if (c.c >= 5 && (c.s / c.c) < 80000) {
      if (!microCat || c.c > microCat.c) {
        microCat = c;
      }
    }
  }
  if (microCat) {
    const microCatName = microCat.name || resolveCatLabel(microCat);
    const microAvg = Math.round(microCat.s / microCat.c);
    items.push({ icon: '🛒', text: `Danh mục **${microCatName}** chứa nhiều giao dịch nhỏ lẻ (**${microCat.c} lượt**, trung bình **${fmtVND(microAvg)}/món**), dễ tích lũy thành khoản tiền lớn.` });
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
    items.push({ icon: '★', text: `Chi nhiều nhất: **"${topSpend.n}"** — **${fmtVND(topSpend.s)}** (**${pct}%** tổng chi tiêu).` });
  }

  // Top by count
  const topCount = [...ti].sort((a, b) => b.c - a.c)[0];
  if (topCount && topCount.c > 1) {
    items.push({ icon: '→', text: `Mua nhiều lần nhất: **"${topCount.n}"** — **${fmtNum(topCount.c)} lần**.` });
  }

  // Top 5 concentration
  const top5 = [...ti].sort((a, b) => b.s - a.s).slice(0, 5);
  const top5Sum = top5.reduce((s, i) => s + i.s, 0);
  if (top5Sum > 0 && top5.length === 5) {
    const pct = Math.round((top5Sum / total) * 100);
    items.push({ icon: '↑', text: `Top 5 sản phẩm chiếm **${pct}%** tổng chi tiêu.` });
  }

  // Số lượng sản phẩm mua lặp lại nhiều lần
  const repeatedCount = ti.filter(i => i.c >= 3).length;
  if (repeatedCount > 0) {
    items.push({ icon: '🔄', text: `Có **${repeatedCount} sản phẩm** được bạn mua lặp lại từ 3 lần trở lên.` });
  }

  // Sản phẩm giá trị cao (tổng tích lũy sản phẩm trên 1M)
  const highValItems = ti.filter(i => i.s >= 1000000).length;
  if (highValItems > 0) {
    items.push({ icon: '💎', text: `Có **${highValItems} mặt hàng** bạn đã chi tổng cộng trên 1 triệu VNĐ.` });
  }

  // Thói quen mua đồ nhỏ lẻ lặp lại
  const cheapRepeatItem = [...ti]
    .filter(i => i.c >= 3 && (i.s / i.c) < 50000)
    .sort((a, b) => b.c - a.c)[0];
  if (cheapRepeatItem) {
    items.push({ icon: '🛍️', text: `Sản phẩm giá rẻ (< 50k) chốt đơn nhiều lần: **"${cheapRepeatItem.n}"** (**${cheapRepeatItem.c} lần**), hãy gom mua combo để tối ưu ship.` });
  }

  // Unique products count
  items.push({ icon: '→', text: `Tổng cộng có **${fmtNum(ti.length)}** sản phẩm khác nhau đã mua.` });

  return items;
}

function renderInsightCard(id, insightItems) {
  const card = document.getElementById(id);
  const list = document.getElementById(id + '-list');

  if (!card || !list || !insightItems || !insightItems.length) return;

  list.innerHTML = insightItems.map(item =>
    `<li><span class="ins-icon">${item.icon}</span><span>${parseBold(item.text)}</span></li>`
  ).join('');
  card.style.display = '';
  reveal(card);
}
