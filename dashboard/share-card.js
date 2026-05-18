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

  function fmtVND(n) {
    n = Math.round(n || 0);
    if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace('.0', '') + ' tỷ';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + ' triệu';
    if (n >= 1000) return Math.round(n / 1000) + 'k';
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

  async function generateShareCard(d, beat) {
    try { await document.fonts.ready; } catch (e) {}

    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const PAD = 72;

    const bgGrad = ctx.createLinearGradient(0, 0, W * 0.6, H);
    bgGrad.addColorStop(0, '#c73516');
    bgGrad.addColorStop(0.5, '#ee4d2d');
    bgGrad.addColorStop(1, '#e84629');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(W * 0.88, H * 0.08, 340, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.05, H * 0.82, 220, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.5, H * 0.45, 420, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    for (let x = 40; x < W; x += 50) {
      for (let y = 40; y < H; y += 50) {
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    function txt(t, x, y, size, weight, color, align) {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.fillStyle = color || '#ffffff';
      ctx.textAlign = align || 'left';
      ctx.fillText(t, x, y);
    }

    const curYear = new Date().getFullYear();

    txt('SHOPEE ANALYTICS PRO', PAD, 110, 26, '600', 'rgba(255,255,255,0.65)');
    txt(`Tổng Kết ${curYear}`, PAD, 170, 60, '800', '#ffffff');

    const lineGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    lineGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
    lineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(PAD, 188, W - PAD * 2, 2);

    const amtStr = fmtVND(d.t) + 'đ';
    const amtSize = amtStr.length > 14 ? 78 : amtStr.length > 10 ? 92 : 110;
    txt(amtStr, PAD, 320, amtSize, '800', '#ffffff');

    const rankStr = getRankStr(d.t);
    ctx.font = `700 30px ${FONT}`;
    const rankW = Math.min(ctx.measureText(rankStr).width + 48, W - PAD * 2);
    roundedRect(ctx, PAD, 340, rankW, 56, 28, 'rgba(255,255,255,0.18)');
    txt(rankStr, PAD + 24, 378, 28, '700', '#ffffff');

    roundedRect(ctx, PAD, 434, W - PAD * 2, 210, 20, 'rgba(0,0,0,0.22)');

    const statColL = PAD + 36;
    const statColR = W / 2 + 24;
    const statY1 = 498, statY2 = 602;

    txt(fmtNum(d.o), statColL, statY1, 52, '800', '#ffffff');
    txt('đơn hàng', statColL, statY1 + 36, 22, '500', 'rgba(255,255,255,0.65)');

    txt(fmtNum(d.ip), statColR, statY1, 52, '800', '#ffffff');
    txt('sản phẩm', statColR, statY1 + 36, 22, '500', 'rgba(255,255,255,0.65)');

    txt(fmtVND(Math.max(0, d.s)) + 'đ', statColL, statY2, 44, '800', '#5fe8cc');
    txt('tiết kiệm', statColL, statY2 + 30, 22, '500', 'rgba(255,255,255,0.65)');

    txt(fmtVND(d.ship || 0) + 'đ', statColR, statY2, 44, '800', '#ffffff');
    txt('phí ship', statColR, statY2 + 30, 22, '500', 'rgba(255,255,255,0.65)');

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(PAD, 684, W - PAD * 2, 1.5);

    let topY = 710;
    const hasTopItem = d.ti && d.ti.length > 0;
    if (hasTopItem) {
      txt('🛒  Sản Phẩm Chi Tiêu Nhiều Nhất', PAD, topY + 44, 28, '600', 'rgba(255,255,255,0.75)');
      txt(truncate(d.ti[0].n, 36), PAD, topY + 96, 40, '800', '#ffffff');
      txt(fmtVND(d.ti[0].s) + 'đ · ' + fmtNum(d.ti[0].c) + ' lần mua', PAD, topY + 132, 24, '400', 'rgba(255,255,255,0.6)');
    }

    const pctY = 900;
    beat = typeof beat === 'number' ? beat : 50;

    roundedRect(ctx, PAD, pctY, W - PAD * 2, 160, 18, 'rgba(0,0,0,0.22)');
    txt(`Chi tiêu nhiều hơn ~${beat}% người dùng Shopee VN`, PAD + 30, pctY + 52, 28, '600', 'rgba(255,255,255,0.88)');
    txt(`ước tính năm ${curYear}`, PAD + 30, pctY + 88, 22, '400', 'rgba(255,255,255,0.55)');

    const barX = PAD + 30, barY2 = pctY + 114, barW = W - PAD * 2 - 60, barH = 12;
    roundedRect(ctx, barX, barY2, barW, barH, 6, 'rgba(255,255,255,0.2)');
    if (beat > 0) roundedRect(ctx, barX, barY2, barW * (beat / 100), barH, 6, '#5fe8cc');

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(PAD, 1108, W - PAD * 2, 1);
    txt('Tạo bởi Shopee Analytics Pro', PAD, 1172, 24, '500', 'rgba(255,255,255,0.5)');
    txt('bit.ly/shopee-analytics', W - PAD, 1172, 22, '400', 'rgba(255,255,255,0.4)', 'right');

    const tagline = `${fmtNum(d.o)} đơn · ${fmtNum(d.ip)} sản phẩm · ${fmtVND(d.t)}đ`;
    txt(tagline, W / 2, 1270, 26, '600', 'rgba(255,255,255,0.35)', 'center');

    return canvas.toDataURL('image/png');
  }

  window.generateDashboardShareCard = generateShareCard;
})();
