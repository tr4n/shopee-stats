(function () {
  'use strict';

  function roundedRect(ctx, x, y, w, h, r, fillColor) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  function truncate(str, maxLen) {
    if (!str) return '';
    const s = String(str);
    return s.length > maxLen ? s.substring(0, maxLen - 1) + '…' : s;
  }

  function fmtVND(n, hide) {
    if (hide) return '***';
    n = Math.round(n || 0);
    if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace('.0', '') + 'b';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'm';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
    return n.toLocaleString('vi-VN');
  }

  function fmtNum(n) {
    return Math.round(n || 0).toLocaleString('vi-VN');
  }

  function getRankStr(total) {
    if (total <= 10000000) return 'Khách Tập Sự 👶';
    if (total <= 50000000) return 'Khách Quen 🤝';
    if (total < 80000000) return 'Tín Đồ Cuồng Nhiệt 👑';
    return 'Cổ Đông Chiến Lược 💎';
  }

  const THEMES = {
    light: {
      bg: ['#ffffff', '#f8f9fa', '#f1f3f5'],
      accent: '#ee4d2d',
      secondary: '#00b894',
      surface: '#ffffff',
      surfaceBorder: 'rgba(0,0,0,0.08)',
      text: '#0f172a',
      textMuted: '#64748b',
      textFaint: '#cbd5e1',
      divider: 'rgba(0,0,0,0.05)',
      shadow: 'rgba(0,0,0,0.03)'
    },
    minimal: {
      bg: ['#fafafa', '#ffffff', '#fafafa'],
      accent: '#000000',
      secondary: '#666666',
      surface: '#ffffff',
      surfaceBorder: '#eaeaea',
      text: '#000000',
      textMuted: '#666666',
      textFaint: '#999999',
      divider: '#eaeaea',
      shadow: 'rgba(0,0,0,0.02)'
    },
    orange: {
      bg: ['#ff6b35', '#f7931e', '#ee4d2d'],
      accent: '#ffffff',
      secondary: '#ffd23f',
      surface: 'rgba(255,255,255,0.1)',
      surfaceBorder: 'rgba(255,255,255,0.2)',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.85)',
      textFaint: 'rgba(255,255,255,0.5)',
      divider: 'rgba(255,255,255,0.15)',
      shadow: 'rgba(0,0,0,0.1)'
    },
    dark: {
      bg: ['#0f172a', '#1e293b', '#020617'],
      accent: '#38bdf8',
      secondary: '#f43f5e',
      surface: 'rgba(255,255,255,0.03)',
      surfaceBorder: 'rgba(255,255,255,0.08)',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      textFaint: '#475569',
      divider: 'rgba(255,255,255,0.05)',
      shadow: 'rgba(0,0,0,0.2)'
    }
  };

  function roundedRect(ctx, x, y, w, h, r, fillColor, shadowColor) {
    if (shadowColor) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 15;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    // reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  async function generateShareCard(d, options = {}) {
    try { await document.fonts.ready; } catch (e) { }

    const {
      theme = 'light',
      hideAmount = false,
      hideNames = false,
      cardType = 'overview', // 'overview', 'items', 'monthly'
      beat = 50,
      month = null,
      year = new Date().getFullYear()
    } = options;

    const W = 1080, H = 1920; // Changed to 1920 for beautiful story layout
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const logoImg = new Image();
    logoImg.src = '../extension/icons/icon128.png';
    await new Promise(r => { logoImg.onload = r; logoImg.onerror = r; });

    const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const PAD = 80;

    const tColors = THEMES[theme] || THEMES.light;

    // 1. Background
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, tColors.bg[0]);
    bgGrad.addColorStop(0.5, tColors.bg[1]);
    bgGrad.addColorStop(1, tColors.bg[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Decorative Elements
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = tColors.surfaceBorder;
    ctx.beginPath(); ctx.arc(W * 0.9, H * 0.1, 400, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.1, H * 0.8, 300, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    function txt(t, x, y, size, weight, color, align = 'left') {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.fillStyle = color || tColors.text;
      ctx.textAlign = align;
      ctx.fillText(t, x, y);
    }

    // 3. Header
    const headY = 120;
    if (logoImg.complete && logoImg.naturalHeight > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(PAD, headY - 32, 40, 40, 10);
      ctx.clip();
      ctx.drawImage(logoImg, PAD, headY - 32, 40, 40);
      ctx.restore();
      txt('SHOPEE ANALYTICS', PAD + 60, headY - 3, 24, '800', tColors.textMuted);
    } else {
      txt('SHOPEE ANALYTICS', PAD, headY - 3, 24, '800', tColors.textMuted);
    }

    let titleStr = `Tổng Quan Chi Tiêu`;
    if (cardType === 'items') titleStr = `Top Sản Phẩm Chi Tiêu`;
    if (cardType === 'monthly') titleStr = month ? `Tháng ${month} / ${year}` : `Chi Tiêu Năm ${year}`;

    txt(titleStr, PAD, headY + 70, 56, '900', tColors.text);

    // Accent line
    const lineGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    lineGrad.addColorStop(0, tColors.accent);
    lineGrad.addColorStop(0.5, tColors.divider);
    lineGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(PAD, headY + 110, W - PAD * 2, 4);

    if (cardType === 'overview') {
      // Amount Section
      const amtY = headY + 280;
      const amtStr = fmtVND(d.t, hideAmount);
      const amtSize = amtStr.length > 14 ? 80 : 100;
      txt('TỔNG CHI TIÊU', PAD, amtY - 90, 24, '700', tColors.textMuted);
      txt(amtStr, PAD, amtY - 10, amtSize, '900', tColors.text);

      const rankStr = getRankStr(d.t);
      ctx.font = `800 28px ${FONT}`;
      const rankW = Math.min(ctx.measureText(rankStr).width + 60, W - PAD * 2);

      roundedRect(ctx, PAD, amtY + 30, rankW, 56, 28, tColors.surface, tColors.shadow);
      ctx.strokeStyle = tColors.surfaceBorder;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(PAD, amtY + 30, rankW, 56, 28); ctx.stroke();

      txt(rankStr, PAD + 30, amtY + 68, 26, '800', tColors.accent);

      // Grid of stats
      const statsY = amtY + 180;
      const boxW = (W - PAD * 2 - 40) / 2;
      const boxH = 220;

      const drawStatBox = (x, y, w, h, label, val, valColor, icon) => {
        roundedRect(ctx, x, y, w, h, 30, tColors.surface, tColors.shadow);
        ctx.strokeStyle = tColors.surfaceBorder;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 30); ctx.stroke();

        txt(icon, x + 40, y + 60, 36, '400', tColors.text);
        txt(label, x + 40, y + 120, 20, '600', tColors.textMuted);
        txt(val, x + 40, y + 175, 42, '800', valColor);
      };

      drawStatBox(PAD, statsY, boxW, boxH, 'ĐƠN HÀNG', fmtNum(d.o), tColors.text, '📦');
      drawStatBox(PAD + boxW + 40, statsY, boxW, boxH, 'SẢN PHẨM', fmtNum(d.ip), tColors.text, '🛍️');

      drawStatBox(PAD, statsY + boxH + 40, boxW, boxH, 'ĐÃ TIẾT KIỆM', fmtVND(Math.max(0, d.s), hideAmount), tColors.accent, '💰');
      if (d.ship && d.ship > 0) {
        drawStatBox(PAD + boxW + 40, statsY + boxH + 40, boxW, boxH, 'PHÍ VẬN CHUYỂN', fmtVND(d.ship, hideAmount), tColors.secondary, '🚚');
      }
      // Top Item Card
      let topItemY = statsY + boxH * 2 + 100;
      const hasTopItem = d.ti && d.ti.length > 0;
      if (hasTopItem) {
        roundedRect(ctx, PAD, topItemY, W - PAD * 2, 200, 30, tColors.surface, tColors.shadow);
        ctx.strokeStyle = tColors.surfaceBorder;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(PAD, topItemY, W - PAD * 2, 200, 30); ctx.stroke();

        txt('SẢN PHẨM YÊU THÍCH NHẤT', PAD + 40, topItemY + 50, 20, '700', tColors.textMuted);
        const itemName = hideNames ? 'Sản phẩm đã ẩn tên' : truncate(d.ti[0].n, 35);
        txt(itemName, PAD + 40, topItemY + 110, 36, '800', tColors.text);
        txt(fmtVND(d.ti[0].s, hideAmount) + '  •  ' + fmtNum(d.ti[0].c) + ' lần mua', PAD + 40, topItemY + 160, 24, '600', tColors.textMuted);
      }

      // Percentile Card
      const pctY = hasTopItem ? topItemY + 240 : topItemY;
      roundedRect(ctx, PAD, pctY, W - PAD * 2, 160, 30, tColors.surface, tColors.shadow);
      ctx.strokeStyle = tColors.surfaceBorder;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(PAD, pctY, W - PAD * 2, 160, 30); ctx.stroke();

      txt(`Chi tiêu nhiều hơn ${beat}% người dùng`, PAD + 40, pctY + 60, 28, '700', tColors.text);
      txt(`Hệ thống Shopee Analytics`, PAD + 40, pctY + 100, 20, '500', tColors.textMuted);

      const barX = PAD + 40, barY2 = pctY + 125, barW = W - PAD * 2 - 80, barH = 10;
      roundedRect(ctx, barX, barY2, barW, barH, 5, tColors.divider);

      if (beat > 0) {
        const progGrad = ctx.createLinearGradient(barX, 0, barX + barW * (beat / 100), 0);
        progGrad.addColorStop(0, tColors.accent);
        progGrad.addColorStop(1, tColors.secondary);
        roundedRect(ctx, barX, barY2, barW * (beat / 100), barH, 5, progGrad);
      }

    } else if (cardType === 'items' || cardType === 'monthly') {
      let items = [];
      let totalSpent = 0;

      if (cardType === 'items') {
        items = d.ti || [];
        totalSpent = d.t;
      } else {
        const ym = `${year}-${month}`;
        items = (d.mi && d.mi[ym]) || [];
        totalSpent = (d.yd && d.yd[year] && d.yd[year].m && d.yd[year].m[month]) ? d.yd[year].m[month] : items.reduce((a, b) => a + b.s, 0);
      }

      const amtStr = fmtVND(totalSpent, hideAmount);
      txt('TỔNG CHI TIÊU', PAD, headY + 220, 24, '700', tColors.textMuted);
      txt(amtStr, PAD, headY + 300, 84, '900', tColors.text);

      const listY = headY + 380;
      roundedRect(ctx, PAD, listY, W - PAD * 2, 1100, 40, tColors.surface, tColors.shadow);
      ctx.strokeStyle = tColors.surfaceBorder;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(PAD, listY, W - PAD * 2, 1100, 40); ctx.stroke();

      const top6 = items.slice(0, 6);
      if (top6.length === 0) {
        txt('Không có dữ liệu', PAD + 60, listY + 100, 32, '600', tColors.textMuted);
      } else {
        const maxS = Math.max(...top6.map(i => i.s), 1);
        let startY = listY + 70;

        top6.forEach((item, idx) => {
          const itemName = hideNames ? 'Sản phẩm đã ẩn tên' : truncate(item.n, 36);
          const pct = Math.max(0.05, item.s / maxS);

          const rankGrad = ctx.createLinearGradient(PAD + 60, startY, PAD + 100, startY + 40);
          rankGrad.addColorStop(0, tColors.accent);
          rankGrad.addColorStop(1, tColors.secondary);
          roundedRect(ctx, PAD + 60, startY - 10, 44, 44, 12, rankGrad);

          txt(`${idx + 1}`, PAD + 82, startY + 20, 22, '800', '#ffffff', 'center');

          txt(itemName, PAD + 130, startY + 5, 30, '700', tColors.text);
          txt(fmtVND(item.s, hideAmount) + `  •  ${item.c} lần mua`, PAD + 130, startY + 45, 22, '500', tColors.textMuted);

          const barX = PAD + 130, barY = startY + 70, barW = W - PAD * 2 - 190, barH = 8;
          roundedRect(ctx, barX, barY, barW, barH, 4, tColors.divider);

          const progBarGrad = ctx.createLinearGradient(barX, 0, barX + barW * pct, 0);
          progBarGrad.addColorStop(0, tColors.accent);
          progBarGrad.addColorStop(1, tColors.secondary);
          roundedRect(ctx, barX, barY, barW * pct, barH, 4, progBarGrad);

          startY += 160;
        });
      }
    }

    // Footer
    const footerY = H - 120;

    const footerDivGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    footerDivGrad.addColorStop(0, 'transparent');
    footerDivGrad.addColorStop(0.5, tColors.divider);
    footerDivGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = footerDivGrad;
    ctx.fillRect(PAD, footerY - 40, W - PAD * 2, 2);

    txt('SHOPEE ANALYTICS PRO', W / 2, footerY, 24, '800', tColors.textFaint, 'center');

    if (cardType === 'overview') {
      const summary = `${fmtNum(d.o)} đơn hàng  •  ${fmtNum(d.ip)} sản phẩm`;
      txt(summary, W / 2, footerY + 40, 20, '600', tColors.textFaint, 'center');
      if (window.APP_CONFIG) txt(`${window.APP_CONFIG.authorIcon} ${window.APP_CONFIG.authorText}`, W / 2, footerY + 80, 18, '500', tColors.textFaint, 'center');
    } else {
      if (window.APP_CONFIG) txt(`${window.APP_CONFIG.authorIcon} ${window.APP_CONFIG.authorText}`, W / 2, footerY + 40, 18, '500', tColors.textFaint, 'center');
    }

    return canvas.toDataURL('image/png', 0.9);
  }

  window.generateDashboardShareCard = generateShareCard;
})();

