/* ─────────────────────────────────────────────────
   AI narrative — Chrome 148+ web LanguageModel
   Depends on helpers.js, cache.js.
───────────────────────────────────────────────── */

const AI_INSIGHT_SYSTEM = [
  'You are a Vietnamese Personal Finance Expert.',
  'Analyze the provided REAL Shopee shopping spend data (including specific product names, costs, order counts) and provide HONEST, highly PERSONALIZED feedback.',
  'CRITICAL RULES:',
  '(1) Always output the final analysis in VIETNAMESE. Do not output in English.',
  '(2) Use the exact numbers and product names from the provided context—do not hallucinate or speak in general terms.',
  '(3) Mention at least one specific product name or category in the analysis.',
  '(4) Suggest at least one actionable, realistic cost-cutting or saving advice tied directly to the purchased items.',
  '(5) Keep the response concise, maximum of 3 sentences. DO NOT use markdown lists or bullet points. DO NOT repeat boring statistics.',
  '(6) Tone: candid, slightly humorous, like an honest financially-savvy friend talking directly to them.',
  '(7) If there are items bought repeatedly, comment on that buying habit.'
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
    if (status === 'unavailable') return null;
    _aiInsightSession = await LanguageModel.create({
      initialPrompts: [{ role: 'system', content: AI_INSIGHT_SYSTEM }]
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

// cacheKey: optional override for cache lookup (used for per-year monthly insights)
async function enrichWithAI(cardId, context, specificPrompt, cacheKey) {
  // Always persist call args so the refresh button can re-trigger this call
  _aiInsightCallArgs[cardId] = { context, specificPrompt, cacheKey };

  if (_aiInsightDisabled) return;
  const aiEl = document.getElementById(cardId + '-ai');
  if (!aiEl) return;

  const ck = cacheKey || cardId;

  // Serve from cache if available — no AI call needed
  if (_dashCache?.insights[ck]) {
    aiEl.innerHTML = renderAIInsight(_dashCache.insights[ck], cardId);
    return;
  }

  aiEl.classList.add('loading');

  const session = await getAIInsightSession();
  if (!session) { aiEl.remove(); return; }

  try {
    const fullPrompt = `DỮ LIỆU CHI TIÊU:\n${context}\n\nYÊU CẦU: ${specificPrompt}`;
    const result = await session.prompt(fullPrompt);
    if (result && result.trim()) {
      const text = result.trim();
      aiEl.innerHTML = renderAIInsight(text, cardId);
      if (_dashCache) {
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
    aiEl.remove();
  } finally {
    aiEl.classList.remove('loading');
  }
}

window.rerunAIInsight = async function (cardId) {
  const args = _aiInsightCallArgs[cardId];
  if (!args) return;

  // Show spinner on the button immediately
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

  // Clear cached result for this card so enrichWithAI will call the model again
  const ck = args.cacheKey || cardId;
  if (_dashCache?.insights) {
    delete _dashCache.insights[ck];
    saveDashCache();
  }

  await enrichWithAI(cardId, args.context, args.specificPrompt, args.cacheKey);
};
