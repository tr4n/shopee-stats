// Chrome Built-in AI (Gemini Nano) classification service.
// Only activates on Chrome >= 138 when LanguageModel is available.
// Called as a last resort after rule-based pipeline returns 🏷️ Khác.
const ShopeeAIService = (() => {
  'use strict';

  const CATEGORIES = [
    '💻 Điện tử & Công nghệ',
    '💪 Thể thao & Sức khỏe',
    '🏠 Nhà cửa & Đời sống',
    '👕 Thời trang & Phụ kiện',
    '📚 Giải trí & Giáo dục',
    '🏷️ Khác'
  ];

  const CACHE_KEY = 'aiClassificationCache';
  const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày

  // Gate: Chrome >= 138 AND LanguageModel global exists
  function isSupported() {
    const m = navigator.userAgent.match(/Chrome\/(\d+)/);
    return !!(m && parseInt(m[1], 10) >= 138 && typeof LanguageModel !== 'undefined');
  }

  // Returns true if Gemini Nano is ready or can be downloaded
  async function checkAIAvailability() {
    if (!isSupported()) return false;
    try {
      const status = await LanguageModel.availability();
      return status !== 'unavailable';
    } catch {
      return false;
    }
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

  // items: [{ id: string, name: string }]
  // onProgress: (done: number, total: number, phase: 'download' | 'classify') => void
  // Returns: { [id]: category }
  async function classifyItemsBatch(items, onProgress) {
    if (!items.length) return {};

    const now = Date.now();
    const cache = await loadCache();
    const results = {};
    const needsClassify = [];

    // Cache lookup first — skip items already classified
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

    let session;
    try {
      session = await LanguageModel.create({
        monitor(m) {
          m.addEventListener('downloadprogress', e => {
            if (onProgress) onProgress(Math.round(e.loaded * 100), 100, 'download');
          });
        },
        initialPrompts: [
          {
            role: 'system',
            content: [
              'Phân loại tên sản phẩm thương mại điện tử Việt Nam vào đúng một danh mục.',
              'Trả về chính xác tên danh mục, không thêm bất kỳ nội dung nào khác:',
              '- 💻 Điện tử & Công nghệ',
              '- 💪 Thể thao & Sức khỏe',
              '- 🏠 Nhà cửa & Đời sống',
              '- 👕 Thời trang & Phụ kiện',
              '- 📚 Giải trí & Giáo dục',
              '- 🏷️ Khác'
            ].join('\n')
          }
        ]
      });
    } catch (e) {
      console.warn('[ShopeeAI] Không thể khởi tạo AI session:', e);
      return results;
    }

    const schema = { type: 'string', enum: CATEGORIES };
    const cacheUpdates = {};

    try {
      for (let i = 0; i < needsClassify.length; i++) {
        const item = needsClassify[i];
        try {
          const raw = await session.prompt(`"${item.name}"`, { responseConstraint: schema });
          const cat = raw.trim();
          results[item.id] = CATEGORIES.includes(cat) ? cat : '🏷️ Khác';
        } catch {
          results[item.id] = '🏷️ Khác';
        }
        cacheUpdates[makeCacheKey(item.name)] = { cat: results[item.id], ts: now };
        if (onProgress) onProgress(i + 1, needsClassify.length, 'classify');
      }
    } finally {
      session.destroy();
    }

    // Merge updates and evict expired entries in one pass
    const merged = Object.fromEntries(
      Object.entries({ ...cache, ...cacheUpdates })
        .filter(([, v]) => (now - v.ts) < CACHE_TTL_MS)
    );
    await saveCache(merged);

    return results;
  }

  return { isSupported, checkAIAvailability, classifyItemsBatch };
})();
