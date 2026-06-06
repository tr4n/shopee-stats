/**
 * Shopee Stats — Tarot Share Image Generator (Canvas)
 * Renders a high-resolution 1080×1350 image (4:5 ratio) for Instagram Feed / Facebook sharing.
 * Design: Luminous Tarot Card — archetype-specific gradient card panel + cosmic "Vũ Trụ Phán" panel.
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

  // Extract first meaningful sentence from narrative
  function getFirstSentence(text) {
    if (!text) return '';
    const clean = text.replace(/<\/?[^>]+(>|$)/g, '').trim();
    // Split on sentence-ending punctuation
    const match = clean.match(/^.{20,200}?[.!?…]/);
    if (match) return match[0].trim();
    // Fallback: first 160 chars
    return clean.slice(0, 160).trim();
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
  const glowBlob = ctx.createRadialGradient(W / 2, 420, 0, W / 2, 420, 500);
  glowBlob.addColorStop(0,   pal.glow + '22');
  glowBlob.addColorStop(0.5, pal.glow + '0a');
  glowBlob.addColorStop(1,   'transparent');
  ctx.fillStyle = glowBlob;
  ctx.fillRect(0, 0, W, H);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. HEADER — "✦ SHOPEE COSMIC TAROT ✦"
  // ═══════════════════════════════════════════════════════════════════════════
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = '#c8a96e';
  ctx.font         = 'bold 22px Arial';
  setGlow('#c8a96e', 6);
  ctx.fillText('✦   S H O P E E   C O S M I C   T A R O T   ✦', W / 2, 54);
  clearGlow();

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. CARD PANEL — upper ~62% of image
  // ═══════════════════════════════════════════════════════════════════════════
  const CARD_MARGIN = 56;
  const CARD_X      = CARD_MARGIN;
  const CARD_Y      = 92;
  const CARD_W      = W - CARD_MARGIN * 2;
  const CARD_H      = 760;  // ~56% of H
  const CARD_R      = 28;

  // Card outer glow
  setGlow(pal.glow, 50);
  ctx.strokeStyle = pal.glow + '88';
  ctx.lineWidth   = 2;
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

  // Card gold double border
  ctx.strokeStyle = '#c8a96e';
  ctx.lineWidth   = 2.5;
  roundRect(CARD_X + 14, CARD_Y + 14, CARD_W - 28, CARD_H - 28, CARD_R - 6);
  ctx.stroke();

  ctx.strokeStyle = '#c8a96e66';
  ctx.lineWidth   = 1;
  roundRect(CARD_X + 20, CARD_Y + 20, CARD_W - 40, CARD_H - 40, CARD_R - 10);
  ctx.stroke();

  // Corner ornaments ◈
  const cOrnX = [CARD_X + 38, CARD_X + CARD_W - 38];
  const cOrnY = [CARD_Y + 38, CARD_Y + CARD_H - 38];
  ctx.fillStyle = '#c8a96e';
  ctx.font = 'bold 22px Arial';
  setGlow('#c8a96e', 8);
  for (const cx of cOrnX) for (const cy of cOrnY) ctx.fillText('◈', cx, cy);
  clearGlow();

  // Header label inside card: "SHOPEE TAROT"
  ctx.fillStyle = '#c8a96eaa';
  ctx.font      = 'bold 11px Arial';
  ctx.fillText('S H O P E E   T A R O T', W / 2, CARD_Y + 52);

  // Thin divider line under header
  const divY1 = CARD_Y + 68;
  const divGrad1 = ctx.createLinearGradient(CARD_X + 80, divY1, CARD_X + CARD_W - 80, divY1);
  divGrad1.addColorStop(0,   'transparent');
  divGrad1.addColorStop(0.5, '#c8a96e66');
  divGrad1.addColorStop(1,   'transparent');
  ctx.strokeStyle = divGrad1;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(CARD_X + 80, divY1);
  ctx.lineTo(CARD_X + CARD_W - 80, divY1);
  ctx.stroke();

  // ── Emoji / icon ─────────────────────────────────────────────────────────
  const emojiY = CARD_Y + 180;
  ctx.font         = '120px Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Soft radial halo behind emoji
  const emojiHalo = ctx.createRadialGradient(W / 2, emojiY, 0, W / 2, emojiY, 130);
  emojiHalo.addColorStop(0,   pal.glow + '33');
  emojiHalo.addColorStop(1,   'transparent');
  ctx.fillStyle = emojiHalo;
  ctx.fillRect(W / 2 - 160, emojiY - 140, 320, 280);

  setGlow(pal.glow, 30);
  ctx.fillText(profile.archetype.icon || '🔮', W / 2, emojiY);
  clearGlow();

  // ── Archetype name ────────────────────────────────────────────────────────
  const archetypeName = (profile.archetype.label || 'BẢN NGÃ').toUpperCase();
  const nameWords     = archetypeName.split(' ');

  // Split into at most 2 lines (balanced)
  let nameLine1 = archetypeName, nameLine2 = '';
  if (nameWords.length > 2) {
    const half = Math.ceil(nameWords.length / 2);
    nameLine1  = nameWords.slice(0, half).join(' ');
    nameLine2  = nameWords.slice(half).join(' ');
  }

  // Auto-scale font: start at 72px, reduce until fits within card width - margin
  const nameMaxW = CARD_W - 120;
  let nameFontSize = 72;
  ctx.font = `900 ${nameFontSize}px Arial`;
  while (
    nameFontSize > 40 &&
    (ctx.measureText(nameLine1).width > nameMaxW || (nameLine2 && ctx.measureText(nameLine2).width > nameMaxW))
  ) {
    nameFontSize -= 2;
    ctx.font = `900 ${nameFontSize}px Arial`;
  }

  const nameLineH = nameFontSize * 1.15;
  const nameBaseY = nameLine2
    ? CARD_Y + 310 - nameLineH / 2
    : CARD_Y + 320;

  ctx.fillStyle    = '#ffffff';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  setGlow('#ffffff', 18);
  ctx.fillText(nameLine1, W / 2, nameBaseY);
  if (nameLine2) ctx.fillText(nameLine2, W / 2, nameBaseY + nameLineH);
  clearGlow();

  // ── Subtitle (English) ────────────────────────────────────────────────────
  const subY = nameLine2 ? nameBaseY + nameLineH + 42 : nameBaseY + 52;
  ctx.fillStyle = pal.accent;
  ctx.font      = `bold 16px Arial`;
  setGlow(pal.glow, 12);
  // Spaced-out letters
  ctx.fillText(subText.split('').join('\u200A'), W / 2, subY);
  clearGlow();

  // Thin gold divider between subtitle and quote
  const divY2 = subY + 34;
  const divLen = 220;
  const divGrad2 = ctx.createLinearGradient(W / 2 - divLen / 2, divY2, W / 2 + divLen / 2, divY2);
  divGrad2.addColorStop(0,   'transparent');
  divGrad2.addColorStop(0.5, '#c8a96e');
  divGrad2.addColorStop(1,   'transparent');
  ctx.strokeStyle = divGrad2;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - divLen / 2, divY2);
  ctx.lineTo(W / 2 + divLen / 2, divY2);
  ctx.stroke();

  // ── Quote (first sentence of narrative) ──────────────────────────────────
  const quoteRaw  = getFirstSentence(cachedText);
  const quoteText = quoteRaw ? `"${quoteRaw}"` : '';
  if (quoteText) {
    ctx.fillStyle    = '#e2d9c8cc';
    ctx.font         = `italic 22px Arial`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    const quoteMaxW = CARD_W - 160;
    let quoteSize   = 22;
    let quoteLines  = wrapText(quoteText, quoteMaxW, `italic ${quoteSize}px Arial`);

    // Shrink if more than 3 lines
    while (quoteLines.length > 3 && quoteSize > 16) {
      quoteSize--;
      quoteLines = wrapText(quoteText, quoteMaxW, `italic ${quoteSize}px Arial`);
    }
    // Trim to max 3 lines with ellipsis
    if (quoteLines.length > 3) {
      quoteLines = quoteLines.slice(0, 3);
      const last = quoteLines[2];
      quoteLines[2] = last.slice(0, -3).trimEnd() + '…"';
    }

    ctx.font = `italic ${quoteSize}px Arial`;
    const quoteLineH = quoteSize * 1.55;
    const quoteTotalH = quoteLines.length * quoteLineH;
    const quoteBaseY  = divY2 + 28;

    // Ensure quote doesn't overflow card
    const quoteEndY = quoteBaseY + quoteTotalH;
    const cardBottom = CARD_Y + CARD_H - 50;
    const quoteStartY = quoteEndY > cardBottom
      ? cardBottom - quoteTotalH
      : quoteBaseY;

    for (let i = 0; i < quoteLines.length; i++) {
      ctx.fillText(quoteLines[i], W / 2, quoteStartY + i * quoteLineH);
    }
  }

  // Card footer line: "✦ 2025 ✦"
  ctx.fillStyle    = '#c8a96e99';
  ctx.font         = 'bold 13px Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`✦  ${new Date().getFullYear()}  ✦`, W / 2, CARD_Y + CARD_H - 30);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. VŨ TRỤ PHÁN SECTION — lower ~38% of image
  // ═══════════════════════════════════════════════════════════════════════════
  const SEC_Y    = CARD_Y + CARD_H + 28;
  const SEC_H    = H - SEC_Y - 36;
  const SEC_X    = CARD_MARGIN;
  const SEC_W    = W - CARD_MARGIN * 2;
  const SEC_R    = 24;

  // Section background
  const secGrad = ctx.createLinearGradient(0, SEC_Y, 0, SEC_Y + SEC_H);
  secGrad.addColorStop(0,   '#100820');
  secGrad.addColorStop(1,   '#080512');
  ctx.fillStyle = secGrad;
  roundRect(SEC_X, SEC_Y, SEC_W, SEC_H, SEC_R);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#c8a96e33';
  ctx.lineWidth   = 1;
  roundRect(SEC_X, SEC_Y, SEC_W, SEC_H, SEC_R);
  ctx.stroke();

  // Constellation dots (static, deterministic)
  const dots = [
    {x: 0.08, y: 0.15}, {x: 0.22, y: 0.05}, {x: 0.38, y: 0.22}, {x: 0.55, y: 0.08},
    {x: 0.72, y: 0.18}, {x: 0.88, y: 0.06}, {x: 0.95, y: 0.35}, {x: 0.78, y: 0.48},
    {x: 0.62, y: 0.55}, {x: 0.45, y: 0.68}, {x: 0.28, y: 0.60}, {x: 0.12, y: 0.72},
    {x: 0.05, y: 0.52}, {x: 0.18, y: 0.88}, {x: 0.92, y: 0.78},
  ];
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (const d of dots) {
    const dx = SEC_X + d.x * SEC_W;
    const dy = SEC_Y + d.y * SEC_H;
    ctx.beginPath();
    ctx.arc(dx, dy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Faint constellation lines
  ctx.strokeStyle = 'rgba(200,169,110,0.08)';
  ctx.lineWidth   = 0.8;
  ctx.beginPath();
  const lineConst = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,0]];
  for (const [a, b] of lineConst) {
    ctx.moveTo(SEC_X + dots[a].x * SEC_W, SEC_Y + dots[a].y * SEC_H);
    ctx.lineTo(SEC_X + dots[b].x * SEC_W, SEC_Y + dots[b].y * SEC_H);
  }
  ctx.stroke();

  // Section title
  const titleY = SEC_Y + 38;
  ctx.fillStyle    = '#c8a96e';
  ctx.font         = 'bold 14px Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  setGlow('#c8a96e', 10);
  ctx.fillText('✦   V Ũ   T R Ụ   P H Á N   ✦', W / 2, titleY);
  clearGlow();

  // Thin gradient separator below title
  const divY3 = titleY + 22;
  const divGrad3 = ctx.createLinearGradient(SEC_X + 60, divY3, SEC_X + SEC_W - 60, divY3);
  divGrad3.addColorStop(0,   'transparent');
  divGrad3.addColorStop(0.5, '#c8a96e55');
  divGrad3.addColorStop(1,   'transparent');
  ctx.strokeStyle = divGrad3;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(SEC_X + 60, divY3);
  ctx.lineTo(SEC_X + SEC_W - 60, divY3);
  ctx.stroke();

  // ── Narrative text (dynamic scale to fit) ────────────────────────────────
  let narrativeRaw = cachedText || '';
  narrativeRaw = narrativeRaw.replace(/<\/?[^>]+(>|$)/g, '').trim();

  const textX      = W / 2;
  const textStartY = divY3 + 22;
  const textMaxW   = SEC_W - 100;
  const textMaxH   = SEC_Y + SEC_H - textStartY - 44; // leave room for watermark

  let fontSize   = 26;
  let lineHeight = 40;
  let finalLines = [];

  // Iteratively reduce font size until text fits
  while (fontSize >= 17) {
    ctx.font = `normal ${fontSize}px Arial`;
    lineHeight = Math.round(fontSize * 1.55);
    const words = narrativeRaw.split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > textMaxW && line) {
        lines.push(line.trim());
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line.trim());

    if (lines.length * lineHeight <= textMaxH || fontSize === 17) {
      finalLines = lines;
      break;
    }
    fontSize -= 1;
  }

  // If still too many lines, truncate with ellipsis
  const maxLines = Math.floor(textMaxH / lineHeight);
  if (finalLines.length > maxLines) {
    finalLines = finalLines.slice(0, maxLines);
    const last = finalLines[finalLines.length - 1];
    finalLines[finalLines.length - 1] = last.trimEnd().slice(0, -2) + '…';
  }

  ctx.fillStyle    = '#e8e0f0';
  ctx.font         = `normal ${fontSize}px Arial`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < finalLines.length; i++) {
    ctx.fillText(finalLines[i], textX, textStartY + i * lineHeight);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. WATERMARK FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  ctx.fillStyle    = 'rgba(255,255,255,0.28)';
  ctx.font         = 'bold 14px Arial';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SHOPEE ANALYTICS  ✦  GIẢI MÃ BẢN NGÃ TAROT', W / 2, H - 22);

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
