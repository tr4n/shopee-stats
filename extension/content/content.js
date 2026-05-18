(function() {
  'use strict';

  const cfg = window.__shopeeConfig || {};
  const LIST_TYPE = cfg.listType || 3;
  const LAST_UPDATED = cfg.lastUpdated || 0;
  const CACHED_MINI_ORDERS = Array.isArray(cfg.miniOrders) ? cfg.miniOrders : [];
  const CACHED_ITEM_MAP = cfg.itemMap || {};

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function fetchWithRetry(url) {
    const MAX_RETRIES = 3;
    let lastErr;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(url);
        if (res.status === 401 || res.status === 403) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại Shopee.');
        }
        if (res.status === 429) {
          await sleep(2000 * attempt);
          continue;
        }
        if (!res.ok) {
          throw new Error('Lỗi máy chủ (HTTP ' + res.status + '). Vui lòng thử lại.');
        }
        return res;
      } catch (err) {
        lastErr = err;
        const isFatal = err.message && (
          err.message.includes('đăng nhập') ||
          err.message.includes('máy chủ')
        );
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
    periods[key].tongTien += o.finalCost;
    periods[key].donHang += 1;
    periods[key].sanPham += o.itemCount;
    periods[key].tienChuaGiam += o.rawCost;
  }

  function computeStats(orders) {
    let totalSpentAmt = 0;
    let totalOriginalAmt = 0;
    let totalItemCount = 0;
    let totalShippingFee = 0;

    const now = new Date();
    const ref1M = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const ref3M = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const ref6M = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const ref1Y = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const periods = {
      '1_thang': { tongTien: 0, donHang: 0, sanPham: 0, tienChuaGiam: 0 },
      '3_thang': { tongTien: 0, donHang: 0, sanPham: 0, tienChuaGiam: 0 },
      '6_thang': { tongTien: 0, donHang: 0, sanPham: 0, tienChuaGiam: 0 },
      '1_nam':   { tongTien: 0, donHang: 0, sanPham: 0, tienChuaGiam: 0 }
    };
    const byYear = {};

    for (const o of orders) {
      totalSpentAmt += o.finalCost;
      totalOriginalAmt += o.rawCost;
      totalItemCount += o.itemCount;
      totalShippingFee += (o.shippingFee || 0);

      if (o.ts) {
        const d = new Date(o.ts * 1000);
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1);

        if (d >= ref1M) addToPeriod(periods, '1_thang', o);
        if (d >= ref3M) addToPeriod(periods, '3_thang', o);
        if (d >= ref6M) addToPeriod(periods, '6_thang', o);
        if (d >= ref1Y) addToPeriod(periods, '1_nam', o);

        if (!byYear[yr]) {
          byYear[yr] = {
            total: { tongTien: 0, donHang: 0, sanPham: 0, tienChuaGiam: 0 },
            months: {}
          };
        }
        const yt = byYear[yr].total;
        yt.tongTien += o.finalCost;
        yt.donHang += 1;
        yt.sanPham += o.itemCount;
        yt.tienChuaGiam += o.rawCost;

        if (!byYear[yr].months[mo]) {
          byYear[yr].months[mo] = { tongTien: 0, donHang: 0, sanPham: 0, tienChuaGiam: 0 };
        }
        const mt = byYear[yr].months[mo];
        mt.tongTien += o.finalCost;
        mt.donHang += 1;
        mt.sanPham += o.itemCount;
        mt.tienChuaGiam += o.rawCost;
      }
    }

    return {
      tongDonHang: orders.length,
      tongtienhang: totalSpentAmt,
      tongTienTietKiem: totalOriginalAmt - totalSpentAmt,
      tongSanPhamDaMua: totalItemCount,
      tongPhiShip: totalShippingFee,
      thongKeTheoThang: periods,
      thongKeTheoNam: byYear,
      tongtienhangchuagiam: totalOriginalAmt
    };
  }

  function capMap(map, limit) {
    const entries = Object.entries(map).sort((a, b) => b[1].spent - a[1].spent);
    const result = {};
    entries.slice(0, limit).forEach(([k, v]) => { result[k] = v; });
    return result;
  }

  async function startSpidering() {
    try {
      let offsetIndex = 0;
      const LIMIT = 20;
      let hasMoreData = true;
      let hitCache = false;
      let totalCount = 0;

      const newMiniOrders = [];

      const itemMap = {};
      for (const [k, v] of Object.entries(CACHED_ITEM_MAP)) {
        itemMap[k] = Object.assign({}, v);
      }

      while (hasMoreData && !hitCache) {
        if (offsetIndex > 0) await sleep(400);

        const url = `https://shopee.vn/api/v4/order/get_order_list?list_type=${LIST_TYPE}&offset=${offsetIndex}&limit=${LIMIT}`;
        const response = await fetchWithRetry(url);
        const json = await response.json();

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
          const shippingFee = (infoCard.shipping_fee || infoCard.actual_shipping_cost || 0) / 100000;

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
                  n: itemName.substring(0, 40),
                  s: price,
                  c: qty,
                  cat: itemCatId
                });
              }
            }
          }

          newMiniOrders.push({ ts: rawTs, finalCost, rawCost, itemCount, shippingFee, il: orderItemList });
        }

        offsetIndex += LIMIT;

        if (hasMoreData && !hitCache) {
          const currentTotal = newMiniOrders.length + CACHED_MINI_ORDERS.length;
          const pct = totalCount > 0
            ? Math.min(Math.round((currentTotal / totalCount) * 100), 99)
            : -1;
          try {
            window.postMessage({
              type: 'SHOPEE_STATS_PROGRESS',
              processed: currentTotal,
              total: totalCount,
              pct
            });
          } catch (e) {}
        }
      }

      const allMiniOrders = [...newMiniOrders, ...CACHED_MINI_ORDERS];
      const stats = computeStats(allMiniOrders);

      const cappedItemMap = capMap(itemMap, 500);

      const topItems = Object.values(itemMap)
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 50);

      // Build category spending stats from all orders for complete coverage
      // Using allMiniOrders (not itemMap) ensures items beyond the 500-cap are included
      const catStats = {};
      for (const order of allMiniOrders) {
        for (const item of (order.il || [])) {
          if (!item.cat) continue;
          const catKey = String(item.cat);
          if (catKey === '0') continue;
          if (!catStats[catKey]) catStats[catKey] = { spent: 0, count: 0 };
          catStats[catKey].spent += item.s;
          catStats[catKey].count += item.c;
        }
      }

      const newLastUpdated = newMiniOrders.length > 0
        ? Math.max(...newMiniOrders.map(o => o.ts).filter(t => t > 0), 0)
        : LAST_UPDATED;

      try {
        window.postMessage({
          type: 'SHOPEE_STATS_COMPLETE',
          data: {
            ...stats,
            topItems,
            catStats,
            cachePayload: {
              lastUpdated: newLastUpdated || LAST_UPDATED,
              listType: LIST_TYPE,
              miniOrders: allMiniOrders,
              itemMap: cappedItemMap
            }
          }
        });
      } catch (e) {}

    } catch (err) {
      console.warn('SP Analyzer Ext Error:', err);
      try {
        window.postMessage({
          type: 'SHOPEE_STATS_ERROR',
          message: err.message || 'Lỗi truy xuất dữ liệu.'
        });
      } catch (e) {}
    }
  }

  startSpidering();

})();
