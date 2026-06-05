(function () {
  /* ====================================================
     Helpers & Share Image Generation
   ==================================================== */
  // 15 archetypes mirroring dashboard ARCHETYPE_DEFINITIONS
  const SHARE_ARCHETYPES = [
    { key: 'reformed',        label: 'Người Đang Tỉnh Ngộ',       icon: '🌱',   badgeBg: '#f0fdf4', badgeColor: '#16a34a', desc: 'Bạn đã bắt đầu kiểm soát chi tiêu tốt hơn. Mỗi đơn hàng giờ đây đều được cân nhắc kỹ lưỡng trước khi chốt — một bước tiến đáng tự hào!',      slogan: 'Tỉnh ngộ muộn còn hơn không! 🌱' },
    { key: 'night_owl',       label: 'Tín Đồ Mua Khuya',          icon: '🦉',   badgeBg: '#f5f3ff', badgeColor: '#7c3aed', desc: 'Đêm xuống là lúc bạn lên đồ. Giỏ hàng của bạn được lấp đầy trong bóng tối khi lý trí đã nghỉ ngơi và đam mê mua sắm thức giấc.',       slogan: 'Đêm khuya, ví tiền rơi nhanh! 🌙' },
    { key: 'fashion_healer',  label: 'Người Chữa Lành Cảm Xúc',  icon: '🌙',   badgeBg: '#fdf4ff', badgeColor: '#a21caf', desc: 'Với bạn, mua sắm không chỉ là nhu cầu — đó là liệu pháp. Mỗi món đồ mới là một cách tự thưởng, tự yêu thương bản thân sau ngày dài.',       slogan: 'Shopping là liệu pháp tâm hồn! 💫' },
    { key: 'bargain_hunter',  label: 'Chiến Thần Săn Sale',        icon: '🎯',   badgeBg: '#f0fdf4', badgeColor: '#15803d', desc: 'Bạn không mua hàng — bạn chinh phục ưu đãi. Mã giảm giá, flash sale, miễn phí ship — không gì thoát khỏi tầm ngắm của bạn!',              slogan: 'Áp mã thành công, ví tiền nở hoa! 🌸' },
    { key: 'emotional',       label: 'Người Mua Sắm Cảm Xúc',    icon: '🌊',   badgeBg: '#eff6ff', badgeColor: '#1d4ed8', desc: 'Cảm xúc là kim chỉ nam của giỏ hàng bạn. Vui hay buồn, căng thẳng hay hứng khởi — mọi trạng thái đều có thể dẫn đến một đơn hàng mới.',  slogan: 'Chốt đơn theo cảm xúc, không cần lý do! 🌊' },
    { key: 'premium_curator', label: 'Người Mua Chọn Lọc',        icon: '💎',   badgeBg: '#eff6ff', badgeColor: '#1e40af', desc: 'Ít nhưng tinh. Bạn đầu tư vào chất lượng, không bị cám dỗ bởi đồ rẻ. Mỗi lần chốt đơn là một quyết định sáng suốt và kiên định.',          slogan: 'Chất lượng làm nên đẳng cấp! ✨' },
    { key: 'rising_addict',   label: 'Người Đang "Bị Cuốn"',      icon: '📈',   badgeBg: '#fff7ed', badgeColor: '#c2410c', desc: 'Chi tiêu của bạn đang tăng tốc theo chiều hướng đáng chú ý. Shopee đã trở thành một phần không thể thiếu trong thói quen hàng ngày!',      slogan: 'Đang trên đà... không phanh được! 📈' },
    { key: 'morning_planner', label: 'Người Mua Có Kế Hoạch',     icon: '📋',   badgeBg: '#f0f9ff', badgeColor: '#0369a1', desc: 'Bạn mua sắm như lên kế hoạch dự án: có mục tiêu, có ngân sách, không bốc đồng. Mỗi đơn hàng đều được cân nhắc từ sáng sớm.',             slogan: 'Kế hoạch rõ ràng, tài chính vững chắc! 📋' },
    { key: 'seasonal',        label: 'Người Mua Theo Mùa',         icon: '🎄',   badgeBg: '#fefce8', badgeColor: '#a16207', desc: 'Bạn không mua quanh năm — bạn bùng phát theo mùa. Cuối năm, Tết, sale lớn — đó là những khoảnh khắc ví tiền bạn "tạm biệt" thế giới!', slogan: 'Sale mùa về, ví tiền ra đi! 🎄' },
    { key: 'beauty_selfcare', label: 'Người Tự Yêu Thương',       icon: '✨',   badgeBg: '#fdf2f8', badgeColor: '#be185d', desc: 'Chăm sóc bản thân là ưu tiên hàng đầu của bạn. Mỗi sản phẩm làm đẹp, chăm sóc da là một cách bạn nói "Tôi xứng đáng được tốt nhất".',   slogan: 'Đầu tư cho nhan sắc, không bao giờ lỗ! 💅' },
    { key: 'tech_optimizer',  label: 'Nhà Đầu Tư Hiệu Suất',      icon: '💻',   badgeBg: '#f0f9ff', badgeColor: '#0284c7', desc: 'Thiết bị tốt = làm việc tốt. Bạn luôn tìm kiếm công nghệ mới nhất để tối ưu hóa cuộc sống và công việc — dù ví tiền có mỏng thêm một chút.', slogan: 'Nâng cấp gear, nâng cấp cuộc sống! 💻' },
    { key: 'home_nester',     label: 'Người Tạo Tổ Ấm',           icon: '🏡',   badgeBg: '#f0fdf4', badgeColor: '#15803d', desc: 'Ngôi nhà là thế giới của bạn và bạn không ngừng làm nó đẹp hơn. Mỗi góc nhỏ đều được chăm chút với tình yêu và những đơn hàng nội thất.',  slogan: 'Nhà đẹp là hạnh phúc mỗi ngày! 🏡' },
    { key: 'food_lover',      label: 'Người Sống Để Ăn Ngon',     icon: '🍜',   badgeBg: '#fff7ed', badgeColor: '#ea580c', desc: 'Ẩm thực là niềm vui, là phần thưởng, là lý do để bạn mỉm cười sau ngày dài. Giỏ hàng của bạn luôn thơm mùi đồ ăn ngon!',                  slogan: 'Ăn ngon là quyền cơ bản của con người! 🍜' },
    { key: 'family_center',   label: 'Người Mua Vì Gia Đình',     icon: '👨‍👩‍👧', badgeBg: '#fdf4ff', badgeColor: '#7e22ce', desc: 'Bạn không mua sắm cho bản thân — bạn mua vì những người thân yêu. Mỗi đơn hàng là một cử chỉ yêu thương gửi đến gia đình!',            slogan: 'Mua vì yêu, chi vì thương! 💝' },
    { key: 'free_spirit',     label: 'Người Khám Phá Đa Dạng',   icon: '🛍️',  badgeBg: '#fff7ed', badgeColor: '#d97706', desc: 'Không theo khuôn mẫu, không theo xu hướng — bạn mua sắm tự do và đa dạng theo đúng cá tính độc đáo của mình. Giỏ hàng = bản sắc!',      slogan: 'Đa dạng không giới hạn, thích là chốt! 🛍️' }
  ];

  // Resolve archetype from d.archIdx (v5) or fall back to basic stats heuristic (v4 and older)
  function resolvePersonality(d) {
    if (typeof d.archIdx === 'number' && d.archIdx >= 0 && d.archIdx < SHARE_ARCHETYPES.length) {
      return SHARE_ARCHETYPES[d.archIdx];
    }
    // Fallback heuristic for legacy links (v4 and older)
    const spend = d.t || 0;
    const orders = d.o || 0;
    const saved = d.s || 0;
    const avg = orders > 0 ? spend / orders : 0;
    const savingsRate = saved > 0 ? saved / (spend + saved) : 0;
    if (avg >= 400000) return SHARE_ARCHETYPES[5];        // premium_curator
    if (savingsRate >= 0.18) return SHARE_ARCHETYPES[3];  // bargain_hunter
    if (orders >= 80 || spend >= 50000000) return SHARE_ARCHETYPES[6]; // rising_addict
    if (orders >= 15 && avg <= 150000) return SHARE_ARCHETYPES[7];    // morning_planner
    return SHARE_ARCHETYPES[14]; // free_spirit
  }


  async function generateSquareShareCard(d) {
    try { await document.fonts.ready; } catch (e) { }

    // Load QR Code dynamically from api.qrserver.com
    const qrImage = new Image();
    qrImage.crossOrigin = "anonymous";
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.href)}`;
    await new Promise((resolve) => {
      qrImage.onload = resolve;
      qrImage.onerror = resolve;
    });

    const W = 1080;
    const H = 1080; // Always square

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const FONT = "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const PAD = 72;

    const tColors = {
      accent: '#ee4d2d',
      secondary: '#26aa99',
      text: '#0f172a',
      textMuted: '#475569',
      textFaint: '#94a3b8',
    };

    // 1. Background: soft light mesh style gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#fffcfb');
    bgGrad.addColorStop(0.45, '#ffece4');
    bgGrad.addColorStop(0.8, '#eafbf7');
    bgGrad.addColorStop(1, '#fcf4ff');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Decorative soft auras
    ctx.globalAlpha = 0.25;
    const c1 = ctx.createRadialGradient(W * 0.94, H * 0.06, 0, W * 0.94, H * 0.06, 420);
    c1.addColorStop(0, '#ffccba'); c1.addColorStop(1, 'transparent');
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(W * 0.94, H * 0.06, 420, 0, Math.PI * 2); ctx.fill();
    const c2 = ctx.createRadialGradient(W * 0.06, H * 0.92, 0, W * 0.06, H * 0.92, 280);
    c2.addColorStop(0, '#ffccba'); c2.addColorStop(1, 'transparent');
    ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(W * 0.06, H * 0.92, 280, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // 3. Subtle dot grid
    ctx.globalAlpha = 0.02;
    ctx.fillStyle = '#ee4d2d';
    for (let dx = 36; dx < W; dx += 44) {
      for (let dy = 36; dy < H; dy += 44) {
        ctx.beginPath(); ctx.arc(dx, dy, 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // ── Helpers ────────────────────────────────────────────────
    function txt(t, x, y, size, weight, color, align = 'left', maxW) {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      if (maxW) ctx.fillText(t, x, y, maxW);
      else ctx.fillText(t, x, y);
    }

    function rrect(x, y, w, h, r, fill, stroke, sw) {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw || 1.5; ctx.stroke(); }
    }

    function rrectShadow(x, y, w, h, r, fill) {
      ctx.shadowColor = 'rgba(238, 77, 45, 0.06)';
      ctx.shadowBlur = 28; ctx.shadowOffsetY = 12;
      rrect(x, y, w, h, r, fill);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }

    function truncate(str, maxLen) {
      const s = String(str || '');
      return s.length > maxLen ? s.substring(0, maxLen - 1) + '…' : s;
    }

    function fmtC(n) {
      if (n < 0) return '***';
      n = Math.round(n || 0);
      if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace('.0', '') + ' tỷ';
      if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'tr';
      if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
      return n.toLocaleString('vi-VN') + 'đ';
    }

    // ── HEADER ─────────────────────────────────────────────────
    // White header strip with soft glass transparent white
    rrect(0, 0, W, 106, 0, 'rgba(255, 255, 255, 0.5)');

    // Brand logo
    ctx.font = `400 40px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('🛍️', PAD, 68);
    txt('Shopee Analytics', PAD + 50, 50, 22, '800', tColors.accent);
    txt('tr4n.github.io/shopee-stats', PAD + 50, 78, 15, '600', tColors.textMuted);

    // Date badge (top right)
    const dateStr = (() => {
      if (!d.ts && d.ts !== 0) return '';
      let dateObj;
      if (typeof d.ts === 'string' || (d.ts > 0 && d.ts < 1000000)) {
        // YYMMDD format (version 4)
        const s = String(d.ts).padStart(6, '0');
        dateObj = new Date(2000 + parseInt(s.slice(0, 2)), parseInt(s.slice(2, 4)) - 1, parseInt(s.slice(4, 6)));
      } else {
        dateObj = new Date(d.ts * 1000);
      }
      return `${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
    })();
    if (dateStr) {
      ctx.font = `700 16px ${FONT}`;
      const dw = ctx.measureText(`📅 ${dateStr}`).width + 36;
      rrect(W - PAD - dw, 36, dw, 36, 18, '#fff5f2', 'rgba(238,77,45,0.2)', 1.5);
      txt(`📅 ${dateStr}`, W - PAD - dw / 2, 60, 16, '700', tColors.accent, 'center');
    }

    // Header bottom gradient line
    const hLine = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    hLine.addColorStop(0, '#ee4d2d');
    hLine.addColorStop(0.5, 'rgba(238,77,45,0.2)');
    hLine.addColorStop(1, 'transparent');
    ctx.fillStyle = hLine;
    ctx.fillRect(PAD, 106, W - PAD * 2, 2);

    // ── HERO AMOUNT ────────────────────────────────────────────
    const heroTop = 152;
    txt('TỔNG CHI TIÊU CỦA TÔI', PAD, heroTop + 24, 17, '800', tColors.textMuted);

    const amtRaw = d.t < 0 ? '***' : fmtC(d.t);
    const amtDisplay = amtRaw;
    const amtSize = amtDisplay.length > 13 ? 72 : (amtDisplay.length > 10 ? 84 : 96);

    // Amount gradient text
    ctx.font = `900 ${amtSize}px ${FONT}`;
    ctx.textAlign = 'left';
    const amtW = ctx.measureText(amtDisplay).width;
    const amtGrad = ctx.createLinearGradient(PAD, 0, PAD + amtW, 0);
    amtGrad.addColorStop(0, '#ee4d2d');
    amtGrad.addColorStop(1, '#ff7a50');
    ctx.fillStyle = amtGrad;
    ctx.fillText(amtDisplay, PAD, heroTop + 24 + amtSize + 14);
    const amtBottom = heroTop + 24 + amtSize + 14;

    // Rank badge
    const rankStr = RANKS[d.r] || RANKS[2];
    const rankY = amtBottom + 20;
    ctx.font = `700 18px ${FONT}`;
    const rbW = Math.min(ctx.measureText(rankStr).width + 44, W - PAD * 2);
    rrectShadow(PAD, rankY, rbW, 44, 12, '#fff5f2');
    rrect(PAD, rankY, rbW, 44, 12, null, 'rgba(238,77,45,0.35)', 1.5);
    txt(rankStr, PAD + rbW / 2, rankY + 28, 16, '800', tColors.accent, 'center');

    // ── STATS PILLS ROW ────────────────────────────────────────
    const statsTop = rankY + 44 + 32;
    const gutter = 14;
    const statW = Math.floor((W - PAD * 2 - gutter * 2) / 3);

    const statsArr = [
      { icon: '📦', label: 'Đơn hàng', val: (d.o || 0).toLocaleString('vi-VN'), color: tColors.text },
      { icon: '🛒', label: 'Sản phẩm', val: (d.ip || 0).toLocaleString('vi-VN'), color: tColors.text },
      { icon: '💰', label: 'Tiết kiệm', val: fmtC(d.s), color: tColors.secondary },
    ];

    statsArr.forEach((st, i) => {
      const sx = PAD + i * (statW + gutter);
      rrectShadow(sx, statsTop, statW, 128, 20, 'rgba(255, 255, 255, 0.65)');
      rrect(sx, statsTop, statW, 128, 20, null, 'rgba(255, 255, 255, 0.85)', 1.5);

      ctx.font = `400 28px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(st.icon, sx + statW / 2, statsTop + 46);
      txt(st.val, sx + statW / 2, statsTop + 82, 24, '800', st.color, 'center');
      txt(st.label, sx + statW / 2, statsTop + 110, 14, '700', tColors.textMuted, 'center');
    });

    // ── SHOPPING PERSONALITY CARD ──
    const topItemTop = statsTop + 128 + 32;
    const persona = resolvePersonality(d);

    const cardH = 180;
    rrectShadow(PAD, topItemTop, W - PAD * 2, cardH, 20, '#ffffff');
    rrect(PAD, topItemTop, W - PAD * 2, cardH, 20, null, 'rgba(0,0,0,0.04)', 1.5);

    const px = PAD + 22;
    const py = topItemTop + 22;
    const pw = 136;
    const ph = 136;
    rrect(px, py, pw, ph, 10, '#fafafa', '#f0f0f0', 1.5);

    const tx = px + pw + 24;

    ctx.font = `400 44px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(persona.icon, px + pw / 2, py + ph / 2 + 14);

    txt('TÍNH CÁCH MUA SẮM', tx, topItemTop + 54, 15, '800', tColors.accent);
    txt(persona.label, tx, topItemTop + 96, 26, '800', tColors.text, 'left', W - PAD * 2 - pw - 60);
    txt(persona.slogan, tx, topItemTop + 134, 15, '600', tColors.textMuted, 'left', W - PAD * 2 - pw - 60);

    // ── YEARLY SPENDING CARD (DÒNG CHẢY THỜI GIAN) ──
    const yearlyChartTop = topItemTop + 180 + 24;
    rrectShadow(PAD, yearlyChartTop, W - PAD * 2, 180, 20, '#ffffff');
    rrect(PAD, yearlyChartTop, W - PAD * 2, 180, 20, null, 'rgba(0,0,0,0.04)', 1.5);

    const yx = PAD + 22;
    const yy = yearlyChartTop + 22;
    const yw = 136;
    const yh = 136;
    rrect(yx, yy, yw, yh, 10, '#fafafa', '#f0f0f0', 1.5);

    ctx.font = `400 44px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('📈', yx + yw / 2, yy + yh / 2 + 14);

    const ytx = yx + yw + 24;
    txt('DÒNG CHẢY THỜI GIAN', ytx, yearlyChartTop + 48, 15, '800', tColors.accent);

    // Render yearly spending horizontal bar rows (up to 12 years dynamically)
    const ydData = (d.yd || []).slice(-12);
    if (ydData.length === 0) {
      txt('Không có dữ liệu năm', ytx, yearlyChartTop + 104, 15, '600', tColors.textMuted);
    } else {
      const maxVal = Math.max(...ydData.map(([, v]) => v), 1);
      const currentYear = new Date().getFullYear();

      let numCols = 1;
      if (ydData.length > 8) {
        numCols = 3;
      } else if (ydData.length > 4) {
        numCols = 2;
      }

      // Calculate sizes of each column dynamically to balance items
      const colSizes = [];
      let itemsLeft = ydData.length;
      for (let c = 0; c < numCols; c++) {
        const size = Math.ceil(itemsLeft / (numCols - c));
        colSizes.push(size);
        itemsLeft -= size;
      }

      const maxRows = colSizes[0];
      const rowH = maxRows > 3 ? Math.floor(106 / maxRows) : 32;
      const startY = yearlyChartTop + 58 + Math.floor((106 - (maxRows * rowH)) / 2);

      const col1X = ytx;
      const totalW = W - PAD - 22 - col1X; // 732px available
      
      let colW, gap;
      let fontSize, barH;
      let yearOffset, barOffset, valWidthOffset;

      if (numCols === 1) {
        colW = totalW;
        gap = 0;
        fontSize = ydData.length > 4 ? 11 : 13;
        barH = ydData.length > 4 ? 6 : 8;
        yearOffset = 54;
        barOffset = 4;
        valWidthOffset = 170;
      } else if (numCols === 2) {
        gap = 40;
        colW = Math.floor((totalW - gap) / 2);
        fontSize = 11;
        barH = 6;
        yearOffset = 40;
        barOffset = 3;
        valWidthOffset = 85;
      } else {
        gap = 24;
        colW = Math.floor((totalW - 2 * gap) / 3);
        fontSize = 10.5;
        barH = 5;
        yearOffset = 34;
        barOffset = 3;
        valWidthOffset = 76;
      }

      let currentCol = 0;
      let colStartIdx = 0;

      ydData.forEach(([year, val], idx) => {
        if (idx >= colStartIdx + colSizes[currentCol]) {
          colStartIdx += colSizes[currentCol];
          currentCol++;
        }
        
        const colIdx = idx - colStartIdx;
        const rowY = startY + colIdx * rowH;
        const startX = col1X + currentCol * (colW + gap);
        
        const textY = rowY + Math.floor(rowH / 2) + Math.floor(fontSize / 3) + 1;
        const barY = rowY + Math.floor((rowH - barH) / 2);

        // Year text
        txt(year.toString(), startX, textY, fontSize, '800', tColors.textMuted);

        // Bar Track
        const barTrackX = startX + yearOffset;
        const barTrackW = colW - yearOffset - valWidthOffset;
        rrect(barTrackX, barY, barTrackW, barH, barH / 2, 'rgba(0,0,0,0.04)');

        // Bar Fill
        const pct = val < 0 ? 0 : val / maxVal;
        const barW = barTrackW * pct;
        const isCurrent = Number(year) === currentYear;

        if (barW > 0) {
          const barGrad = ctx.createLinearGradient(barTrackX, 0, barTrackX + barW, 0);
          if (isCurrent) {
            barGrad.addColorStop(0, '#ee4d2d');
            barGrad.addColorStop(1, '#ff8a5a');
          } else {
            barGrad.addColorStop(0, '#94a3b8');
            barGrad.addColorStop(1, '#cbd5e1');
          }
          rrect(barTrackX, barY, barW, barH, barH / 2, barGrad);
        }

        // Amount Val
        const valFmt = fmtC(val);
        txt(valFmt, startX + colW, textY, fontSize, '800', tColors.text, 'right');
      });
    }

    // ── FOOTER ────────────────────────────────────────────────
    const footerY = H - 76;

    const fLine = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    fLine.addColorStop(0, 'transparent');
    fLine.addColorStop(0.35, 'rgba(238,77,45,0.1)');
    fLine.addColorStop(0.65, 'rgba(238,77,45,0.1)');
    fLine.addColorStop(1, 'transparent');
    ctx.fillStyle = fLine;
    ctx.fillRect(PAD, footerY - 18, W - PAD * 2, 1);

    if (qrImage.complete && qrImage.naturalWidth > 0) {
      const qrx = W - PAD - 100;
      const qry = footerY - 42;
      // Draw small white backing for QR
      rrect(qrx - 6, qry - 6, 112, 112, 8, '#ffffff', 'rgba(0,0,0,0.05)', 1);
      ctx.drawImage(qrImage, qrx, qry, 100, 100);

      // Left align the footer brand text to balance
      txt('Quét để xem chi tiêu của bạn:', PAD, footerY + 16, 16, '700', tColors.textMuted);
      txt('tr4n.github.io/shopee-stats', PAD, footerY + 46, 20, '800', tColors.accent);
    } else {
      // Fallback center aligned brand text if QR code image failed to load
      txt('Bạn chi tiêu bao nhiêu tiền trên Shopee?', W / 2, footerY + 6, 17, '600', tColors.textMuted, 'center');
      txt('tr4n.github.io/shopee-stats', W / 2, footerY + 38, 20, '800', tColors.accent, 'center');
    }

    return canvas.toDataURL('image/png', 0.92);
  }


  async function recordStoryVideo(d) {
    const btnVid = document.getElementById("btn-download-vid");
    const origHTML = btnVid ? btnVid.innerHTML : '🎥';
    if (btnVid) {
      btnVid.disabled = true;
      btnVid.innerHTML = '⌛';
      btnVid.title = 'Đang chuẩn bị...';
    }

    const videoOverlay = document.getElementById("video-recording-overlay");
    const progressEl = document.getElementById("video-recording-progress");
    const cancelBtn = document.getElementById("btn-video-cancel");

    let isRecordingCancelled = false;
    if (videoOverlay) videoOverlay.style.display = "flex";
    if (progressEl) progressEl.textContent = "Đang quay video: 0%";

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        isRecordingCancelled = true;
        if (videoOverlay) videoOverlay.style.display = "none";
        showToast("❌ Đã hủy quay video");
      };
    }

    try {
      await document.fonts.ready;
    } catch (e) {}

    // Preload QR image dynamically
    const qrImage = new Image();
    qrImage.crossOrigin = "anonymous";
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.href)}`;
    await new Promise((resolve) => {
      qrImage.onload = resolve;
      qrImage.onerror = resolve;
    });

    const W = 540;
    const H = 960;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const FONT = "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const PAD = 48;

    const tColors = {
      accent: '#ee4d2d',
      secondary: '#26aa99',
      text: '#0f172a',
      textMuted: '#475569',
      textFaint: '#94a3b8',
    };

    function txt(t, x, y, size, weight, color, align = 'left', maxW) {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      if (maxW) ctx.fillText(t, x, y, maxW);
      else ctx.fillText(t, x, y);
    }

    function rrect(x, y, w, h, r, fill, stroke, sw) {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw || 1.5; ctx.stroke(); }
    }

    function rrectShadow(x, y, w, h, r, fill) {
      ctx.shadowColor = 'rgba(238, 77, 45, 0.05)';
      ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
      rrect(x, y, w, h, r, fill);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }

    function truncate(str, maxLen) {
      const s = String(str || '');
      return s.length > maxLen ? s.substring(0, maxLen - 1) + '…' : s;
    }

    const fps = 30;
    const totalFrames = 1050; // 5 slides * 7 seconds * 30fps
    
    const captureStreamFn = canvas.captureStream || canvas.mozCaptureStream || canvas.webkitCaptureStream;
    if (!captureStreamFn) {
      throw new Error("Trình duyệt không hỗ trợ Canvas captureStream.");
    }
    const stream = captureStreamFn.call(canvas, fps);

    let mimeType = 'video/webm;codecs=vp9';
    let recorder;
    try {
      if (typeof MediaRecorder === 'undefined') {
        throw new Error("MediaRecorder API không khả dụng.");
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      recorder = new MediaRecorder(stream, { mimeType });
    } catch (e) {
      console.warn("Failed to initialize MediaRecorder with custom mimeType, falling back to default:", e);
      try {
        recorder = new MediaRecorder(stream);
        mimeType = recorder.mimeType || 'video/webm';
      } catch (err) {
        throw new Error(`MediaRecorder failed: ${err.message || err}`);
      }
    }

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const dateStr = (() => {
      if (!d.ts && d.ts !== 0) return '';
      let dateObj;
      if (typeof d.ts === 'string' || (d.ts > 0 && d.ts < 1000000)) {
        const s = String(d.ts).padStart(6, '0');
        dateObj = new Date(2000 + parseInt(s.slice(0, 2)), parseInt(s.slice(2, 4)) - 1, parseInt(s.slice(4, 6)));
      } else {
        dateObj = new Date(d.ts * 1000);
      }
      return `${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
    })();

    const rankLabel = RANKS[d.r] || RANKS[2];
    const currentYear = new Date().getFullYear();
    const videoPersona = resolvePersonality(d);

    const slogans = [
      "Kiếp này xin lỗi ví tiền! 💸",
      "Mua sắm vì đam mê, không vì cần! 🛍️",
      "Bàn tay vàng trong làng chốt đơn! 👑",
      "Kiểm soát chi tiêu, làm chủ tương lai! 💎",
      "Chốt đơn xuyên đêm, quên sầu ví rỗng! 🦉"
    ];
    const randomSlogan = slogans[Math.floor(Math.random() * slogans.length)];

    // Define drawing function
    function drawFrame(currentFrame) {
      ctx.clearRect(0, 0, W, H);

      // 1. Soft mesh style gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      const shift1 = Math.sin(currentFrame * 0.04) * 0.08;
      const shift2 = Math.cos(currentFrame * 0.04) * 0.08;
      bgGrad.addColorStop(0, '#fffcfb');
      bgGrad.addColorStop(0.45 + shift1, '#ffece4');
      bgGrad.addColorStop(0.8 + shift2, '#eafbf7');
      bgGrad.addColorStop(1, '#fcf4ff');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle dot grid
      ctx.globalAlpha = 0.015;
      ctx.fillStyle = '#ee4d2d';
      for (let dx = 24; dx < W; dx += 32) {
        for (let dy = 24; dy < H; dy += 32) {
          ctx.beginPath(); ctx.arc(dx, dy, 1.8, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // 2. Header
      rrect(0, 0, W, 110, 0, 'rgba(255, 255, 255, 0.5)');
      ctx.font = `400 36px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText('🛍️', PAD, 66);
      txt('Shopee Analytics', PAD + 46, 48, 20, '800', tColors.accent);
      txt('tr4n.github.io/shopee-stats', PAD + 46, 76, 13, '600', tColors.textMuted);

      if (dateStr) {
        ctx.font = `700 13px ${FONT}`;
        const dw = ctx.measureText(`📅 ${dateStr}`).width + 24;
        rrect(W - PAD - dw, 38, dw, 32, 16, '#fff5f2', 'rgba(238,77,45,0.2)', 1.2);
        txt(`📅 ${dateStr}`, W - PAD - dw / 2, 58, 13, '700', tColors.accent, 'center');
      }

      const hLine = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
      hLine.addColorStop(0, '#ee4d2d');
      hLine.addColorStop(0.5, 'rgba(238,77,45,0.2)');
      hLine.addColorStop(1, 'transparent');
      ctx.fillStyle = hLine;
      ctx.fillRect(PAD, 110, W - PAD * 2, 1.5);

      // 3. Footer
      const footerY = H - 86;
      const fLine = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
      fLine.addColorStop(0, 'transparent');
      fLine.addColorStop(0.35, 'rgba(238,77,45,0.1)');
      fLine.addColorStop(0.65, 'rgba(238,77,45,0.1)');
      fLine.addColorStop(1, 'transparent');
      ctx.fillStyle = fLine;
      ctx.fillRect(PAD, footerY - 14, W - PAD * 2, 1);

      if (qrImage.complete && qrImage.naturalWidth > 0) {
        const qrx = W - PAD - 90;
        const qry = footerY - 36;
        rrect(qrx - 5, qry - 5, 100, 100, 8, '#ffffff', 'rgba(0,0,0,0.05)', 1);
        ctx.drawImage(qrImage, qrx, qry, 90, 90);
        txt('Quét để xem chi tiêu của bạn:', PAD, footerY + 16, 14, '700', tColors.textMuted);
        txt('tr4n.github.io/shopee-stats', PAD, footerY + 42, 18, '800', tColors.accent);
      } else {
        txt('Bạn chi tiêu bao nhiêu tiền trên Shopee?', W / 2, footerY + 8, 15, '600', tColors.textMuted, 'center');
        txt('tr4n.github.io/shopee-stats', W / 2, footerY + 34, 18, '800', tColors.accent, 'center');
      }

      // 4. Slide content drawing
      const page = Math.floor(currentFrame / 210); // 7s * 30fps = 210 frames/slide
      const pageFrame = currentFrame % 210;

      if (page === 0) {
        txt('Shopee Analytics', PAD, 180, 15, '800', tColors.accent);
        txt('Chào mừng bạn đến với tổng kết chi tiêu!', PAD, 216, 19, '700', tColors.text);

        const cardY = 320;
        const cardH = 460;
        rrectShadow(PAD, cardY, W - PAD * 2, cardH, 24, 'rgba(255, 255, 255, 0.5)');
        rrect(PAD, cardY, W - PAD * 2, cardH, 24, null, 'rgba(255, 255, 255, 0.85)', 1.5);

        txt('🛍️', W / 2, cardY + 90, 56, '400', null, 'center');
        txt('TỔNG CHI TIÊU CỦA TÔI', W / 2, cardY + 160, 14, '800', tColors.textMuted, 'center');

        const progress = Math.min(pageFrame / 40, 1);
        const currentTotal = d.t < 0 ? -1 : Math.round(d.t * progress);
        const totalText = fmtVND(currentTotal);
        txt(totalText, W / 2, cardY + 250, 48, '900', tColors.accent, 'center');

        if (pageFrame >= 20) {
          const badgeProgress = Math.min((pageFrame - 20) / 10, 1);
          ctx.save();
          ctx.translate(W / 2, cardY + 330);
          ctx.scale(badgeProgress, badgeProgress);
          ctx.rotate(-1.5 * Math.PI / 180);
          ctx.font = `800 15px ${FONT}`;
          const rbW = ctx.measureText(rankLabel).width + 36;
          rrectShadow(-rbW / 2, -22, rbW, 44, 12, '#fff5f2');
          rrect(-rbW / 2, -22, rbW, 44, 12, null, 'rgba(238,77,45,0.35)', 1.5);
          txt(rankLabel, 0, 6, 15, '800', tColors.accent, 'center');
          ctx.restore();
        }
      }
      else if (page === 1) {
        txt('Xếp hạng của bạn', PAD, 180, 15, '800', tColors.accent);
        txt('Bạn là chiến thần mua sắm cấp độ nào?', PAD, 216, 19, '700', tColors.text);

        const cardY = 320;
        const cardH = 460;
        rrectShadow(PAD, cardY, W - PAD * 2, cardH, 24, 'rgba(255, 255, 255, 0.5)');
        rrect(PAD, cardY, W - PAD * 2, cardH, 24, null, 'rgba(255, 255, 255, 0.85)', 1.5);

        const progress = Math.min(pageFrame / 40, 1);
        const currentOrders = Math.round((d.o || 0) * progress);
        const currentItems = Math.round((d.ip || 0) * progress);
        const currentSaved = d.s < 0 ? -1 : Math.round((d.s || 0) * progress);

        const innerPad = 24;
        const boxW = (W - PAD * 2 - innerPad * 3) / 2;
        const boxH = 140;

        const bx1 = PAD + innerPad;
        const by1 = cardY + innerPad + 20;
        rrect(bx1, by1, boxW, boxH, 16, 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.9)', 1.5);
        txt('📦', bx1 + boxW / 2, by1 + 42, 28, '400', null, 'center');
        txt(currentOrders.toString(), bx1 + boxW / 2, by1 + 88, 24, '800', tColors.text, 'center');
        txt('Đơn hàng', bx1 + boxW / 2, by1 + 116, 11, '700', tColors.textMuted, 'center');

        const bx2 = bx1 + boxW + innerPad;
        rrect(bx2, by1, boxW, boxH, 16, 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.9)', 1.5);
        txt('🛒', bx2 + boxW / 2, by1 + 42, 28, '400', null, 'center');
        txt(currentItems.toString(), bx2 + boxW / 2, by1 + 88, 24, '800', tColors.text, 'center');
        txt('Sản phẩm', bx2 + boxW / 2, by1 + 116, 11, '700', tColors.textMuted, 'center');

        const bx3 = PAD + innerPad;
        const by3 = by1 + boxH + innerPad;
        const boxW3 = W - PAD * 2 - innerPad * 2;
        rrect(bx3, by3, boxW3, boxH, 16, 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.9)', 1.5);
        txt('💰', bx3 + 44, by3 + boxH / 2 + 10, 36, '400', null, 'left');
        const savedText = fmtVND(currentSaved);
        txt(savedText, bx3 + 100, by3 + 65, 26, '800', tColors.secondary);
        txt('Tiết kiệm được', bx3 + 100, by3 + 95, 12, '700', tColors.textMuted);
      }
      else if (page === 2) {
        txt('Tính cách mua sắm', PAD, 180, 15, '800', tColors.accent);
        txt('Chân dung chi tiêu độc bản của riêng bạn', PAD, 216, 17, '700', tColors.text, 'left', W - PAD * 2);

        const scale = Math.min(pageFrame / 20, 1);
        const rotateDeg = 2 + Math.sin(pageFrame * 0.05) * 1;

        ctx.save();
        ctx.translate(W / 2, 540);
        ctx.scale(scale, scale);
        ctx.rotate(rotateDeg * Math.PI / 180);

        const pW = 320;
        const pH = 380;
        rrectShadow(-pW / 2, -pH / 2, pW, pH, 12, '#ffffff');
        rrect(-pW / 2, -pH / 2, pW, pH, 12, null, 'rgba(0,0,0,0.04)', 1.5);

        const phW = 280;
        const phH = 210;
        rrect(-phW / 2, -pH / 2 + 20, phW, phH, 6, '#fafafa', '#f2f2f2', 1.5);

        txt(videoPersona.icon, 0, -pH / 2 + 130, 56, '400', null, 'center');

        ctx.save();
        ctx.translate(phW / 2 - 10, -pH / 2 + 20);
        ctx.rotate(8 * Math.PI / 180);
        ctx.font = `800 11px ${FONT}`;
        const badgeLabel = videoPersona.icon + ' ' + videoPersona.label;
        const badgeW = ctx.measureText(badgeLabel).width + 16;
        rrect(-badgeW / 2, -14, badgeW, 28, 8, videoPersona.badgeBg, 'rgba(0,0,0,0.08)', 1);
        txt(badgeLabel, 0, 5, 11, '800', videoPersona.badgeColor, 'center');
        ctx.restore();

        txt(videoPersona.label, 0, pH / 2 - 100, 18, '800', '#0f172a', 'center', pW - 40);

        const descWords = videoPersona.desc.split(' ');
        let descLine = '';
        const maxLineW = pW - 40;
        let lineY = pH / 2 - 75;
        ctx.font = `600 11px ${FONT}`;
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        for (let n = 0; n < descWords.length; n++) {
          const testLine = descLine + descWords[n] + ' ';
          if (ctx.measureText(testLine).width > maxLineW && n > 0) {
            ctx.fillText(descLine, 0, lineY);
            descLine = descWords[n] + ' ';
            lineY += 16;
          } else {
            descLine = testLine;
          }
        }
        ctx.fillText(descLine, 0, lineY);

        txt(videoPersona.slogan, 0, pH / 2 - 22, 11, '800', tColors.accent, 'center');

        ctx.restore();
      }
      else if (page === 3) {
        txt('Dòng chảy thời gian', PAD, 180, 15, '800', tColors.accent);
        txt('Biến động chi tiêu của bạn qua các năm', PAD, 216, 19, '700', tColors.text);

        const cardY = 320;
        const cardH = 460;
        rrectShadow(PAD, cardY, W - PAD * 2, cardH, 24, 'rgba(255, 255, 255, 0.5)');
        rrect(PAD, cardY, W - PAD * 2, cardH, 24, null, 'rgba(255, 255, 255, 0.85)', 1.5);

        const maxVal = Array.isArray(d.yd) ? Math.max(...d.yd.map(([, v]) => v), 1) : 1;
        const yd = Array.isArray(d.yd) ? d.yd.slice(-12) : [];

        const progress = Math.min(pageFrame / 40, 1);
        
        // Dynamic Y spacing and font scale
        const rowH = yd.length > 5 ? Math.floor(340 / yd.length) : 60;
        const startY = cardY + 45 + Math.floor((340 - (yd.length * rowH)) / 2);
        const fontSize = yd.length > 8 ? 10 : (yd.length > 5 ? 12 : 14);
        const barH = yd.length > 8 ? 5 : (yd.length > 5 ? 7 : 10);

        yd.forEach(([y, v], i) => {
          const rowY = startY + i * rowH;
          const textY = rowY + Math.floor(rowH / 2) + Math.floor(fontSize / 3) + 1;
          const barY = rowY + Math.floor((rowH - barH) / 2);

          // Year text
          txt(y.toString(), PAD + 24, textY, fontSize, '800', tColors.textMuted);

          // Bar Track
          const barTrackX = PAD + 80;
          const barTrackW = W - PAD * 2 - 200;
          rrect(barTrackX, barY, barTrackW, barH, barH / 2, 'rgba(0,0,0,0.05)');

          // Bar Fill
          const pct = v < 0 ? 0 : Math.round((v / maxVal) * 100);
          const isCurrent = Number(y) === currentYear;

          const barW = barTrackW * (pct / 100) * progress;
          if (barW > 0) {
            const barGrad = ctx.createLinearGradient(barTrackX, 0, barTrackX + barW, 0);
            if (isCurrent) {
              barGrad.addColorStop(0, '#ee4d2d');
              barGrad.addColorStop(1, '#ff8a5a');
            } else {
              barGrad.addColorStop(0, '#94a3b8');
              barGrad.addColorStop(1, '#cbd5e1');
            }
            rrect(barTrackX, barY, barW, barH, barH / 2, barGrad);
          }

          // Amount Val
          const valFmt = fmtVND(v);
          txt(valFmt, W - PAD - 24, textY, fontSize - 1, '800', tColors.text, 'right');
        });
      }
      else if (page === 4) {
        txt('Đến lượt bạn', PAD, 180, 15, '800', tColors.accent);
        txt('Khám phá và chia sẻ câu chuyện chi tiêu của riêng bạn', PAD, 216, 18, '700', tColors.text, 'left', W - PAD * 2);

        const cardY = 320;
        const cardH = 460;
        rrectShadow(PAD, cardY, W - PAD * 2, cardH, 24, 'rgba(255, 255, 255, 0.5)');
        rrect(PAD, cardY, W - PAD * 2, cardH, 24, null, 'rgba(255, 255, 255, 0.85)', 1.5);

        ctx.save();
        ctx.translate(W / 2, cardY + 90);
        ctx.rotate(2 * Math.sin(pageFrame * 0.08) * Math.PI / 180);
        ctx.font = `800 16px ${FONT}`;
        const sw = ctx.measureText(randomSlogan).width + 36;
        rrectShadow(-sw / 2, -24, sw, 48, 12, '#ffece4');
        rrect(-sw / 2, -24, sw, 48, 12, null, 'rgba(238, 77, 45, 0.35)', 1.5);
        txt(randomSlogan, 0, 6, 16, '800', tColors.accent, 'center');
        ctx.restore();

        txt('Xem thống kê chi tiêu Shopee của bạn', W / 2, cardY + 200, 15, '700', tColors.text, 'center');
        txt('Bảo mật 100% offline với tiện ích Shopee Analytics', W / 2, cardY + 235, 13, '600', tColors.textMuted, 'center');

        const btnW = W - PAD * 2 - 80;
        const btnH = 60;
        const btnX = PAD + 40;
        const btnY = cardY + 310;
        const btnGrad = ctx.createLinearGradient(btnX, 0, btnX + btnW, 0);
        btnGrad.addColorStop(0, '#ee4d2d');
        btnGrad.addColorStop(1, '#ff8a5a');
        rrectShadow(btnX, btnY, btnW, btnH, 16, btnGrad);
        txt('CÀI ĐẶT TIỆN ÍCH MIỄN PHÍ', W / 2, btnY + 36, 14, '800', '#ffffff', 'center');
      }
    }

    // Setup onstop logic first to avoid race conditions
    const recordPromise = new Promise((resolve, reject) => {
      recorder.onstop = () => {
        try {
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = 'shopee-stats-wrapped.webm';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Delay revoke to avoid race condition with download
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          showToast("✓ Đã tải video! Dùng VLC hoặc Chrome để mở file .webm");
          if (btnVid) {
            btnVid.disabled = false;
            btnVid.innerHTML = origHTML;
            btnVid.title = 'Quay video Story';
          }
          if (videoOverlay) videoOverlay.style.display = "none";
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      
      recorder.onerror = (e) => {
        reject(e.error || new Error("Lỗi MediaRecorder."));
      };
    });

    // Draw the first frame immediately so canvas isn't blank
    drawFrame(0);

    // Start recording
    recorder.start();

    let currentFrame = 0;
    
    function renderLoop() {
      if (isRecordingCancelled) {
        try {
          recorder.onstop = null; // Discard onstop logic (so no file download)
          recorder.stop();
          stream.getTracks().forEach(track => track.stop());
        } catch(e) {}
        if (btnVid) {
          btnVid.disabled = false;
          btnVid.innerHTML = origHTML;
          btnVid.title = 'Quay video Story';
        }
        return;
      }

      if (currentFrame >= totalFrames) {
        recorder.stop();
        if (videoOverlay) videoOverlay.style.display = "none";
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      const progressPct = Math.round((currentFrame / totalFrames) * 100);
      if (progressEl) {
        progressEl.textContent = `Đang quay video: ${progressPct}%`;
      }
      if (btnVid) {
        btnVid.innerHTML = `${progressPct}%`;
        btnVid.title = `Đang ghi: ${progressPct}%`;
      }

      drawFrame(currentFrame);

      currentFrame++;
      setTimeout(renderLoop, 1000 / fps);
    }

    // Run the render loop
    renderLoop();

    return recordPromise;
  }


  function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }



  function setupDarkMode() {
    const btn = document.getElementById('btn-theme');
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    const root = document.documentElement;
    if (!btn) return;

    btn.style.display = 'inline-flex';

    const applyTheme = (dark) => {
      if (dark) {
        root.setAttribute('data-theme', 'dark');
        icon.textContent = '☀️';
        label.textContent = 'Sáng';
      } else {
        root.removeAttribute('data-theme');
        icon.textContent = '🌙';
        label.textContent = 'Tối';
      }
    };

    const saved = localStorage.getItem('share-theme');
    let isDark = saved === 'dark';
    applyTheme(isDark);

    btn.addEventListener('click', () => {
      isDark = !isDark;
      applyTheme(isDark);
      localStorage.setItem('share-theme', isDark ? 'dark' : 'light');
      showToast(isDark ? '🌙 Dark mode đã bật' : '☀️ Light mode đã bật');
    });
  }

  function setupActions(d) {
    const btnDownload = document.getElementById("btn-download-img");
    const btnDownloadVid = document.getElementById("btn-download-vid");
    const actionsPanel = document.getElementById("actions-panel");
    const overlay = document.getElementById("img-preview-overlay");
    const previewFrame = document.getElementById("img-preview-frame");
    const previewActions = document.getElementById("img-preview-actions");
    const btnImgDownload = document.getElementById("btn-img-download");
    const btnImgCopy = document.getElementById("btn-img-copy");

    if (actionsPanel) actionsPanel.style.display = "flex";

    const musicFloatBtn = document.getElementById('btn-music-float');
    if (musicFloatBtn) musicFloatBtn.style.display = 'inline-flex';

    // Image preview modal helpers
    let currentDataUrl = null;

    const openImgPreview = () => {
      currentDataUrl = null;
      // Reset to loading state
      previewFrame.innerHTML = `
        <div class="img-preview-loading">
          <div class="img-preview-spinner"></div>
          <span>Đang tạo ảnh...</span>
        </div>`;
      if (previewActions) previewActions.style.display = 'none';
      overlay.classList.add('active');
    };

    const closeImgPreview = () => {
      overlay.classList.remove('active');
    };

    const showPreviewImage = (dataUrl) => {
      currentDataUrl = dataUrl;
      // Build image + close button inside frame
      previewFrame.innerHTML = `
        <button class="img-preview-close" id="btn-close-preview" aria-label="Đóng">✕</button>
        <img src="${dataUrl}" alt="Preview ảnh Shopee Stats">`;
      document.getElementById('btn-close-preview').addEventListener('click', closeImgPreview);
      if (previewActions) previewActions.style.display = 'flex';
    };

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeImgPreview();
    });

    // Download action
    if (btnImgDownload) {
      btnImgDownload.addEventListener('click', () => {
        if (!currentDataUrl) return;
        const link = document.createElement('a');
        link.href = currentDataUrl;
        link.download = 'shopee-stats-overview.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('✓ Đã tải ảnh thành công!');
      });
    }

    // Copy image to clipboard
    if (btnImgCopy) {
      btnImgCopy.addEventListener('click', async () => {
        if (!currentDataUrl) return;
        const origHTML = btnImgCopy.innerHTML;
        btnImgCopy.innerHTML = '⌛';
        btnImgCopy.disabled = true;
        try {
          const res = await fetch(currentDataUrl);
          const blob = await res.blob();
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          showToast('✓ Đã sao chép ảnh vào clipboard!');
        } catch (err) {
          console.warn('Copy image failed:', err);
          showToast('❌ Trình duyệt chưa hỗ trợ sao chép ảnh. Hãy tải về rồi chia sẻ thủ công.');
        } finally {
          btnImgCopy.innerHTML = origHTML;
          btnImgCopy.disabled = false;
        }
      });
    }

    // Image button: generate → show preview
    if (btnDownload) {
      btnDownload.addEventListener("click", async () => {
        openImgPreview();
        try {
          const dataUrl = await generateSquareShareCard(d);
          showPreviewImage(dataUrl);
        } catch (err) {
          console.error(err);
          closeImgPreview();
          showToast("❌ Lỗi khi tạo ảnh");
        }
      });
    }

    if (btnDownloadVid) {
      btnDownloadVid.addEventListener("click", async () => {
        try {
          await recordStoryVideo(d);
        } catch (err) {
          console.error(err);
          showToast(`❌ Lỗi khi quay video: ${err.message || err}`);
          if (btnDownloadVid) { btnDownloadVid.disabled = false; btnDownloadVid.innerHTML = '🎥 Video'; }
        }
      });
    }
  }

  const RANKS = {
    1: 'Khách Tập Sự 👶',
    2: 'Khách Quen 🤝',
    3: 'Tín Đồ Cuồng Nhiệt 👑',
    4: 'Cổ Đông Chiến Lược 💎'
  };

  function fmtVND(n) {
    if (n < 0) return '***';
    n = Math.round(n || 0);
    if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace('.0', '') + ' tỷ';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'tr';
    if (n >= 1000) return Math.round(n / 1000) + 'k';
    return n.toLocaleString('vi-VN') + 'đ';
  }
  function fmtNum(n) { return Math.round(n || 0).toLocaleString('vi-VN'); }
  function fmtDate(ts) {
    if (!ts) return '';
    let dateObj;
    // V4: YYMMDD integer (6-digit number, < 1000000)
    if (ts > 0 && ts < 1000000) {
      const s = String(ts).padStart(6, '0');
      dateObj = new Date(2000 + parseInt(s.slice(0, 2)), parseInt(s.slice(2, 4)) - 1, parseInt(s.slice(4, 6)));
    } else {
      // V3 and earlier: Unix timestamp in seconds
      dateObj = new Date(ts * 1000);
    }
    return `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
  }
  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ====================================================
     Counter animation
   ==================================================== */
  function animateCounter(el, targetText, duration) {
    const match = targetText.match(/^([\d,\.]+)(.*)$/);
    if (!match) { el.textContent = targetText; return; }

    const numStr = match[1].replace(/,/g, '');
    const suffix = match[2];
    const target = parseFloat(numStr);
    const isFloat = numStr.includes('.');
    const decimals = isFloat ? (numStr.split('.')[1] || '').length : 0;

    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      const formatted = isFloat
        ? current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        : Math.round(current).toLocaleString('vi-VN');
      el.textContent = formatted + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = targetText;
    }
    requestAnimationFrame(step);
  }

  /* ====================================================
     Confetti (for top spenders: percentile >= 80)
   ==================================================== */
  let confettiActive = false;
  function launchConfetti() {
    if (confettiActive) return;
    confettiActive = true;
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 3,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 8,
      w: 8 + Math.random() * 6,
      h: 4 + Math.random() * 4,
      color: ['#ee4d2d', '#ff8a5a', '#5fe8cc', '#ffd700', '#fff'][Math.floor(Math.random() * 5)],
      alpha: 1
    }));

    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotV;
        p.vy += 0.06;
        if (frame > 80) p.alpha -= 0.018;
        if (p.alpha <= 0) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      frame++;
      if (alive) requestAnimationFrame(draw);
      else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confettiActive = false;
      }
    }
    requestAnimationFrame(draw);
  }

  /* ====================================================
     Parse URL data
   ==================================================== */
  function parseData() {
    try {
      // 1. Try matching s= (new format)
      const matchS = location.hash.match(/[#&]s=([^&]+)/);
      if (matchS) {
        const hashVal = decodeURIComponent(matchS[1]);

        // Shared helper: parse yd string "24:3s13k0,25:1m48w"
        const parseYd = (ydStr) => {
          const yd = [];
          if (!ydStr) return yd;
          for (const entry of ydStr.split(',')) {
            const colonIdx = entry.indexOf(':');
            if (colonIdx > 0) {
              const fullYear = parseInt(entry.slice(0, colonIdx), 10) + 2000;
              const valPart = entry.slice(colonIdx + 1);
              yd.push([fullYear, valPart === 'n' ? -1 : parseInt(valPart, 36)]);
            }
          }
          return yd;
        };
        const calcRank = (t) => t <= 10000000 ? 1 : (t <= 50000000 ? 2 : (t < 80000000 ? 3 : 4));
        const calcBeat = (t) => {
          for (const { max, beat } of [
            { max: 1000000, beat: 20 }, { max: 5000000, beat: 45 },
            { max: 15000000, beat: 65 }, { max: 35000000, beat: 80 },
            { max: 70000000, beat: 90 }, { max: 120000000, beat: 95 },
            { max: 250000000, beat: 98 }, { max: Infinity, beat: 99 }
          ]) { if (t <= max) return beat; }
          return 99;
        };

        if (hashVal.startsWith('5-')) {
          // Version 5: same as v4 but last field is archIdx (1 base36 char) instead of topItemB64
          // Format: 5-{totalB36}-{ordersB36}-{itemsB36}-{savedB36}-{YYMMDD}-{yd}-{archIdx}
          const parts = hashVal.split('-');
          const finalTotal = parts[1] === 'n' ? -1 : parseInt(parts[1], 36);
          const totalOrders = parseInt(parts[2], 36);
          const totalItems = parseInt(parts[3], 36);
          const finalSaved = parts[4] === 'n' ? -1 : parseInt(parts[4], 36);
          const datecode = parseInt(parts[5], 10);
          const yd = parseYd(parts[6] || '');
          const archIdx = parts[7] ? parseInt(parts[7], 36) : 14; // default: free_spirit (14)

          return {
            r: calcRank(finalTotal),
            p: calcBeat(finalTotal),
            t: finalTotal,
            o: totalOrders,
            ip: totalItems,
            s: finalSaved,
            ts: datecode,
            archIdx: archIdx,
            yd: yd
          };
        } else if (hashVal.startsWith('4-')) {
          // Version 4: YYMMDD date — last field is topItemB64 (legacy, ignored for privacy)
          const parts = hashVal.split('-');
          const finalTotal = parts[1] === 'n' ? -1 : parseInt(parts[1], 36);
          const totalOrders = parseInt(parts[2], 36);
          const totalItems = parseInt(parts[3], 36);
          const finalSaved = parts[4] === 'n' ? -1 : parseInt(parts[4], 36);
          const datecode = parseInt(parts[5], 10);
          const yd = parseYd(parts[6] || '');
          // archIdx not present in v4 → will use calculateSharePersonality fallback

          return {
            r: calcRank(finalTotal),
            p: calcBeat(finalTotal),
            t: finalTotal,
            o: totalOrders,
            ip: totalItems,
            s: finalSaved,
            ts: datecode,
            archIdx: null,
            yd: yd
          };
        } else if (hashVal.startsWith('3-')) {
          // Version 3 (legacy)
          const parts = hashVal.split('-');
          const finalTotal = parts[1] === 'n' ? -1 : parseInt(parts[1], 36);
          const totalOrders = parseInt(parts[2], 36);
          const totalItems = parseInt(parts[3], 36);
          const finalSaved = parts[4] === 'n' ? -1 : parseInt(parts[4], 36);
          const tsVal = parseInt(parts[5], 36);

          const ydStr = parts[6] || '';
          let yd = [];
          if (ydStr) {
            const ydParts = ydStr.split('_');
            for (let i = 0; i < ydParts.length; i += 2) {
              if (ydParts[i] && ydParts[i + 1]) {
                const fullYear = parseInt(ydParts[i], 10) + 2000;
                const val = ydParts[i + 1] === 'n' ? -1 : parseInt(ydParts[i + 1], 36);
                yd.push([fullYear, val]);
              }
            }
          }

          return {
            r: calcRank(finalTotal),
            p: calcBeat(finalTotal),
            t: finalTotal,
            o: totalOrders,
            ip: totalItems,
            s: finalSaved,
            ts: tsVal,
            archIdx: null,
            yd: yd
          };
        } else {
          // Version 1 or 2 (Base64 encoded)
          const rawStr = decodeURIComponent(escape(atob(hashVal)));
          const parts = rawStr.split('|');
          if (parts.length >= 9) {
            const version = parseInt(parts[0], 10);
            if (version === 2) {
              const rankVal = parseInt(parts[1], 10);
              const beat = parseInt(parts[2], 10);

              const finalTotal = parts[3] === 'n' ? -1 : parseInt(parts[3], 36);
              const totalOrders = parseInt(parts[4], 36);
              const totalItems = parseInt(parts[5], 36);
              const finalSaved = parts[6] === 'n' ? -1 : parseInt(parts[6], 36);
              const tsVal = parseInt(parts[7], 36);

              const ydStr = parts[parts.length - 1] || '';
              const finalTopItem = parts.slice(8, parts.length - 1).join('|');

              let yd = [];
              if (ydStr) {
                yd = ydStr.split(';').map(item => {
                  const sub = item.split(',');
                  const fullYear = parseInt(sub[0], 10) + 2000;
                  const val = sub[1] === 'n' ? -1 : parseInt(sub[1], 36);
                  return [fullYear, val];
                });
              }

              return {
                r: rankVal,
                p: beat,
                t: finalTotal,
                o: totalOrders,
                ip: totalItems,
                s: finalSaved,
                ts: tsVal,
                archIdx: null,
                yd: yd
              };
            } else {
              // Fallback for version 1 (Base10 delimited string)
              const rankVal = parseInt(parts[1], 10);
              const beat = parseInt(parts[2], 10);
              const finalTotal = parseFloat(parts[3]);
              const totalOrders = parseInt(parts[4], 10);
              const totalItems = parseInt(parts[5], 10);
              const finalSaved = parseFloat(parts[6]);
              const tsVal = parseInt(parts[7], 10);

              const ydStr = parts[parts.length - 1] || '';
              let yd = [];
              if (ydStr) {
                yd = ydStr.split(';').map(item => {
                  const sub = item.split(',');
                  return [sub[0], parseFloat(sub[1])];
                });
              }

              return {
                r: rankVal,
                p: beat,
                t: finalTotal,
                o: totalOrders,
                ip: totalItems,
                s: finalSaved,
                ts: tsVal,
                archIdx: null,
                yd: yd
              };
            }
          }
        }
      }

      // 2. Fallback to older d= format
      const matchD = location.hash.match(/[#&]d=([^&]+)/);
      if (!matchD) return null;
      return JSON.parse(decodeURIComponent(escape(atob(matchD[1]))));
    } catch (err) {
      console.error("Failed to parse sharing data:", err);
      return null;
    }
  }


  /* ====================================================
     Render error
   ==================================================== */
  function renderError() {
    document.getElementById('story-frame').style.display = 'none';
    const errRoot = document.getElementById('error-root');
    errRoot.style.display = 'block';
    errRoot.innerHTML = `
    <div class="error-msg">
      <h2>Không tìm thấy dữ liệu</h2>
      <p>Link chia sẻ không hợp lệ hoặc đã hết hạn.</p>
    </div>
    <div style="text-align: center; margin-top: 24px; padding: 0 24px;">
      <a class="cta-btn" href="https://chromewebstore.google.com/detail/shopee-analytics-pro-th%E1%BB%91n/jcflofioiopfchfelgbpbndplhpfeapm" target="_blank">
        Cài Shopee Analytics Miễn Phí
      </a>
    </div>`;
  }

  /* ====================================================
     Main Render Slideshow
   ==================================================== */
  function renderSlideshow(d) {
    const rankLabel = RANKS[d.r] || RANKS[2];
    const beat = d.p || 0;
    const currentYear = new Date().getFullYear();

    // Slide 1: Welcome & Total Spent
    const totalFmt = fmtVND(d.t);
    const welcomeSlideHtml = `
    <div class="slide" id="slide-0">
      <div>
        <div class="slide-title">Shopee Analytics</div>
        <div class="slide-desc">Chào mừng bạn đến với tổng kết chi tiêu!</div>
      </div>
      <div class="glass-card" style="text-align: center; margin: auto 0; padding: 36px 20px;">
        <div style="font-size: 56px; margin-bottom: 16px;">🛍️</div>
        <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); letter-spacing: 1.5px; text-transform: uppercase;">Tổng Chi Tiêu Của Tôi</div>
        <div class="huge-amount" id="welcome-spent">0đ</div>
        <div style="margin-top: 14px;">
          <div class="rank-badge">${escHtml(rankLabel)}</div>
        </div>
      </div>
      <div class="story-footer">
        <a class="brand-logo" href="https://tr4n.github.io/shopee-stats" target="_blank" rel="noopener">
          <img src="../extension/icons/icon128.png" alt="Logo" class="brand-logo-img">
          <span>Shopee Analytics</span>
        </a>
        <span class="brand-date">${fmtDate(d.ts)}</span>
      </div>
    </div>`;

    // Slide 2: Percentile & Stats Grid
    const savedFmt = fmtVND(d.s);
    const statsSlideHtml = `
    <div class="slide" id="slide-1">
      <div>
        <div class="slide-title">Xếp hạng của bạn</div>
        <div class="slide-desc">Bạn là chiến thần mua sắm cấp độ nào?</div>
      </div>
      <div class="glass-card" style="margin: auto 0; padding: 20px 16px;">
        <div class="stats-grid">
          <div class="stat-box" style="text-align: center;">
            <div style="font-size: 28px; margin-bottom: 6px;">📦</div>
            <div class="stat-val" id="stat-orders">0</div>
            <div class="stat-lbl">Đơn hàng</div>
          </div>
          <div class="stat-box" style="text-align: center;">
            <div style="font-size: 28px; margin-bottom: 6px;">🛒</div>
            <div class="stat-val" id="stat-items">0</div>
            <div class="stat-lbl">Sản phẩm</div>
          </div>
          <div class="stat-box" style="grid-column: span 2; text-align: center; display: flex; align-items: center; justify-content: center; gap: 16px; padding: 20px;">
            <div style="font-size: 32px;">💰</div>
            <div style="text-align: left;">
              <div class="stat-val green" id="stat-saved">0đ</div>
              <div class="stat-lbl">Tiết kiệm được</div>
            </div>
          </div>
        </div>
      </div>
      <div class="story-footer">
        <a class="brand-logo" href="https://tr4n.github.io/shopee-stats" target="_blank" rel="noopener">
          <img src="../extension/icons/icon128.png" alt="Logo" class="brand-logo-img">
          <span>Shopee Analytics</span>
        </a>
        <span class="brand-date">${fmtDate(d.ts)}</span>
      </div>
    </div>`;

    // Slide 3: Personality / Archetype card
    const persona = resolvePersonality(d);
    const personalitySlideHtml = `
    <div class="slide" id="slide-2">
      <div>
        <div class="slide-title">Tính cách mua sắm</div>
        <div class="slide-desc">Chân dung chi tiêu độc bản của riêng bạn</div>
      </div>
      <div style="margin: auto 0;">
        <div class="personality-card">
          <div class="personality-icon-wrap">
            <span class="personality-icon">${escHtml(persona.icon)}</span>
          </div>
          <span class="personality-badge" style="background:${escHtml(persona.badgeBg)};color:${escHtml(persona.badgeColor)}">${escHtml(persona.icon)} ${escHtml(persona.label)}</span>
          <div class="personality-desc">${escHtml(persona.desc)}</div>
          <div class="personality-slogan">${escHtml(persona.slogan)}</div>
        </div>
      </div>
      <div class="story-footer">
        <a class="brand-logo" href="https://tr4n.github.io/shopee-stats" target="_blank" rel="noopener">
          <img src="../extension/icons/icon128.png" alt="Logo" class="brand-logo-img">
          <span>Shopee Analytics</span>
        </a>
        <span class="brand-date">${fmtDate(d.ts)}</span>
      </div>
    </div>`;

    // Slide 4: Yearly Breakdown
    const maxVal = Array.isArray(d.yd) ? Math.max(...d.yd.map(([, v]) => v), 1) : 1;
    const chartRowsHtml = Array.isArray(d.yd) ? d.yd.slice(-12).map(([y, v]) => {
      const pct = v < 0 ? 0 : Math.round((v / maxVal) * 100);
      const isCurrent = Number(y) === currentYear;
      const valFmt = fmtVND(v);
      return `
      <div class="year-row">
        <div class="year-label">${y}</div>
        <div class="year-bar-track">
          <div class="year-bar-fill ${isCurrent ? 'active-year' : ''}" data-pct="${pct}"></div>
        </div>
        <div class="year-val">${valFmt}</div>
      </div>`;
    }).join('') : '<div style="text-align:center;color:var(--text-muted);">Không có dữ liệu năm</div>';

    const yearlySlideHtml = `
    <div class="slide" id="slide-3">
      <div>
        <div class="slide-title">Dòng chảy thời gian</div>
        <div class="slide-desc">Biến động chi tiêu của bạn qua các năm</div>
      </div>
      <div class="glass-card" style="margin: auto 0; padding: 24px 20px;">
        <div class="year-chart">
          ${chartRowsHtml}
        </div>
      </div>
      <div class="story-footer">
        <a class="brand-logo" href="https://tr4n.github.io/shopee-stats" target="_blank" rel="noopener">
          <img src="../extension/icons/icon128.png" alt="Logo" class="brand-logo-img">
          <span>Shopee Analytics</span>
        </a>
        <span class="brand-date">${fmtDate(d.ts)}</span>
      </div>
    </div>`;

    // Slide 5: CTA
    const slogans = [
      "Kiếp này xin lỗi ví tiền! 💸",
      "Mua sắm vì đam mê, không vì cần! 🛍️",
      "Bàn tay vàng trong làng chốt đơn! 👑",
      "Kiểm soát chi tiêu, làm chủ tương lai! 💎",
      "Chốt đơn xuyên đêm, quên sầu ví rỗng! 🦉"
    ];
    const randomSlogan = slogans[Math.floor(Math.random() * slogans.length)];

    const ctaSlideHtml = `
    <div class="slide" id="slide-4">
      <div>
        <div class="slide-title">Đến lượt bạn</div>
        <div class="slide-desc">Khám phá và chia sẻ câu chuyện chi tiêu của riêng bạn</div>
      </div>
      <div class="glass-card cta-card" style="margin: auto 0; padding: 28px 20px;">
        <div class="sticker-slogan">${randomSlogan}</div>
        <div style="font-size: 14px; font-weight: 600; line-height: 1.6; color: var(--text); margin: 8px 0;">
          Xem thống kê chi tiêu Shopee của bạn bảo mật 100% offline với tiện ích <strong>Shopee Analytics</strong>.
        </div>
        <a class="cta-btn" href="https://chromewebstore.google.com/detail/shopee-analytics-pro-th%E1%BB%91n/jcflofioiopfchfelgbpbndplhpfeapm" target="_blank">
          Cài Đặt Tiện Ích Miễn Phí
        </a>
      </div>
      <div class="story-footer">
        <a class="brand-logo" href="https://tr4n.github.io/shopee-stats" target="_blank" rel="noopener">
          <img src="../extension/icons/icon128.png" alt="Logo" class="brand-logo-img">
          <span>Shopee Analytics</span>
        </a>
        <span class="brand-date">${fmtDate(d.ts)}</span>
      </div>
    </div>`;

    const slidesWrap = document.getElementById("slides-wrap");
    slidesWrap.innerHTML = welcomeSlideHtml + statsSlideHtml + personalitySlideHtml + yearlySlideHtml + ctaSlideHtml;

    // Slides logic
    const slides = Array.from(document.querySelectorAll(".slide"));
    const progressFills = Array.from(document.querySelectorAll(".story-progress-fill"));
    const nSlides = slides.length;

    let currentIdx = 0;
    let progress = 0;
    let lastTime = performance.now();
    let isPaused = false;
    const slideDuration = 7000;
    let animationFrameId = null;

    function showSlide(idx) {
      currentIdx = idx;
      progress = 0;

      // Auto-pause briefly so new slide has time to animate in before counting down
      isPaused = true;

      slides.forEach((slide, sIdx) => {
        slide.classList.toggle("active", sIdx === idx);
      });

      progressFills.forEach((fill, fIdx) => {
        if (fIdx < idx) {
          fill.style.width = "100%";
        } else {
          fill.style.width = "0%";
        }
      });

      triggerSlideAnimations(idx);

      // Resume after animations have had time to play (800ms grace period)
      setTimeout(() => {
        isPaused = false;
        lastTime = performance.now();
      }, 800);
    }

    function triggerSlideAnimations(idx) {
      if (idx === 0) {
        const totalEl = document.getElementById("welcome-spent");
        if (totalEl) animateCounter(totalEl, totalFmt, 1200);
        if (beat >= 80) setTimeout(launchConfetti, 300);
      } else if (idx === 1) {
        const svOrders = document.getElementById("stat-orders");
        const svItems = document.getElementById("stat-items");
        const svSaved = document.getElementById("stat-saved");
        if (svOrders) animateCounter(svOrders, fmtNum(d.o), 900);
        if (svItems) animateCounter(svItems, fmtNum(d.ip), 900);
        if (svSaved) animateCounter(svSaved, savedFmt, 900);
        if (beat >= 80) setTimeout(launchConfetti, 300);
      } else if (idx === 3) {
        document.querySelectorAll("#slide-3 .year-bar-fill").forEach((bar, bIdx) => {
          setTimeout(() => {
            bar.style.width = bar.getAttribute("data-pct") + '%';
          }, bIdx * 100);
        });
      }
    }

    function nextSlide() {
      if (currentIdx < nSlides - 1) {
        showSlide(currentIdx + 1);
      } else {
        showSlide(0);
      }
    }

    function prevSlide() {
      if (currentIdx > 0) {
        showSlide(currentIdx - 1);
      } else {
        showSlide(0);
      }
    }

    function loop(now) {
      const delta = now - lastTime;
      lastTime = now;

      if (!isPaused) {
        progress += (delta / slideDuration) * 100;
        if (progress >= 100) {
          progress = 0;
          nextSlide();
        } else {
          if (progressFills[currentIdx]) {
            progressFills[currentIdx].style.width = `${progress}%`;
          }
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    }

    const storyFrame = document.getElementById("story-frame");

    storyFrame.addEventListener("click", (e) => {
      // Ignore clicks on links, buttons, inputs, labels, and other interactive containers
      if (e.target.closest("a, button, input, label, .cta-btn, .actions-panel, #actions-panel, #btn-music-float")) {
        return;
      }

      const rect = storyFrame.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;

      if (clickX < width * 0.3) {
        prevSlide();
      } else {
        nextSlide();
      }
    });

    const pauseStart = () => { isPaused = true; };
    const pauseEnd = () => { isPaused = false; lastTime = performance.now(); };

    storyFrame.addEventListener("mousedown", pauseStart);
    storyFrame.addEventListener("mouseup", pauseEnd);
    storyFrame.addEventListener("mouseleave", pauseEnd);
    storyFrame.addEventListener("touchstart", pauseStart);
    storyFrame.addEventListener("touchend", pauseEnd);

    showSlide(0);
    // Note: isPaused will be reset to false by showSlide's setTimeout(800ms)
    animationFrameId = requestAnimationFrame(loop);
  }

  /* ====================================================
     Boot
   ==================================================== */
  const data = parseData();
  if (!data || !data.t) {
    renderError();
  } else {
    renderSlideshow(data);
    setupActions(data);
    setupDarkMode();
  }
})();
