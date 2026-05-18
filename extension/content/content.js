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
  // 5 main categories with compreh  const kwTech = "samsung|apple|iphone|ipad|macbook|lg|sony|xiaomi|oppo|vivo|realme|nokia|huawei|honor|oneplus|asus|acer|dell|hp|lenovo|msi|gigabyte|asrock|intel|amd|nvidia|corsair|razer|logitech|steelseries|hyperx|akko|dareu|edifier|jbl|bose|harman kardon|marshall|anker|baseus|ugreen|hoco|pisen|orico|sandisk|kingston|wd|western digital|seagate|toshiba|tuya|tp-link|mainboard|bo mạch chủ|cpu|processor|gpu|vga|card màn hình|ram|memory|ssd|hdd|nvme|sata|m2|vỏ case|case máy tính|nguồn|psu|power supply|quạt tản nhiệt|tản nhiệt khí|tản nhiệt nước|aio|fan case|dây riser|ốc vít máy tính|thermal pad|chuột quang|chuột không dây|chuột bluetooth|chuột gaming|lót chuột|mousepad|bàn phím cơ|bàn phím giả cơ|bàn phím wireless|keycap|switch|lube switch|stabilizer|tai nghe có dây|tai nghe bluetooth|tai nghe true wireless|tai nghe over ear|tai nghe gaming|loa bluetooth|loa máy tính|loa vi tính|loa kéo|soundbar|ampli|amply|dac|amp|router wifi|modem|switch mạng|cáp mạng|rj45|hạt mạng|kìm bấm mạng|usb wifi|card wifi|bộ phát wifi|kích sóng wifi|repeater|access point|cáp sạc|dây sạc|cáp lightning|cáp type c|cáp micro usb|đầu chuyển|hub usb|cổng chia usb|cáp hdmi|cáp vga|cáp displayport|cáp audio|cáp quang|ốp lưng|bao da|cường lực|dán màn hình|dán ppf|dán viền|sạc dự phòng|pin dự phòng|củ sạc|cốc sạc|sạc nhanh|sạc không dây|sạc magsafe|đế sạc|giá đỡ điện thoại|kẹp điện thoại|gậy tự sướng|gậy selfie|tripod|tay cầm chơi game|gamepad|trigger|quạt tản nhiệt điện thoại|máy ảnh cơ|máy ảnh kỹ thuật số|dslr|mirrorless|action cam|gopro|insta360|flycam|drone|dji|ống kính|lens|filter|chân máy ảnh|thẻ nhớ|đầu đọc thẻ|túi đựng máy ảnh|hộp chống ẩm|tủ chống ẩm|đèn flash|đèn studio|softbox|hắt sáng|dù tản sáng|tivi|smart tivi|tivi box|android box|google chromecast|apple tv|máy chiếu|màn chiếu|điều khiển tivi|remote tivi|máy in|máy scan|máy photocopy|máy đếm tiền|máy chấm công|usb|ổ flash|thiết bị mạng|nas|airtag|smarttag|gimbal|ring light|đèn livestream|thermal paste|keo tản nhiệt|bàn di chuột|pad chuột|ốp airpods|dây đồng hồ apple watch|dây đeo xiaomi|máy đọc sách|kindle|laptop|máy tính bảng|màn hình máy tính|nhà thông minh|smart home|camera quan sát|camera hành trình|ổ cứng ngoài|ổ cứng di động|công tắc thông minh|ổ cắm thông minh|đèn thông minh|khóa thông minh|chuông cửa thông minh|webcam|micro|stream deck|máy đánh chữ|sim 4g|sim 5g|kính vr|kính ar|điện thoại|chuột|bàn phím|tai nghe|loa|cáp|sạc|pin|ốp|camera|ổ cứng";
  const kwSport = "bóng đá|bóng rổ|bóng chuyền|cầu lông|quần vợt|tennis|bóng bàn|golf|bơi lội|chạy bộ|đạp xe|võ thuật|boxing|mma|muay thái|karate|taekwondo|judo|vovinam|yoga|pilates|aerobic|gym|thể hình|vợt cầu lông|quả cầu lông|dây chăng vợt|cuốn cán vợt|vợt tennis|bóng tennis|vợt bóng bàn|mặt vợt|cốt vợt|quả bóng bàn|quả bóng đá|quả bóng rổ|quả bóng chuyền|bóng bầu dục|rugby|khúc côn cầu|hockey|bóng ném|squash|găng tay thủ môn|bọc ống đồng|tất chống trơn|giày đá bóng|giày đinh|giày chạy bộ|giày training|đồ bơi|kính bơi|mũ bơi|phao bơi|chân vịt|gậy golf|bóng golf|túi golf|xe đạp thể thao|xe đạp địa hình|mũ bảo hiểm xe đạp|đồng hồ thể thao|đồng hồ thông minh|garmin|coros|suunto|tạ tay|tạ đòn|đĩa tạ|tạ ấm|kettlebell|ghế tập tạ|xà đơn|xà kép|giàn tạ|máy chạy bộ|xe đạp tập|thảm yoga|bóng yoga|gạch yoga|vòng yoga|con lăn tập bụng|dây nhảy|dây kháng lực|băng quấn tay|găng tay tập gym|đai lưng nâng tạ|đai nịt bụng|áo tập|quần tập|bra thể thao|bình lắc|shaker|bình nước thể thao|whey protein|mass gainer|bcaa|eaa|creatine|pre-workout|đốt mỡ|fat burner|vitamin|khoáng chất|dầu cá|omega 3|canxi|glucosamine|sụn vi cá|đông trùng hạ thảo|yến sào|hồng sâm|linh chi|tảo xoắn|mật ong|thực phẩm ăn kiêng|yến mạch|granola|hạt dinh dưỡng|máy đo huyết áp|máy đo đường huyết|que thử đường huyết|nhiệt kế|máy xông khí dung|máy massage|đệm massage|ghế massage|súng massage|cân điện tử|cân sức khỏe|cân sức khoẻ|cân thông minh|khẩu trang y tế|khẩu trang n95|mặt nạ y tế|nước sát khuẩn|cồn y tế|bông y tế|băng gạc|băng cá nhân|băng urgo|nước muối sinh lý|bao cao su|gel bôi trơn|que thử thai|yonex|victor|lining|decathlon|asics|mizuno|thuốc nhỏ mắt|thuốc dạ dày|men tiêu hóa|băng vệ sinh|cốc nguyệt san|nước súc miệng|chỉ nha khoa|tăm nước|bàn chải điện|kem đánh răng|sữa tắm nam|dầu gội nam|lăn khử mùi|xịt khử mùi|bảo vệ mắt cá|bảo vệ đầu gối|bảo vệ khủy tay|balo thể thao|túi thể thao|kem dưỡng da|serum dưỡng da|toner da|kem chống nắng|tẩy tế bào chết|sữa rửa mặt|dầu gội đầu|dầu gội|dầu xả|kem xả|kem ủ|sữa tắm|kem dưỡng ẩm|mặt nạ dưỡng da|viên uống|collagen|xương khớp|giảm đau|đau mỏi|vai gáy|cao dán|đai lưng|cột sống|đai nịt|thanh tập|gối tập|đai hỗ trợ|bảo hộ chân|patin|trượt patin|leo núi|cắm trại|camping|lều cắm trại|câu cá|cần câu|mồi câu|phao câu|dây câu|túi ngủ|gậy leo núi|bóng|vợt|xe đạp|tạ|thuốc";
  const kwHome = "chăn|mền|ga trải giường|drap|vỏ gối|ruột gối|đệm lò xo|đệm cao su|đệm bông ép|nệm|chiếu trúc|chiếu điều hòa|chiếu mây|chiếu|mùng|màn chống muỗi|rèm cửa|màn cửa|tủ quần áo|tủ giày|kệ sách|kệ tivi|bàn trà|bàn sofa|bàn ăn|bàn làm việc|bàn học|ghế sofa|ghế ăn|ghế văn phòng|ghế xoay|ghế lười|ghế thư giãn|ghế chỉnh dáng|ghế chống gù|roichen|ghế công thái học|bàn ghế|kệ bếp|kệ đầu giường|tủ đầu giường|giá để bát|tranh treo tường|tranh canvas|đồng hồ treo tường|gương soi|gương trang trí|lọ hoa|bình hoa|cây giả|hoa giả|nến thơm|sáp thơm|tinh dầu|máy khuếch tán|thảm trải sàn|thảm trang trí|thảm chùi chân|nồi cơm điện|nồi chiên không dầu|nồi áp suất|nồi nấu chậm|lò vi sóng|lò nướng|máy xay sinh tố|máy ép trái cây|máy ép chậm|máy đánh trứng|máy trộn bột|ấm siêu tốc|ấm đun|bình đun|bếp từ|bếp hồng ngoại|bếp ga|bếp nướng|vỉ nướng|chảo chống dính|chảo gang|bộ nồi inox|dao bếp|kéo nhà bếp|thớt|muôi|vá|sạn|rổ|rá|đũa|thìa|dĩa|muỗng|bát|chén|đĩa|tô|ly thủy tinh|cốc sứ|bình giữ nhiệt|hộp đựng thực phẩm|hộp bento|màng bọc thực phẩm|màng nhôm|giấy bạc|máy giặt|máy sấy quần áo|bàn ủi|bàn là|cầu là|móc treo quần áo|kẹp quần áo|giàn phơi|sào phơi|chổi quét nhà|hót rác|chổi lau nhà|cây lau nhà|xô lau nhà|máy hút bụi|robot hút bụi|robot lau sàn|lau sàn|dreame|roborock|ecovacs|nước lau sàn|nước tẩy rửa|nước tẩy bồn cầu|vim|duck|xà phòng|bột giặt|nước giặt|omo|ariel|nước xả vải|comfort|downy|giấy vệ sinh|khăn giấy|giấy rút|bao rác|túi rác|thùng rác|kìm|búa|cờ lê|mỏ lết|tuốc nơ vít|khoan điện|khoan pin|máy cắt|máy mài|ốc vít|đinh|tắc kê|thước cuộn|thước kẹp|keo silicon|keo 502|băng keo điện|dụng cụ|xe đẩy hàng|xe kéo hàng|thang|thang nhôm|thang chữ a|chậu cây|chậu hoa|đất trồng|phân bón|hạt giống|bình xịt tưới cây|dụng cụ làm vườn|xẻng|cào|kéo cắt cành|vòi tưới cây|lock&lock|locknlock|philips|panasonic|sunhouse|kangaroo|elmich|tefal|bluestone|sharp|đồ kim khí|vật tư nông nghiệp|thuốc diệt côn trùng|thuốc diệt muỗi|thuốc diệt kiến|keo dính chuột|ổ cắm điện|phích cắm|dây điện|bóng đèn|công tắc|máy lọc nước|máy lọc không khí|bình nóng lạnh|vòi sen|gương nhà tắm|kệ nhà tắm|đồ trang trí|decor|tủ lạnh|máy lạnh|điều hòa|quạt điện|quạt trần|quạt đứng|quạt bàn|máy rửa bát|bếp điện|khăn tắm|khăn mặt|áo choàng tắm|nệm hơi|ghế tắm|chậu rửa mặt|bồn cầu|nắp bồn cầu|tủ nhựa|ngăn kéo|giỏ rác|vách ngăn|đèn bàn|đèn ngủ|đèn ốp trần|van nước|ống nước|bản lề|tay nắm cửa|phụ kiện ô tô|phụ kiện xe máy|nhớt xe|mũ bảo hiểm xe máy|nước hoa ô tô|đệm ghế ô tô|bạt phủ xe|nước mắm|dầu ăn|gia vị|nước tương|tương ớt|muối|đường|bột ngọt|mì gói|phở gói|gạo|ngũ cốc|đồ ăn vặt|snack|bim bim|kẹo|bánh quy|sô cô la|thạch|bia|rượu|nước ngọt|nước ép|trà|cafe|cà phê|sữa tươi|sữa bột|bỉm|tã|đồ sơ sinh|bình sữa|xe đẩy em bé|địu em bé|thức ăn cho chó|thức ăn cho mèo|đồ chơi cho thú cưng|chuồng chó|chuồng mèo|cát vệ sinh|bàn|ghế|tủ|kệ|giường|đệm|nệm|rèm|màn|chổi|thùng|hộp|nồi|chảo|bát|chén|đĩa|đũa|thìa|ly|cốc|dao|kéo|thước|keo|kìm|búa|thang|bếp|quạt|tã|bỉm|sữa|kẹo|bánh|trà|nước uống|mì";
  const kwFashion = "áo|áo thun|áo phông|áo sơ mi|áo polo|áo khoác|áo gió|áo dạ|áo len|áo nỉ|áo hoodie|áo vest|blazer|quần|quần tây|quần âu|quần kaki|quần jeans|quần bò|quần short|quần đùi|quần jogger|quần lót|sịp|boxer|đồ bộ|pijama|áo kiểu|áo trễ vai|áo hai dây|áo croptop|chân váy|váy|váy xòe|váy chữ a|váy bút chì|váy maxi|đầm|đầm xòe|đầm suông|đầm dạ hội|đầm dự tiệc|váy cưới|quần ống rộng|quần culottes|quần legging|đồ lót|áo ngực|áo lót|bra|bralette|bikini|đồ bơi|áo bơi|quần bơi|đồ mặc nhà|váy ngủ|giày|giày thể thao|giày sneaker|sneaker|giày tây|giày lười|giày slip on|giày boot|dép|dép quai hậu|sandal|giày cao gót|giày búp bê|giày bệt|guốc|tất|vớ|quần tất|balo|ba lô|túi|túi xách|túi đeo chéo|túi tote|túi vải|cặp xách|vali|vali kéo|vali du lịch|túi trống|ví|ví da|bóp|ví cầm tay|clutch|mũ|nón|mũ lưỡi trai|nón kết|mũ vành|nón lá|kính|kính râm|kính mát|kính cận|gọng kính|thắt lưng|dây nịt|cà vạt|nơ|khăn|khăn choàng|khăn lụa|găng tay|bao tay|nhẫn|dây chuyền|bông tai|khuyên tai|vòng tay|lắc tay|lắc chân|trâm cài tóc|băng đô|cột tóc|kẹp tóc|đồng hồ|đồng hồ nam|đồng hồ nữ|đồng hồ cơ|đồng hồ quartz|đồng hồ đeo tay|dây đồng hồ|vàng|bạc|trang sức|jewelry|coolmate|uniqlo|zara|h&m|adidas|nike|puma|under armour|reebok|gucci|dior|chanel|louis vuitton|lv|prada|coach|áo măng tô|áo phao|áo ống|áo dài|áo bà ba|váy body|giày oxford|ủng|dép sục|dép xỏ ngón|chun buộc tóc|scrunchies|son môi|son dưỡng|phấn nền|phấn phủ|cushion|bb cream|mascara|eyeliner|kẻ mắt|phấn mắt|phấn má|kem nền|tẩy trang|nước hoa|làm móng|sơn móng tay|nail|nail box";
  const kwEdu = "sách|book|sách giáo khoa|sách tham khảo|sách bài tập|từ điển|truyện|truyện tranh|manga|comic|tiểu thuyết|truyện ngắn|tản văn|sách kinh tế|sách kỹ năng|sách tâm lý|sách nuôi dạy con|vở|notebook|tập|vở ô ly|vở kẻ ngang|sổ tay|sổ còng|giấy|paper|giấy a4|giấy in|giấy note|bút|pen|pencil|bút bi|bút chì|bút máy|bút dạ|bút highlight|bút màu|ruột bút bi|hộp bút|bóp viết|thước|thước kẻ|compa|tẩy|gôm|mực bơm|kẹp bướm|ghim bấm|keo dán|hồ dán|băng dính|đồ chơi|toy|đồ chơi trẻ em|đồ chơi gỗ|xếp hình|lego|rubik|yoyo|con quay|beyblade|búp bê|barbie|xe đồ chơi|máy bay điều khiển|ô tô điều khiển|mô hình|figure|gundam|gunpla|thẻ bài|pokemon|yugioh|board game|cờ vua|cờ tướng|cờ cá ngựa|cờ tỷ phú|ma sói|uno|mèo nổ|đất nặn|cát động lực|lều bóng|màu nước|màu sáp|màu acrylic|cọ vẽ|bảng pha màu|toan vẽ|canvas|khung tranh|sổ vẽ|sketchbook|len sợi|kim móc|kẽm nhung|giấy thủ công|keo sữa|nhạc cụ|đàn guitar|đàn piano|đàn organ|ukulele|sáo trúc|sáo recorder|kèn harmonica|trống|kalimba|dây đàn|phím gảy|capo|đĩa cd|đĩa than|vinyl|đĩa game|ps4|ps5|nintendo switch|thẻ game|nạp game|steam wallet|khóa học|course|khóa học tiếng anh|khóa học lập trình|khóa học thiết kế|học online|edumall|unica|hocmai|toán|văn|anh|lịch sử|địa lý|vật lý|hóa học|sinh học|ielts|toeic|học giao tiếp|spotify premium|netflix|elsa|tài khoản|phần mềm|máy tính bỏ túi|máy tính casio|bảng|album|nhạc|phim|game|video game|sách tô màu|tranh tô màu|sách thiếu nhi|sách ngoại ngữ|gọt bút chì|cặp sách|balo học sinh|bìa hồ sơ|file lá|bấm lỗ|flashcard|đồ chơi stem|arduino|raspberry pi|cờ|đàn";

  const CAT_DEFS = [
    { name: '💻 Điện tử & Công nghệ', kw: kwTech },
    { name: '💪 Thể thao & Sức khỏe', kw: kwSport },
    { name: '🏠 Nhà cửa & Đời sống', kw: kwHome },
    { name: '👕 Thời trang & Phụ kiện', kw: kwFashion },
    { name: '📚 Giải trí & Giáo dục', kw: kwEdu }
  ];

  const SCORING_CATS = CAT_DEFS.map(cat => ({
    name: cat.name,
    words: cat.kw.split('|').map(w => w.trim().toLowerCase()).filter(Boolean).sort((a, b) => b.length - a.length)
  }));

  function formatItemNameForDisplay(name) {
    let s = String(name || '');
    // Loại bỏ các tag quảng cáo [ ] ( ) { }
    s = s.replace(/\[.*?\]|\(.*?\)|\{.*?\}/g, ' ');
    // Loại bỏ khoảng trắng thừa
    return s.replace(/\s+/g, ' ').trim();
  }

  function cleanItemName(name) {
    let s = String(name || '');
    // Loại bỏ các tag quảng cáo [ ] ( ) { }
    s = s.replace(/\[.*?\]|\(.*?\)|\{.*?\}/g, ' ');
    // Loại bỏ emoji và ký tự đặc biệt, chỉ giữ lại chữ cái, số và khoảng trắng
    s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ');
    // Chuyển thành chữ thường
    s = s.toLowerCase();
    
    // Loại bỏ các từ khóa nhiễu
    const noiseWords = [
      'combo', 'set', 'sét', 'pack', 'vỉ', 'hộp', 'thùng', 
      'chính hãng', 'cao cấp', 'nhập khẩu', 'giá rẻ', 'freeship', 
      'hỏa tốc', 'quà tặng', 'gift', 'không bán', 'mới', 
      'hàng loại 1', 'siêu mỏng', 'siêu bền', 'tặng kèm'
    ];
    s = ' ' + s + ' ';
    for (const w of noiseWords) {
      s = s.replace(new RegExp(' ' + w + ' ', 'g'), ' ');
      s = s.replace(new RegExp(' ' + w + ' ', 'g'), ' ');
    }
    
    // Chuẩn hóa khoảng trắng
    return s.replace(/\s+/g, ' ').trim();
  }

  function classifyByName(name) {
    const n = cleanItemName(name);
    const paddedN = ' ' + n + ' ';
    
    let bestCat = '🏷️ Khác';
    let maxScore = 0;

    for (const cat of SCORING_CATS) {
      let score = 0;
      let temp = paddedN;
      
      for (const w of cat.words) {
        const target = ' ' + w + ' ';
        let idx = temp.indexOf(target);
        while (idx !== -1) {
          // Cộng điểm bằng với độ dài từ khóa (từ khóa dài/chi tiết sẽ được điểm cao hơn)
          score += w.length;
          // Xóa từ khóa đã match nhưng giữ lại 1 khoảng trắng để không ảnh hưởng các từ bên cạnh
          temp = temp.substring(0, idx) + ' ' + temp.substring(idx + target.length - 1);
          idx = temp.indexOf(target);
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestCat = cat.name;
      }
    }
    
    return bestCat;
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

  const API_CAT_MAP = {
    'Điện Thoại & Phụ Kiện': '💻 Điện tử & Công nghệ',
    'Thiết Bị Điện Tử': '💻 Điện tử & Công nghệ',
    'Máy Tính & Laptop': '💻 Điện tử & Công nghệ',
    'Máy Ảnh & Máy Quay Phim': '💻 Điện tử & Công nghệ',
    'Thiết Bị Âm Thanh': '💻 Điện tử & Công nghệ',
    
    'Thời Trang Nam': '👕 Thời trang & Phụ kiện',
    'Thời Trang Nữ': '👕 Thời trang & Phụ kiện',
    'Giày Dép Nam': '👕 Thời trang & Phụ kiện',
    'Giày Dép Nữ': '👕 Thời trang & Phụ kiện',
    'Đồng Hồ': '👕 Thời trang & Phụ kiện',
    'Phụ Kiện & Trang Sức Nữ': '👕 Thời trang & Phụ kiện',
    'Túi Ví Nữ': '👕 Thời trang & Phụ kiện',
    'Túi Xách Nữ': '👕 Thời trang & Phụ kiện',
    'Balo & Túi Ví Nam': '👕 Thời trang & Phụ kiện',
    'Thời Trang Trẻ Em': '👕 Thời trang & Phụ kiện',
    'Sắc Đẹp': '👕 Thời trang & Phụ kiện',

    'Thể Thao & Du Lịch': '💪 Thể thao & Sức khỏe',
    'Sức Khỏe': '💪 Thể thao & Sức khỏe',

    'Nhà Cửa & Đời Sống': '🏠 Nhà cửa & Đời sống',
    'Thiết Bị Gia Dụng': '🏠 Nhà cửa & Đời sống',
    'Mẹ & Bé': '🏠 Nhà cửa & Đời sống',
    'Bách Hóa Online': '🏠 Nhà cửa & Đời sống',
    'Chăm Sóc Thú Cưng': '🏠 Nhà cửa & Đời sống',
    'Ô Tô & Xe Máy & Xe Đạp': '🏠 Nhà cửa & Đời sống',

    'Đồ Chơi': '📚 Giải trí & Giáo dục',
    'Nhà Sách Online': '📚 Giải trí & Giáo dục'
  };

  function resolveCategory(catId, itemName, catIdMap) {
    if (catId && catIdMap && catIdMap[catId]) {
      const topLevelName = catIdMap[catId].trim();
      
      // Match mapped Shopee Category first
      if (API_CAT_MAP[topLevelName]) {
        return API_CAT_MAP[topLevelName];
      }
      
      // Fuzzy match for unmapped Shopee API categories
      const tl = topLevelName.toLowerCase();
      if (tl.includes('điện tử') || tl.includes('công nghệ') || tl.includes('máy tính') || tl.includes('điện thoại')) return '💻 Điện tử & Công nghệ';
      if (tl.includes('thời trang') || tl.includes('giày dép') || tl.includes('túi') || tl.includes('trang sức') || tl.includes('đồng hồ') || tl.includes('sắc đẹp')) return '👕 Thời trang & Phụ kiện';
      if (tl.includes('thể thao') || tl.includes('sức khỏe') || tl.includes('du lịch')) return '💪 Thể thao & Sức khỏe';
      if (tl.includes('nhà cửa') || tl.includes('gia dụng') || tl.includes('bách hóa') || tl.includes('thú cưng') || tl.includes('xe')) return '🏠 Nhà cửa & Đời sống';
      if (tl.includes('giáo dục') || tl.includes('sách') || tl.includes('đồ chơi')) return '📚 Giải trí & Giáo dục';
    }
    
    // Fallback: strictly classify by the robust keyword scoring based on name
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
        let json;
        try {
          json = await response.json();
        } catch (e) {
          throw new Error('Lỗi đọc dữ liệu từ Shopee (có thể do lỗi đăng nhập). Vui lòng F5 tải lại trang Shopee và thử lại.');
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
            }, '*');
          } catch (e) {}
        }
      }

      const allMiniOrders = [...newMiniOrders, ...CACHED_MINI_ORDERS];
      const stats = computeStats(allMiniOrders);

      const cappedItemMap = capMap(itemMap, 500);

      const topItems = Object.values(itemMap)
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 100)
        .map(item => ({
          name:  item.name,
          spent: item.spent,
          count: item.count,
          cat:   resolveCategory(item.catId, item.name, catIdMap)
        }));

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
        ? newMiniOrders.reduce((max, o) => (o.ts > max ? o.ts : max), 0)
        : LAST_UPDATED;

      try {
        window.postMessage({
          type: 'SHOPEE_STATS_COMPLETE',
          data: {
            ...stats,
            topItems,
            catStats,
            cachePayload: {
              fetchTime: Math.floor(Date.now() / 1000),
              lastUpdated: newLastUpdated || LAST_UPDATED,
              listType: LIST_TYPE,
              miniOrders: allMiniOrders,
              itemMap: cappedItemMap,
              catTree: { ts: catTreeTs, map: catIdMap }
            }
          }
        }, '*');
      } catch (e) {}

    } catch (err) {
      console.warn('SP Analyzer Ext Error:', err);
      try {
        window.postMessage({
          type: 'SHOPEE_STATS_ERROR',
          message: err.message || 'Lỗi truy xuất dữ liệu.'
        }, '*');
      } catch (e) {}
    }
  }

  startSpidering();

})();
