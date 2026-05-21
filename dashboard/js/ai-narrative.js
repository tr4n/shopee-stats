/* ─────────────────────────────────────────────────
   AI narrative — Chrome 148+ web LanguageModel
   Depends on helpers.js, cache.js.
───────────────────────────────────────────────── */

const AI_INSIGHT_SYSTEM = [
  'You are a Vietnamese Shopping Psychology and Consumer Personality Expert.',
  'Analyze the provided REAL Shopee shopping spend data (including specific product names, costs, order counts) to predict the user\'s consumer psychology, spending personality, shopping habits, or emotional mood in the given context (year, month, season, category distribution).',
  'CRITICAL RULES:',
  '(1) Always output the final analysis in VIETNAMESE. Do not output in English.',
  '(2) Use the exact numbers and product names from the provided context—do not hallucinate or speak in general terms.',
  '(3) Mention at least one specific product name or category in the analysis.',
  '(4) Focus on predicting consumer psychology, spending habits, lifestyle, personality, or mood. DO NOT provide saving, budgeting, or cost-cutting advice.',
  '(5) Keep the response concise, maximum of 3 sentences. DO NOT use markdown lists or bullet points. DO NOT repeat boring statistics.',
  '(6) Tone: candid, slightly humorous, insightful, like an honest friend who reads your mind through your shopping history.',
  '(7) If there are items bought repeatedly, comment on what that says about their lifestyle or psychological needs.'
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

async function getAIInsightSession() {
  if (_aiInsightDisabled) return null;
  if (_aiInsightSession) return _aiInsightSession;
  if (typeof LanguageModel === 'undefined') return null;
  try {
    const status = await LanguageModel.availability();
    const isAvail = ['available', 'readily', 'downloadable', 'after-download', 'downloading'].includes(status);
    if (!isAvail) return null;
    _aiInsightSession = await LanguageModel.create({
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
    }
    return null;
  }
}

let _isAIAvailable = false;
const _aiAvailabilityPromise = (async () => {
  if (typeof LanguageModel === 'undefined') return false;
  try {
    const status = await LanguageModel.availability();
    return ['available', 'readily', 'downloadable', 'after-download', 'downloading'].includes(status);
  } catch (e) {
    return false;
  }
})();

_aiAvailabilityPromise.then(avail => {
  _isAIAvailable = avail;
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
  if (!session) { aiEl.remove(); return; }

  try {
    const fullPrompt = `SPENDING DATA:\n${args.context}\n\nREQUEST: ${args.specificPrompt}`;
    const result = await session.prompt(fullPrompt);
    if (result && result.trim()) {
      const text = result.trim();
      aiEl.innerHTML = renderAIInsight(text, cardId);
      if (_dashCache) {
        const ck = args.cacheKey || cardId;
        _dashCache.insights[ck] = text;
        saveDashCache();
      }
    } else {
      aiEl.remove();
    }
  } catch (e) {
    console.warn('[Dashboard] AI insight failed:', e);
    if (isAIFatalError(e)) {
      _aiInsightDisabled = true;
      _aiInsightSession = null;
    }
    // Show button again so user can retry
    aiEl.innerHTML = renderAnalyzeButton(cardId);
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
