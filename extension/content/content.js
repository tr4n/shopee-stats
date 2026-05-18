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

  // Keyword-based classification fallback for items with no valid catId from API.
  // Order matters: first match wins. More specific categories are listed before generic ones.
  const KEYWORD_CATS = [
    // ── Đồng Hồ (before Điện Thoại to avoid smartwatch ambiguity) ──────────────────────────
    { name: '⌚ Đồng Hồ', re: /đồng hồ|watch|g-shock|g shock|baby-g|casio|seiko|citizen|tissot|orient|fossil|rolex|longines|hamilton|michael kors|mk watch|daniel wellington|garmin watch|fitbit|apple watch|dây đồng hồ|hộp đựng đồng hồ|pin đồng hồ|kính đồng hồ/i },

    // ── Máy Ảnh & Máy Quay ───────────────────────────────────────────────────────────────────
    { name: '📷 Máy Ảnh & Máy Quay', re: /máy ảnh|camera dslr|mirrorless|máy quay phim|camcorder|action cam|gopro|dji osmo|osmo pocket|insta360|flycam|drone|ống kính|lens\b|kit lens|prime lens|wide angle|telephoto|tripod|monopod|gimbal|stabilizer|đèn flash|ring light|softbox|thẻ nhớ sd|memory card|túi máy ảnh|body máy ảnh|canon eos|nikon d|sony alpha|fujifilm/i },

    // ── Điện Thoại & Phụ Kiện ────────────────────────────────────────────────────────────────
    { name: '📱 Điện Thoại & Phụ Kiện', re: /điện thoại|smartphone|iphone|samsung galaxy|samsung s\d|samsung a\d|samsung note|xiaomi \d|redmi note|redmi \d|poco [xmf]|poco c|oppo [afr]\d|oppo reno|oppo find|realme \d|realme c|realme gt|vivo [yv]\d|vivo x\d|nokia \d|huawei [pmy]|honor \d|oneplus|motorola moto|tecno|infinix|asus rog phone|máy tính bảng|tablet|ipad|galaxy tab|ốp lưng|case điện thoại|bao da điện thoại|miếng dán|kính cường lực|cường lực|pin dự phòng|power bank|sạc nhanh|sạc không dây|wireless charger|củ sạc|bộ sạc|cáp sạc|cáp type c|cáp lightning|cáp usb|dock sạc|đế sạc|giá đỡ điện thoại|gương selfie|lens selfie|phụ kiện điện thoại|phụ kiện iphone|phụ kiện samsung|airpods|earbud\b|tws\b|tai nghe bluetooth|tai nghe không dây|wireless earphone|tai nghe iphone|tai nghe type c/i },

    // ── Máy Tính & Laptop ────────────────────────────────────────────────────────────────────
    { name: '💻 Máy Tính & Laptop', re: /laptop|macbook|máy tính xách tay|notebook|ultrabook|chromebook|surface pro|surface laptop|dell xps|dell inspiron|hp envy|hp pavilion|hp probook|hp elitebook|lenovo thinkpad|lenovo ideapad|lenovo legion|asus vivobook|asus zenbook|asus rog|asus tuf|acer aspire|acer nitro|acer predator|msi gaming|gigabyte aorus|pc desktop|máy tính bàn|case máy tính|vỏ case|cpu intel|cpu amd|ryzen|core i\d|ram ddr|ram laptop|ổ cứng ssd|ổ cứng hdd|nvme|m\.2 ssd|mainboard|bo mạch chủ|card đồ họa|vga card|gpu rtx|gpu gtx|rx 6|rx 7|nguồn máy tính|psu|tản nhiệt cpu|bàn phím cơ|mechanical keyboard|bàn phím không dây|chuột gaming|chuột không dây|gaming mouse|mousepad|lót chuột|màn hình máy tính|monitor|màn hình gaming|màn hình 4k|màn hình 144hz|webcam|tai nghe gaming|headset gaming|tai nghe có mic|microphone|ghế gaming|bàn gaming|ups\b|bộ lưu điện|hub usb|docking station|máy in\b|mực in|hộp mực|máy scan|máy chiếu|projector|router wifi|switch mạng/i },

    // ── Thiết Bị Điện Tử ─────────────────────────────────────────────────────────────────────
    { name: '🔌 Thiết Bị Điện Tử', re: /smart tv|tivi\b|android tv|oled tv|qled tv|samsung tv|lg tv|sony tv|tcl tv|panasonic tv|màn hình tivi|máy lạnh|điều hòa|daikin|toshiba ac|lg ac|tủ lạnh|máy giặt|máy sấy quần áo|lò vi sóng|nồi cơm điện|nồi áp suất|nồi chiên không dầu|air fryer|bếp điện|bếp từ|bếp gas|máy xay sinh tố|máy ép trái cây|máy làm sữa chua|máy xay thịt|quạt điện|quạt đứng|quạt trần|quạt tích điện|máy hút bụi|robot hút bụi|máy rửa bát|bình đun nước|ấm siêu tốc|bình nóng lạnh|máy lọc nước|máy lọc không khí|máy cạo râu|máy uốn tóc|máy sấy tóc|máy tạo kiểu tóc|loa bluetooth|loa mini|loa di động|loa karaoke|soundbar|amply|amplifier|mixer âm thanh|đầu thu kỹ thuật số|đầu dvd|đầu cd|máy đọc sách kindle|ebook reader|đèn bàn led|đèn pin\b|pin sạc aa|pin sạc aaa|ổ cắm điện|ổ điện|phích cắm|cầu dao|aptomat/i },

    // ── Thời Trang Trẻ Em (trước Nam/Nữ để bé gái/bé trai không nhầm) ───────────────────────
    { name: '🧸 Đồ Trẻ Em & Đồ Chơi', re: /đồ chơi|xe đẩy em bé|xe nôi|nôi em bé|địu em bé|địu trẻ em|bình sữa em bé|bình pha sữa|máy hâm sữa|tã bỉm|bỉm\b|khăn ướt em bé|phấn em bé|sữa tắm em bé|dầu tắm bé|dầu massage bé|quần áo trẻ em|quần áo em bé|đồ sơ sinh|bodysuit bé|áo liền quần bé|váy bé gái|quần bé trai|áo bé trai|bộ đồ bé|giày dép trẻ em|dép bé|giày bé|balo trẻ em|cặp sách|balo học sinh|lego\b|lego duplo|xếp hình|đồ chơi lắp ráp|búp bê|búp bê barbie|xe đồ chơi|ô tô đồ chơi|robot đồ chơi|đồ chơi điều khiển|xích đu|cầu trượt|bể bơi trẻ em|đồ chơi tắm|sách trẻ em|truyện thiếu nhi|đồ chơi giáo dục|bảng học|bảng chữ cái|đồ chơi đất nặn|đất nặn|bộ tô màu|đồ chơi bếp|đồ chơi nhà bác sĩ|guitar đồ chơi|nhạc cụ đồ chơi/i },

    // ── Thời Trang Nam ────────────────────────────────────────────────────────────────────────
    { name: '👔 Thời Trang Nam', re: /áo thun nam|áo sơ mi nam|áo polo nam|áo hoodie nam|áo khoác nam|áo len nam|áo nỉ nam|áo gió nam|áo vest nam|áo blazer nam|áo tanktop nam|áo ba lỗ nam|áo phông nam|áo sweater nam|áo cardigan nam|quần jean nam|quần tây nam|quần kaki nam|quần short nam|quần thun nam|quần jogger nam|quần nỉ nam|bộ đồ nam|đồ bộ nam|set đồ nam|bộ đồ thể thao nam|đồ ngủ nam|đồ lót nam|quần lót nam|quần boxer nam|quần brief nam|trang phục nam|vest nam|suit nam|jeans nam|quần tây nam|sơ mi nam/i },

    // ── Thời Trang Nữ ────────────────────────────────────────────────────────────────────────
    { name: '👗 Thời Trang Nữ', re: /váy\b|đầm\b|chân váy|váy midi|váy maxi|váy mini|đầm dự tiệc|đầm ren|đầm hoa|đầm suông|đầm body|đầm wrap|áo nữ\b|áo thun nữ|áo sơ mi nữ|áo khoác nữ|áo hoodie nữ|áo len nữ|áo blazer nữ|áo croptop|crop top|áo kiểu|áo nỉ nữ|áo gió nữ|áo cardigan nữ|áo sweater nữ|quần nữ\b|quần jean nữ|quần short nữ|quần thun nữ|quần jogger nữ|legging|quần ống rộng|quần suông nữ|bộ đồ nữ|đồ bộ nữ|set đồ nữ|bộ đồ mặc nhà|đồ ngủ nữ|đồ lót nữ|áo ngực|bra\b|quần lót nữ|tất\b|vớ\b|tất lưới|tất cổ cao|trang phục nữ|jeans nữ|áo phông nữ/i },

    // ── Giày Dép ─────────────────────────────────────────────────────────────────────────────
    { name: '👟 Giày Dép', re: /giày\b|dép\b|sandal|sneaker|loafer|oxford|derby|moccasin|espadrilles|slip on|high heel|stiletto|wedge|platform shoe|boot\b|ankle boot|chelsea boot|martin boot|bốt\b|giày thể thao|giày chạy bộ|giày tennis|giày tây|giày lười|giày cao gót|giày đế xuồng|giày đế bằng|giày da\b|giày vải|giày canvas|giày lười nam|giày lười nữ|dép lê|dép kẹp|flip flop|dép tổ ong|birkenstock|nike\b|adidas\b|converse\b|vans\b|new balance|puma\b|reebok\b|skechers\b|fila\b|asics\b|under armour|jordan\b|air force|air max|yeezy\b/i },

    // ── Túi & Ví ──────────────────────────────────────────────────────────────────────────────
    { name: '👜 Túi & Ví', re: /túi xách|handbag|shoulder bag|tote bag|túi tote|túi clutch|clutch bag|túi đeo chéo|crossbody|sling bag|túi đeo vai|túi belt|túi bum bag|balo\b|backpack|ba lô|balo laptop|balo học sinh|balo thể thao|balo du lịch|travel bag|túi du lịch|túi kéo|vali\b|ví da\b|wallet|ví đựng thẻ|card holder|ví dây kéo|ví zip|ví cầm tay|ví nam\b|ví nữ\b|túi nam\b|túi nữ\b|túi mini|túi nhỏ|túi phong bì|pouch\b|túi vải|túi canvas|túi lưới|hộp đựng nữ trang|coach\b|gucci\b|louis vuitton|lv bag|michael kors bag|mk bag|dior bag|chanel bag|hermes/i },

    // ── Sức Khỏe & Làm Đẹp ───────────────────────────────────────────────────────────────────
    { name: '💊 Sức Khỏe & Làm Đẹp', re: /kem dưỡng|kem dưỡng da|kem dưỡng ẩm|kem dưỡng trắng|kem dưỡng mắt|serum\b|essence\b|ampoule\b|toner\b|nước cân bằng|lotion\b|moisturizer|kem chống nắng|sunscreen|spf\b|bb cream|cc cream|cushion\b|kem nền|foundation\b|concealer\b|phấn phủ|phấn nền|highlight\b|contour\b|blush\b|má hồng|eyeshadow|phấn mắt|mascara\b|eyeliner\b|kẻ mắt|kẻ chân mày|eyebrow|son môi|lipstick|lip gloss|lip tint|lip balm|son dưỡng|nước hoa|perfume|cologne\b|body mist|xịt thơm|dầu gội|dầu xả|kem ủ tóc|mặt nạ tóc|thuốc nhuộm tóc|tóc giả|lược\b|cọ trang điểm|bộ cọ|sữa tắm|dầu tắm|tắm trắng|scrub\b|tẩy tế bào chết|kem dưỡng thể|lotion body|lăn khử mùi|nước tẩy trang|micellar|mặt nạ\b|sheet mask|mặt nạ đất sét|clay mask|nước hoa hồng|toner hana|tẩy trang|vitamin c serum|hyaluronic acid|retinol\b|niacinamide\b|thực phẩm chức năng|vitamin\b|vitamin d|vitamin e|collagen\b|omega \d|probiotic\b|protein powder|whey protein|creatine\b|bcaa\b|viên uống|thuốc bổ|thực phẩm bảo vệ|bổ sung|kẹo vitamin|siro\b|máy massage|máy rửa mặt|máy xông hơi mặt|dụng cụ làm đẹp|bộ dụng cụ nail|sơn móng|nail art|khẩu trang\b|mask\b|nhiệt kế|máy đo huyết áp|băng cá nhân|bông tẩy trang|miếng bông|gương trang điểm/i },

    // ── Thực Phẩm & Đồ Uống ──────────────────────────────────────────────────────────────────
    { name: '🍜 Thực Phẩm & Đồ Uống', re: /cà phê|cafe\b|coffee\b|trà\b|tea\b|matcha\b|sữa\b|sữa tươi|sữa bột|sữa đặc|sữa hạt|nước trái cây|nước ép|nước ngọt|coca cola|pepsi\b|7up\b|sprite\b|nước tăng lực|energy drink|bia\b|rượu\b|nước uống|đồ uống|mì tôm|mì gói|mì ly|bún khô|miến khô|phở khô|cháo ăn liền|cơm ăn liền|gạo\b|nếp\b|bột mì|bột gạo|đường\b|muối\b|dầu ăn|nước mắm|tương ớt|tương đen|mắm\b|hạt nêm|bột ngọt|mì chính|nước tương|dấm\b|mật ong|snack\b|bánh kẹo|kẹo\b|chocolate|socola|bánh quy|bánh biscuit|bánh cracker|bánh kem|bánh tráng|bánh mì\b|bánh ngọt|kem tươi|kem ice cream|chè\b|hạt điều|hạt macca|hạt hướng dương|hạt dẻ|đậu phộng|mực khô|tôm khô|khô bò|thịt khô|trái cây sấy|mít sấy|xoài sấy|chuối sấy|rong biển|thực phẩm|đồ ăn|ăn vặt|combo thực phẩm|combo đồ ăn|organic\b|yến sào|tổ yến|đông trùng hạ thảo|nhân sâm|nấm linh chi|hạt chia/i },

    // ── Sách & Văn Phòng Phẩm ─────────────────────────────────────────────────────────────────
    { name: '📚 Sách & Văn Phòng Phẩm', re: /sách\b|truyện tranh|manga\b|light novel|tiểu thuyết|tập truyện|comic\b|sách giáo khoa|sách tham khảo|sách học|từ điển|sách nấu ăn|sách self-help|sách kinh doanh|bút bi\b|bút mực|bút dạ|bút chì\b|bút highlight|bút lông\b|bút marker|bút gel|viết\b|vở\b|tập\b|sổ tay|sổ nhật ký|giấy note|sticky note|nhãn vở|bìa sách|bao sách|thước kẻ|compa\b|ê ke|tẩy\b|kéo\b|kim bấm|kẹp giấy|kẹp bướm|băng dính|hồ dán|keo dán|silicon gun|file hồ sơ|kệ hồ sơ|bìa còng|bìa lò xo|giấy a4|giấy in\b|máy in\b|mực in\b|hộp mực|máy scan|máy fax|máy tính bỏ túi|calculator|bảng trắng|bảng viết|phấn viết|màu vẽ|bộ màu|màu sáp|màu nước|màu acrylic|cọ vẽ|đồ vẽ|canvas vẽ|khung tranh|đồ dùng học tập|dụng cụ học sinh/i },

    // ── Thể Thao & Du Lịch ────────────────────────────────────────────────────────────────────
    { name: '⚽ Thể Thao & Du Lịch', re: /áo thể thao|áo bóng đá|áo jersey|áo thi đấu|quần thể thao|bộ đồ thể thao|áo gym|quần gym|áo tennis|quần tennis|áo bơi|quần bơi|đồ bơi|kính bơi|mũ bơi|bóng đá|trái bóng|bóng rổ|bóng chuyền|bóng bàn|vợt cầu lông|vợt tennis|vợt bóng bàn|lưới cầu lông|khung thành|tạ\b|barbell\b|dumbell|dây nhảy|xà đơn|xà kép|dây kéo|thảm yoga|yoga block|resistance band|máy chạy bộ|xe đạp tập|xe đạp\b|đạp xe|bơi lội|leo núi|camping|lều trại|túi ngủ|ba lô leo núi|vali kéo|vali du lịch|balo du lịch|túi du lịch|bình giữ nhiệt|bình nước du lịch|phụ kiện du lịch|đồ phượt|dụng cụ cắm trại|cần câu|câu cá|mồi câu|lưỡi câu|cung tên|tập golf|gậy golf|bóng golf|kính thể thao|mũ thể thao|găng tay thể thao|băng bảo vệ|bọc đầu gối|bọc cổ tay/i },

    // ── Ô Tô & Xe Máy ────────────────────────────────────────────────────────────────────────
    { name: '🚗 Ô Tô & Xe Máy', re: /phụ kiện ô tô|phụ kiện xe hơi|phụ kiện xe máy|đồ xe máy|đồ ô tô|lốp xe|vỏ xe|lốp ô tô|lốp xe máy|nhớt xe|dầu nhớt|nhớt ô tô|nhớt xe máy|lọc gió|lọc dầu|lọc xăng|bình ắc quy|ắc quy ô tô|ắc quy xe máy|phanh xe|đĩa phanh|bố thắng|dây côn|dây ga|má phanh|gương chiếu hậu|camera hành trình|camera lùi|màn hình ô tô|đầu dvd xe|thảm lót sàn xe|thảm ô tô|bọc vô lăng|ghế ô tô trẻ em|ghế ngồi xe hơi|cốp xe|hộp đựng đồ xe|móc treo xe|đồ trang trí ô tô|nước rửa xe|xà phòng xe|polish xe|wax xe|bơm xe đạp|bơm ô tô|bơm xe máy|dụng cụ sửa xe|bộ dụng cụ sửa|mũ bảo hiểm|áo mưa\b|khóa xe|khóa chống trộm/i },

    // ── Nhà Cửa & Đời Sống ────────────────────────────────────────────────────────────────────
    { name: '🏠 Nhà Cửa & Đời Sống', re: /chăn\b|chăn ga|drap\b|gối\b|vỏ gối|ruột gối|chăn lông vũ|chăn điện|chăn sưởi|bộ chăn ga|rèm cửa|rèm vải|rèm cuốn|màn cửa|đèn led|đèn ngủ|đèn bàn|đèn sàn|đèn trang trí|đèn dây|đèn fairy light|nến thơm|tinh dầu thơm|máy khuếch tán|diffuser\b|xịt phòng|cây xanh|chậu hoa|chậu cây|cây giả|hoa giả|tranh tường|tranh canvas|đồng hồ treo tường|gương trang trí|gương phòng ngủ|bàn làm việc|bàn học sinh|bàn máy tính|ghế văn phòng|ghế tựa|tủ quần áo|kệ sách|kệ bếp|kệ đa năng|giá treo|móc treo|hộp đựng|hộp nhựa|hộp lưu trữ|thùng nhựa|thùng rác|nồi inox|chảo\b|dao bếp|thớt\b|dụng cụ bếp|bộ nồi|đũa\b|chén\b|tô\b|ly\b|cốc\b|bình nước|hộp cơm|hộp đựng thức ăn|máy lọc nước|bình giữ nhiệt|bột giặt|nước xả vải|nước rửa bát|nước lau nhà|chổi lau|cây lau nhà|giẻ lau|bàn chải vệ sinh|xô\b|chổi\b|hót rác|khăn bếp|khăn tắm|khăn mặt|bàn chải đánh răng|kem đánh răng|thảm toilet|thảm phòng ngủ|thảm trải sàn|màn tắm|kệ phòng tắm|giá đựng dầu gội/i },
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
