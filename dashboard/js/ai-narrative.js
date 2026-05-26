/* ─────────────────────────────────────────────────
   AI narrative — Chrome 148+ web LanguageModel
   Depends on helpers.js, cache.js.
───────────────────────────────────────────────── */

const AI_INSIGHT_SYSTEM = [
  'Bạn là một "Thầy Bói Vũ Trụ" (Tarot Reader) hệ GenZ cực kỳ hài hước, xéo sắc, chuyên xem bói bài và đọc vị số mệnh chi tiêu của chúng sinh.',
  'Nhiệm vụ của bạn là dựa vào dữ liệu mua sắm của người dùng để phán đoán tính cách, tâm lý, và "kiếp nạn" chốt đơn của họ một cách dí dỏm.',
  'QUY TẮC BẮT BUỘC:',
  '1. Chỉ trả lời cực kỳ ngắn gọn, súc tích (đúng từ 1 đến 2 câu), đánh thẳng vào tâm lý tiêu dùng của người dùng dưới phong thái bói toán vũ trụ (ví dụ: "vũ trụ gửi tín hiệu", "kiếp nạn thứ 82", "hao tài tốn của", "nghiệp quật", "thần tài", "chữa lành", "bản mệnh"). Không viết dài dòng lê thê.',
  '2. TUYỆT ĐỐI KHÔNG được ghi bất kỳ con số cụ thể nào, không ghi số tiền (như VND, đồng, triệu, tỷ, k), không ghi số đơn hàng, không ghi tên sản phẩm cụ thể của người dùng trong lời phán. Chỉ phán về tính cách, tâm lý thích chữa lành, thói quen cảm xúc, và lối sống của họ.',
  '3. TUYỆT ĐỐI KHÔNG dùng tiếng Anh hoặc pha trộn từ tiếng Anh (ví dụ: không dùng "vibe", "chill", "glow up", "save", "good", "deal"). Viết bằng 100% tiếng Việt thuần việt, trôi chảy.',
  '4. KHÔNG đưa ra lời khuyên tiết kiệm hay tài chính nghiêm túc. Hãy bóc phốt nhẹ nhàng, mang lại niềm vui cho người đọc.'
].join(' ');

