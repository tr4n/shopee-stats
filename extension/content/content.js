(function() {
  'use strict';

  let runNonce = null;

  /**
   * Security & Reviewer Compliance Note:
   * `safeSend` handles message passing back to the extension's popup window.
   * It catches "Extension context invalidated" errors that happen if the user reloads
   * or closes the popup window while an analysis is in progress. The message payload
   * contains only raw statistical values and state logs for popup rendering.
   */
  function safeSend(msg) {
    try {
      if (!chrome.runtime?.id) {
        console.warn('[ShopeeAnalytics] Extension context invalidated, dropping message:', msg.type);
        return;
      }
      if (runNonce) {
        msg.nonce = runNonce;
      }
      chrome.runtime.sendMessage(msg).catch(() => {});
    } catch (e) {
      // Silently ignore — popup may have been closed
    }
  }

  /**
   * Security Note:
   * We retrieve the temporary parameters (nonce, current order cache) from `chrome.storage.local`.
   * These parameters are stored briefly by the popup before script injection. 
   * We immediately call `chrome.storage.local.remove` to clean up the temporary config object,
   * minimizing the storage footprint.
   */
  chrome.storage.local.get(['shopee_temp_config'], (res) => {
    const cfg = res.shopee_temp_config || {};
    const LIST_TYPE = cfg.listType || 3;
    const LAST_UPDATED = cfg.lastUpdated || 0;
    const CACHED_MINI_ORDERS = Array.isArray(cfg.miniOrders) ? cfg.miniOrders : [];
    const CACHED_ITEM_MAP = cfg.itemMap || {};
    // Nonce ties this content script instance to the popup run that spawned it.
    // The popup uses it to drop messages from any parallel/stale instances.
    runNonce = cfg.nonce || null;

    // Clean up temporary config immediately
    chrome.storage.local.remove(['shopee_temp_config']);

    let isCancelled = false;

    // Listen for ping/cancel from the popup
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.nonce === runNonce) {
        if (msg.type === 'ping') {
          sendResponse({ type: 'pong' });
        } else if (msg.type === 'cancel') {
          isCancelled = true;
        }
      }
      return false;
    });

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Technical & Security Rationale:
   * We delegate the fetch requests to the Main World context using CustomEvents (`__sa_fetch_req` 
   * and `__sa_fetch_res`). Doing so is necessary to bypass Shopee's strict anti-CSRF / CORS
   * verification that rejects cross-origin requests coming from the isolated extension world.
   * All fetched data stays local to the client browser and is utilized solely for statistical aggregation.
   */
  function fetchViaMainWorldBridge(url, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2);
      const timer = setTimeout(() => {
        window.removeEventListener('__sa_fetch_res', handler);
        reject(new Error('Lỗi mạng. Kiểm tra kết nối internet.'));
      }, timeoutMs);

      function handler(ev) {
        if (ev.detail.id !== id) return;
        window.removeEventListener('__sa_fetch_res', handler);
        clearTimeout(timer);
        resolve(ev.detail);
      }
      window.addEventListener('__sa_fetch_res', handler);
      window.dispatchEvent(new CustomEvent('__sa_fetch_req', { detail: { id, url } }));
    });
  }

  async function fetchWithRetry(url) {
    const MAX_RETRIES = 3;
    let lastErr;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await fetchViaMainWorldBridge(url);

        if (result.networkError) throw new Error('Lỗi mạng. Kiểm tra kết nối internet.');

        if (result.status === 401) {
          const err = new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại Shopee.');
          err.fatal = true;
          throw err;
        }
        if (result.status === 403) {
          const err = new Error('Shopee từ chối yêu cầu (lỗi 403). Vui lòng tải lại trang Shopee (F5) và thử lại. Nếu vẫn lỗi, hãy đăng nhập lại Shopee.');
          err.fatal = true;
          throw err;
        }
        if (result.status === 429) {
          await sleep(2000 * attempt);
          continue;
        }
        if (!result.ok) {
          throw new Error('Lỗi máy chủ (HTTP ' + result.status + '). Vui lòng thử lại.');
        }
        if (result.parseError || result.data === null) {
          throw new Error('Lỗi đọc dữ liệu từ Shopee. Vui lòng tải lại trang và thử lại.');
        }
        return result.data;
      } catch (err) {
        lastErr = err;
        console.warn(`[ShopeeAnalytics] Lỗi kết nối ở lần thử ${attempt}:`, err);
        const isFatal = err.fatal || (err.message && (
          err.message.includes('đăng nhập') ||
          err.message.includes('máy chủ')
        ));
        if (isFatal) throw err;
        if (attempt < MAX_RETRIES) await sleep(1000 * attempt);
      }
    }
    throw lastErr || new Error('Lỗi mạng. Kiểm tra kết nối internet.');
  }

  function getRawTs(orderObj) {
    return (
      orderObj &&
      orderObj.shipping &&
      orderObj.shipping.tracking_info &&
      orderObj.shipping.tracking_info.ctime
    ) || 0;
  }

  function addToPeriod(periods, key, o) {
    periods[key].totalSpent += o.finalCost;
    periods[key].orderCount += 1;
    periods[key].itemCount += o.itemCount;
    periods[key].rawSpent += o.rawCost;
  }

  function computeStats(orders) {
    let totalSpentAmt = 0;
    let totalOriginalAmt = 0;
    let totalItemCount = 0;

    const now = new Date();
    const ref1M = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const ref3M = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const ref6M = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const ref1Y = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const periods = {
      '1_month': { totalSpent: 0, orderCount: 0, itemCount: 0, rawSpent: 0 },
      '3_months': { totalSpent: 0, orderCount: 0, itemCount: 0, rawSpent: 0 },
      '6_months': { totalSpent: 0, orderCount: 0, itemCount: 0, rawSpent: 0 },
      '1_year':   { totalSpent: 0, orderCount: 0, itemCount: 0, rawSpent: 0 }
    };
    const byYear = {};

    for (const o of orders) {
      totalSpentAmt += o.finalCost;
      totalOriginalAmt += o.rawCost;
      totalItemCount += o.itemCount;

      if (o.ts) {
        const d = new Date(o.ts * 1000);
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1);

        if (d >= ref1M) addToPeriod(periods, '1_month', o);
        if (d >= ref3M) addToPeriod(periods, '3_months', o);
        if (d >= ref6M) addToPeriod(periods, '6_months', o);
        if (d >= ref1Y) addToPeriod(periods, '1_year', o);

        if (!byYear[yr]) {
          byYear[yr] = {
            total: { totalSpent: 0, orderCount: 0, itemCount: 0, rawSpent: 0 },
            months: {}
          };
        }
        const yt = byYear[yr].total;
        yt.totalSpent += o.finalCost;
        yt.orderCount += 1;
        yt.itemCount += o.itemCount;
        yt.rawSpent += o.rawCost;

        if (!byYear[yr].months[mo]) {
          byYear[yr].months[mo] = { totalSpent: 0, orderCount: 0, itemCount: 0, rawSpent: 0 };
        }
        const mt = byYear[yr].months[mo];
        mt.totalSpent += o.finalCost;
        mt.orderCount += 1;
        mt.itemCount += o.itemCount;
        mt.rawSpent += o.rawCost;
      }
    }

    return {
      totalOrders: orders.length,
      totalSpent: totalSpentAmt,
      totalSaved: totalOriginalAmt - totalSpentAmt,
      totalItems: totalItemCount,
      monthlyStats: periods,
      yearlyStats: byYear,
      totalRawSpent: totalOriginalAmt
    };
  }

  function capMap(map, limit) {
    const entries = Object.entries(map).sort((a, b) => b[1].spent - a[1].spent);
    const result = {};
    entries.slice(0, limit).forEach(([k, v]) => { result[k] = v; });
    return result;
  }

  // Classification is done in the dashboard.
  // Content script only processes and structures raw order data.

  const HOMOGLYPH_MAP = {
    // Cyrillic
    'а': 'a', 'А': 'A',
    'в': 'v', 'В': 'B',
    'е': 'e', 'Е': 'E',
    'ѕ': 's', 'Ѕ': 'S',
    'і': 'i', 'І': 'I',
    'ј': 'j', 'Ј': 'J',
    'к': 'k', 'К': 'K',
    'м': 'm', 'М': 'M',
    'н': 'h', 'Н': 'H',
    'о': 'o', 'О': 'O',
    'р': 'p', 'Р': 'P',
    'с': 'c', 'С': 'C',
    'т': 't', 'Т': 'T',
    'у': 'y', 'У': 'Y',
    'х': 'x', 'Х': 'X',
    'ԁ': 'd',
    'ш': 'w',
    'ђ': 'đ', 'Ђ': 'Đ',

    // Greek
    'α': 'a', 'Α': 'A',
    'β': 'b', 'Β': 'B',
    'γ': 'y',
    'ε': 'e', 'Ε': 'E',
    'ζ': 'z', 'Ζ': 'Z',
    'η': 'h', 'Η': 'H',
    'ι': 'i', 'Ι': 'I',
    'κ': 'k', 'Κ': 'K',
    'μ': 'm', 'Μ': 'M',
    'ν': 'v', 'Ν': 'N',
    'ο': 'o', 'Ο': 'O',
    'ρ': 'p', 'Ρ': 'P',
    'σ': 's', 'ς': 's',
    'τ': 't', 'Τ': 'T',
    'υ': 'y', 'Υ': 'Y',
    'χ': 'x', 'Χ': 'X',
    'ω': 'w', 'Ω': 'O',

    // Cherokee
    'Ꭰ': 'A', 'Ꭱ': 'R', 'Ꭲ': 'I', 'Ꮇ': 'M', 'Ꮎ': 'H', 'Ꮜ': 'U',
    'Ꮣ': 'D', 'Ꮤ': 'T', 'Ꮩ': 'V', 'Ꮹ': 'W', 'Ꮿ': 'Y', 'Ᏼ': 'B',
    'Ꮋ': 'H', 'Ꭻ': 'J', 'Ꮶ': 'K', 'Ꮡ': 'S', 'Ꮞ': '4', 'Ꮠ': 'O',
    'Ꮸ': 'V', 'Ꮺ': 'W'
  };

  // Pre-compile regex for fast detection of homoglyphs, zero-width spaces, math script, fullwidth characters, etc.
  const SPECIAL_CHAR_REGEX = /[\u0370-\u03FF\u0400-\u04FF\u13A0-\u13FF\u200B-\u200D\uFEFF\u200E\u200F\u2060\u2100-\u214F\uFF00-\uFFEF]|\ud835[\udc00-\udfff]/;

  function cleanHomoglyphsAndFonts(text) {
    if (!text) return '';
    
    // Fast path: if the text doesn't contain any target bypass characters, skip normalization & translation entirely.
    // This is a major optimization for Vietnamese text because normalize("NFKD") decomposes accents,
    // which takes significant CPU time when done on thousands of items.
    if (!SPECIAL_CHAR_REGEX.test(text)) {
      return text;
    }

    // Step 1: Normalize using NFKD to decompose styled fonts (bold, italic, double-struck, fullwidth, etc.)
    const decomp = text.normalize("NFKD");

    // Step 2: Replace confusable homoglyphs from Cyrillic, Greek, Cherokee, etc.
    let result = '';
    for (const char of decomp) {
      result += HOMOGLYPH_MAP[char] || char;
    }

    // Step 3: Strip zero-width and invisible characters
    result = result.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u2060]/g, '');

    // Step 4: Recompose characters and accents using NFC
    return result.normalize("NFC");
  }

  function formatItemNameForDisplay(name) {
    let s = String(name || '');
    // Chuẩn hóa ký tự lách luật (Mathematical symbols & Homoglyphs)
    s = cleanHomoglyphsAndFonts(s);
    // Loại bỏ các tag quảng cáo [ ] ( ) { }
    s = s.replace(/\[.*?\]|\(.*?\)|\{.*?\}/g, ' ');
    // Loại bỏ khoảng trắng thừa
    return s.replace(/\s+/g, ' ').trim();
  }

  async function startAnalysis() {
    console.log('[ShopeeAnalytics] Bắt đầu quá trình khởi tạo báo cáo...');
    
    try {
      // Send initial message to indicate start
      safeSend({ type: 'progress', message: 'Đang kết nối...', processed: 0, total: 0, pct: -1 });

      let offsetIndex = 0;
      const LIMIT = 20;
      let hasMoreData = true;
      let hitCache = false;
      let totalCount = 0;

      // Smart dynamic congestion control parameters
      // We implement adaptive rate-limiting (backing off when API response is slow)
      // to protect Shopee's API servers from load spikes and avoid HTTP 429 rate-limiting.
      let baseDelay = 150; // Start at 150ms
      const MIN_DELAY = 100;
      const MAX_DELAY = 500;
      let consecutiveSuccessCount = 0;
      let lastDuration = 0;
      let lastSleepTime = 0;

      const newMiniOrders = [];

      const itemMap = {};
      for (const [k, v] of Object.entries(CACHED_ITEM_MAP)) {
        itemMap[k] = Object.assign({}, v);
      }

      while (hasMoreData && !hitCache) {
        if (isCancelled) {
          throw new Error('Tiến trình đã bị hủy.');
        }

        const jitter = Math.floor(Math.random() * 80) + 10; // 10ms - 90ms jitter
        const sleepTime = offsetIndex > 0 ? (baseDelay + jitter) : 0;
        lastSleepTime = sleepTime;
        if (sleepTime > 0) {
          await sleep(sleepTime);
        }
        
        // Fetch official purchase order history endpoint. Accessing this requires the active Shopee cookie.
        // Data is processed and aggregated purely client-side; no personal identifiers are extracted or stored.
        const url = `https://shopee.vn/api/v4/order/get_order_list?list_type=${LIST_TYPE}&offset=${offsetIndex}&limit=${LIMIT}`;
        const startTime = Date.now();
        const json = await fetchWithRetry(url);
        const duration = Date.now() - startTime;
        lastDuration = duration;

        if (!json || typeof json !== 'object') {
          throw new Error('Dữ liệu trả về từ Shopee không hợp lệ. Vui lòng tải lại trang và thử lại.');
        }

        // Adapt delay based on API response duration / load signs
        if (duration > 1500) {
          baseDelay = Math.min(baseDelay + 50, MAX_DELAY);
          consecutiveSuccessCount = 0;
          console.log(`[ShopeeAnalytics] Response slow (${duration}ms). Backing off, base delay: ${baseDelay}ms`);
        } else if (duration < 600) {
          consecutiveSuccessCount++;
          if (consecutiveSuccessCount >= 4) {
            baseDelay = Math.max(baseDelay - 10, MIN_DELAY);
            consecutiveSuccessCount = 0;
          }
        } else {
          consecutiveSuccessCount = 0;
        }

        if (offsetIndex === 0) {
          totalCount = (json && json.data && (json.data.total || json.data.total_count)) || 0;
        }

        const orders = (json && json.data && json.data.details_list) || [];
        hasMoreData = orders.length >= LIMIT;

        for (const order of orders) {
          const rawTs = getRawTs(order);

          if (LAST_UPDATED > 0 && rawTs > 0 && rawTs <= LAST_UPDATED) {
            hitCache = true;
            break;
          }

          const infoCard = order.info_card || {};
          const finalCost = (infoCard.final_total || 0) / 100000;

          let rawCost = 0;
          let itemCount = 0;
          // Compact item list per order — enables period-filtered top items in popup
          const orderItemList = [];

          const cards = infoCard.order_list_cards || [];
          for (const card of cards) {
            const productInfo = card.product_info || {};
            const groups = productInfo.item_groups || [];

            for (const grp of groups) {
              // Try multiple possible catid fields from Shopee API
              const catId = grp.catid || grp.cat_id || grp.main_cat_id || grp.category_id || grp.main_category_id || 0;
              const items = grp.items || [];

              for (const it of items) {
                const price = (it.order_price || 0) / 100000;
                const qty = it.amount || 1;
                rawCost += price;
                itemCount += qty;

                const baseItemId = String(it.item_id || '');
                const modelId = String(it.modelid || it.model_id || '');
                const uniqueItemId = baseItemId + (modelId ? '_' + modelId : '');

                let itemName = it.name || it.item_name || 'Sản phẩm';
                const modelName = it.model_name || '';
                if (modelName) itemName += ` - ${modelName}`;

                itemName = formatItemNameForDisplay(itemName);

                // Item-level catid takes priority over group-level
                const itemCatId = it.catid || it.cat_id || it.main_cat_id || it.category_id || catId;

                if (uniqueItemId) {
                  if (!itemMap[uniqueItemId]) {
                    itemMap[uniqueItemId] = { name: itemName, spent: 0, count: 0, catId: itemCatId };
                  }
                  itemMap[uniqueItemId].spent += price;
                  itemMap[uniqueItemId].count += qty;
                }

                orderItemList.push({
                  i: uniqueItemId,
                  n: itemName.substring(0, 100),
                  s: price,
                  c: qty,
                  cat: itemCatId
                });
              }
            }
          }

          newMiniOrders.push({ ts: rawTs, finalCost, rawCost, itemCount, il: orderItemList });
        }

        offsetIndex += LIMIT;

        if (hasMoreData && !hitCache) {
          const currentTotal = newMiniOrders.length + CACHED_MINI_ORDERS.length;
          const pct = totalCount > 0
            ? Math.min(Math.round((currentTotal / totalCount) * 100), 99)
            : -1;
          const speedMsg = `tốc độ ${(lastDuration / 1000).toFixed(1)}s/trang, nghỉ ${lastSleepTime}ms`;
          safeSend({ type: 'progress', message: speedMsg, processed: currentTotal, total: totalCount, pct });
        }
      }

      const allMiniOrders = [...newMiniOrders, ...CACHED_MINI_ORDERS];
      const stats = computeStats(allMiniOrders);

      const cappedItemMap = capMap(itemMap, 500);

      // Aggregate items for top-spending list; category is left empty for dashboard to classify
      const allItemAggr = {};
      for (const order of allMiniOrders) {
        for (const item of (order.il || [])) {
          const uId = item.i || item.n;
          if (!allItemAggr[uId]) {
            allItemAggr[uId] = { name: item.n, spent: 0, count: 0, cat: item.cat };
          }
          allItemAggr[uId].spent += item.s;
          allItemAggr[uId].count += item.c;
        }
      }

      const topItems = Object.values(allItemAggr)
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 500);

      const newLastUpdated = newMiniOrders.length > 0
        ? newMiniOrders.reduce((max, o) => (o.ts > max ? o.ts : max), 0)
        : LAST_UPDATED;

      const cachePayload = {
        fetchTime: Math.floor(Date.now() / 1000),
        lastUpdated: newLastUpdated || LAST_UPDATED,
        listType: LIST_TYPE,
        miniOrders: allMiniOrders,
        itemMap: cappedItemMap
      };

      const completeMsgData = {
        ...stats,
        topItems,
        cachePayload
      };

      console.log('[ShopeeAnalytics] Hoàn thành! Đang áp dụng thiết lập...');
      // Save the aggregated purchase stats payload to chrome.storage.local cache.
      // This caches order history to allow instant future loads, reducing API queries next time.
      // The cache lives 100% on the user's hard drive and is never uploaded.
      chrome.storage.local.set({ shopee_cache: cachePayload }, () => {
        chrome.storage.local.get(['shopee_analysis_lock'], (r) => {
          const existingLock = r.shopee_analysis_lock;
          if (existingLock && existingLock.nonce === runNonce) {
            chrome.storage.local.set({
              shopee_analysis_lock: {
                ...existingLock,
                status: 'completed',
                result: completeMsgData
              }
            }, () => {
              safeSend({
                type: 'complete',
                data: completeMsgData
              });
            });
          } else {
            safeSend({
              type: 'complete',
              data: completeMsgData
            });
          }
        });
      });

    } catch (err) {
      if (isCancelled) {
        console.log('[ShopeeAnalytics] Analysis stopped due to user cancellation.');
        return;
      }
      console.error('[ShopeeAnalytics] SP Analyzer Ext Error:', err);
      console.error('[ShopeeAnalytics] Error stack:', err.stack);
      
      // Determine appropriate error message based on error type
      let errorMessage = 'Lỗi truy xuất dữ liệu.';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.name === 'NetworkError') {
        errorMessage = 'Lỗi mạng. Kiểm tra kết nối internet và thử lại.';
      } else if (err.name === 'TypeError') {
        errorMessage = 'Lỗi xử lý dữ liệu. Tải lại trang Shopee và thử lại.';
      }
      
      chrome.storage.local.get(['shopee_analysis_lock'], (r) => {
        const existingLock = r.shopee_analysis_lock;
        if (existingLock && existingLock.nonce === runNonce) {
          chrome.storage.local.set({
            shopee_analysis_lock: {
              ...existingLock,
              status: 'failed',
              error: errorMessage
            }
          }, () => {
            safeSend({ type: 'error', message: errorMessage });
          });
        } else {
          safeSend({ type: 'error', message: errorMessage });
        }
      });
    }
  }

  startAnalysis();

  }); // end chrome.storage.local.get
})();
