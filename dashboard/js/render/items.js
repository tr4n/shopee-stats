/* ─────────────────────────────────────────────────
   Render: Top Items view
   renderTopItems, renderTopItemsList.
   Depends on helpers.js.
───────────────────────────────────────────────── */

let currentTopItems = [];

function renderTopItems(ti) {
  console.log('[Dashboard] renderTopItems', { itemCount: (ti || []).length, sampleItems: (ti || []).slice(0, 2) });
  currentTopItems = ti || [];
  renderTopItemsList();
  reveal(document.getElementById('card-items'));
}

function renderTopItemsList() {
  const list = document.getElementById('items-list');
  const limit = parseInt(document.getElementById('items-limit-select').value, 10) || 20;
  const items = currentTopItems.slice(0, limit);

  if (items.length === 0) {
    list.innerHTML = '<div class="no-data">Không có dữ liệu sản phẩm</div>';
    return;
  }

  const maxS = Math.max(...items.map(i => i.s), 1);
  list.innerHTML = items.map((item, idx) => {
    const pct = Math.round((item.s / maxS) * 100);
    return `
      <div class="top-row" style="transition-delay:${idx * 0.06}s">
        <div class="top-num">${idx + 1}</div>
        <div class="top-name-wrap">
          <div class="top-name">${escHtml(capFirst(item.n))}</div>
          <div class="top-bar-wrap"><div class="top-bar-fill" data-pct="${pct}"></div></div>
          <div class="top-meta">${fmtNum(item.c)} lượt · ${fmtVND(item.s)}</div>
        </div>
        <div class="top-val">${fmtVND(item.s)}</div>
      </div>`;
  }).join('');
  list.querySelectorAll('.top-row').forEach(row => reveal(row));

  // Animate bars on scroll into view
  const barObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('.top-bar-fill').forEach((bar, i) => {
        setTimeout(() => { bar.style.width = bar.getAttribute('data-pct') + '%'; }, i * 30);
      });
    });
  }, { threshold: 0.2 });
  barObs.observe(list);
}
