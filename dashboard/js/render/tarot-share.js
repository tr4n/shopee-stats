/**
 * Shopee Stats — Tarot Share Image Generator (Canvas)
 * Renders a high-resolution 1080x1920 image suitable for social sharing (Instagram/Facebook Stories)
 */

window.generateTarotShareImage = function(profile, cachedText) {
  if (!profile || !profile.archetype) {
    console.error('[Tarot Share] No profile data available');
    return;
  }

  // Show a loading state if we want, or do it immediately
  const btnShare = document.getElementById('btn-tarot-share');
  if (btnShare) {
    btnShare.disabled = true;
    btnShare.innerHTML = '⏳ Đang Tạo Ảnh...';
  }

  // Open the preview modal immediately in loading state
  const shareModal = document.getElementById('tarot-share-modal');
  const loader = document.getElementById('tarot-share-loader');
  const previewImg = document.getElementById('tarot-share-preview-img');
  const btnDownload = document.getElementById('btn-tarot-download');
  const btnCopy = document.getElementById('btn-tarot-copy');

  if (shareModal) {
    shareModal.classList.add('active');
  }
  if (loader) loader.style.display = 'block';
  if (previewImg) {
    previewImg.style.display = 'none';
    previewImg.src = '';
  }
  if (btnDownload) btnDownload.disabled = true;
  if (btnCopy) btnCopy.disabled = true;

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  // Ensure canvas rendering quality is set high
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Draw Background Gradient (Deep Cosmic Purple-Black)
  const bgGrad = ctx.createLinearGradient(540, 0, 540, 1920);
  bgGrad.addColorStop(0, '#0c071d');
  bgGrad.addColorStop(0.5, '#190f33');
  bgGrad.addColorStop(1, '#0b0618');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Draw Stars & Constellations
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  // Fixed seed positions so it's deterministic and doesn't jitter
  const starSeeds = [
    {x: 100, y: 150, r: 2}, {x: 880, y: 120, r: 1.5}, {x: 950, y: 300, r: 2.5},
    {x: 200, y: 400, r: 1.5}, {x: 750, y: 500, r: 3}, {x: 150, y: 700, r: 2},
    {x: 900, y: 850, r: 1}, {x: 120, y: 1000, r: 2.5}, {x: 960, y: 1150, r: 1.5},
    {x: 80, y: 1300, r: 3}, {x: 850, y: 1450, r: 2}, {x: 200, y: 1600, r: 1.5},
    {x: 920, y: 1750, r: 2.5}, {x: 500, y: 120, r: 2}, {x: 540, y: 1800, r: 1.5}
  ];
  starSeeds.forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();

    // Draw a small cross glow on larger stars
    if (s.r >= 2.5) {
      ctx.strokeStyle = 'rgba(200, 169, 110, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x - 12, s.y);
      ctx.lineTo(s.x + 12, s.y);
      ctx.moveTo(s.x, s.y - 12);
      ctx.lineTo(s.x, s.y + 12);
      ctx.stroke();
    }
  });

  // Constellation faint lines
  ctx.strokeStyle = 'rgba(155, 114, 207, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 150); ctx.lineTo(200, 400); ctx.lineTo(150, 700);
  ctx.moveTo(880, 120); ctx.lineTo(750, 500); ctx.lineTo(900, 850);
  ctx.moveTo(850, 1450); ctx.lineTo(920, 1750);
  ctx.stroke();

  // 3. Draw Tarot Card Box
  const cardW = 460;
  const cardH = 780;
  const cardX = (1080 - cardW) / 2;
  const cardY = 240;

  // Shadow for card
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 15;

  // Card Background (Ivory Cream #fffef9)
  ctx.fillStyle = '#fffef9';
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fill();

  // Reset shadow for subsequent drawings
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Gold Double Borders
  const goldColor = '#c8a96e';
  ctx.strokeStyle = goldColor;
  
  // Outer Border
  ctx.lineWidth = 2;
  drawRoundRect(ctx, cardX + 10, cardY + 10, cardW - 20, cardH - 20, 14);
  ctx.stroke();

  // Inner Border (Thicker)
  ctx.lineWidth = 4;
  drawRoundRect(ctx, cardX + 16, cardY + 16, cardW - 32, cardH - 32, 10);
  ctx.stroke();

  // Corner ornaments on card: ◈ (Using Arial)
  ctx.fillStyle = '#e8d5a3';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('◈', cardX + 35, cardY + 35);
  ctx.fillText('◈', cardX + cardW - 35, cardY + 35);
  ctx.fillText('◈', cardX + 35, cardY + cardH - 35);
  ctx.fillText('◈', cardX + cardW - 35, cardY + cardH - 35);

  // Card Header: SHOPEE COSMIC TAROT (Using Arial)
  ctx.fillStyle = goldColor;
  ctx.font = 'bold 12px Arial';
  ctx.fillText('✦ SHOPEE COSMIC TAROT ✦', 540, cardY + 45);

  // Card Center Ornament Circles
  const circleX = 540;
  const circleY = cardY + 280;
  const circleR = 90;

  ctx.strokeStyle = 'rgba(200, 169, 110, 0.4)';
  ctx.lineWidth = 1.5;
  // Outer dashed circle
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // Inner solid circle
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleR - 22, 0, Math.PI * 2);
  ctx.stroke();

  // Archetype Emoji
  ctx.font = '85px Arial';
  ctx.fillText(profile.archetype.icon || '🔮', circleX, circleY + 5);

  // Archetype Title (Using Arial)
  ctx.font = 'bold 30px Arial';
  ctx.fillStyle = goldColor;
  ctx.fillText((profile.archetype.label || 'TÌM KIẾM').toUpperCase(), 540, cardY + 520);

  // Subtitle (English matching helpers.js subLabels, using Arial)
  const subLabels = {
    reformed: 'THE REFORMED',
    night_owl: 'THE NIGHT OWL',
    fashion_healer: 'THE EMOTIONAL HEALER',
    bargain_hunter: 'THE BARGAIN HUNTER',
    emotional: 'THE IMPULSIVE SOUL',
    premium_curator: 'THE PREMIUM CURATOR',
    rising_addict: 'THE SHOPPING ENTHUSIAST',
    morning_planner: 'THE disciplined PLANNER',
    seasonal: 'THE SEASONAL EXPLORER',
    beauty_selfcare: 'THE SELF-CARE LOVER',
    tech_optimizer: 'THE TECH OPTIMIZER',
    home_nester: 'THE NEST BUILDER',
    food_lover: 'THE CONNOISSEUR',
    family_center: 'THE PROVIDER',
    free_spirit: 'THE FREE SPIRIT'
  };
  const subText = subLabels[profile.archetype.key] || 'THE SEEKER';
  ctx.fillStyle = '#7c6f9e';
  ctx.font = 'bold 13px Arial';
  ctx.fillText(subText.split('').join(' '), 540, cardY + 575);

  // Stars ornament: ✦ ✵ ✦ (Using Arial)
  ctx.fillStyle = goldColor;
  ctx.font = '22px Arial';
  ctx.fillText('✦  ✵  ✦', 540, cardY + 630);

  // Card Footer: year (Using Arial)
  ctx.font = 'bold 12px Arial';
  ctx.fillText(`✦  ${new Date().getFullYear()}  ✦`, 540, cardY + cardH - 45);


  // 4. Draw Stats & Text below card
  const contentY = cardY + cardH + 110;

  // Stats Text: Dựa trên X đơn hàng (Using Arial)
  ctx.fillStyle = '#e8d5a3';
  ctx.font = 'bold 24px Arial';
  ctx.fillText((profile.totalOrders > 0 
    ? `DỰA TRÊN ${profile.totalOrders.toLocaleString('vi-VN')} ĐƠN HÀNG` 
    : 'BẢN NGÃ MUA SẮM'
  ).toUpperCase(), 540, contentY);

  // Gradient Separator line
  const sepW = 600;
  const sepX = (1080 - sepW) / 2;
  const sepY = contentY + 35;
  const sepGrad = ctx.createLinearGradient(sepX, sepY, sepX + sepW, sepY);
  sepGrad.addColorStop(0, 'rgba(200, 169, 110, 0)');
  sepGrad.addColorStop(0.5, 'rgba(200, 169, 110, 0.45)');
  sepGrad.addColorStop(1, 'rgba(200, 169, 110, 0)');
  ctx.fillStyle = sepGrad;
  ctx.fillRect(sepX, sepY, sepW, 3);

  // Section Title: VŨ TRỤ PHÁN (Using Arial)
  ctx.fillStyle = goldColor;
  ctx.font = 'bold 18px Arial';
  ctx.fillText('✦   V Ũ   T R Ụ   P H Á N   ✦', 540, sepY + 70);

  // Clean sentences & render wrapped (Using Arial with dynamic scaling)
  let insightText = cachedText || '';
  // Clean potential HTML tags
  insightText = insightText.replace(/<\/?[^>]+(>|$)/g, "").trim();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Dynamic wrap and scale text
  let startY = sepY + 120;
  let maxWidth = 840;
  let fontSize = 30;
  let lineHeight = 45;
  let finalLines = [];

  while (fontSize >= 18) {
    ctx.font = `normal ${fontSize}px Arial`;
    const words = insightText.split(/\s+/);
    let line = '';
    const lines = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());

    // Check if total height fits in the available space (450px max)
    if (lines.length * lineHeight <= 450 || fontSize === 18) {
      finalLines = lines;
      break;
    }

    fontSize -= 2;
    lineHeight = Math.round(fontSize * 1.5);
  }

  // Draw all lines without truncation
  for (let i = 0; i < finalLines.length; i++) {
    ctx.fillText(finalLines[i], 540, startY + (i * lineHeight));
  }


  // 5. Draw Footer Brand Watermark (Using Arial)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SHOPEE ANALYTICS  ✦  GIẢI MÃ BẢN NGÃ TAROT', 540, 1830);


  // 6. Output to Blob & Update Modal Preview
  setTimeout(() => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('[Tarot Share] Failed to generate Blob');
        resetShareButton();
        if (loader) loader.style.display = 'none';
        return;
      }

      // Create preview object URL
      const previewUrl = URL.createObjectURL(blob);

      // Display image in modal, hide loader
      if (previewImg) {
        previewImg.src = previewUrl;
        previewImg.style.display = 'block';
      }
      if (loader) loader.style.display = 'none';

      // Set up Actions for Download & Copy
      if (btnDownload) {
        btnDownload.disabled = false;
        
        // Remove old click listener by cloning
        const freshDownload = btnDownload.cloneNode(true);
        btnDownload.parentNode.replaceChild(freshDownload, btnDownload);
        
        freshDownload.addEventListener('click', () => {
          const link = document.createElement('a');
          link.href = previewUrl;
          link.download = `shopee-stats-tarot-${profile.archetype.key}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }

      if (btnCopy) {
        btnCopy.disabled = false;

        // Remove old click listener by cloning
        const freshCopy = btnCopy.cloneNode(true);
        btnCopy.parentNode.replaceChild(freshCopy, btnCopy);

        freshCopy.addEventListener('click', async () => {
          try {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            showToast('Đã sao chép ảnh vào bộ nhớ tạm! Paste để chia sẻ ngay ✨');
          } catch (err) {
            console.warn('[Tarot Share] Clipboard copy failed:', err);
            showToast('Đã lưu ảnh Bản Ngã Tarot thành công! ✨');
          }
        });
      }

      resetShareButton();
    }, 'image/png');
  }, 100);

  // Helpers inside function context
  function drawRoundRect(c, x, y, width, height, radius) {
    c.beginPath();
    c.moveTo(x + radius, y);
    c.lineTo(x + width - radius, y);
    c.quadraticCurveTo(x + width, y, x + width, y + radius);
    c.lineTo(x + width, y + height - radius);
    c.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    c.lineTo(x + radius, y + height - radius);
    c.quadraticCurveTo(x, y + height, x, y + height - radius);
    c.lineTo(x, y + radius);
    c.quadraticCurveTo(x, y, x + radius, y);
    c.closePath();
  }

  function resetShareButton() {
    if (btnShare) {
      btnShare.disabled = false;
      btnShare.innerHTML = '✨ Chia Sẻ Bản Ngã';
    }
  }

  function showToast(message) {
    const toast = document.getElementById('tarot-toast');
    if (toast) {
      if (message) {
        const msgEl = toast.querySelector('.toast-message');
        if (msgEl) msgEl.textContent = message;
      }
      toast.classList.remove('hidden');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3500);
    }
  }
};
