/**
 * Shopee Stats — Tarot Share Image Generator (Canvas)
 * Renders a high-resolution 1080×1350 image (4:5 ratio) for Instagram Feed / Facebook sharing.
 * Design: Luminous Tarot Card — archetype-specific gradient card panel + cosmic stars.
 */

// Cache variables to avoid re-rendering the canvas multiple times for the same profile
let cachedTarotBlob = null;
let cachedTarotUrl = null;
let cachedTarotProfileKey = null;

window.renderTarotCanvas = function (profile, cachedText) {
  return new Promise((resolve, reject) => {
    if (!profile || !profile.archetype) {
      reject(new Error('No profile data available'));
      return;
    }

    // Return cached image if profile hasn't changed
    if (cachedTarotBlob && cachedTarotProfileKey === profile.archetype.key) {
      resolve({ blob: cachedTarotBlob, previewUrl: cachedTarotUrl });
      return;
    }

    try {
      // ─── Canvas: 1080 × 1350 (4:5) ───────────────────────────────────────────
      const W = 1080, H = 1350;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // ─── Archetype colour palettes ────────────────────────────────────────────
      const palettes = {
        reformed: { top: '#163a3d', mid: '#235d62', bot: '#0f2729', glow: 'rgba(0, 200, 180, 0.45)', accent: '#4ef2d2' },
        night_owl: { top: '#2e1a47', mid: '#4c2c75', bot: '#1f1033', glow: 'rgba(139, 92, 246, 0.45)', accent: '#b785f5' },
        fashion_healer: { top: '#4c1a3b', mid: '#752c5c', bot: '#331027', glow: 'rgba(236, 72, 153, 0.45)', accent: '#f472b6' },
        bargain_hunter: { top: '#4a2c11', mid: '#73451c', bot: '#301c0a', glow: 'rgba(249, 115, 22, 0.45)', accent: '#ff9f43' },
        emotional: { top: '#153350', mid: '#25527a', bot: '#0d2136', glow: 'rgba(6, 182, 212, 0.45)', accent: '#22d3ee' },
        premium_curator: { top: '#3a2e1b', mid: '#5d4a2d', bot: '#251d11', glow: 'rgba(234, 179, 8, 0.45)', accent: '#facc15' },
        rising_addict: { top: '#52161b', mid: '#80282f', bot: '#330e11', glow: 'rgba(239, 68, 68, 0.45)', accent: '#f87171' },
        morning_planner: { top: '#132c54', mid: '#224b89', bot: '#0b1c37', glow: 'rgba(59, 130, 246, 0.45)', accent: '#60a5fa' },
        seasonal: { top: '#442f15', mid: '#694a23', bot: '#2b1d0c', glow: 'rgba(245, 158, 11, 0.45)', accent: '#fbbf24' },
        beauty_selfcare: { top: '#371d54', mid: '#573083', bot: '#221236', glow: 'rgba(168, 85, 247, 0.45)', accent: '#c084fc' },
        tech_optimizer: { top: '#113a35', mid: '#1f5d55', bot: '#0a2522', glow: 'rgba(20, 184, 166, 0.45)', accent: '#2dd4bf' },
        home_nester: { top: '#1f3611', mid: '#33571f', bot: '#14240a', glow: 'rgba(132, 204, 22, 0.45)', accent: '#a3e635' },
        food_lover: { top: '#4f182c', mid: '#7e2b49', bot: '#320f1b', glow: 'rgba(225, 29, 72, 0.45)', accent: '#fb7185' },
        family_center: { top: '#113d23', mid: '#1f623a', bot: '#0b2817', glow: 'rgba(34, 197, 94, 0.45)', accent: '#4ade80' },
        free_spirit: { top: '#2e3947', mid: '#475569', bot: '#1e252e', glow: 'rgba(148, 163, 184, 0.45)', accent: '#94a3b8' },
      };
      const pal = palettes[profile.archetype.key] || palettes.free_spirit;

      // ─── Sub-labels (English archetype subtitle) ──────────────────────────────
      const subLabels = {
        reformed: 'THE REFORMED',
        night_owl: 'THE NIGHT OWL',
        fashion_healer: 'THE EMOTIONAL HEALER',
        bargain_hunter: 'THE BARGAIN HUNTER',
        emotional: 'THE IMPULSIVE SOUL',
        premium_curator: 'THE PREMIUM CURATOR',
        rising_addict: 'THE SHOPPING ENTHUSIAST',
        morning_planner: 'THE DISCIPLINED PLANNER',
        seasonal: 'THE SEASONAL EXPLORER',
        beauty_selfcare: 'THE SELF-CARE LOVER',
        tech_optimizer: 'THE TECH OPTIMIZER',
        home_nester: 'THE NEST BUILDER',
        food_lover: 'THE CONNOISSEUR',
        family_center: 'THE PROVIDER',
        free_spirit: 'THE FREE SPIRIT',
      };
      const subText = subLabels[profile.archetype.key] || 'THE SEEKER';

      // ─── Helpers ──────────────────────────────────────────────────────────────
      function adjustAlpha(colorStr, alpha) {
        if (!colorStr) return 'transparent';
        if (colorStr.startsWith('rgba')) {
          return colorStr.replace(/[\d\.]+\)$/, alpha + ')');
        }
        if (colorStr.startsWith('rgb')) {
          return colorStr.replace('rgb', 'rgba').replace(/\)$/, ', ' + alpha + ')');
        }
        if (colorStr.startsWith('#')) {
          const hexAlpha = Math.round(alpha * 255).toString(16).padStart(2, '0');
          return colorStr.substring(0, 7) + hexAlpha;
        }
        return colorStr;
      }

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
        ctx.shadowBlur = blur;
      }
      function clearGlow() {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

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

      // 1. GLOBAL BACKGROUND — deep space black
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#060310');
      bgGrad.addColorStop(0.5, '#09050f');
      bgGrad.addColorStop(1, '#040208');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle atmospheric glow blob behind card
      const glowBlob = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 600);
      glowBlob.addColorStop(0, adjustAlpha(pal.glow, 0.15));
      glowBlob.addColorStop(0.5, adjustAlpha(pal.glow, 0.04));
      glowBlob.addColorStop(1, 'transparent');
      ctx.fillStyle = glowBlob;
      ctx.fillRect(0, 0, W, H);

      // Ambient constellation dots & faint lines
      const dots = [
        { x: 0.1, y: 0.12 }, { x: 0.18, y: 0.35 }, { x: 0.08, y: 0.65 }, { x: 0.15, y: 0.88 },
        { x: 0.9, y: 0.15 }, { x: 0.82, y: 0.38 }, { x: 0.92, y: 0.62 }, { x: 0.85, y: 0.85 },
        { x: 0.32, y: 0.06 }, { x: 0.68, y: 0.05 }, { x: 0.45, y: 0.95 }, { x: 0.58, y: 0.94 }
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

      // 2. THE SINGLE VERTICAL TAROT CARD
      const CARD_W = 700;
      const CARD_H = 1177;
      const CARD_X = (W - CARD_W) / 2;
      const CARD_Y = (H - CARD_H) / 2 - 20;
      const CARD_R = 30;

      setGlow(pal.glow, 15);
      ctx.strokeStyle = adjustAlpha(pal.glow, 0.40);
      ctx.lineWidth = 3;
      roundRect(CARD_X, CARD_Y, CARD_W, CARD_H, CARD_R);
      ctx.stroke();
      clearGlow();

      const cardGrad = ctx.createLinearGradient(CARD_X, CARD_Y, CARD_X, CARD_Y + CARD_H);
      cardGrad.addColorStop(0, pal.top);
      cardGrad.addColorStop(0.45, pal.mid);
      cardGrad.addColorStop(1, pal.bot);
      ctx.fillStyle = cardGrad;
      roundRect(CARD_X, CARD_Y, CARD_W, CARD_H, CARD_R);
      ctx.fill();

      // Outer gold border (thick)
      ctx.strokeStyle = '#c8a96e';
      ctx.lineWidth = 3.5;
      roundRect(CARD_X + 16, CARD_Y + 16, CARD_W - 32, CARD_H - 32, CARD_R - 5);
      ctx.stroke();

      // Inner gold border (thin)
      ctx.strokeStyle = '#c8a96e55';
      ctx.lineWidth = 1.5;
      roundRect(CARD_X + 22, CARD_Y + 22, CARD_W - 44, CARD_H - 44, CARD_R - 7);
      ctx.stroke();

      // Corner ornaments ◈
      const cOrnX = [CARD_X + 42, CARD_X + CARD_W - 42];
      const cOrnY = [CARD_Y + 42, CARD_Y + CARD_H - 42];
      ctx.fillStyle = '#c8a96e';
      ctx.font = 'bold 24px Arial';
      setGlow('#c8a96e', 3);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const cx of cOrnX) {
        for (const cy of cOrnY) {
          ctx.fillText('◈', cx, cy);
        }
      }
      clearGlow();

      // Card Header
      ctx.fillStyle = '#c8a96ecc';
      ctx.font = 'bold 13px "Times New Roman", Times, Georgia, serif';
      ctx.fillText('✦  S H O P E E  C O S M I C  T A R O T ✦', W / 2, CARD_Y + 52);

      // Divider line
      ctx.strokeStyle = '#c8a96e33';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CARD_X + 35, CARD_Y + 68);
      ctx.lineTo(CARD_X + CARD_W - 35, CARD_Y + 68);
      ctx.stroke();

      // Emoji circular dashed frame
      const emojiY = CARD_Y + 240;
      ctx.strokeStyle = '#c8a96e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(W / 2, emojiY, 110, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Glow halo
      const emojiHalo = ctx.createRadialGradient(W / 2, emojiY, 0, W / 2, emojiY, 140);
      emojiHalo.addColorStop(0, adjustAlpha(pal.glow, 0.27));
      emojiHalo.addColorStop(1, 'transparent');
      ctx.fillStyle = emojiHalo;
      ctx.beginPath();
      ctx.arc(W / 2, emojiY, 140, 0, Math.PI * 2);
      ctx.fill();

      // Emoji
      ctx.font = '110px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      setGlow(pal.glow, 10);
      ctx.fillText(profile.archetype.icon || '🔮', W / 2, emojiY);
      clearGlow();

      // Title
      const archetypeName = (profile.archetype.label || 'BẢN NGÃ').toUpperCase();
      ctx.fillStyle = '#c8a96e';
      ctx.font = 'bold 44px "Times New Roman", Times, Georgia, serif';
      setGlow('#c8a96e', 6);
      ctx.fillText(archetypeName, W / 2, CARD_Y + 430);
      clearGlow();

      // Subtitle
      ctx.fillStyle = pal.accent;
      ctx.font = 'bold 15px Arial';
      setGlow(pal.glow, 4);
      ctx.fillText(subText.split('').join('\u200A'), W / 2, CARD_Y + 482);
      clearGlow();

      // Ornament
      ctx.fillStyle = '#c8a96ecc';
      ctx.font = '16px Arial';
      ctx.fillText('✦   ✵   ✦', W / 2, CARD_Y + 528);

      // Narrative text
      const rawSummary = (window.ARCHETYPE_CARD_SUMMARIES && window.ARCHETYPE_CARD_SUMMARIES[profile.archetype.key])
        ? window.ARCHETYPE_CARD_SUMMARIES[profile.archetype.key]
        : (cachedText ? cachedText.replace(/<\/?[^>]+(>|$)/g, '').replace(/\*\*/g, '').trim() : 'Đang lắng nghe thông điệp từ vũ trụ...');
      const summaryText = `"${rawSummary}"`;

      if (summaryText) {
        const maxTextW = CARD_W - 160;
        const maxTextH = 430;

        let fontSize = 28;
        let lineH = 46;
        let lines = [];

        while (fontSize >= 18) {
          ctx.font = `italic ${fontSize}px "Times New Roman", Times, Georgia, Arial, sans-serif`;
          lineH = Math.round(fontSize * 1.65);
          lines = wrapText(summaryText, maxTextW, ctx.font);
          if (lines.length * lineH <= maxTextH) {
            break;
          }
          fontSize -= 1;
        }

        ctx.fillStyle = '#f3f1f7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const startY = CARD_Y + 575 + (maxTextH - lines.length * lineH) / 2;
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], W / 2, startY + i * lineH);
        }
      }

      // Footer divider
      ctx.strokeStyle = '#c8a96e33';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CARD_X + 35, CARD_Y + CARD_H - 58);
      ctx.lineTo(CARD_X + CARD_W - 35, CARD_Y + CARD_H - 58);
      ctx.stroke();

      // Card Footer
      ctx.fillStyle = '#c8a96e99';
      ctx.font = 'bold 12px "Times New Roman", Times, Georgia, serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(`✦   ${new Date().getFullYear()}   ✦`, W / 2, CARD_Y + CARD_H - 33);

      // Watermark
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('SHOPEE ANALYTICS  ✦  GIẢI MÃ BẢN NGÃ TAROT', W / 2, H - 36);

      // Generate Blob output
      setTimeout(() => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to generate Canvas Blob'));
            return;
          }

          if (cachedTarotUrl && cachedTarotUrl.startsWith('blob:')) {
            URL.revokeObjectURL(cachedTarotUrl);
          }

          cachedTarotBlob = blob;
          cachedTarotUrl = URL.createObjectURL(blob);
          cachedTarotProfileKey = profile.archetype.key;

          resolve({ blob, previewUrl: cachedTarotUrl });
        }, 'image/png');
      }, 100);

    } catch (err) {
      reject(err);
    }
  });
};

