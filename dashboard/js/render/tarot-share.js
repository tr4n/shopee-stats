/**
 * Shopee Stats — Tarot Share Image Generator (Canvas)
 * Renders a high-resolution 1080×1350 image (4:5 ratio) for Instagram Feed / Facebook sharing.
 * Design: Luminous Tarot Card — archetype-specific gradient card panel + cosmic stars.
 */

window.generateTarotShareImage = function(profile, cachedText) {
  const btnShare = document.getElementById('btn-tarot-share');
  if (btnShare) {
    btnShare.disabled = true;
    btnShare.innerHTML = '⏳ Đang Tạo Ảnh...';
  }

  const shareModal   = document.getElementById('tarot-share-modal');
  const loader       = document.getElementById('tarot-share-loader');
  const previewImg   = document.getElementById('tarot-share-preview-img');
  const btnDownload  = document.getElementById('btn-tarot-download');
  const btnCopy      = document.getElementById('btn-tarot-copy');

  if (!profile || !profile.archetype) {
    console.error('[Tarot Share] No profile data available');
    resetShareButton();
    if (loader) loader.style.display = 'none';
    if (shareModal) shareModal.classList.remove('active');
    return;
  }

  if (shareModal) shareModal.classList.add('active');
  if (loader)     loader.style.display = 'block';
  if (previewImg) { previewImg.style.display = 'none'; previewImg.src = ''; }
  if (btnDownload) btnDownload.disabled = true;
  if (btnCopy)     btnCopy.disabled    = true;

  // ─── Canvas: 1080 × 1350 (4:5) ───────────────────────────────────────────
  const W = 1080, H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // ─── Archetype colour palettes ────────────────────────────────────────────
  const palettes = {
    reformed:        { top: '#0d2a3e', mid: '#0d4a5e', bot: '#093040', glow: '#00c8b4', accent: '#5ee8d8' },
    night_owl:       { top: '#160d30', mid: '#2a1055', bot: '#0e0822', glow: '#8b5cf6', accent: '#c084fc' },
    fashion_healer:  { top: '#2a0d22', mid: '#5a1040', bot: '#1a0516', glow: '#ec4899', accent: '#f9a8d4' },
    bargain_hunter:  { top: '#2a1200', mid: '#5a2800', bot: '#1a0c00', glow: '#f97316', accent: '#fdba74' },
    emotional:       { top: '#001e2a', mid: '#003a50', bot: '#00131c', glow: '#06b6d4', accent: '#67e8f9' },
    premium_curator: { top: '#1a1200', mid: '#3d2c00', bot: '#0e0900', glow: '#eab308', accent: '#fde047' },
    rising_addict:   { top: '#2a0000', mid: '#5a0a00', bot: '#180000', glow: '#ef4444', accent: '#fca5a5' },
    morning_planner: { top: '#001030', mid: '#00205c', bot: '#000a1e', glow: '#3b82f6', accent: '#93c5fd' },
    seasonal:        { top: '#1e1200', mid: '#3d2600', bot: '#120d00', glow: '#f59e0b', accent: '#fcd34d' },
    beauty_selfcare: { top: '#1a0030', mid: '#380060', bot: '#0e001e', glow: '#a855f7', accent: '#d8b4fe' },
    tech_optimizer:  { top: '#001e1e', mid: '#003d3d', bot: '#001212', glow: '#14b8a6', accent: '#5eead4' },
    home_nester:     { top: '#0a1e00', mid: '#1a3d00', bot: '#051200', glow: '#84cc16', accent: '#bef264' },
    food_lover:      { top: '#2a0010', mid: '#5a0022', bot: '#1a000c', glow: '#e11d48', accent: '#fda4af' },
    family_center:   { top: '#002210', mid: '#004522', bot: '#00140a', glow: '#22c55e', accent: '#86efac' },
    free_spirit:     { top: '#0d1520', mid: '#1e2d44', bot: '#080e18', glow: '#64748b', accent: '#94a3b8' },
  };
  const pal = palettes[profile.archetype.key] || palettes.free_spirit;

  // ─── Sub-labels (English archetype subtitle) ──────────────────────────────
  const subLabels = {
    reformed:        'THE REFORMED',
    night_owl:       'THE NIGHT OWL',
    fashion_healer:  'THE EMOTIONAL HEALER',
    bargain_hunter:  'THE BARGAIN HUNTER',
    emotional:       'THE IMPULSIVE SOUL',
    premium_curator: 'THE PREMIUM CURATOR',
    rising_addict:   'THE SHOPPING ENTHUSIAST',
    morning_planner: 'THE DISCIPLINED PLANNER',
    seasonal:        'THE SEASONAL EXPLORER',
    beauty_selfcare: 'THE SELF-CARE LOVER',
    tech_optimizer:  'THE TECH OPTIMIZER',
    home_nester:     'THE NEST BUILDER',
    food_lover:      'THE CONNOISSEUR',
    family_center:   'THE PROVIDER',
    free_spirit:     'THE FREE SPIRIT',
  };
  const subText = subLabels[profile.archetype.key] || 'THE SEEKER';

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function roundRect(x, y, w, h, r) {
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
  }

  function setGlow(color, blur) {
    ctx.shadowColor = color;
    ctx.shadowBlur  = blur;
  }
  function clearGlow() {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Wrap text and return array of lines
  function wrapText(text, maxWidth, font) {
    ctx.font = font;
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. GLOBAL BACKGROUND — deep space black
  // ═══════════════════════════════════════════════════════════════════════════
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0,   '#060310');
  bgGrad.addColorStop(0.5, '#09050f');
  bgGrad.addColorStop(1,   '#040208');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle atmospheric glow blob behind card
  const glowBlob = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 600);
  glowBlob.addColorStop(0,   pal.glow + '25');
  glowBlob.addColorStop(0.5, pal.glow + '0a');
  glowBlob.addColorStop(1,   'transparent');
  ctx.fillStyle = glowBlob;
  ctx.fillRect(0, 0, W, H);

  // Ambient constellation dots & faint lines across the background
  const dots = [
    {x: 0.1, y: 0.12}, {x: 0.18, y: 0.35}, {x: 0.08, y: 0.65}, {x: 0.15, y: 0.88},
    {x: 0.9, y: 0.15}, {x: 0.82, y: 0.38}, {x: 0.92, y: 0.62}, {x: 0.85, y: 0.85},
    {x: 0.32, y: 0.06}, {x: 0.68, y: 0.05}, {x: 0.45, y: 0.95}, {x: 0.58, y: 0.94}
  ];
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  for (const d of dots) {
    ctx.beginPath();
    ctx.arc(d.x * W, d.y * H, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(200, 169, 110, 0.05)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  const connections = [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7], [8, 9]];
  for (const [a, b] of connections) {
    ctx.moveTo(dots[a].x * W, dots[a].y * H);
    ctx.lineTo(dots[b].x * W, dots[b].y * H);
  }
  ctx.stroke();

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. THE SINGLE VERTICAL TAROT CARD (Aspect Ratio 220:370 -> 700:1177)
  // ═══════════════════════════════════════════════════════════════════════════
  const CARD_W = 700;
  const CARD_H = 1177;
  const CARD_X = (W - CARD_W) / 2;     // 190
  const CARD_Y = (H - CARD_H) / 2 - 20; // 66.5 (slightly pushed up to leave space for watermark)
  const CARD_R = 30;

  // Card outer glow
  setGlow(pal.glow, 45);
  ctx.strokeStyle = pal.glow + '66';
  ctx.lineWidth   = 3;
  roundRect(CARD_X, CARD_Y, CARD_W, CARD_H, CARD_R);
  ctx.stroke();
  clearGlow();

  // Card background gradient
  const cardGrad = ctx.createLinearGradient(CARD_X, CARD_Y, CARD_X, CARD_Y + CARD_H);
  cardGrad.addColorStop(0,    pal.top);
  cardGrad.addColorStop(0.45, pal.mid);
  cardGrad.addColorStop(1,    pal.bot);
  ctx.fillStyle = cardGrad;
  roundRect(CARD_X, CARD_Y, CARD_W, CARD_H, CARD_R);
  ctx.fill();

  // Outer gold border (thick)
  ctx.strokeStyle = '#c8a96e';
  ctx.lineWidth   = 3.5;
  roundRect(CARD_X + 16, CARD_Y + 16, CARD_W - 32, CARD_H - 32, CARD_R - 5);
  ctx.stroke();

  // Inner gold border (thin)
  ctx.strokeStyle = '#c8a96e55';
  ctx.lineWidth   = 1.5;
  roundRect(CARD_X + 22, CARD_Y + 22, CARD_W - 44, CARD_H - 44, CARD_R - 7);
  ctx.stroke();

  // Corner ornaments ◈
  const cOrnX = [CARD_X + 42, CARD_X + CARD_W - 42];
  const cOrnY = [CARD_Y + 42, CARD_Y + CARD_H - 42];
  ctx.fillStyle = '#c8a96e';
  ctx.font = 'bold 24px Arial';
  setGlow('#c8a96e', 8);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const cx of cOrnX) {
    for (const cy of cOrnY) {
      ctx.fillText('◈', cx, cy);
    }
  }
  clearGlow();

  // Card Header: "✦ SHOPEE COSMIC TAROT ✦"
  ctx.fillStyle = '#c8a96ecc';
  ctx.font      = 'bold 13px Georgia, serif';
  ctx.fillText('✦   S H O P E E   C O S M I C   T A R O T   ✦', W / 2, CARD_Y + 52);

  // Thin header divider line
  ctx.strokeStyle = '#c8a96e33';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(CARD_X + 35, CARD_Y + 68);
  ctx.lineTo(CARD_X + CARD_W - 35, CARD_Y + 68);
  ctx.stroke();

  // Emoji circular dashed frame & glow halo
  const emojiY = CARD_Y + 240;
  
  // Dashed frame outer circle
  ctx.strokeStyle = '#c8a96e';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(W / 2, emojiY, 110, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]); // reset

  // Glow halo behind emoji
  const emojiHalo = ctx.createRadialGradient(W / 2, emojiY, 0, W / 2, emojiY, 140);
  emojiHalo.addColorStop(0, pal.glow + '44');
  emojiHalo.addColorStop(1, 'transparent');
  ctx.fillStyle = emojiHalo;
  ctx.beginPath();
  ctx.arc(W / 2, emojiY, 140, 0, Math.PI * 2);
  ctx.fill();

  // Archetype Emoji
  ctx.font         = '110px Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  setGlow(pal.glow, 25);
  ctx.fillText(profile.archetype.icon || '🔮', W / 2, emojiY);
  clearGlow();

  // Archetype Title
  const archetypeName = (profile.archetype.label || 'BẢN NGÃ').toUpperCase();
  ctx.fillStyle    = '#ffffff';
  ctx.font         = 'bold 44px Georgia, serif';
  setGlow('#ffffff', 14);
  ctx.fillText(archetypeName, W / 2, CARD_Y + 430);
  clearGlow();

  // Archetype Subtitle (spaced out English name)
  ctx.fillStyle = pal.accent;
  ctx.font      = 'bold 15px Arial';
  setGlow(pal.glow, 8);
  ctx.fillText(subText.split('').join('\u200A'), W / 2, CARD_Y + 482);
  clearGlow();

  // Subtitle separator ornament
  ctx.fillStyle = '#c8a96ecc';
  ctx.font      = '16px Arial';
  ctx.fillText('✦   ✵   ✦', W / 2, CARD_Y + 528);

  // ── Narrative text (Vũ Trụ Phán) ──────────────────────────────────────────
  let narrativeRaw = cachedText || '';
  narrativeRaw = narrativeRaw.replace(/<\/?[^>]+(>|$)/g, '').replace(/\*\*/g, '').trim();

  if (narrativeRaw) {
    const sentences = narrativeRaw.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(Boolean);
    const maxTextW = CARD_W - 160; // 540px width (margins of 80px on both sides)
    const maxTextH = 430; // max height for narrative zone
    
    let fontSize = 23;
    let lineH = 36;
    let gapH = 12;
    let wrappedGroups = [];

    // Auto-scale font size
    while (fontSize >= 15) {
      ctx.font = `italic ${fontSize}px Georgia, Arial`;
      lineH = Math.round(fontSize * 1.5);
      gapH = Math.round(fontSize * 0.55);
      wrappedGroups = [];
      let totalH = 0;

      for (let i = 0; i < sentences.length; i++) {
        const bulletText = `• ${sentences[i]}`;
        const lines = wrapText(bulletText, maxTextW, ctx.font);
        wrappedGroups.push(lines);
        totalH += lines.length * lineH;
        if (i < sentences.length - 1) {
          totalH += gapH;
        }
      }

      if (totalH <= maxTextH) {
        break;
      }
      fontSize -= 1;
    }

    ctx.fillStyle    = '#e8e0f0';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    
    // Calculate total height to center the entire group vertically in the zone
    let totalH = 0;
    for (let i = 0; i < wrappedGroups.length; i++) {
      totalH += wrappedGroups[i].length * lineH;
      if (i < wrappedGroups.length - 1) totalH += gapH;
    }

    const startX = CARD_X + 80;
    const startY = CARD_Y + 575 + (maxTextH - totalH) / 2;
    
    let currentY = startY;
    for (let i = 0; i < wrappedGroups.length; i++) {
      const lines = wrappedGroups[i];
      for (let j = 0; j < lines.length; j++) {
        ctx.fillText(lines[j], startX, currentY);
        currentY += lineH;
      }
      currentY += gapH;
    }
    
    // Restore text alignment to center for the rest of canvas operations
    ctx.textAlign = 'center';
  }

  // Footer divider line
  ctx.strokeStyle = '#c8a96e33';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(CARD_X + 35, CARD_Y + CARD_H - 58);
  ctx.lineTo(CARD_X + CARD_W - 35, CARD_Y + CARD_H - 58);
  ctx.stroke();

  // Card Footer: "✦ 2026 ✦"
  ctx.fillStyle    = '#c8a96e99';
  ctx.font         = 'bold 12px Georgia, serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`✦   ${new Date().getFullYear()}   ✦`, W / 2, CARD_Y + CARD_H - 33);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. IMAGE WATERMARK FOOTER (outside card)
  // ═══════════════════════════════════════════════════════════════════════════
  ctx.fillStyle    = 'rgba(255,255,255,0.28)';
  ctx.font         = 'bold 14px Arial';
  ctx.fillText('SHOPEE ANALYTICS  ✦  GIẢI MÃ BẢN NGÃ TAROT', W / 2, H - 36);

  // ─── Output ───────────────────────────────────────────────────────────────
  setTimeout(() => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('[Tarot Share] Failed to generate Blob');
        resetShareButton();
        if (loader) loader.style.display = 'none';
        return;
      }

      if (previewImg && previewImg.src && previewImg.src.startsWith('blob:')) {
        URL.revokeObjectURL(previewImg.src);
      }

      const previewUrl = URL.createObjectURL(blob);

      if (previewImg) {
        previewImg.src = previewUrl;
        previewImg.style.display = 'block';
      }
      if (loader) loader.style.display = 'none';

      // Pass archetype key to modal for neon glow styling
      if (shareModal) {
        shareModal.dataset.archetypeKey = profile.archetype.key || '';
      }

      if (btnDownload) {
        btnDownload.disabled = false;
        const freshDownload = btnDownload.cloneNode(true);
        btnDownload.parentNode.replaceChild(freshDownload, btnDownload);
        freshDownload.addEventListener('click', () => {
          const link = document.createElement('a');
          link.href     = previewUrl;
          link.download = `shopee-banga-tarot-${profile.archetype.key}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }

      if (btnCopy) {
        btnCopy.disabled = false;
        const freshCopy = btnCopy.cloneNode(true);
        btnCopy.parentNode.replaceChild(freshCopy, btnCopy);
        freshCopy.addEventListener('click', async () => {
          try {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            showToast('Đã sao chép ảnh vào bộ nhớ tạm! Paste để chia sẻ ngay ✨');
          } catch (err) {
            console.warn('[Tarot Share] Clipboard copy failed:', err);
            showToast('Không thể tự động copy, vui lòng tải ảnh về máy! 😢');
          }
        });
      }

      resetShareButton();
    }, 'image/png');
  }, 100);

  // ─── Local helpers ────────────────────────────────────────────────────────
  function resetShareButton() {
    if (btnShare) {
      btnShare.disabled = false;
      btnShare.innerHTML = '✨ Chia Sẻ Bản Ngã';
    }
  }

  function showToast(message) {
    const toast = document.getElementById('tarot-toast');
    if (toast) {
      const msgEl = toast.querySelector('.toast-message');
      if (msgEl && message) msgEl.textContent = message;
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 3500);
    }
  }
};
