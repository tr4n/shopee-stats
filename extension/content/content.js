(function() {
  'use strict';

  const cfg = window.__shopeeConfig || {};
  const LIST_TYPE = cfg.listType || 3;
  const LAST_UPDATED = cfg.lastUpdated || 0;
  const CACHED_MINI_ORDERS = Array.isArray(cfg.miniOrders) ? cfg.miniOrders : [];
  const CACHED_ITEM_MAP = cfg.itemMap || {};
  const CACHED_CAT_TREE = (cfg.catTree && cfg.catTree.map) ? cfg.catTree : {};

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

  // Keyword-based classification fallback for items with no valid catId from API
  const KEYWORD_CATS = [
    { name: '📱 Điện Thoại & Phụ Kiện',  re: /điện thoại|smartphone|iphone|samsung galaxy|xiaomi|oppo|realme|vivo|poco|redmi|zenfone|nokia|huawei|tai nghe bluetooth|sạc nhanh|cáp sạc|ốp lưng|pin dự phòng|kính cường lực|cường lực|phụ kiện điện thoại/i },
    { name: '💻 Máy Tính & Laptop',        re: /laptop|macbook|máy tính|pc desktop|cpu|ram ddr|ổ cứng ssd|ổ cứng hdd|mainboard|card đồ họa|gpu|bàn phím cơ|chuột gaming|màn hình máy tính|tản nhiệt|nguồn máy tính|case máy tính/i },
    { name: '🔌 Thiết Bị Điện Tử',         re: /smart tv|tivi|máy lạnh|điều hòa|tủ lạnh|máy giặt|lò vi sóng|nồi cơm điện|quạt điện|máy hút bụi|máy lọc không khí|bình nóng lạnh|loa bluetooth|loa nghe nhạc|headphone|earphone|tai nghe|amplifier|thiết bị điện tử/i },
    { name: '👔 Thời Trang Nam',            re: /áo nam|quần nam|áo thun nam|áo sơ mi nam|quần jean nam|quần tây nam|áo hoodie nam|áo khoác nam|bộ đồ nam|vest nam|áo polo nam|đồ bộ nam|trang phục nam/i },
    { name: '👗 Thời Trang Nữ',             re: /váy|đầm|áo nữ|quần nữ|áo thun nữ|bộ đồ nữ|áo khoác nữ|đồ bộ nữ|blazer nữ|áo croptop|áo kiểu|crop top|chân váy|đầm dự tiệc|trang phục nữ/i },
    { name: '👟 Giày Dép',                  re: /giày thể thao|giày tây|giày cao gót|giày lười|giày chạy bộ|sneaker|dép lê|dép sandal|boot cổ cao|high heel|giày da|giày vải|dép nam|dép nữ/i },
    { name: '👜 Túi & Ví',                  re: /túi xách|ví da|balo|túi đeo chéo|clutch|handbag|tote bag|ví nam|ví nữ|túi tote|túi mini|túi đựng|balo laptop/i },
    { name: '🏠 Nhà Cửa & Đời Sống',        re: /chăn ga gối|drap giường|rèm cửa|đèn led|nến thơm|cây xanh|chậu hoa|đồ dùng nhà bếp|nồi chiên|chảo không dính|dao bếp|thớt|hộp đựng|kệ sách|bàn làm việc|ghế văn phòng|thảm trải sàn|tủ quần áo|gương trang điểm/i },
    { name: '💊 Sức Khỏe & Làm Đẹp',        re: /kem dưỡng|serum|son môi|phấn trang điểm|mascara|nước hoa|dầu gội|sữa tắm|kem chống nắng|nước tẩy trang|mặt nạ dưỡng|thực phẩm chức năng|vitamin|collagen|thực phẩm bảo vệ sức khỏe|máy massage|dụng cụ làm đẹp|mỹ phẩm/i },
    { name: '🍜 Thực Phẩm & Đồ Uống',       re: /cà phê|trà sữa|sữa tươi|nước ngọt|snack|bánh kẹo|mì tôm|gạo|dầu ăn|nước mắm|tương ớt|thực phẩm|đồ ăn vặt|đồ uống|trái cây sấy|hạt điều|hạt macca|chocolate|kẹo|bánh mì/i },
    { name: '📚 Sách & Văn Phòng Phẩm',     re: /sách|truyện tranh|manga|light novel|tiểu thuyết|bút bi|bút chì|vở ô ly|tập học sinh|bảng trắng|mực in|máy in|giấy a4|kẹp file|băng keo|thước kẻ|tẩy|bút highlight|file hồ sơ/i },
    { name: '⚽ Thể Thao & Du Lịch',         re: /áo thể thao|quần thể thao|tập gym|bóng đá|bóng rổ|bóng bàn|cầu lông|yoga mat|xe đạp|balo du lịch|vali kéo|lều trại|áo khoác thể thao|giày thể thao|dụng cụ thể thao/i },
    { name: '🧸 Đồ Trẻ Em & Đồ Chơi',       re: /đồ chơi|xe đẩy em bé|bình sữa em bé|tã bỉm|quần áo trẻ em|giày dép trẻ em|lego|xếp hình|búp bê|xe đồ chơi|sách trẻ em|balo trẻ em|đồ chơi giáo dục|đồ chơi trẻ sơ sinh/i },
    { name: '🚗 Ô Tô & Xe Máy',              re: /phụ kiện xe hơi|phụ kiện ô tô|phụ kiện xe máy|lốp xe|nhớt xe máy|gương chiếu hậu|camera hành trình|ghế ô tô trẻ em|thảm lót sàn xe|đồ xe máy|đồ ô tô|lọc gió|phanh xe/i },
    { name: '⌚ Đồng Hồ',                    re: /đồng hồ nam|đồng hồ nữ|đồng hồ đeo tay|smartwatch|đồng hồ thông minh|đồng hồ cơ|đồng hồ điện tử|dây đồng hồ/i },
    { name: '📷 Máy Ảnh & Máy Quay',         re: /máy ảnh|camera dslr|máy quay phim|ống kính|lens máy ảnh|tripod|chân máy ảnh|đèn flash|gimbal|action cam|gopro|mirrorless|flycam/i },
  ];

  function classifyByName(name) {
    const n = String(name || '');
    for (const cat of KEYWORD_CATS) {
      if (cat.re.test(n)) return cat.name;
    }
    return '🏷️ Khác';
  }

  // Fetch Shopee VN category tree and build a flat catId → top-level-name map
  async function fetchCategoryTree() {
    const CAT_TREE_TTL = 7 * 24 * 3600;
    const now = Math.floor(Date.now() / 1000);
    if (CACHED_CAT_TREE.ts && CACHED_CAT_TREE.map && (now - CACHED_CAT_TREE.ts) < CAT_TREE_TTL) {
      return CACHED_CAT_TREE.map;
    }
    try {
      const res = await fetchWithRetry('https://shopee.vn/api/v4/pages/get_category_tree');
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data
        : (json.data && Array.isArray(json.data.category_list)) ? json.data.category_list
        : [];
      const map = {};
      function walk(node, topName) {
        const id = String(node.catid || node.cat_id || node.id || '');
        const rawName = node.display_name || node.name || topName || '';
        if (id && id !== '0') map[id] = topName || rawName;
        const children = node.children || node.sub_category_list || [];
        for (const child of children) walk(child, topName || rawName);
      }
      for (const cat of list) {
        const topName = cat.display_name || cat.name || '';
        walk(cat, topName);
      }
      return map;
    } catch (e) {
      return {};
    }
  }

  // Emoji display names for top-level Shopee VN categories (maps API names → pretty names)
  const PRETTY_CAT = {
    'Điện Thoại & Phụ Kiện':   '📱 Điện Thoại & Phụ Kiện',
    'Máy Tính & Laptop':        '💻 Máy Tính & Laptop',
    'Thiết Bị Điện Tử':         '🔌 Thiết Bị Điện Tử',
    'Thời Trang Nam':           '👔 Thời Trang Nam',
    'Thời Trang Nữ':            '👗 Thời Trang Nữ',
    'Nhà Cửa & Đời Sống':       '🏠 Nhà Cửa & Đời Sống',
    'Sức Khỏe & Làm Đẹp':       '💊 Sức Khỏe & Làm Đẹp',
    'Thực Phẩm & Đồ Uống':      '🍜 Thực Phẩm & Đồ Uống',
    'Sách & Văn Phòng Phẩm':    '📚 Sách & Văn Phòng Phẩm',
    'Sách & Văn Phòng':         '📚 Sách & Văn Phòng Phẩm',
    'Thể Thao & Du Lịch':       '⚽ Thể Thao & Du Lịch',
    'Đồ Trẻ Em & Đồ Chơi':      '🧸 Đồ Trẻ Em & Đồ Chơi',
    'Ô Tô & Xe Máy':            '🚗 Ô Tô & Xe Máy',
    'Đồng Hồ':                  '⌚ Đồng Hồ',
    'Máy Ảnh & Máy Quay':       '📷 Máy Ảnh & Máy Quay',
    'Giày Dép Nam':              '👟 Giày Dép',
    'Giày Dép Nữ':               '👟 Giày Dép',
    'Túi Ví Nam':                '👜 Túi & Ví',
    'Túi Ví Nữ':                 '👜 Túi & Ví',
    'Phụ Kiện Thời Trang':       '💍 Phụ Kiện Thời Trang',
    'Balo & Túi Xách':           '👜 Túi & Ví',
  };

  function resolveCategory(catId, itemName, catIdMap) {
    const key = String(catId || 0);
    if (key !== '0' && catIdMap[key]) {
      const raw = catIdMap[key];
      return PRETTY_CAT[raw] || raw;
    }
    return classifyByName(itemName);
  }

  async function startSpidering() {
    try {
      // Fetch category tree first (uses cache if fresh enough)
      const catIdMap = await fetchCategoryTree();
      const catTreeTs = Math.floor(Date.now() / 1000);

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

      // Build category spending stats — all items are classified (catId=0 uses keyword fallback)
      const catStats = {};
      for (const order of allMiniOrders) {
        for (const item of (order.il || [])) {
          const catName = resolveCategory(item.cat, item.n, catIdMap);
          if (!catStats[catName]) catStats[catName] = { spent: 0, count: 0 };
          catStats[catName].spent += item.s;
          catStats[catName].count += item.c;
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
              itemMap: cappedItemMap,
              catTree: { ts: catTreeTs, map: catIdMap }
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