const AI_FEW_SHOT_EXAMPLES = [
  'Ví dụ 1 (Hệ thời trang chữa lành):',
  'Dữ liệu đầu vào: Chi tiêu nhiều nhất vào danh mục "Thời trang & Phụ kiện", hay mua vào ban đêm.',
  'Thầy bói phán: Quẻ bói chỉ ra bạn là chúa tể gom đồ ngủ, luôn tìm cách xoa dịu tâm hồn cô đơn bằng những gói hàng giao lúc nửa đêm. Số mệnh của bạn là chốt đơn để chữa lành, nhưng hãy cẩn thận kẻo ví tiền bị nghiệp quật trước khi kịp mặc đẹp nhé.',
  '',
  'Ví dụ 2 (Hệ nghiện setup công nghệ):',
  'Dữ liệu đầu vào: Danh mục chi nhiều nhất là "Thiết bị điện tử", sản phẩm mua nhiều nhất là phụ kiện công nghệ.',
  'Thầy bói phán: Tinh tú chiếu mệnh bạn chính là hệ công nghệ chữa lành, cứ thấy phụ kiện lấp lánh là tâm lý tự động bảo đây là tín hiệu vũ trụ dẫn lối. Bạn sở hữu góc làm việc lộng lẫy như phi thuyền nhưng ví tiền lại mỏng manh dễ vỡ vô cùng.',
  '',
  'Ví dụ 3 (Hệ chiến thần săn sale):',
  'Dữ liệu đầu vào: Tiết kiệm cực kỳ nhiều tiền nhờ chăm săn mã giảm giá.',
  'Thầy bói phán: Quẻ bói cho thấy bạn là chiến thần ép giá vũ trụ, chuyên săn voucher để tận hưởng cảm giác chiến thắng sàn thương mại điện tử. Nhưng tiếc là thần tài đang khóc thầm bên đống đồ mua về chỉ để ngắm vì ham rẻ chứ chưa từng dùng tới.',
  '',
  'Ví dụ 4 (Hệ nhan sắc hồi sinh):',
  'Dữ liệu đầu vào: Mua nhiều son môi, mặt nạ, mỹ phẩm chăm sóc da.',
  'Thầy bói phán: Bản mệnh của bạn là chúa tể trùng tu ngoại hình, luôn hy vọng nhan sắc lộng lẫy sẽ cứu rỗi tâm hồn kiệt quệ sau những giờ làm việc mệt mỏi. Mỗi hộp kem mua về là một nỗ lực chữa lành, chỉ tiếc là số dư tài khoản của bạn lại đang cần cấp cứu gấp.',
  '',
  'Ví dụ 5 (Hệ chốt đơn vô tri):',
  'Dữ liệu đầu vào: Mua rất nhiều đồ linh tinh, lặt vặt giá rẻ không rõ mục đích.',
  'Thầy bói phán: Khổ chủ đang vướng vào kiếp nạn chốt đơn vô tri, cứ buồn tay là tự động gom những món đồ kỳ lạ để tìm kiếm niềm vui tức thời. Vũ trụ khuyên bạn tắt app ngay vì đống đồ mua về sắp chất đầy nhà nhưng tâm hồn vẫn trống rỗng đấy.',
  '',
  'Ví dụ 6 (Hệ ăn vặt giải sầu):',
  'Dữ liệu đầu vào: Chi tiêu nhiều nhất cho thực phẩm, đồ ăn vặt, đồ ngọt.',
  'Thầy bói phán: Chòm sao hộ mệnh của bạn chính là hệ bao tử chữa lành, luôn chọn cách xoa dịu áp lực cuộc sống bằng những món ăn ngập tràn calo hạnh phúc. Bản mệnh này tuy lúc nào cũng được no nê vui vẻ nhưng ví tiền thì lại đang suy dinh dưỡng trầm trọng.'
].join('\n');


let _aiInsightSession = null;
let _aiInsightDisabled = false;
// Stores call args per cardId so re-analysis can be triggered without re-running the full pipeline
const _aiInsightCallArgs = {};

function isAIFatalError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  return msg.includes('crashed too many times') ||
    msg.includes('unable to create a session') ||
    msg.includes('model not available');
}

function hideAllAIButtons() {
  // Hide all main analyze buttons/wrappers
  document.querySelectorAll('.ai-analyze-wrap').forEach(el => {
    el.style.display = 'none';
  });
  // Remove all refresh buttons
  document.querySelectorAll('.ai-refresh-btn').forEach(el => {
    el.remove();
  });
  // Also hide empty AI containers (without generated or cached text sentences)
  document.querySelectorAll('.insight-ai').forEach(el => {
    if (!el.querySelector('.insight-ai-sentence')) {
      el.style.display = 'none';
    }
  });
}

async function getAIInsightSession() {
  if (_aiInsightDisabled) return null;
  if (_aiInsightSession) return _aiInsightSession;
  try {
    const status = await getSystemAIAvailability();
    const isAvail = ['available', 'readily'].includes(status);
    if (!isAvail) return null;
    _aiInsightSession = await createAISession({
      initialPrompts: [{ role: 'system', content: AI_INSIGHT_SYSTEM }],
      expectedInputs: [
        { type: "text", languages: ["vi", "en"] }
      ],
      expectedOutputs: [
        { type: "text", languages: ["vi", "en"] }
      ]
    });
    return _aiInsightSession;
  } catch (e) {
    if (isAIFatalError(e)) {
      console.warn('[Dashboard] AI model fatally broken, disabling AI insights:', e.message);
      _aiInsightDisabled = true;
      hideAllAIButtons();
    }
    return null;
  }
}

