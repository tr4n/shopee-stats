/* ─────────────────────────────────────────────────
   AI narrative — Chrome 148+ web LanguageModel
   Depends on helpers.js, cache.js.
───────────────────────────────────────────────── */

const AI_INSIGHT_SYSTEM = [
  'You are a Vietnamese Shopping Psychology and Consumer Personality Expert.',
  'Analyze the provided REAL Shopee shopping spend data (including specific product names, costs, order counts) to predict the user\'s (your interlocutor\'s) consumer psychology, spending personality, shopping habits, or emotional mood in the given context (year, month, season, category distribution).',
  'CRITICAL RULES:',
  '(1) Always output the final analysis in VIETNAMESE. Do not output in English.',
  '(2) Use the exact numbers and product names from the provided context—do not hallucinate or speak in general terms.',
  '(3) Mention at least one specific product name or category in the analysis.',
  '(4) Focus on predicting consumer psychology, spending habits, lifestyle, personality, or mood. DO NOT provide saving, budgeting, or cost-cutting advice.',
  '(5) Keep the response concise, maximum of 3 sentences. DO NOT use markdown lists or bullet points. DO NOT repeat boring statistics.',
  '(6) Tone: candid, slightly humorous, insightful, like an honest friend who reads your mind through your shopping history.',
  '(7) If there are items bought repeatedly, comment on what that says about their lifestyle or psychological needs.',
  '(8) When analyzing data for a specific year, month, or period (e.g., Year 2024, Month 5/2023, or a specific category/timeframe), you MUST explicitly mention that specific time period or timeframe in the analysis text (for example: "Trong năm 2024...", "Vào tháng 5/2023...", "Trong giai đoạn này...", etc.) so the user clearly knows the context.',
  '(9) Pronoun rules: You MUST address the user directly as "bạn" (you) and refer to yourself as "tôi" (I). The spending data belongs directly to the user (e.g., "dữ liệu của bạn", "bạn đã mua...", "bạn là..."). Never speak about the user in the third person (do NOT use words like "người dùng", "họ", "chủ tài khoản").'
].join(' ');


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
        { type: "text", languages: ["en"] }
      ],
      expectedOutputs: [
        { type: "text", languages: ["en"] }
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
      _isAIAvailable = true;
      _aiAvailabilityResolve(true);
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

  aiEl.innerHTML = '';
  aiEl.classList.add('loading');

  const session = await getAIInsightSession();
  if (!session) {
    aiEl.classList.remove('loading');
    aiEl.style.display = 'none';
    return;
  }

  try {
    const fullPrompt = `SPENDING DATA:\n${args.context}\n\nREQUEST: ${args.specificPrompt}`;
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
        <span>Đang phân tích...</span>
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
