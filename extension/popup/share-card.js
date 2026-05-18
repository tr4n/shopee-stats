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
    const PAD = 60;

    // Modern gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#ff6b35');
    bgGrad.addColorStop(0.35, '#f7931e');
    bgGrad.addColorStop(1, '#ee4d2d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Add subtle mesh gradient overlay
    const meshGrad = ctx.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, W * 0.8);
    meshGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
    meshGrad.addColorStop(1, 'rgba(0,0,0,0.05)');
    ctx.fillStyle = meshGrad;
    ctx.fillRect(0, 0, W, H);

    // Modern geometric decorative elements
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ffffff';
    // Large circles
    ctx.beginPath(); ctx.arc(W * 0.85, H * 0.12, 280, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.15, H * 0.85, 200, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.65, H * 0.6, 350, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Subtle grid pattern instead of dots
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
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

    // Modern header with better spacing
    txt('SHOPEE ANALYTICS', PAD, 100, 22, '700', 'rgba(255,255,255,0.8)');
    txt(`Tổng Kết ${curYear}`, PAD, 150, 48, '900', '#ffffff');

    // Modern accent line with gradient
    const lineGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    lineGrad.addColorStop(0, '#00d9ff');
    lineGrad.addColorStop(0.7, 'rgba(255,255,255,0.4)');
    lineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(PAD, 165, W - PAD * 2, 3);
    
    // Add subtle shadow line
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(PAD, 168, W - PAD * 2, 1);

    // === Main amount ===
    const amtStr = fmtVND(data.tongtienhang) + 'đ';
    const amtSize = amtStr.length > 14 ? 68 : amtStr.length > 10 ? 82 : 96;
    txt(amtStr, PAD, 280, amtSize, '900', '#ffffff');

    // Modern rank pill
    const rankStr = getRankStr(data.tongtienhang);
    ctx.font = `800 26px ${FONT}`;
    const rankW = Math.min(ctx.measureText(rankStr).width + 56, W - PAD * 2);
    
    // Modern pill with glass effect
    const pillGrad = ctx.createLinearGradient(PAD, 310, PAD + rankW, 310);
    pillGrad.addColorStop(0, 'rgba(255,255,255,0.1)');
    pillGrad.addColorStop(1, 'rgba(255,255,255,0.05)');
    roundedRect(ctx, PAD, 310, rankW, 48, 24, pillGrad);
    
    // Add border highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(PAD, 310, rankW, 48, 24);
    ctx.stroke();
    
    txt(rankStr, PAD + 28, 342, 24, '800', '#ffffff');

    // Modern glass card with better styling
    const cardGrad = ctx.createLinearGradient(PAD, 390, PAD, 580);
    cardGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
    cardGrad.addColorStop(1, 'rgba(255,255,255,0.08)');
    roundedRect(ctx, PAD, 390, W - PAD * 2, 190, 24, cardGrad);
    
    // Card border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(PAD, 390, W - PAD * 2, 190, 24);
    ctx.stroke();

    const statColL = PAD + 40, statColR = W / 2 + 20;
    const statY1 = 450, statY2 = 530;

    // Main stats with better typography
    txt(fmtNum(data.tongDonHang), statColL, statY1, 44, '900', '#ffffff');
    txt('ĐƠN HÀNG', statColL, statY1 + 28, 18, '700', 'rgba(255,255,255,0.7)');

    txt(fmtNum(data.tongSanPhamDaMua), statColR, statY1, 44, '900', '#ffffff');
    txt('SẢN PHẨM', statColR, statY1 + 28, 18, '700', 'rgba(255,255,255,0.7)');

    // Secondary stats with accent colors
    txt(fmtVND(Math.max(0, data.tongTienTietKiem)) + 'đ', statColL, statY2, 38, '800', '#00d9ff');
    txt('TIẾT KIỆM', statColL, statY2 + 24, 16, '600', 'rgba(255,255,255,0.6)');

    txt(fmtVND(data.tongPhiShip || 0) + 'đ', statColR, statY2, 38, '800', '#ffd23f');
    txt('PHÍ SHIP', statColR, statY2 + 24, 16, '600', 'rgba(255,255,255,0.6)');

    // Modern divider
    const dividerGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    dividerGrad.addColorStop(0, 'rgba(255,255,255,0)');
    dividerGrad.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    dividerGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = dividerGrad;
    ctx.fillRect(PAD, 620, W - PAD * 2, 2);

    // === Top Item Section ===
    let topY = 640;
    const hasTopItem = data.topItems && data.topItems.length > 0;

    if (hasTopItem) {
      // Icon with background circle
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath(); 
      ctx.arc(PAD + 20, topY + 50, 20, 0, Math.PI * 2); 
      ctx.fill();
      txt('🛒', PAD + 15, topY + 57, 20, '400', '#ffffff');
      
      txt('SẢN PHẨM YÊU THÍCH', PAD + 50, topY + 36, 22, '700', 'rgba(255,255,255,0.8)');
      txt(truncate(data.topItems[0].name, 32), PAD, topY + 80, 32, '800', '#ffffff');
      txt(fmtVND(data.topItems[0].spent) + 'đ • ' + fmtNum(data.topItems[0].count) + ' lần mua', PAD, topY + 110, 20, '500', 'rgba(255,255,255,0.65)');
    }

    // === Percentile bar ===
    const pctY = 780;
    const annualSpent = (data.thongKeTheoNam && data.thongKeTheoNam[curYear])
      ? data.thongKeTheoNam[curYear].total.tongTien : 0;
    const beat = typeof getSpendingPercentile === 'function' ? getSpendingPercentile(annualSpent) : 50;

    // Modern percentile card
    const pctGrad = ctx.createLinearGradient(PAD, pctY, PAD, pctY + 140);
    pctGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
    pctGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
    roundedRect(ctx, PAD, pctY, W - PAD * 2, 140, 20, pctGrad);
    
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(PAD, pctY, W - PAD * 2, 140, 20);
    ctx.stroke();

    txt(`Chi tiêu nhiều hơn ${beat}% người dùng`, PAD + 30, pctY + 42, 24, '700', 'rgba(255,255,255,0.9)');
    txt(`Năm ${curYear}`, PAD + 30, pctY + 70, 18, '500', 'rgba(255,255,255,0.6)');

    // Modern progress bar with gradient
    const barX = PAD + 30, barY2 = pctY + 95, barW = W - PAD * 2 - 60, barH = 8;
    roundedRect(ctx, barX, barY2, barW, barH, 4, 'rgba(255,255,255,0.15)');
    
    if (beat > 0) {
      const progGrad = ctx.createLinearGradient(barX, 0, barX + barW * (beat / 100), 0);
      progGrad.addColorStop(0, '#00d9ff');
      progGrad.addColorStop(1, '#ffd23f');
      roundedRect(ctx, barX, barY2, barW * (beat / 100), barH, 4, progGrad);
    }

    // Clean minimal footer - removed URLs and excess info
    const footerY = 1000;
    
    // Subtle divider
    const footerDivGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    footerDivGrad.addColorStop(0, 'rgba(255,255,255,0)');
    footerDivGrad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    footerDivGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = footerDivGrad;
    ctx.fillRect(PAD, footerY, W - PAD * 2, 1);

    // Simple branding
    txt('SHOPEE ANALYTICS', W / 2, footerY + 80, 20, '600', 'rgba(255,255,255,0.4)', 'center');
    
    // Clean summary without URLs
    const summary = `${fmtNum(data.tongDonHang)} đơn hàng • ${fmtNum(data.tongSanPhamDaMua)} sản phẩm`;
    txt(summary, W / 2, footerY + 110, 22, '500', 'rgba(255,255,255,0.3)', 'center');

    return canvas.toDataURL('image/png');
  }

  window.generateShareCard = generateShareCard;
})();