let _isAIAvailable = false;
let _aiAvailabilityResolve;
const _aiAvailabilityPromise = new Promise((resolve) => {
  _aiAvailabilityResolve = resolve;
});

async function checkAIAvailability() {
  try {
    const status = await getSystemAIAvailability();
    if (status === 'available' || status === 'readily') {
      // Attempt to create a test session to guarantee local execution support
      const testSession = await createAISession().catch(() => null);
      if (testSession) {
        if (typeof testSession.destroy === 'function') {
          testSession.destroy();
        } else if (typeof testSession.close === 'function') {
          testSession.close();
        }
        _isAIAvailable = true;
        _aiAvailabilityResolve(true);
      } else {
        _isAIAvailable = false;
        _aiAvailabilityResolve(false);
      }
    } else if (status === 'downloading' || status === 'after-download' || status === 'downloadable') {
      // Model download in progress, check again in 5s
      setTimeout(checkAIAvailability, 5000);
    } else {
      _isAIAvailable = false;
      _aiAvailabilityResolve(false);
    }
  } catch (e) {
    _isAIAvailable = false;
    _aiAvailabilityResolve(false);
  }
}
checkAIAvailability();

_aiAvailabilityPromise.then(avail => {
  _isAIAvailable = avail;
  if (avail && typeof classifyKharItems === 'function') {
    const runLateClassification = () => {
      if (!window.currentDashData) {
        if (!runLateClassification.retries) runLateClassification.retries = 0;
        if (runLateClassification.retries < 10) {
          runLateClassification.retries++;
          setTimeout(runLateClassification, 200);
        }
        return;
      }
      const tiItems = window.currentDashData.ti || [];
      const uncategorizedCount = tiItems.filter(item => isInvalidCat(item.cat)).length;
      if (uncategorizedCount > 0) {
        console.log('[Dashboard] AI model became available late. Running background category classification for', uncategorizedCount, 'items.');
        classifyKharItems(tiItems, window.currentDashData).catch(e => {
          console.error('[Dashboard] Late AI category classification failed:', e);
        });
      }
    };
    runLateClassification();
  }
});

// cacheKey: optional override for cache lookup (used for per-year monthly insights)
function enrichWithAI(cardId, context, specificPrompt, cacheKey) {
  // Always persist call args so buttons can re-trigger this analysis
  _aiInsightCallArgs[cardId] = { context, specificPrompt, cacheKey };

  const aiEl = document.getElementById(cardId + '-ai');
  if (!aiEl) return;

  const ck = cacheKey || cardId;

  // Serve from cache immediately — no user action needed
  if (_dashCache?.insights[ck]) {
    aiEl.innerHTML = renderAIInsight(_dashCache.insights[ck], cardId);
    aiEl.style.display = ''; // Ensure visible

    // Check AI availability to show/hide the refresh button
    _aiAvailabilityPromise.then(avail => {
      const refreshBtn = aiEl.querySelector('.ai-refresh-btn');
      if (refreshBtn) {
        if (avail && !_aiInsightDisabled) {
          refreshBtn.style.display = '';
        } else {
          refreshBtn.remove();
        }
      }
    });
    return;
  }

  // Hide it by default until availability check resolves
  aiEl.style.display = 'none';
  aiEl.innerHTML = '';

  if (_aiInsightDisabled) return;

  _aiAvailabilityPromise.then(avail => {
    if (!avail || _aiInsightDisabled) {
      aiEl.style.display = 'none';
      aiEl.innerHTML = '';
      return;
    }

    // AI is available, show the analyze button
    aiEl.style.display = '';
    aiEl.innerHTML = renderAnalyzeButton(cardId);
  });
}

