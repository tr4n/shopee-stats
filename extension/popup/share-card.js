/**
 * Generates a 1080x1350 "Shopee Wrapped" share card using Canvas API.
 * Exposed as window.generateShareCard(data, getSpendingPercentile) → Promise<dataURL>
 */
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

  async function generateShareCard(data, getSpendingPercentile) {
    // Wait for fonts to be ready so Canvas can use Inter
    try { await document.fonts.ready; } catch (e) {}

    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const PAD = 72;

    // === Background gradient ===
    const bgGrad = ctx.createLinearGradient(0, 0, W * 0.6, H);
    bgGrad.addColorStop(0, '#c73516');
    bgGrad.addColorStop(0.5, '#ee4d2d');
    bgGrad.addColorStop(1, '#e84629');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Decorative blurred circles
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(W * 0.88, H * 0.08, 340, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.05, H * 0.82, 220, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.5, H * 0.45, 420, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Subtle dot pattern
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    for (let x = 40; x < W; x += 50) {
      for (let y = 40; y < H; y += 50) {
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Helper: draw text
    function txt(t, x, y, size, weight, color, align) {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.fillStyle = color || '#ffffff';
      ctx.textAlign = align || 'left';
      ctx.fillText(t, x, y);
    }

    const curYear = new Date().getFullYear();

    // === Header ===
    txt('SHOPEE ANALYTICS PRO', PAD, 110, 26, '600', 'rgba(255,255,255,0.65)');
    txt(`Tổng Kết ${curYear}`, PAD, 170, 60, '800', '#ffffff');

    // Accent line
    const lineGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    lineGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
    lineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(PAD, 188, W - PAD * 2, 2);

    // === Main amount ===
    const amtStr = fmtVND(data.tongtienhang) + 'đ';
    const amtSize = amtStr.length > 14 ? 78 : amtStr.length > 10 ? 92 : 110;
    txt(amtStr, PAD, 320, amtSize, '800', '#ffffff');

    // Rank pill
    const rankStr = getRankStr(data.tongtienhang);
    ctx.font = `700 30px ${FONT}`;
    const rankW = Math.min(ctx.measureText(rankStr).width + 48, W - PAD * 2);
    roundedRect(ctx, PAD, 340, rankW, 56, 28, 'rgba(255,255,255,0.18)');
    txt(rankStr, PAD + 24, 378, 28, '700', '#ffffff');

    // === Stats card ===
    roundedRect(ctx, PAD, 434, W - PAD * 2, 210, 20, 'rgba(0,0,0,0.22)');

    const statColL = PAD + 36;
    const statColR = W / 2 + 24;
    const statY1 = 498, statY2 = 602;

    // Orders
    txt(fmtNum(data.tongDonHang), statColL, statY1, 52, '800', '#ffffff');
    txt('đơn hàng', statColL, statY1 + 36, 22, '500', 'rgba(255,255,255,0.65)');
    // Items
    txt(fmtNum(data.tongSanPhamDaMua), statColR, statY1, 52, '800', '#ffffff');
    txt('sản phẩm', statColR, statY1 + 36, 22, '500', 'rgba(255,255,255,0.65)');

    // Savings
    txt(fmtVND(Math.max(0, data.tongTienTietKiem)) + 'đ', statColL, statY2, 44, '800', '#5fe8cc');
    txt('tiết kiệm', statColL, statY2 + 30, 22, '500', 'rgba(255,255,255,0.65)');
    // Shipping
    txt(fmtVND(data.tongPhiShip || 0) + 'đ', statColR, statY2, 44, '800', '#ffffff');
    txt('phí ship', statColR, statY2 + 30, 22, '500', 'rgba(255,255,255,0.65)');

    // === Divider ===
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(PAD, 684, W - PAD * 2, 1.5);

    // === Top Section ===
    let topY = 710;
    const hasTopShop = data.topShops && data.topShops.length > 0;
    const hasTopItem = data.topItems && data.topItems.length > 0;

    if (hasTopShop) {
      txt('🏆  Cửa Hàng Hàng Đầu', PAD, topY + 44, 28, '600', 'rgba(255,255,255,0.75)');
      txt(truncate(data.topShops[0].name, 32), PAD, topY + 96, 42, '800', '#ffffff');
      txt(fmtVND(data.topShops[0].spent) + 'đ · ' + fmtNum(data.topShops[0].count) + ' đơn', PAD, topY + 132, 24, '400', 'rgba(255,255,255,0.6)');
    }
    if (hasTopItem) {
      const col2 = hasTopShop ? W / 2 + 12 : PAD;
      txt('🛒  Sản Phẩm Ưa Thích', col2, topY + 44, 28, '600', 'rgba(255,255,255,0.75)');
      txt(truncate(data.topItems[0].name, hasTopShop ? 22 : 32), col2, topY + 96, 38, '800', '#ffffff');
      txt(fmtNum(data.topItems[0].count) + ' lần mua', col2, topY + 132, 24, '400', 'rgba(255,255,255,0.6)');
    }

    // === Percentile bar ===
    const pctY = 900;
    const annualSpent = (data.thongKeTheoNam && data.thongKeTheoNam[curYear])
      ? data.thongKeTheoNam[curYear].total.tongTien : 0;
    const beat = typeof getSpendingPercentile === 'function' ? getSpendingPercentile(annualSpent) : 50;

    roundedRect(ctx, PAD, pctY, W - PAD * 2, 160, 18, 'rgba(0,0,0,0.22)');
    txt(`Chi tiêu nhiều hơn ~${beat}% người dùng Shopee VN`, PAD + 30, pctY + 52, 28, '600', 'rgba(255,255,255,0.88)');
    txt(`ước tính năm ${curYear}`, PAD + 30, pctY + 88, 22, '400', 'rgba(255,255,255,0.55)');

    // Progress bar
    const barX = PAD + 30, barY2 = pctY + 114, barW = W - PAD * 2 - 60, barH = 12;
    roundedRect(ctx, barX, barY2, barW, barH, 6, 'rgba(255,255,255,0.2)');
    if (beat > 0) roundedRect(ctx, barX, barY2, barW * (beat / 100), barH, 6, '#5fe8cc');

    // === Footer ===
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(PAD, 1108, W - PAD * 2, 1);
    txt('Tạo bởi Shopee Analytics Pro', PAD, 1172, 24, '500', 'rgba(255,255,255,0.5)');
    txt('bit.ly/shopee-analytics', W - PAD, 1172, 22, '400', 'rgba(255,255,255,0.4)', 'right');

    // Bottom tagline
    const tagline = `${fmtNum(data.tongDonHang)} đơn · ${fmtNum(data.tongSanPhamDaMua)} sản phẩm · ${fmtVND(data.tongtienhang)}đ`;
    txt(tagline, W / 2, 1270, 26, '600', 'rgba(255,255,255,0.35)', 'center');

    return canvas.toDataURL('image/png');
  }

  window.generateShareCard = generateShareCard;
})();
