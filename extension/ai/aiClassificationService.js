// Chrome Built-in AI (Gemini Nano) classification service.
// Supports LanguageModel (Chrome 138+), ai.languageModel, chrome.aiOriginTrial.languageModel.
const ShopeeAIService = (() => {
  'use strict';

  const CATEGORY_CODES = {
    tech:    '💻 Điện tử & Công nghệ',
    sport:   '💪 Thể thao & Sức khỏe',
    home:    '🏠 Nhà cửa & Đời sống',
    fashion: '👕 Thời trang & Phụ kiện',
    edu:     '📚 Giải trí & Giáo dục',
    other:   '🏷️ Khác'
  };
  const CATEGORY_KEYS = Object.keys(CATEGORY_CODES);

  const SYSTEM_PROMPT = [
    'You are a Vietnamese e-commerce product classifier.',
    'Classify multiple product names into categories: tech, sport, home, fashion, edu, other.',
    'For each product, respond with just the category code on a new line.',
    'Example input: "iPhone 15\\nÁo thun\\nSách toán"',
    'Example output: "tech\\nfashion\\nedu"'
  ].join(' ');

  const CACHE_KEY = 'aiClassificationCache';
  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

  function getChromeMajor() {
    if (navigator.userAgentData?.brands) {
      const b = navigator.userAgentData.brands.find(x => /chrom/i.test(x.brand));
      if (b) return parseInt(b.version, 10) || 0;
    }
    const m = navigator.userAgent.match(/(?:Chrom(?:e|ium)|Edg)\/(\d+)/i);
    return m ? parseInt(m[1], 10) : 0;
  }

  // Try all known Prompt API entry points (varies by Chrome version / trial / flags).
  // NOTE: These APIs are experimental and may not be available in all Chrome installations
  function resolveModelEntry() {
    try {
      // Standard API (Chrome 138+)
      if (typeof globalThis.LanguageModel !== 'undefined') {
        return { kind: 'LanguageModel', api: globalThis.LanguageModel };
      }
      // Built-in AI API (experimental)
      if (globalThis.ai?.languageModel) {
        return { kind: 'ai.languageModel', api: globalThis.ai.languageModel };
      }
      // Origin Trial API (deprecated, fallback only)
      if (typeof chrome !== 'undefined' && chrome.aiOriginTrial?.languageModel) {
        console.warn('[ShopeeAI] Using deprecated Origin Trial API - may not be available');
        return { kind: 'chrome.aiOriginTrial', api: chrome.aiOriginTrial.languageModel };
      }
    } catch (error) {
      console.warn('[ShopeeAI] Error accessing AI APIs:', error);
    }
    return null;
  }

  function isSupported() {
    const entry = resolveModelEntry();
    if (!entry) {
      console.info('[ShopeeAI] Chrome Built-in AI is not available. Classification will use fallback logic.');
      return false;
    }
    return true;
  }

  function getDiagnostics() {
    const entry = resolveModelEntry();
    const chromeMajor = getChromeMajor();
    return {
      supported: !!entry,
      entryKind: entry?.kind || null,
      chromeMajor,
      hasLanguageModel: typeof globalThis.LanguageModel !== 'undefined',
      hasAiLanguageModel: !!globalThis.ai?.languageModel,
      hasChromeAiOriginTrial: !!(typeof chrome !== 'undefined' && chrome.aiOriginTrial?.languageModel),
      userAgent: navigator.userAgent
    };
  }

  async function checkAvailability(entry) {
    const { kind, api } = entry;
    if (kind === 'LanguageModel') {
      const status = await api.availability();
      console.log('[ShopeeAI] LanguageModel.availability() =', status);
      return status !== 'unavailable';
    }
    const cap = await api.capabilities();
    console.log('[ShopeeAI] capabilities() =', cap);
    const a = cap?.available ?? cap?.availability ?? '';
    return a === 'readily' || a === 'available' || a === 'after-download' ||
      a === 'downloadable' || a === 'downloading';
  }

  async function checkAIAvailability() {
    const entry = resolveModelEntry();
    if (!entry) {
      console.warn('[ShopeeAI] Không tìm thấy API (LanguageModel / ai.languageModel / chrome.aiOriginTrial)');
      return false;
    }
    try {
      return await checkAvailability(entry);
    } catch (e) {
      console.warn('[ShopeeAI] checkAvailability failed:', e);
      return false;
    }
  }

  function parseCategoryCode(raw) {
    const token = String(raw || '').trim().toLowerCase().replace(/[^a-z]/g, '');
    if (CATEGORY_KEYS.includes(token)) return token;
    // Fallback: first word only
    const first = String(raw || '').trim().toLowerCase().split(/\s+/)[0]?.replace(/[^a-z]/g, '');
    return CATEGORY_KEYS.includes(first) ? first : null;
  }

  async function createModelSession(entry, onProgress) {
    const { kind, api } = entry;

    if (kind === 'LanguageModel') {
      let params = null;
      try {
        params = await api.params();
        console.log('[ShopeeAI] LanguageModel.params() =', params);
      } catch (e) {
        console.warn('[ShopeeAI] params() unavailable:', e);
      }

      const sessionConfig = {
        monitor(m) {
          m.addEventListener('downloadprogress', e => {
            const pct = Math.round(e.loaded * 100);
            console.log(`[ShopeeAI] Model download: ${pct}%`);
            if (onProgress) onProgress(pct, 100, 'download');
          });
        },
        // Output is always one of the English category codes (tech/sport/home/fashion/edu/other)
        expectedOutputLanguage: 'en',
        // Product names are in Vietnamese; declare so the model can optimise tokenisation
        expectedInputLanguages: ['vi'],
        initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }]
      };
      if (params) {
        sessionConfig.temperature = 0.1;
        sessionConfig.topK = 1;
      }

      const session = await api.create(sessionConfig);
      return {
        kind: 'LanguageModel',
        session,
        async classify(input) {
          // Check if input contains multiple items (has newlines)
          const isMultiple = input.includes('\n');
          
          if (isMultiple) {
            // Batch processing - no responseConstraint for multiple items
            return await session.prompt(
              `Classify these products (one category per line):\n${input}\n\nCategories:`,
              { outputLanguage: 'en' }
            );
          } else {
            // Single item - can use responseConstraint
            const schema = { type: 'string', enum: CATEGORY_KEYS };
            try {
              return await session.prompt(input, { 
                responseConstraint: schema,
                outputLanguage: 'en'
              });
            } catch (e) {
              console.warn('[ShopeeAI] responseConstraint failed, retry plain prompt:', e);
              return await session.prompt(
                `Product: ${input}\nReply with one code only: tech, sport, home, fashion, edu, or other`,
                { outputLanguage: 'en' }
              );
            }
          }
        },
        destroy() { session.destroy(); }
      };
    }

    // Legacy: ai.languageModel / chrome.aiOriginTrial.languageModel
    const legacySession = await api.create({
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.1,
      topK: 1,
      expectedOutputLanguage: 'en',
      expectedInputLanguages: ['vi']
    });
    return {
      kind: 'legacy',
      session: legacySession,
      async classify(input) {
        const isMultiple = input.includes('\n');
        if (isMultiple) {
          return legacySession.prompt(
            `Classify these products (one category per line):\n${input}\n\nCategories:`,
            { outputLanguage: 'en' }
          );
        } else {
          return legacySession.prompt(
            `Product: ${input}\nCategory code (tech/sport/home/fashion/edu/other):`,
            { outputLanguage: 'en' }
          );
        }
      },
      destroy() {
        if (typeof legacySession.destroy === 'function') legacySession.destroy();
      }
    };
  }

  function makeCacheKey(name) {
    return name.trim().toLowerCase().substring(0, 120);
  }

  function loadCache() {
    return new Promise(resolve =>
      chrome.storage.local.get([CACHE_KEY], res => resolve(res[CACHE_KEY] || {}))
    );
  }

  function saveCache(cache) {
    return new Promise(resolve => chrome.storage.local.set({ [CACHE_KEY]: cache }, resolve));
  }

  // Persistent session — created once, reused across all classifyItemsBatch calls.
  // The Gemini Nano model is downloaded once by Chrome and stays cached on disk.
  // Keeping the session alive avoids re-initialization overhead on subsequent scans.
  let _persistentSession = null;

  async function getOrCreateSession(entry, onProgress) {
    if (_persistentSession) return _persistentSession;
    _persistentSession = await createModelSession(entry, onProgress);
    console.log(`[ShopeeAI] Persistent session created via ${entry.kind}`);
    return _persistentSession;
  }

  function destroySession() {
    if (_persistentSession) {
      try { _persistentSession.destroy(); } catch {}
      _persistentSession = null;
    }
  }

  async function classifyItemsBatch(items, onProgress) {
    if (!items.length) return {};

    const entry = resolveModelEntry();
    if (!entry) {
      console.error('[ShopeeAI] classifyItemsBatch: no model API');
      return {};
    }

    const now = Date.now();
    const cache = await loadCache();
    const results = {};
    const needsClassify = [];

    for (const item of items) {
      const key = makeCacheKey(item.name);
      const hit = cache[key];
      if (hit && hit.ts && (now - hit.ts) < CACHE_TTL_MS) {
        results[item.id] = hit.cat;
      } else {
        needsClassify.push(item);
      }
    }

    if (!needsClassify.length) return results;

    console.log(`[ShopeeAI] Classifying ${needsClassify.length} items (entry: ${entry.kind})`);

    let modelSession;
    try {
      modelSession = await getOrCreateSession(entry, onProgress);
    } catch (e) {
      console.error('[ShopeeAI] Session init failed:', e);
      _persistentSession = null;
      return results;
    }

    const BATCH_SIZE = 20;
    const cacheUpdates = {};

    try {
      for (let batchStart = 0; batchStart < needsClassify.length; batchStart += BATCH_SIZE) {
        const batch = needsClassify.slice(batchStart, batchStart + BATCH_SIZE);
        const batchInput = batch.map(item => item.name).join('\n');

        try {
          const rawResponse = await modelSession.classify(batchInput);
          const lines = String(rawResponse).split('\n').map(l => l.trim()).filter(Boolean);

          for (let i = 0; i < batch.length; i++) {
            const item = batch[i];
            const code = parseCategoryCode(lines[i] || 'other');
            const fullCat = code ? CATEGORY_CODES[code] : '🏷️ Khác';
            console.log(`[ShopeeAI] "${item.name}" → "${fullCat}"`);
            results[item.id] = fullCat;
            cacheUpdates[makeCacheKey(item.name)] = { cat: fullCat, ts: now };
          }
        } catch (e) {
          console.warn('[ShopeeAI] Batch failed, retrying individually:', e);
          // Session may be stale — reset and retry with a fresh one
          _persistentSession = null;
          try {
            modelSession = await getOrCreateSession(entry, null);
          } catch { /* give up on this batch */ }

          for (const item of batch) {
            try {
              const raw = await modelSession.classify(item.name);
              const code = parseCategoryCode(raw);
              results[item.id] = code ? CATEGORY_CODES[code] : '🏷️ Khác';
            } catch {
              results[item.id] = '🏷️ Khác';
            }
            cacheUpdates[makeCacheKey(item.name)] = { cat: results[item.id], ts: now };
          }
        }

        if (onProgress) {
          onProgress(Math.min(batchStart + BATCH_SIZE, needsClassify.length), needsClassify.length, 'classify');
        }
      }
    } catch (e) {
      console.error('[ShopeeAI] classifyItemsBatch error:', e);
      _persistentSession = null;
    }

    const merged = Object.fromEntries(
      Object.entries({ ...cache, ...cacheUpdates })
        .filter(([, v]) => (now - v.ts) < CACHE_TTL_MS)
    );
    await saveCache(merged);
    return results;
  }

  return { isSupported, checkAIAvailability, classifyItemsBatch, destroySession, getDiagnostics, resolveModelEntry };
})();

if (typeof globalThis !== 'undefined') {
  globalThis.ShopeeAIService = ShopeeAIService;
}
