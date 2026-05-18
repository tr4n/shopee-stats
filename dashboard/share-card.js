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
    if (hide) return '*** đ';
    n = Math.round(n || 0);
    if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace('.0', '') + ' tỷ đ';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + ' triệu đ';
    if (n >= 1000) return Math.round(n / 1000) + 'k đ';
    return n.toLocaleString('vi-VN') + ' đ';
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
      surface: 'rgba(0,0,0,0.03)',
      surfaceBorder: 'rgba(0,0,0,0.08)',
      text: '#1e293b',
      textMuted: '#64748b',
      textFaint: '#94a3b8',
      divider: 'rgba(0,0,0,0.1)'
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
      divider: '#eaeaea'
    },
    orange: { 
      bg: ['#ff6b35', '#f7931e', '#ee4d2d'], 
      accent: '#ffffff',
      secondary: '#ffd23f',
      surface: 'rgba(255,255,255,0.1)',
      surfaceBorder: 'rgba(255,255,255,0.2)',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.8)',
      textFaint: 'rgba(255,255,255,0.5)',
      divider: 'rgba(255,255,255,0.3)'
    },
    dark: { 
      bg: ['#1a1a2e', '#16213e', '#0f0f23'], 
      accent: '#00d9ff',
      secondary: '#ff6b6b',
      surface: 'rgba(255,255,255,0.08)',
      surfaceBorder: 'rgba(255,255,255,0.15)',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.7)',
      textFaint: 'rgba(255,255,255,0.4)',
      divider: 'rgba(255,255,255,0.2)'
    }
  };

  async function generateShareCard(d, options = {}) {
    try { await document.fonts.ready; } catch (e) {}

    const {
      theme = 'light',
      hideAmount = false,
      hideNames = false,
      cardType = 'overview', // 'overview', 'items', 'monthly'
      beat = 50,
      month = null,
      year = new Date().getFullYear()
    } = options;

    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const logoImg = new Image();
    logoImg.src = '../extension/icons/icon128.png';
    await new Promise(r => {
      logoImg.onload = r;
      logoImg.onerror = r;
    });

    const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const PAD = 60;

    const tColors = THEMES[theme] || THEMES.light;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, tColors.bg[0]);
    bgGrad.addColorStop(0.35, tColors.bg[1]);
    bgGrad.addColorStop(1, tColors.bg[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle mesh
    const meshGrad = ctx.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, W * 0.8);
    meshGrad.addColorStop(0, tColors.surface);
    meshGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = meshGrad;
    ctx.fillRect(0, 0, W, H);

    // Decorative elements
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = tColors.surface;
    ctx.beginPath(); ctx.arc(W * 0.85, H * 0.12, 280, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.15, H * 0.85, 200, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.65, H * 0.6, 350, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Grid pattern
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = tColors.surfaceBorder;
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    function txt(t, x, y, size, weight, color, align) {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.fillStyle = color || tColors.text;
      ctx.textAlign = align || 'left';
      ctx.fillText(t, x, y);
    }

    if (logoImg.complete && logoImg.naturalHeight > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(PAD, 72, 32, 32, 8);
      ctx.clip();
      ctx.drawImage(logoImg, PAD, 72, 32, 32);
      ctx.restore();
      txt('SHOPEE ANALYTICS', PAD + 44, 96, 22, '800', tColors.textMuted);
    } else {
      txt('SHOPEE ANALYTICS', PAD, 96, 22, '800', tColors.textMuted);
    }
    
    let titleStr = `Tổng Quan Chi Tiêu`;
    if (cardType === 'items') titleStr = `Top Sản Phẩm Chi Tiêu`;
    if (cardType === 'monthly') titleStr = month ? `Tháng ${month}/${year}` : `Chi Tiêu Năm ${year}`;
    
    txt(titleStr, PAD, 150, 48, '900', tColors.text);

    // Accent line
    const lineGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    lineGrad.addColorStop(0, tColors.accent);
    lineGrad.addColorStop(0.7, tColors.divider);
    lineGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(PAD, 165, W - PAD * 2, 3);

    if (cardType === 'overview') {
      const amtStr = fmtVND(d.t, hideAmount);
      const amtSize = amtStr.length > 14 ? 68 : amtStr.length > 10 ? 82 : 96;
      txt(amtStr, PAD, 280, amtSize, '900', tColors.text);

      const rankStr = getRankStr(d.t);
      ctx.font = `800 26px ${FONT}`;
      const rankW = Math.min(ctx.measureText(rankStr).width + 56, W - PAD * 2);
      
      const pillGrad = ctx.createLinearGradient(PAD, 310, PAD + rankW, 310);
      pillGrad.addColorStop(0, tColors.surface);
      pillGrad.addColorStop(1, tColors.surface);
      roundedRect(ctx, PAD, 310, rankW, 48, 24, pillGrad);
      
      ctx.strokeStyle = tColors.surfaceBorder;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(PAD, 310, rankW, 48, 24); ctx.stroke();
      
      txt(rankStr, PAD + 28, 342, 24, '800', tColors.text);

      // Main stats card
      const cardGrad = ctx.createLinearGradient(PAD, 390, PAD, 580);
      cardGrad.addColorStop(0, tColors.surface);
      cardGrad.addColorStop(1, tColors.surface);
      roundedRect(ctx, PAD, 390, W - PAD * 2, 190, 24, cardGrad);
      
      ctx.strokeStyle = tColors.surfaceBorder;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(PAD, 390, W - PAD * 2, 190, 24); ctx.stroke();

      const statColL = PAD + 40, statColR = W / 2 + 20;
      const statY1 = 450, statY2 = 530;

      txt(fmtNum(d.o), statColL, statY1, 44, '900', tColors.text);
      txt('ĐƠN HÀNG', statColL, statY1 + 28, 18, '700', tColors.textMuted);

      txt(fmtNum(d.ip), statColR, statY1, 44, '900', tColors.text);
      txt('SẢN PHẨM', statColR, statY1 + 28, 18, '700', tColors.textMuted);

      txt(fmtVND(Math.max(0, d.s), hideAmount), statColL, statY2, 38, '800', tColors.accent);
      txt('TIẾT KIỆM', statColL, statY2 + 24, 16, '600', tColors.textMuted);

      txt(fmtVND(d.ship || 0, hideAmount), statColR, statY2, 38, '800', tColors.secondary);
      txt('PHÍ SHIP', statColR, statY2 + 24, 16, '600', tColors.textMuted);

      // Divider
      const dividerGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
      dividerGrad.addColorStop(0, 'rgba(0,0,0,0)');
      dividerGrad.addColorStop(0.5, tColors.divider);
      dividerGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = dividerGrad;
      ctx.fillRect(PAD, 620, W - PAD * 2, 2);

      let topY = 640;
      const hasTopItem = d.ti && d.ti.length > 0;
      if (hasTopItem) {
        ctx.fillStyle = tColors.surface;
        ctx.beginPath(); ctx.arc(PAD + 20, topY + 50, 20, 0, Math.PI * 2); ctx.fill();
        txt('🛒', PAD + 15, topY + 57, 20, '400', tColors.text);
        
        txt('SẢN PHẨM YÊU THÍCH', PAD + 50, topY + 36, 22, '700', tColors.textMuted);
        const itemName = hideNames ? 'Sản phẩm đã ẩn tên' : truncate(d.ti[0].n, 32);
        txt(itemName, PAD, topY + 80, 32, '800', tColors.text);
        txt(fmtVND(d.ti[0].s, hideAmount) + ' · ' + fmtNum(d.ti[0].c) + ' lần mua', PAD, topY + 110, 20, '500', tColors.textMuted);
      }

      const pctY = 780;
      const pctGrad = ctx.createLinearGradient(PAD, pctY, PAD, pctY + 140);
      pctGrad.addColorStop(0, tColors.surface);
      pctGrad.addColorStop(1, tColors.surface);
      roundedRect(ctx, PAD, pctY, W - PAD * 2, 140, 20, pctGrad);
      
      ctx.strokeStyle = tColors.surfaceBorder;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(PAD, pctY, W - PAD * 2, 140, 20); ctx.stroke();

      txt(`Chi tiêu nhiều hơn ${beat}% người dùng`, PAD + 30, pctY + 42, 24, '700', tColors.text);
      txt(`Hệ thống Analytics`, PAD + 30, pctY + 70, 18, '500', tColors.textMuted);

      const barX = PAD + 30, barY2 = pctY + 95, barW = W - PAD * 2 - 60, barH = 8;
      roundedRect(ctx, barX, barY2, barW, barH, 4, tColors.surfaceBorder);
      
      if (beat > 0) {
        const progGrad = ctx.createLinearGradient(barX, 0, barX + barW * (beat / 100), 0);
        progGrad.addColorStop(0, tColors.accent);
        progGrad.addColorStop(1, tColors.secondary);
        roundedRect(ctx, barX, barY2, barW * (beat / 100), barH, 4, progGrad);
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
      txt('TỔNG CHI TIÊU', PAD, 220, 20, '700', tColors.textMuted);
      txt(amtStr, PAD, 270, 64, '900', tColors.text);
      
      const listGrad = ctx.createLinearGradient(PAD, 320, PAD, 1020);
      listGrad.addColorStop(0, tColors.surface);
      listGrad.addColorStop(1, tColors.surface);
      roundedRect(ctx, PAD, 320, W - PAD * 2, 600, 28, listGrad);
      
      ctx.strokeStyle = tColors.surfaceBorder;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(PAD, 320, W - PAD * 2, 600, 28); ctx.stroke();
      
      const top5 = items.slice(0, 5);
      if (top5.length === 0) {
        txt('Không có dữ liệu', PAD + 50, 450, 28, '600', tColors.textMuted);
      } else {
        const maxS = Math.max(...top5.map(i => i.s), 1);
        let startY = 370;
        
        top5.forEach((item, idx) => {
          const itemName = hideNames ? 'Sản phẩm đã ẩn tên' : truncate(item.n, 32);
          const pct = Math.max(0.05, item.s / maxS);
          
          const rankGrad = ctx.createRadialGradient(PAD + 50, startY + 20, 0, PAD + 50, startY + 20, 16);
          rankGrad.addColorStop(0, tColors.accent);
          rankGrad.addColorStop(1, tColors.secondary);
          ctx.fillStyle = rankGrad;
          ctx.beginPath(); ctx.arc(PAD + 50, startY + 20, 16, 0, Math.PI * 2); ctx.fill();
          
          // Number in rank badge uses hardcoded white because rank badge bg is colored
          txt(`${idx + 1}`, PAD + 50, startY + 26, 18, '800', '#ffffff', 'center');
          
          txt(itemName, PAD + 80, startY + 16, 28, '700', tColors.text);
          txt(fmtVND(item.s, hideAmount) + ` • ${item.c} lần mua`, PAD + 80, startY + 46, 18, '500', tColors.textMuted);
          
          const barX = PAD + 80, barY = startY + 65, barW = W - PAD * 2 - 120, barH = 6;
          roundedRect(ctx, barX, barY, barW, barH, 3, tColors.surfaceBorder);
          
          const progBarGrad = ctx.createLinearGradient(barX, 0, barX + barW * pct, 0);
          progBarGrad.addColorStop(0, tColors.accent);
          progBarGrad.addColorStop(1, tColors.secondary);
          roundedRect(ctx, barX, barY, barW * pct, barH, 3, progBarGrad);
          
          startY += 110;
        });
      }
    }

    const footerY = 1000;
    
    const footerDivGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    footerDivGrad.addColorStop(0, 'rgba(0,0,0,0)');
    footerDivGrad.addColorStop(0.5, tColors.divider);
    footerDivGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = footerDivGrad;
    ctx.fillRect(PAD, footerY, W - PAD * 2, 1);

    txt('SHOPEE ANALYTICS', W / 2, footerY + 80, 20, '600', tColors.textFaint, 'center');
    
    if (cardType === 'overview') {
      const summary = `${fmtNum(d.o)} đơn hàng • ${fmtNum(d.ip)} sản phẩm`;
      txt(summary, W / 2, footerY + 110, 22, '500', tColors.textFaint, 'center');
    }

    return canvas.toDataURL('image/png');
  }

  window.generateDashboardShareCard = generateShareCard;
})();