window.generateTarotShareImage = function (profile, cachedText) {
  const btnShare = document.getElementById('btn-tarot-share');
  if (btnShare) {
    btnShare.disabled = true;
    btnShare.innerHTML = '⏳';
  }

  const shareModal = document.getElementById('tarot-share-modal');
  const loader = document.getElementById('tarot-share-loader');
  const previewImg = document.getElementById('tarot-share-preview-img');
  const btnDownload = document.getElementById('btn-tarot-download');
  const btnCopy = document.getElementById('btn-tarot-copy');

  if (!profile || !profile.archetype) {
    console.error('[Tarot Share] No profile data available');
    resetShareButton();
    if (loader) loader.style.display = 'none';
    if (shareModal) shareModal.classList.remove('active');
    return;
  }

  if (shareModal) shareModal.classList.add('active');
  if (loader) loader.style.display = 'block';
  if (previewImg) { previewImg.style.display = 'none'; previewImg.src = ''; }
  if (btnDownload) btnDownload.disabled = true;
  if (btnCopy) btnCopy.disabled = true;

  window.renderTarotCanvas(profile, cachedText)
    .then(({ blob, previewUrl }) => {
      if (previewImg) {
        previewImg.src = previewUrl;
        previewImg.style.display = 'block';
      }
      if (loader) loader.style.display = 'none';

      if (shareModal) {
        shareModal.dataset.archetypeKey = profile.archetype.key || '';
      }

      if (btnDownload) {
        btnDownload.disabled = false;
        const freshDownload = btnDownload.cloneNode(true);
        btnDownload.parentNode.replaceChild(freshDownload, btnDownload);
        freshDownload.addEventListener('click', () => {
          const link = document.createElement('a');
          link.href = previewUrl;
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
    })
    .catch((err) => {
      console.error('[Tarot Share Error]:', err);
      resetShareButton();
      if (loader) loader.style.display = 'none';
      showToast('Gặp sự cố khi tạo ảnh chia sẻ! 😢');
    });

  function resetShareButton() {
    if (btnShare) {
      btnShare.disabled = false;
      btnShare.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`;
    }
  }
};

window.generateTarotDirectShare = function (profile, cachedText) {
  const actionsContainer = document.getElementById('tarot-card-actions');
  const btnDownload = document.getElementById('btn-tarot-direct-download');
  const btnCopy = document.getElementById('btn-tarot-direct-copy');

  if (!profile || !profile.archetype || !actionsContainer) return;

  // Keep hidden initially until image is ready
  actionsContainer.style.display = 'none';
  if (btnDownload) {
    btnDownload.disabled = true;
    btnDownload.classList.add('loading');
  }
  if (btnCopy) {
    btnCopy.disabled = true;
    btnCopy.classList.add('loading');
  }

  window.renderTarotCanvas(profile, cachedText)
    .then(({ blob, previewUrl }) => {
      if (btnDownload) {
        btnDownload.disabled = false;
        btnDownload.classList.remove('loading');
        const freshDownload = btnDownload.cloneNode(true);
        btnDownload.parentNode.replaceChild(freshDownload, btnDownload);
        freshDownload.addEventListener('click', (e) => {
          e.preventDefault();
          const link = document.createElement('a');
          link.href = previewUrl;
          link.download = `shopee-banga-tarot-${profile.archetype.key}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast('Đã tải ảnh kết quả về máy! 💾');
        });
      }

      if (btnCopy) {
        btnCopy.disabled = false;
        btnCopy.classList.remove('loading');
        const freshCopy = btnCopy.cloneNode(true);
        btnCopy.parentNode.replaceChild(freshCopy, btnCopy);
        freshCopy.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            showToast('Đã sao chép ảnh vào bộ nhớ tạm! Paste để chia sẻ ngay ✨');
          } catch (err) {
            console.warn('[Tarot Direct Copy] Clipboard copy failed:', err);
            showToast('Không thể tự động copy, vui lòng tải ảnh về máy! 😢');
          }
        });
      }

      // Show container once ready
      actionsContainer.style.display = 'flex';
    })
    .catch((err) => {
      console.error('[Tarot Direct Share Error]:', err);
      if (btnDownload) {
        btnDownload.disabled = false;
        btnDownload.classList.remove('loading');
      }
      if (btnCopy) {
        btnCopy.disabled = false;
        btnCopy.classList.remove('loading');
      }
    });
};

function showToast(message) {
  const toast = document.getElementById('tarot-toast');
  if (toast) {
    const msgEl = toast.querySelector('.toast-message');
    if (msgEl && message) msgEl.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3500);
  }
}
window.showTarotToast = showToast;
