/* ─────────────────────────────────────────────────
   Main — boot, navigation, share modal, init pipeline.
   Depends on all other js/* files. Must be loaded last.
───────────────────────────────────────────────── */

/* ── Author info ─────────────────────────────── */
const authorInfoEl = document.getElementById('dashboard-author-info');
if (authorInfoEl && window.APP_CONFIG) {
  authorInfoEl.innerHTML = `${window.APP_CONFIG.authorIcon} <a href="${window.APP_CONFIG.authorLink}" target="_blank" style="color: var(--primary); text-decoration: none;">${window.APP_CONFIG.authorText}</a>`;
}

/* ── Navigation ──────────────────────────────── */
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-item');

function switchView(name) {
  views.forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  navBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === name));
}

navBtns.forEach(btn => btn.addEventListener('click', () => switchView(btn.getAttribute('data-view'))));

/* ── Parse data from URL hash ────────────────── */
function parseData() {
  try {
    const match = location.hash.match(/[#&]d=([^&]+)/);
    if (!match) return null;
    return JSON.parse(decodeURIComponent(escape(atob(match[1]))));
  } catch { return null; }
}

/* ── Share Modal ─────────────────────────────── */
function setupShareButtons(d) {
  const modal = document.getElementById('share-modal');
  const previewImg = document.getElementById('share-preview-img');
  const themeSelect = document.getElementById('share-theme-select');
  const hideAmountCb = document.getElementById('share-hide-amount');
  const hideNamesCb = document.getElementById('share-hide-names');
  const btnCopy = document.getElementById('btn-modal-copy');
  const btnDownload = document.getElementById('btn-modal-download');

  let currentOptions = { cardType: 'overview' };
  let currentDataUrl = '';

  const getBeat = (t) => {
    if (t <= 1000000) return 10;
    if (t <= 3000000) return 25;
    if (t <= 8000000) return 45;
    if (t <= 20000000) return 65;
    if (t <= 50000000) return 82;
    if (t <= 100000000) return 93;
    return 99;
  };

  async function updatePreview() {
    if (!window.generateDashboardShareCard) return;
    const curYear = new Date().getFullYear();
    const yearlySpend = (d.yd && d.yd[curYear]) ? d.yd[curYear].t : d.t;
    const opts = {
      ...currentOptions,
      theme: themeSelect.value,
      hideAmount: hideAmountCb.checked,
      hideNames: hideNamesCb.checked,
      beat: getBeat(yearlySpend),
      year: currentOptions.year || curYear
    };
    previewImg.style.opacity = '0.5';
    try {
      currentDataUrl = await window.generateDashboardShareCard(d, opts);
      previewImg.src = currentDataUrl;
    } catch (e) { console.error(e); }
    previewImg.style.opacity = '1';
  }

  function openModal(cardType, extraOpts = {}) {
    currentOptions = { cardType, ...extraOpts };
    modal.classList.add('active');
    updatePreview();
  }

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  themeSelect.addEventListener('change', updatePreview);
  hideAmountCb.addEventListener('change', updatePreview);
  hideNamesCb.addEventListener('change', updatePreview);

  document.querySelectorAll('.btn-share-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      if (type === 'monthly') {
        const selYear = currentMonthlySelection.year;
        let selMonth = currentMonthlySelection.month;
        if (!selMonth && d.yd && d.yd[selYear] && d.yd[selYear].m) {
          const topMonth = Object.entries(d.yd[selYear].m).sort((a, b) => b[1] - a[1])[0];
          selMonth = topMonth ? topMonth[0] : null;
        }
        openModal(type, { month: selMonth, year: selYear });
      } else {
        openModal(type);
      }
    });
  });

  btnDownload.addEventListener('click', () => {
    if (!currentDataUrl) return;
    const link = document.createElement('a');
    link.href = currentDataUrl;
    link.download = `shopee-analytics-${currentOptions.cardType}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  btnCopy.addEventListener('click', async () => {
    if (!currentDataUrl) return;
    const orig = btnCopy.innerHTML;
    btnCopy.innerHTML = 'Đang copy...';
    try {
      const res = await fetch(currentDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      btnCopy.innerHTML = '✓ Đã copy!';
    } catch (err) {
      console.error(err);
      btnCopy.innerHTML = '❌ Lỗi';
    } finally {
      setTimeout(() => { btnCopy.innerHTML = orig; }, 2000);
    }
  });
}

/* ── Boot ────────────────────────────────────── */
const d = parseData();
console.log('[Dashboard] Parsed data:', {
  hasData: !!d,
  totalSpend: d?.t,
  topItemsCount: (d?.ti || []).length,
  categoriesCount: (d?.cs || []).length
});

if (!d || !d.t) {
  console.warn('[Dashboard] No data or invalid data, showing no-data view');
  renderNoData();
} else {
  _dashCache = loadDashCache(d.ts);
  console.log(`[Dashboard] Cache ${Object.keys(_dashCache.cats).length} categories, ${Object.keys(_dashCache.insights).length} insights`);

  let _categorizationFinished = false;
  let _activeYear = null;
  let _activeCatYear = 'all';

  function triggerMonthlyAIInsight(d, yr) {
    const yearData = d.yd[yr] || {};
    const avgPerOrder = Math.round((yearData.t || 0) / Math.max(yearData.o || 1, 1));
    const monthEntries = Object.entries(yearData.m || {})
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .filter(([, v]) => v > 0);
    const monthBreakdown = monthEntries.map(([m, v]) => `T${m}:${fmtVND(v)}`).join(', ');
    const activeMonths = monthEntries.length;
    const avgPerMonth = activeMonths > 0 ? Math.round((yearData.t || 0) / activeMonths) : 0;

    let peakMonthItems = '';
    if (monthEntries.length > 0) {
      const peakEntry = monthEntries.reduce((a, b) => a[1] >= b[1] ? a : b);
      const peakKey = `${yr}-${peakEntry[0]}`;
      const peakItems = (d.mi || {})[peakKey] || [];
      if (peakItems.length > 0) {
        peakMonthItems = `Sản phẩm mua trong tháng ${peakEntry[0]}: ${peakItems.slice(0, 5).map(i => `"${i.n}" ${fmtVND(i.s)}`).join(', ')}.`;
      }
    }

    const currentYear = new Date().getFullYear();
    const yearNum = Number(yr);
    const yearDiff = currentYear - yearNum;
    const isCurrentYear = yearDiff === 0;
    const isLastYear = yearDiff === 1;

    const lastActiveMonth = monthEntries.length > 0
      ? Number(monthEntries[monthEntries.length - 1][0])
      : null;
    const currentMonth = new Date().getMonth() + 1;

    const contextLines = [
      `Năm ${yr}: tổng ${fmtVND(yearData.t || 0)} / ${fmtNum(yearData.o || 0)} đơn / trung bình ${fmtVND(avgPerOrder)}/đơn.`,
      `Chi theo tháng: ${monthBreakdown || 'không có dữ liệu'}.`,
      `Trung bình ${fmtVND(avgPerMonth)}/tháng (${activeMonths} tháng có mua sắm).`,
      peakMonthItems
    ];

    if (isCurrentYear) {
      const recent1m = fmtVND(d.ps?.['1m'] || 0);
      const recent3m = fmtVND(d.ps?.['3m'] || 0);
      contextLines.push(`Gần đây: 1 tháng qua ${recent1m}, 3 tháng qua ${recent3m}.`);
      if (lastActiveMonth) {
        contextLines.push(`Tháng hiện tại: tháng ${currentMonth}/${currentYear}. Tháng gần nhất có dữ liệu: tháng ${lastActiveMonth}.`);
      }
    } else {
      contextLines.push(`Lưu ý: Đây là dữ liệu của năm ${yr}, cách đây ${yearDiff} năm (năm hiện tại là ${currentYear}).`);
      if (lastActiveMonth) {
        contextLines.push(`Tháng cuối cùng có dữ liệu trong năm ${yr}: tháng ${lastActiveMonth}.`);
      }
    }

    let specificPrompt;
    if (isCurrentYear) {
      specificPrompt = `This is the spend data for THIS current year (${yr}):
1. Identify the exact month with the highest total spend. Based on the monthly total and order count, analyze whether they went broke due to purchasing 1-2 high-value items (like tech gadgets) or due to an addiction to ordering dozens of micro-items. Name 1 representative product bought in that month.
2. Propose advice on setting a specific budget limit for months with similar characteristics (such as mega-sale months, birthday months) to avoid repeating this mistake.
Requirements: Output in VIETNAMESE. Structure into 2 paragraphs: Paragraph 1 analyzes the peak month, Paragraph 2 gives budget limits advice. Use **bold** for the month name, product name, and budget numbers.`;
    } else if (isLastYear) {
      specificPrompt = `This is the spend data for LAST year (${yr}):
1. Identify the exact month with the highest total spend. Analyze if the high spend was due to high-value purchases or ordering dozens of micro-items. Name 1 representative product from that month.
2. Draw a concrete lesson for this year (${currentYear})—are there seasonal/holiday shopping habits where they should set budget limits in advance?
Requirements: Output in VIETNAMESE. Structure into 2 paragraphs. Use **bold** for the month name, product name, and main advice.`;
    } else {
      specificPrompt = `This is the spend data from ${yearDiff} years ago (${yr}):
1. Identify the month with the highest spend, and analyze the root cause (major purchase vs. micro-orders). Name 1 representative product.
2. Reflect on the seasonal patterns in their shopping behavior back then, and suggest whether this habit might be repeating in recent years.
Requirements: Output in VIETNAMESE. Write in 2 clear paragraphs. Use **bold** for the month name and important observations.`;
    }

    enrichWithAI('insight-monthly',
      contextLines.filter(Boolean).join(' '),
      specificPrompt,
      `insight-monthly-${yr}`
    );
  }

  function getItemsForYear(mi, year) {
    const prefix = year + '-';
    const map = {};
    for (const key of Object.keys(mi || {})) {
      if (!key.startsWith(prefix)) continue;
      for (const item of (mi[key] || [])) {
        const k = item.n.toLowerCase().substring(0, 120);
        if (!map[k]) {
          map[k] = { n: item.n, s: 0, c: 0 };
          if (_dashCache.cats[k]) map[k].cat = _dashCache.cats[k];
        }
        map[k].s += item.s || 0;
        map[k].c += item.c || 0;
      }
    }
    return Object.values(map).sort((a, b) => b.s - a.s);
  }

  function triggerCategoryAIInsight(cs, ti, total, cacheKey) {
    const filteredCs = (cs || []).filter(c => c.name !== '🏷️ Khác' && c.name !== 'Khác');
    if (!filteredCs.length) return;
    const catLines = filteredCs.map(c => {
      const pct = Math.round((c.s / Math.max(total || 1, 1)) * 100);
      const catItems = (ti || []).filter(i => i.cat === c.name).slice(0, 2);
      const catItemStr = catItems.length > 0 ? ` (vd: ${catItems.map(i => `"${i.n}"`).join(', ')})` : '';
      return `${c.name}: ${fmtVND(c.s)} (${pct}%, ${c.c} lượt)${catItemStr}`;
    }).join('; ');
    enrichWithAI('insight-categories',
      `Phân bổ chi tiêu theo danh mục: ${catLines}.`,
      `Ignore the category '🏷️ Khác' entirely:
1. Find the category with the highest percentage (%) of total spend and label it as the 'spending trap'.
2. You MUST cite the exact names of 2 specific products purchased under this category as evidence of overspending.
3. Based on the nature of these 2 products (essential need vs. impulse buy for fun), suggest a financial brake rule (e.g., the 24-hour waiting rule before checking out).
Requirements: Output in VIETNAMESE. Format into 2 paragraphs: Paragraph 1 identifies the spending trap with product evidence, Paragraph 2 proposes the financial brake rule. Use **bold** for category names, product names, and rule names.`,
      cacheKey
    );
  }

  function switchCategoryYear(year, d, tiItems) {
    _activeCatYear = year;

    let cs, ti, total;
    if (year === 'all') {
      cs = d.cs;
      ti = tiItems;
      total = d.t;
      const sub = document.getElementById('cat-subtitle');
      if (sub) sub.textContent = 'Phân bổ chi tiêu theo từng danh mục Shopee';
    } else {
      ti = getItemsForYear(d.mi, year);
      for (const item of ti) {
        if (!item.cat) item.cat = '🏷️ Khác';
      }
      cs = buildCsFromTi(ti);
      total = (d.yd[year] || {}).t || 0;
      const sub = document.getElementById('cat-subtitle');
      if (sub) sub.textContent = `Danh mục năm ${year} · dữ liệu top 20 sản phẩm/tháng`;
    }

    document.getElementById('card-cat-items').style.display = 'none';
    document.querySelectorAll('#cat-bars .cat-row').forEach(r => r.classList.remove('cat-row-active'));

    renderCategories(cs, ti);
    renderInsightCard('insight-categories', computeCategoryInsights(cs, total));

    if (_categorizationFinished) {
      const key = year === 'all' ? 'insight-categories-all' : `insight-categories-${year}`;
      triggerCategoryAIInsight(cs, ti, total, key);
    }
  }

  function renderCatYearPills(d, tiItems) {
    const years = Object.keys(d.yd || {}).sort((a, b) => b - a);
    if (!years.length) return;
    const container = document.getElementById('cat-year-pills');
    if (!container) return;
    const allPills = ['all', ...years];
    container.innerHTML = allPills.map((y, i) =>
      `<button class="pill${i === 0 ? ' active' : ''}" data-catyear="${y}">${y === 'all' ? 'Tất cả' : 'Năm ' + y}</button>`
    ).join('');
    container.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        switchCategoryYear(btn.getAttribute('data-catyear'), d, tiItems);
      });
    });
  }

  function runAIInsightsNarrative(d) {
    console.log('[Dashboard] Starting AI insights narrative...');
    const years = Object.keys(d.yd || {}).map(Number).sort((a, b) => b - a);
    const curYear = years[0];
    const prevYear = years[1];
    const avgOrderValue = Math.round((d.t || 0) / Math.max(d.o || 1, 1));
    const savingsRate = Math.round(((d.s || 0) / Math.max((d.t || 0) + (d.s || 0), 1)) * 100);

    let yoyLine = '';
    if (curYear && prevYear && d.yd[prevYear]?.t > 0) {
      const pct = Math.round(((d.yd[curYear].t - d.yd[prevYear].t) / d.yd[prevYear].t) * 100);
      yoyLine = `Năm ${curYear} ${pct >= 0 ? 'tăng' : 'giảm'} ${Math.abs(pct)}% so với năm ${prevYear}.`;
    }

    // 1. Yearly overview AI insight
    const yearSummaryLines = Object.entries(d.yd || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([yr, yd]) => {
        const saved = Math.round(Math.max(0, (yd.s || 0)));
        const total = yd.t || 0;
        const saveRatePct = total > 0 ? Math.round((saved / (total + saved)) * 100) : 0;
        return `Năm ${yr}: chi ${fmtVND(total)} / ${fmtNum(yd.o || 0)} đơn / tiết kiệm ${fmtVND(saved)} (${saveRatePct}% giá gốc)`;
      });
    enrichWithAI('insight-yearly',
      [
        `Tổng chi: ${fmtVND(d.t)} / ${fmtNum(d.o)} đơn / trung bình ${fmtVND(avgOrderValue)}/đơn.`,
        `Tiết kiệm voucher toàn lịch sử: ${fmtVND(d.s)} (${savingsRate}% giá gốc).`,
        `Lịch sử từng năm: ${yearSummaryLines.join('; ')}.`,
        yoyLine
      ].filter(Boolean).join(' '),
      `Based on the total spend, order count, and voucher savings data:
1. Compare the year with the highest spend against the other historical years.
2. Evaluate the purchasing efficiency: if the order count is extremely high but total savings (from vouchers) is a tiny fraction of the total spend, criticize the habit of buying minor items frequently without utilizing discount codes.
3. Propose a specific order bundling rule to increase the savings rate for the upcoming year.
Requirements: Output in VIETNAMESE. Write in distinct paragraphs. Use **bold** for key numbers and major remarks.`
    );

    // 2. Items AI insight
    const top10 = (d.ti || []).slice(0, 10);
    const top5sum = top10.slice(0, 5).reduce((s, i) => s + i.s, 0);
    const concentration = Math.round((top5sum / Math.max(d.t || 1, 1)) * 100);
    const itemLines = top10.map(i => {
      const avgP = i.c > 0 ? Math.round(i.s / i.c) : i.s;
      return `"${i.n}": tổng ${fmtVND(i.s)}, ${i.c} lần mua (~${fmtVND(avgP)}/lần)`;
    }).join('; ');
    const mostRepeat = [...top10].sort((a, b) => b.c - a.c)[0];
    const repeatNote = mostRepeat && mostRepeat.c > 2
      ? `Mua lặp nhiều nhất: "${mostRepeat.n}" (${mostRepeat.c} lần).`
      : '';
    enrichWithAI('insight-items',
      [
        `Danh sách sản phẩm đã mua: ${itemLines}.`,
        `Top 5 chiếm ${concentration}% tổng chi.`,
        repeatNote
      ].filter(Boolean).join(' '),
      `Scan the top spend products list:
1. Explicitly name the product with the highest total spend. Evaluate whether this was a worthy investment or an impulsive purchase.
2. Identify the product with the highest repeat purchase count. Satirize the habit of buying this item in separate small orders. Instruct them to switch to buying in combos/bulk or choosing a larger volume/capacity to optimize the average cost per purchase.
Requirements: Output in VIETNAMESE. Structure the analysis into 2 separate paragraphs. Use **bold** for product names and key numbers.`
    );

    // 3. Categories AI insight — only for 'all' view; year-specific handled by switchCategoryYear
    if (_activeCatYear === 'all') {
      triggerCategoryAIInsight(d.cs, d.ti, d.t, 'insight-categories-all');
    }

    // 4. Monthly insight for current active year
    if (_activeYear) {
      triggerMonthlyAIInsight(d, _activeYear);
    }
  }

  async function initDashboard() {
    const tiItems = d.ti || [];

    // 1. Apply cached AI overrides from previous sessions
    for (const item of tiItems) {
      if (item.cat) continue;
      const key = item.n.toLowerCase().substring(0, 120);
      if (_dashCache.cats[key]) item.cat = _dashCache.cats[key];
    }

    // 2. Initialize with default category for unclassified items
    for (const item of tiItems) {
      if (!item.cat) item.cat = '🏷️ Khác';
    }

    // 3. Build initial catStats from classified ti
    d.cs = buildCsFromTi(tiItems);

    // 4. Render layout synchronously so UI appears instantly
    document.title = `Dashboard — ${fmtVND(d.t)} · Shopee Analytics`;
    document.getElementById('data-date').textContent = fmtDate(d.ts);
    document.getElementById('subtitle-overview').textContent =
      `${fmtVND(d.t)} tổng chi tiêu · ${fmtNum(d.o)} đơn hàng`;

    renderKpi(d);
    renderYearlyChart(d.yd || {}, d);
    renderPeriod(d.ps || {});

    renderYearPills(d.yd || {}, yr => {
      _activeYear = yr;
      renderMonthly(d.yd, yr, d);
      const monthlyItems = computeMonthlyInsights(d.yd, yr);
      renderInsightCard('insight-monthly', monthlyItems);

      if (_categorizationFinished) {
        triggerMonthlyAIInsight(d, yr);
      }
    });

    renderTopItems(tiItems);
    renderCategories(d.cs, tiItems);
    renderCatYearPills(d, tiItems);

    // Render static insight cards
    renderInsightCard('insight-yearly', computeYearlyInsights(d.yd || {}, d));
    renderInsightCard('insight-items', computeItemInsights(tiItems, d.t));
    renderInsightCard('insight-categories', computeCategoryInsights(d.cs, d.t));

    // Render monthly insight for default year
    const defaultYears = Object.keys(d.yd || {}).map(Number).sort((a, b) => b - a);
    if (defaultYears.length) {
      renderInsightCard('insight-monthly', computeMonthlyInsights(d.yd, defaultYears[0]));
    }

    // Add listeners for limits
    document.getElementById('items-limit-select')?.addEventListener('change', renderTopItemsList);
    document.getElementById('monthly-limit-select')?.addEventListener('change', renderMonthlyItemsList);

    setupShareButtons(d);

    // 5. Run async keyword classification (background)
    try {
      let hasUpdates = false;
      for (const item of tiItems) {
        if (item.cat === '🏷️ Khác') {
          const newCat = await classifyByNameDash(item.n);
          if (newCat !== '🏷️ Khác') {
            item.cat = newCat;
            hasUpdates = true;
          }
        }
      }

      if (hasUpdates) {
        d.cs = buildCsFromTi(tiItems);
        renderCategories(d.cs, tiItems);
        renderTopItems(tiItems);
        console.log('[Dashboard] Categories updated after async keyword classification');
      }
    } catch (error) {
      console.error('[Dashboard] Error in async keyword classification:', error);
    }

    // 6. Run AI category classification if any remaining '🏷️ Khác' items
    const uncategorizedCount = tiItems.filter(item => item.cat === '🏷️ Khác').length;
    if (uncategorizedCount > 0) {
      console.log(`[Dashboard] Running AI category classification for ${uncategorizedCount} items...`);
      try {
        await classifyKharItems(tiItems, d);
      } catch (e) {
        console.error('[Dashboard] AI category classification failed:', e);
      }
    }

    // 7. Categorization is now 100% finished — update final state
    _categorizationFinished = true;
    d.cs = buildCsFromTi(tiItems);

    renderTopItems(tiItems);

    // Re-render static rule-based cards with final categorized data
    renderInsightCard('insight-yearly', computeYearlyInsights(d.yd || {}, d));
    renderInsightCard('insight-items', computeItemInsights(tiItems, d.t));

    // Re-render categories respecting the active year filter
    if (_activeCatYear !== 'all') {
      switchCategoryYear(_activeCatYear, d, tiItems);
    } else {
      renderCategories(d.cs, tiItems);
      renderInsightCard('insight-categories', computeCategoryInsights(d.cs, d.t));
    }

    // 8. Run AI narrative insights using final clean categorization
    runAIInsightsNarrative(d);
  }

  initDashboard();
}