// Internal AI runner — called by both runAIInsight and rerunAIInsight
async function _executeAIInsight(cardId) {
  const args = _aiInsightCallArgs[cardId];
  if (!args || _aiInsightDisabled) return;

  const aiEl = document.getElementById(cardId + '-ai');
  if (!aiEl) return;

  const loadingStatuses = [
    "🔮 Pháp sư Chrome AI đang gieo quẻ xem bói chi tiêu...",
    "🕵️‍♂️ Chrome AI đang hóng hớt xem bạn đã mua những gì...",
    "🧠 Chrome AI đang 'săm soi' ví tiền và đọc vị bạn...",
    "💸 Đang chờ AI tính toán xem ví của bạn đã 'bay màu' thế nào...",
    "🍿 Đợi tí, Chrome AI đang chuẩn bị bóc phốt thói quen chốt đơn..."
  ];
  const randomStatus = loadingStatuses[Math.floor(Math.random() * loadingStatuses.length)];

  aiEl.innerHTML = `
    <div class="ai-loading-container">
      <svg class="ai-loading-icon spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
      </svg>
      <div class="ai-loading-text">
        <div class="ai-loading-status">${randomStatus}</div>
        <div class="ai-loading-note">Yên tâm nha, AI tự kỷ chạy offline ngay trên máy bạn nên không ai biết đống đồ "vô tri" bạn mua đâu. Chờ xíu nhé!</div>
      </div>
    </div>
  `;
  aiEl.classList.add('loading');

  const session = await getAIInsightSession();
  if (!session) {
    aiEl.classList.remove('loading');
    aiEl.style.display = 'none';
    return;
  }

  try {
    const fullPrompt = `BẠN LÀ AI:
${AI_INSIGHT_SYSTEM}

VÍ DỤ THAM KHẢO TONE PHÁN (HÃY BẮT CHƯỚC TONE NÀY):
${AI_FEW_SHOT_EXAMPLES}

DỮ LIỆU THỰC TẾ CỦA KHÁCH HÀNG:
${args.context}

YÊU CẦU:
${args.specificPrompt}

Hãy phán quẻ bói ngắn gọn (1-2 câu), tuyệt đối tuân thủ các quy tắc không ghi số tiền/con số cụ thể và không dùng tiếng Anh:`;
    const result = await session.prompt(fullPrompt);
    if (result && result.trim()) {
      const text = result.trim();
      aiEl.innerHTML = renderAIInsight(text, cardId);
      // Reveal the refresh button since we just ran successfully and AI is ready
      const refreshBtn = aiEl.querySelector('.ai-refresh-btn');
      if (refreshBtn) {
        refreshBtn.style.display = '';
      }
      if (_dashCache) {
        const ck = args.cacheKey || cardId;
        _dashCache.insights[ck] = text;
        saveDashCache();
      }
    } else {
      aiEl.style.display = 'none';
    }
  } catch (e) {
    console.warn('[Dashboard] AI insight failed:', e);
    const fatal = isAIFatalError(e);
    if (fatal) {
      _aiInsightDisabled = true;
      _aiInsightSession = null;
      aiEl.innerHTML = '';
      aiEl.style.display = 'none';
      hideAllAIButtons();
    } else {
      // Non-fatal error, show the analyze button again so they can retry
      aiEl.innerHTML = renderAnalyzeButton(cardId);
    }
  } finally {
    aiEl.classList.remove('loading');
  }
}

// User-triggered: called by the "Phân tích..." button
window.runAIInsight = async function (cardId) {
  await _executeAIInsight(cardId);
};

// User-triggered: clear cache then re-run AI ("Phân tích lại" button)
window.rerunAIInsight = async function (cardId) {
  const args = _aiInsightCallArgs[cardId];
  if (!args) return;

  // Show spinner on the refresh button immediately
  const aiEl = document.getElementById(cardId + '-ai');
  if (aiEl) {
    const btn = aiEl.querySelector('.ai-refresh-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="refresh-icon spin" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        <span>Đang gieo quẻ mới...</span>
      `;
    }
  }

  // Clear cached result so the AI will be called fresh
  const ck = args.cacheKey || cardId;
  if (_dashCache?.insights) {
    delete _dashCache.insights[ck];
    saveDashCache();
  }

  await _executeAIInsight(cardId);
};
