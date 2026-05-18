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
    { name: '⌚ Đồng Hồ', re: /đồng hồ|watch\b|wrist watch|time piece|g-shock|g shock|baby-g|casio\b|seiko\b|citizen\b|tissot\b|orient\b|fossil\b|rolex\b|longines\b|hamilton\b|michael kors|mk watch|daniel wellington|dw watch|garmin\b|fitbit\b|apple watch|samsung watch|huawei watch|amazfit\b|xiaomi watch|mi watch|smartwatch|đồng hồ thông minh|đồng hồ điện tử|đồng hồ cơ|đồng hồ automatic|đồng hồ quartz|đồng hồ kim|đồng hồ số|dây đồng hồ|dây da đồng hồ|dây kim loại|dây silicone|hộp đựng đồng hồ|pin đồng hồ|kính đồng hồ|khóa đồng hồ|vỏ đồng hồ|mặt đồng hồ|kim đồng hồ|tag heuer|omega\b|breitling|patek philippe|audemars|vacheron|iwc\b|cartier watch|mvmt\b|skagen\b|timex\b|swatch\b|ice watch|nixon\b|invicta\b|bulova\b|guess watch|armani watch|diesel watch|tommy watch|calvin klein watch|đồng hồ đeo tay|đồng hồ nam|đồng hồ nữ|đồng hồ couple|đồng hồ cặp đôi|đồng hồ unisex/i },

    // ── Máy Ảnh & Máy Quay ───────────────────────────────────────────────────────────────────
    { name: '📷 Máy Ảnh & Máy Quay', re: /máy ảnh|camera\b|dslr\b|mirrorless|máy quay|máy quay phim|camcorder|action cam|action camera|gopro\b|hero\d|dji\b|osmo\b|mavic\b|mini \d|air \d|phantom\b|insta360\b|sjcam\b|yi camera|eken\b|thieye\b|flycam|drone\b|quadcopter|fpv drone|ống kính|lens\b|objective|kit lens|prime lens|zoom lens|macro lens|fisheye|wide angle|telephoto|tele lens|ultra wide|50mm|85mm|24-70|70-200|sigma lens|tamron\b|tokina\b|samyang\b|zeiss\b|leica\b|tripod\b|chân máy|monopod|chân một|gimbal\b|zhiyun\b|feiyutech\b|moza\b|stabilizer|ổn định|đèn flash|speedlight|strobe\b|softbox\b|umbrella light|reflector|tản sáng|ring light|led panel|thẻ nhớ|memory card|sd card|cf card|xqd card|cfast|micro sd|sandisk\b|lexar\b|samsung evo|túi máy ảnh|case máy ảnh|strap máy ảnh|body máy ảnh|canon\b|eos\b|rebel\b|5d\b|6d\b|7d\b|80d\b|90d\b|r5\b|r6\b|nikon\b|d3500|d5600|d7500|d750|d850|z5\b|z6\b|z7\b|sony\b|alpha\b|a7\b|a6\d|fx\b|rx100|fujifilm\b|fuji\b|xt\d|xh\d|xe\d|gfx\b|olympus\b|omd\b|pen\b|panasonic\b|lumix\b|gh\d|g\d\d|blackmagic\b|bmpcc\b|ursa\b|atem\b|davinci\b|red camera|arri\b|cinema camera|broadcast|studio camera|webcam\b|usb camera|streaming cam|obs\b|elgato\b/i },

    // ── Điện Thoại & Phụ Kiện ────────────────────────────────────────────────────────────────
    { name: '📱 Điện Thoại & Phụ Kiện', re: /điện thoại|smartphone|mobile phone|cellphone|phone\b|iphone\b|ip\d+|apple phone|samsung\b|ss galaxy|galaxy\b|note\d+|s2\d|a\d+\b|m\d+\b|j\d+\b|xiaomi\b|mi\d+|redmi\b|poco\b|black shark|oppo\b|reno\b|find x|a\d+k|realme\b|gt\b|c\d+\b|vivo\b|iqoo\b|y\d+\b|v\d+\b|x\d+\b|nokia\b|lumia\b|huawei\b|p\d+\b|mate\b|nova\b|y\d+p|honor\b|magic\b|oneplus\b|1\+\d|nothing phone|motorola\b|moto\b|edge\b|g\d+\b|e\d+\b|tecno\b|camon\b|spark\b|infinix\b|hot\b|note\b|zero\b|asus\b|rog phone|zenfone\b|google pixel|pixel\b|sony xperia|lg\b|wing\b|velvet\b|blackberry\b|htc\b|meizu\b|lenovo\b|zte\b|alcatel\b|máy tính bảng|tablet\b|ipad\b|galaxy tab|surface\b|lenovo tab|huawei matepad|xiaomi pad|oppo pad|tab\b|ốp lưng|case\b|ốp\b|bao da|flip case|clear case|silicone case|tpu case|pc case|leather case|wallet case|miếng dán|dán màn hình|dán lưng|kính cường lực|cường lực|tempered glass|screen protector|hydrogel|ppf\b|ceramic film|pin dự phòng|power bank|sạc dự phòng|portable charger|anker\b|romoss\b|xiaomi powerbank|baseus\b|aukey\b|ravpower\b|sạc nhanh|fast charge|quick charge|pd charger|gan charger|sạc không dây|wireless charger|qi charger|magsafe\b|củ sạc|adapter|wall charger|bộ sạc|charger kit|cáp sạc|cable\b|usb cable|cáp type c|usb c|type-c|cáp lightning|lightning cable|cáp micro usb|micro usb|cáp usb|data cable|sync cable|charging cable|dock sạc|charging dock|đế sạc|charging stand|wireless stand|giá đỡ|phone stand|phone holder|car mount|bike mount|ring holder|popsocket\b|gương selfie|selfie mirror|lens selfie|wide lens|macro lens|fisheye lens|clip lens|phụ kiện điện thoại|phone accessories|mobile accessories|điện thoại cũ|refurbished|second hand|máy đẹp|99\%|fullbox\b|nguyên seal|chính hãng|bảo hành|warranty|sim ghép|rsim\b|gevey\b|unlock\b|jailbreak\b|root\b|custom rom|gcam\b|mod\b|airpods\b|airpod\b|earbud\b|earphone\b|tws\b|true wireless|bluetooth earphone|wireless earphone|tai nghe bluetooth|tai nghe không dây|tai nghe thể thao|gaming earphone|tai nghe gaming|tai nghe có dây|wired earphone|tai nghe iphone|earpods\b|beats\b|sony wf|galaxy buds|xiaomi earbuds|1more\b|soundpeats\b|anker soundcore|jabra\b|sennheiser\b|audio technica|bose\b|jbl\b|marshall\b|skullcandy\b/i },

    // ── Máy Tính & Laptop ────────────────────────────────────────────────────────────────────
    { name: '💻 Máy Tính & Laptop', re: /laptop\b|notebook\b|máy tính xách tay|ultrabook\b|chromebook\b|gaming laptop|workstation\b|macbook\b|mac\b|surface\b|dell\b|xps\b|inspiron\b|latitude\b|precision\b|alienware\b|hp\b|envy\b|pavilion\b|omen\b|probook\b|elitebook\b|spectre\b|lenovo\b|thinkpad\b|ideapad\b|legion\b|yoga\b|asus\b|vivobook\b|zenbook\b|rog\b|tuf\b|strix\b|acer\b|aspire\b|swift\b|spin\b|nitro\b|predator\b|helios\b|triton\b|msi\b|stealth\b|raider\b|creator\b|prestige\b|modern\b|gigabyte\b|aorus\b|aero\b|razer\b|blade\b|samsung\b|galaxy book|huawei\b|matebook\b|honor\b|magicbook\b|lg gram|xiaomi\b|mi notebook|redmibook\b|pc\b|desktop\b|máy tính bàn|gaming pc|workstation pc|mini pc|all-in-one|imac\b|mac mini|mac pro|case\b|vỏ case|tower\b|mid tower|full tower|mini itx|micro atx|atx\b|cpu\b|processor\b|intel\b|amd\b|ryzen\b|threadripper\b|epyc\b|core\b|i3\b|i5\b|i7\b|i9\b|xeon\b|celeron\b|pentium\b|fx\b|a4\b|a6\b|a8\b|a10\b|a12\b|3000\b|5000\b|7000\b|9000\b|ram\b|memory\b|ddr3\b|ddr4\b|ddr5\b|sodimm\b|dimm\b|corsair\b|gskill\b|g\.skill\b|kingston\b|crucial\b|teamgroup\b|adata\b|patriot\b|hyperx\b|vengeance\b|trident\b|ripjaws\b|fury\b|8gb\b|16gb\b|32gb\b|64gb\b|ổ cứng|storage\b|ssd\b|hdd\b|nvme\b|sata\b|m\.2\b|pcie\b|samsung\b|wd\b|western digital\b|seagate\b|toshiba\b|crucial\b|intel ssd|kingston ssd|adata ssd|970\b|980\b|blue\b|black\b|red\b|purple\b|gold\b|mainboard\b|motherboard\b|bo mạch chủ|mobo\b|asus prime|msi\b|gigabyte\b|asrock\b|evga\b|biostar\b|b450\b|b550\b|x570\b|z490\b|z590\b|h410\b|h510\b|card đồ họa|gpu\b|graphics card|vga\b|video card|nvidia\b|geforce\b|gtx\b|rtx\b|titan\b|quadro\b|amd\b|radeon\b|rx\b|vega\b|navi\b|rdna\b|asus\b|msi\b|gigabyte\b|evga\b|zotac\b|palit\b|galax\b|pny\b|sapphire\b|powercolor\b|xfx\b|1050\b|1060\b|1070\b|1080\b|1650\b|1660\b|2060\b|2070\b|2080\b|3050\b|3060\b|3070\b|3080\b|3090\b|4060\b|4070\b|4080\b|4090\b|6600\b|6700\b|6800\b|6900\b|7600\b|7700\b|7800\b|7900\b|nguồn\b|psu\b|power supply\b|watt\b|80\+ bronze|80\+ gold|80\+ platinum|seasonic\b|corsair\b|evga\b|cooler master\b|thermaltake\b|antec\b|be quiet\b|silverstone\b|modular\b|semi modular|non modular|tản nhiệt|cooler\b|cooling\b|fan\b|quạt\b|air cooler|liquid cooling|aio\b|custom loop|thermal paste\b|keo tản nhiệt|arctic\b|noctua\b|be quiet\b|cooler master\b|corsair\b|deepcool\b|id cooling\b|scythe\b|zalman\b|bàn phím|keyboard\b|mechanical\b|membrane\b|wireless keyboard\b|gaming keyboard\b|cherry mx|gateron\b|kailh\b|outemu\b|optical switch|linear\b|tactile\b|clicky\b|keycap\b|logitech\b|corsair\b|razer\b|steelseries\b|asus\b|msi\b|cooler master\b|ducky\b|filco\b|leopold\b|varmilo\b|akko\b|keychron\b|anne pro\b|rk\b|fl esports\b|dare-u\b|chuột\b|mouse\b|gaming mouse\b|wireless mouse\b|bluetooth mouse\b|optical mouse\b|laser mouse\b|ergonomic mouse\b|vertical mouse\b|trackball\b|logitech\b|razer\b|steelseries\b|corsair\b|asus\b|msi\b|cooler master\b|zowie\b|finalmouse\b|glorious\b|g pro\b|deathadder\b|basilisk\b|viper\b|rival\b|sensei\b|ec1\b|ec2\b|fk1\b|fk2\b|za11\b|za12\b|mousepad\b|mouse pad\b|lót chuột\b|gaming pad\b|extended\b|xl\b|xxl\b|cloth\b|hard pad\b|steelseries qck\b|corsair mm\b|razer goliathus\b|zowie g-sr\b|artisan\b|màn hình\b|monitor\b|display\b|screen\b|lcd\b|led\b|oled\b|qled\b|ips\b|tn\b|va\b|1080p\b|1440p\b|4k\b|ultrawide\b|curved\b|gaming monitor\b|144hz\b|165hz\b|240hz\b|360hz\b|gsync\b|freesync\b|hdr\b|asus\b|acer\b|lg\b|samsung\b|dell\b|msi\b|gigabyte\b|benq\b|aoc\b|viewsonic\b|philips\b|webcam\b|camera\b|web camera\b|streaming camera\b|1080p camera\b|4k camera\b|logitech\b|razer\b|microsoft\b|asus\b|a4tech\b|genius\b|tai nghe\b|headset\b|headphone\b|earphone\b|gaming headset\b|studio headphone\b|monitor headphone\b|wireless headset\b|bluetooth headset\b|usb headset\b|3\.5mm\b|7\.1\b|surround\b|noise cancelling\b|anc\b|open back\b|closed back\b|over ear\b|on ear\b|in ear\b|logitech\b|razer\b|steelseries\b|corsair\b|hyperx\b|asus\b|msi\b|cooler master\b|sennheiser\b|audio technica\b|beyerdynamic\b|akg\b|sony\b|bose\b|microphone\b|mic\b|streaming mic\b|usb mic\b|xlr mic\b|condenser\b|dynamic\b|shotgun\b|lavalier\b|blue yeti\b|audio technica\b|rode\b|shure\b|samson\b|akg\b|ghế\b|chair\b|gaming chair\b|office chair\b|ergonomic chair\b|racing chair\b|executive chair\b|mesh chair\b|leather chair\b|fabric chair\b|noblechairs\b|secretlab\b|dxracer\b|akracing\b|corsair\b|razer\b|asus\b|msi\b|cooler master\b|bàn\b|desk\b|table\b|gaming desk\b|computer desk\b|standing desk\b|l shaped\b|corner desk\b|glass desk\b|wood desk\b|metal desk\b|ikea\b|uplift\b|flexispot\b|autonomous\b|jarvis\b|ups\b|uninterruptible power supply\b|bộ lưu điện\b|apc\b|cyberpower\b|eaton\b|liebert\b|vertiv\b|schneider\b|hub\b|usb hub\b|docking station\b|port replicator\b|thunderbolt\b|usb-c hub\b|multiport\b|anker\b|ugreen\b|baseus\b|belkin\b|caldigit\b|máy in\b|printer\b|inkjet\b|laser\b|all-in-one\b|multifunction\b|3d printer\b|hp\b|canon\b|epson\b|brother\b|samsung\b|xerox\b|kyocera\b|ricoh\b|mực in\b|ink\b|toner\b|cartridge\b|hộp mực\b|refill\b|compatible\b|original\b|oem\b|máy scan\b|scanner\b|document scanner\b|photo scanner\b|flatbed\b|sheet fed\b|duplex\b|máy chiếu\b|projector\b|dlp\b|lcd\b|led\b|laser projector\b|short throw\b|ultra short\b|portable projector\b|home theater\b|business\b|education\b|epson\b|benq\b|optoma\b|lg\b|sony\b|panasonic\b|viewsonic\b|router\b|modem\b|wifi\b|wireless\b|mesh\b|access point\b|range extender\b|repeater\b|switch\b|hub\b|ethernet\b|lan\b|wan\b|gigabit\b|10g\b|poe\b|tp-link\b|asus\b|netgear\b|linksys\b|d-link\b|tenda\b|mercusys\b|xiaomi\b|huawei\b|cisco\b|ubiquiti\b|mikrotik\b/i },

    // ── Thiết Bị Điện Tử ─────────────────────────────────────────────────────────────────────
    { name: '🔌 Thiết Bị Điện Tử', re: /smart tv|tivi\b|android tv|oled tv|qled tv|samsung tv|lg tv|sony tv|tcl tv|panasonic tv|màn hình tivi|máy lạnh|điều hòa|daikin|toshiba ac|lg ac|tủ lạnh|máy giặt|máy sấy quần áo|lò vi sóng|nồi cơm điện|nồi áp suất|nồi chiên không dầu|air fryer|bếp điện|bếp từ|bếp gas|máy xay sinh tố|máy ép trái cây|máy làm sữa chua|máy xay thịt|quạt điện|quạt đứng|quạt trần|quạt tích điện|máy hút bụi|robot hút bụi|máy rửa bát|bình đun nước|ấm siêu tốc|bình nóng lạnh|máy lọc nước|máy lọc không khí|máy cạo râu|máy uốn tóc|máy sấy tóc|máy tạo kiểu tóc|loa bluetooth|loa mini|loa di động|loa karaoke|soundbar|amply|amplifier|mixer âm thanh|đầu thu kỹ thuật số|đầu dvd|đầu cd|máy đọc sách kindle|ebook reader|đèn bàn led|đèn pin\b|pin sạc aa|pin sạc aaa|ổ cắm điện|ổ điện|phích cắm|cầu dao|aptomat/i },

    // ── Thời Trang Trẻ Em (trước Nam/Nữ để bé gái/bé trai không nhầm) ───────────────────────
    { name: '🧸 Đồ Trẻ Em & Đồ Chơi', re: /đồ chơi|xe đẩy em bé|xe nôi|nôi em bé|địu em bé|địu trẻ em|bình sữa em bé|bình pha sữa|máy hâm sữa|tã bỉm|bỉm\b|khăn ướt em bé|phấn em bé|sữa tắm em bé|dầu tắm bé|dầu massage bé|quần áo trẻ em|quần áo em bé|đồ sơ sinh|bodysuit bé|áo liền quần bé|váy bé gái|quần bé trai|áo bé trai|bộ đồ bé|giày dép trẻ em|dép bé|giày bé|balo trẻ em|cặp sách|balo học sinh|lego\b|lego duplo|xếp hình|đồ chơi lắp ráp|búp bê|búp bê barbie|xe đồ chơi|ô tô đồ chơi|robot đồ chơi|đồ chơi điều khiển|xích đu|cầu trượt|bể bơi trẻ em|đồ chơi tắm|sách trẻ em|truyện thiếu nhi|đồ chơi giáo dục|bảng học|bảng chữ cái|đồ chơi đất nặn|đất nặn|bộ tô màu|đồ chơi bếp|đồ chơi nhà bác sĩ|guitar đồ chơi|nhạc cụ đồ chơi/i },

    // ── Thời Trang Nam ────────────────────────────────────────────────────────────────────────
    { name: '👔 Thời Trang Nam', re: /áo thun nam|áo phông nam|t-shirt nam|tshirt nam|áo sơ mi nam|shirt nam|áo polo nam|polo nam|áo hoodie nam|hoodie nam|áo khoác nam|jacket nam|áo len nam|sweater nam|áo nỉ nam|áo gió nam|windbreaker nam|áo vest nam|vest nam|áo blazer nam|blazer nam|áo tanktop nam|tank top nam|áo ba lỗ nam|singlet nam|áo sweater nam|áo cardigan nam|cardigan nam|quần jean nam|jeans nam|denim nam|quần tây nam|trouser nam|slacks nam|quần kaki nam|chinos nam|khaki nam|quần short nam|shorts nam|quần thun nam|jogger nam|quần jogger nam|trackpants nam|quần nỉ nam|sweatpants nam|quần cargo nam|cargo pants nam|quần legging nam|tights nam|bộ đồ nam|set đồ nam|outfit nam|suit nam|formal wear nam|đồ bộ nam|pyjama nam|đồ ngủ nam|sleepwear nam|đồ lót nam|underwear nam|quần lót nam|briefs nam|boxer nam|quần boxer nam|boxer briefs nam|trunk nam|áo lót nam|undershirt nam|tất nam|socks nam|vớ nam|thắt lưng nam|belt nam|nơ nam|bow tie nam|cà vạt nam|tie nam|khăn nam|scarf nam|mũ nam|cap nam|hat nam|nón nam|beanie nam|snapback nam|bucket hat nam|trang phục nam|menswear|men fashion|men clothing|uniqlo nam|h&m nam|zara nam|gap nam|levis nam|tommy nam|calvin klein nam|polo ralph lauren|lacoste nam|adidas nam|nike nam|puma nam|under armour nam|champion nam|supreme nam|off-white nam|gucci nam|louis vuitton nam|dior nam|chanel nam|hermes nam|balenciaga nam|versace nam|armani nam|hugo boss nam|burberry nam|prada nam|ysl nam|saint laurent nam|bottega veneta nam|givenchy nam/i },

    // ── Thời Trang Nữ ────────────────────────────────────────────────────────────────────────
    { name: '👗 Thời Trang Nữ', re: /váy\b|dress\b|skirt\b|đầm\b|chân váy|váy midi|midi dress|váy maxi|maxi dress|váy mini|mini dress|váy a|a-line|váy xòe|flare dress|váy ôm|bodycon|váy suông|shift dress|váy wrap|wrap dress|váy shirt|shirt dress|váy jeans|denim dress|váy hoa|floral dress|váy ren|lace dress|váy dạ hội|evening dress|váy cưới|wedding dress|váy dự tiệc|party dress|váy công sở|office dress|đầm dự tiệc|đầm ren|đầm hoa|đầm suông|đầm body|đầm wrap|áo nữ\b|women top|áo thun nữ|t-shirt nữ|tshirt nữ|áo phông nữ|áo sơ mi nữ|blouse\b|shirt nữ|áo khoác nữ|jacket nữ|blazer nữ|cardigan nữ|áo hoodie nữ|hoodie nữ|áo len nữ|sweater nữ|áo nỉ nữ|áo gió nữ|windbreaker nữ|áo croptop|crop top|áo kiểu|áo 2 dây|camisole\b|tank top nữ|áo vest nữ|vest nữ|áo dài tay|long sleeve|áo ngắn tay|short sleeve|áo cổ lọ|turtleneck|áo cổ tim|v-neck|áo off vai|off shoulder|quần nữ\b|pants nữ|quần jean nữ|jeans nữ|denim nữ|quần short nữ|shorts nữ|quần tây nữ|trouser nữ|quần thun nữ|legging\b|tights\b|quần jogger nữ|trackpants nữ|quần cargo nữ|cargo pants nữ|quần ống rộng|wide leg|quần suông nữ|straight leg|quần ống loe|bootcut|quần skinny|skinny jeans|quần baggy|loose fit|bộ đồ nữ|set nữ|outfit nữ|coordinate\b|two piece|đồ bộ nữ|pyjama nữ|sleepwear nữ|đồ ngủ nữ|nightwear\b|bộ đồ mặc nhà|homewear\b|loungewear\b|đồ lót nữ|underwear nữ|lingerie\b|intimate\b|áo ngực|bra\b|bralette\b|sports bra|push up bra|strapless bra|wireless bra|quần lót nữ|panties\b|briefs nữ|thong\b|bikini panties|boyshorts\b|hipster\b|tất\b|socks nữ|vớ\b|stockings\b|pantyhose\b|tights nữ|tất lưới|fishnet\b|tất cổ cao|knee high|over knee|thigh high|áo khoác ngoài|outerwear\b|coat\b|trench coat|denim jacket|leather jacket|bomber jacket|puffer jacket|wool coat|fur coat|trang phục nữ|women fashion|women clothing|ladies wear|female fashion|uniqlo nữ|h&m nữ|zara nữ|mango nữ|topshop\b|forever 21|gap nữ|banana republic|ann taylor|loft\b|j\.crew|anthropologie\b|free people|urban outfitters|asos\b|boohoo\b|prettylittlething\b|shein\b|romwe\b|yesstyle\b|chuu\b|stylenanda\b|66girls\b|chanel nữ|dior nữ|gucci nữ|prada nữ|versace nữ|valentino\b|givenchy nữ|saint laurent nữ|bottega veneta nữ|celine\b|loewe\b|jacquemus\b|ganni\b|acne studios|isabel marant|zimmermann\b|reformation\b|realisation par|faithfull\b|house of cb|for love lemons|alice mccall/i },

    // ── Giày Dép ─────────────────────────────────────────────────────────────────────────────
    { name: '👟 Giày Dép', re: /giày\b|shoe\b|footwear\b|dép\b|sandal\b|slipper\b|sneaker\b|trainer\b|running shoe|athletic shoe|sport shoe|casual shoe|dress shoe|formal shoe|loafer\b|moccasin\b|boat shoe|oxford\b|brogue\b|derby\b|monk strap|wingtip\b|cap toe|espadrille\b|slip on|slip-on|slip ons|high heel|stiletto\b|pump\b|wedge\b|platform\b|block heel|kitten heel|mary jane|ballet flat|flat\b|boot\b|ankle boot|chelsea boot|combat boot|hiking boot|work boot|cowboy boot|riding boot|knee boot|thigh boot|over knee|rain boot|snow boot|ugg\b|timberland\b|dr martens|doc martens|martens\b|bốt\b|giày boot|giày thể thao|giày chạy bộ|giày tennis|giày bóng rổ|basketball shoe|giày bóng đá|football boot|soccer cleat|giày golf|golf shoe|giày tây|giày lười|giày công sở|giày da\b|leather shoe|giày vải|canvas shoe|giày cao gót|giày đế xuồng|giày đế bằng|giày đế thấp|low heel|giày đế cao|high heel|giày mũi nhọn|pointed toe|giày mũi tròn|round toe|giày mũi vuông|square toe|dép lê|slide\b|dép kẹp|flip flop|thong sandal|dép quai ngang|strap sandal|dép cao gót|heel sandal|dép đế bằng|flat sandal|dép tổ ong|croc\b|crocs\b|birkenstock\b|teva\b|chacos\b|nike\b|air jordan|jordan\b|air force|air max|react\b|zoom\b|flyknit\b|vapormax\b|presto\b|huarache\b|cortez\b|blazer nike|dunk\b|sb dunk|adidas\b|ultraboost\b|nmd\b|yeezy\b|stan smith|superstar\b|gazelle\b|samba\b|campus\b|continental\b|originals\b|three stripes|converse\b|chuck taylor|all star|one star|jack purcell|cons\b|vans\b|old skool|authentic\b|era\b|slip-on|sk8|checkerboard\b|off the wall|new balance|nb\b|990\b|991\b|992\b|993\b|995\b|997\b|998\b|999\b|1500\b|1400\b|574\b|373\b|327\b|puma\b|suede\b|clyde\b|rs-x|thunder\b|cell\b|future rider|reebok\b|classic leather|club c|instapump\b|question\b|answer\b|kamikaze\b|skechers\b|d'lites|energy\b|go walk|max cushioning|memory foam|arch fit|fila\b|disruptor\b|grant hill|cage\b|mindblower\b|asics\b|gel\b|tiger\b|onitsuka\b|mexico 66|gel-kayano|gel-nimbus|gel-lyte|under armour|ua\b|curry\b|hovr\b|charged\b|micro g|saucony\b|jazz\b|shadow\b|grid\b|kinvara\b|guide\b|triumph\b|mizuno\b|wave\b|prophecy\b|rider\b|creation\b|brooks\b|ghost\b|glycerin\b|adrenaline\b|levitate\b|hoka\b|clifton\b|bondi\b|arahi\b|speedgoat\b|salomon\b|speedcross\b|xa\b|sense\b|gore-tex\b|balenciaga\b|triple s|track\b|speed\b|knife\b|gucci\b|ace\b|rhyton\b|screener\b|flashtrek\b|louis vuitton|lv trainer|archlight\b|run away|dior\b|b23\b|b22\b|oblique\b|saddle\b|chanel\b|cc\b|sneaker chanel|prada\b|cloudbust\b|americas cup|linea rossa|saint laurent|ysl\b|court classic|sl10\b|bottega veneta|tire boot|puddle\b|givenchy\b|jaw\b|giv 1|spectre\b|valentino\b|rockstud\b|garavani\b|open\b|common projects|achilles\b|golden goose|superstar ggdb|slide ggdb|off-white\b|chicago\b|presto ow|blazer ow|jordan ow|fear of god|fog\b|essentials fog|military sneaker|jerry lorenzo|stone island|compass\b|marine\b|rick owens|drkshdw\b|ramones\b|geobasket\b|maison margiela|gat\b|tabi\b|fusion\b|acne studios|bolzter\b|perey lace|y-3\b|yohji yamamoto|qasa\b|kaiwa\b|kusari\b|bashyo\b|shiku run/i },

    // ── Túi & Ví ──────────────────────────────────────────────────────────────────────────────
    { name: '👜 Túi & Ví', re: /túi xách|handbag|shoulder bag|tote bag|túi tote|túi clutch|clutch bag|túi đeo chéo|crossbody|sling bag|túi đeo vai|túi belt|túi bum bag|balo\b|backpack|ba lô|balo laptop|balo học sinh|balo thể thao|balo du lịch|travel bag|túi du lịch|túi kéo|vali\b|ví da\b|wallet|ví đựng thẻ|card holder|ví dây kéo|ví zip|ví cầm tay|ví nam\b|ví nữ\b|túi nam\b|túi nữ\b|túi mini|túi nhỏ|túi phong bì|pouch\b|túi vải|túi canvas|túi lưới|hộp đựng nữ trang|coach\b|gucci\b|louis vuitton|lv bag|michael kors bag|mk bag|dior bag|chanel bag|hermes/i },

    // ── Sức Khỏe & Làm Đẹp ───────────────────────────────────────────────────────────────────
    { name: '💊 Sức Khỏe & Làm Đẹp', re: /skincare\b|beauty\b|cosmetic\b|makeup\b|kem dưỡng|moisturizer\b|cream\b|kem dưỡng da|kem dưỡng ẩm|kem dưỡng trắng|whitening cream|brightening cream|anti aging|chống lão hóa|kem chống nhăn|wrinkle cream|kem dưỡng mắt|eye cream|kem dưỡng môi|lip balm|kem dưỡng tay|hand cream|kem dưỡng chân|foot cream|kem dưỡng thể|body lotion|body cream|serum\b|essence\b|ampoule\b|concentrate\b|treatment\b|toner\b|nước cân bằng|astringent\b|witch hazel|micellar water|nước tẩy trang|makeup remover|cleansing water|cleansing oil|oil cleanser|balm cleanser|foam cleanser|gel cleanser|cream cleanser|sữa rửa mặt|facial cleanser|face wash|kem chống nắng|sunscreen\b|sunblock\b|sun protection|spf\b|pa\+|uva\b|uvb\b|zinc oxide|titanium dioxide|chemical sunscreen|physical sunscreen|bb cream|cc cream|dd cream|cushion\b|foundation\b|kem nền|liquid foundation|powder foundation|stick foundation|mineral foundation|full coverage|light coverage|medium coverage|concealer\b|kem che khuyết điểm|color corrector|primer\b|lót\b|base makeup|phấn phủ|setting powder|finishing powder|translucent powder|pressed powder|loose powder|compact powder|highlight\b|highlighter\b|illuminator\b|glow\b|strobing\b|contour\b|bronzer\b|sculpting\b|chiseling\b|blush\b|má hồng|cheek color|rouge\b|blusher\b|eyeshadow\b|phấn mắt|eye makeup|palette\b|single shadow|shimmer\b|matte\b|metallic\b|glitter\b|pigment\b|mascara\b|lông mi|lengthening\b|volumizing\b|waterproof\b|tubing\b|fiber\b|eyeliner\b|kẻ mắt|liquid liner|gel liner|pencil liner|felt tip|winged\b|cat eye|tightline\b|kẻ chân mày|eyebrow\b|brow\b|eyebrow pencil|brow gel|brow powder|brow pomade|eyebrow tint|microblading\b|son môi|lipstick\b|lip color|matte lipstick|satin lipstick|glossy lipstick|liquid lipstick|lip stain|lip tint|lip gloss|lip oil|lip balm|son dưỡng|lip treatment|lip scrub|tẩy tế bào chết môi|nail polish|sơn móng|gel polish|nail art|nail sticker|nail decoration|cuticle oil|base coat|top coat|nail file|nail buffer|nail cutter|nail clipper|manicure\b|pedicure\b|false nail|nail extension|press on nail|nước hoa|perfume\b|fragrance\b|cologne\b|eau de parfum|edp\b|eau de toilette|edt\b|eau fraiche|parfum\b|body mist|body spray|xịt thơm|travel size|sample\b|decant\b|atomizer\b|chanel no 5|dior sauvage|tom ford|creed\b|jo malone|maison margiela|byredo\b|le labo|diptyque\b|hermès\b|versace eros|paco rabanne|yves saint laurent|calvin klein|hugo boss|armani code|dolce gabbana|burberry\b|thierry mugler|viktor rolf|issey miyake|kenzo\b|lancome\b|estee lauder|clarins\b|guerlain\b|givenchy\b|haircare\b|hair\b|dầu gội|shampoo\b|dầu xả|conditioner\b|hair mask|mặt nạ tóc|kem ủ tóc|hair treatment|leave in|hair oil|dầu dưỡng tóc|hair serum|serum tóc|dry shampoo|dầu gội khô|hair spray|keo xịt tóc|hair gel|gel vuốt tóc|hair wax|sáp vuốt tóc|pomade\b|hair cream|kem vuốt tóc|mousse\b|bọt tạo kiểu|hair dye|thuốc nhuộm tóc|hair color|tóc nhuộm|bleach\b|tẩy tóc|developer\b|oxi\b|ammonia\b|peroxide\b|tóc giả|wig\b|hair extension|nối tóc|hairpiece\b|toupee\b|lược\b|comb\b|brush\b|hair brush|bàn chải tóc|round brush|paddle brush|detangling brush|wide tooth comb|rat tail comb|hair dryer|máy sấy tóc|blow dryer|hair straightener|máy là tóc|flat iron|curling iron|máy uốn tóc|hair curler|hot roller|hair clipper|tông đơ|trimmer\b|razor\b|dao cạo|electric shaver|máy cạo râu|beard trimmer|tỉa râu|aftershave\b|shaving cream|kem cạo râu|shaving gel|gel cạo râu|makeup brush|cọ trang điểm|foundation brush|powder brush|blush brush|eyeshadow brush|eyeliner brush|lip brush|fan brush|stippling brush|beauty blender|mút trang điểm|makeup sponge|beauty tools|dụng cụ làm đẹp|eyelash curler|kẹp mi|tweezers\b|nhíp\b|makeup mirror|gương trang điểm|led mirror|magnifying mirror|gương phóng to|compact mirror|gương bỏ túi|skincare tools|máy rửa mặt|facial cleansing brush|sonic cleaner|silicone brush|jade roller|con lăn đá|gua sha|facial steamer|máy xông hơi mặt|pore extractor|máy hút mụn|led mask|mặt nạ led|microneedling\b|derma roller|máy massage mặt|face massager|thực phẩm chức năng|supplement\b|vitamin\b|mineral\b|multivitamin\b|vitamin c|vitamin d|vitamin e|vitamin b|b complex|biotin\b|folic acid|iron\b|calcium\b|magnesium\b|zinc\b|omega 3|omega 6|fish oil|dầu cá|collagen\b|peptide\b|hyaluronic acid|coq10\b|glutathione\b|resveratrol\b|probiotics\b|digestive enzyme|fiber\b|protein powder|whey protein|casein protein|plant protein|pea protein|hemp protein|rice protein|creatine\b|bcaa\b|amino acid|pre workout|post workout|fat burner|weight loss|giảm cân|detox\b|cleanse\b|antioxidant\b|anti inflammatory|turmeric\b|nghệ\b|ginger\b|gừng\b|green tea|trà xanh|garcinia\b|forskolin\b|raspberry ketone|glucomannan\b|chitosan\b|l-carnitine\b|cla\b|green coffee|cà phê xanh|viên uống|thuốc bổ|thực phẩm bảo vệ|bổ sung|kẹo vitamin|vitamin gummy|siro\b|syrup\b|liquid vitamin|powder vitamin|capsule\b|tablet\b|softgel\b|healthcare\b|medical\b|thermometer\b|nhiệt kế|blood pressure monitor|máy đo huyết áp|glucose meter|máy đo đường huyết|pulse oximeter|máy đo oxy|scale\b|cân\b|body fat scale|cân đo mỡ|massage\b|máy massage|back massager|neck massager|foot massager|massage chair|ghế massage|massage ball|bóng massage|massage gun|súng massage|essential oil|tinh dầu|aromatherapy\b|diffuser\b|máy khuếch tán|humidifier\b|máy tạo ẩm|air purifier|máy lọc không khí|hepa filter|ion\b|ozone\b|uv sterilizer|máy diệt khuẩn|first aid|sơ cứu|bandage\b|băng gạc|gauze\b|adhesive tape|băng dính y tế|antiseptic\b|thuốc sát trùng|alcohol\b|cồn y tế|hydrogen peroxide|oxy già|iodine\b|povidone|betadine\b|cotton ball|bông y tế|cotton swab|tăm bông|medical mask|khẩu trang y tế|surgical mask|n95\b|kn95\b|ffp2\b|face shield|kính chống giọt bắn|glove\b|găng tay y tế|nitrile\b|latex\b|vinyl\b/i },

    // ── Thực Phẩm & Đồ Uống ──────────────────────────────────────────────────────────────────
    { name: '🍜 Thực Phẩm & Đồ Uống', re: /food\b|thực phẩm|đồ ăn|ăn uống|grocery\b|beverage\b|drink\b|nước uống|đồ uống|cà phê|cafe\b|coffee\b|espresso\b|cappuccino\b|latte\b|americano\b|mocha\b|macchiato\b|frappuccino\b|cold brew|iced coffee|instant coffee|cà phê hòa tan|cà phê rang xay|cà phê rang|ground coffee|coffee bean|hạt cà phê|arabica\b|robusta\b|trung nguyên|highlands coffee|nescafe\b|vinacafe\b|g7\b|kopiko\b|trà\b|tea\b|green tea|trà xanh|black tea|trà đen|oolong\b|white tea|trà trắng|herbal tea|trà thảo mộc|matcha\b|thai tea|trà thái|milk tea|trà sữa|bubble tea|trà sữa trân châu|iced tea|trà đá|jasmine tea|trà hoa nhài|earl grey|english breakfast|chamomile\b|peppermint tea|ginger tea|trà gừng|lemon tea|trà chanh|honey tea|trà mật ong|lipton\b|dilmah\b|twinings\b|celestial\b|tazo\b|bigelow\b|sữa\b|milk\b|sữa tươi|fresh milk|sữa tiệt trùng|uht milk|sữa bột|powder milk|sữa đặc|condensed milk|evaporated milk|sữa đậu nành|soy milk|sữa hạnh nhân|almond milk|sữa yến mạch|oat milk|sữa dừa|coconut milk|sữa gạo|rice milk|sữa hạt|nut milk|sữa chua|yogurt\b|greek yogurt|sữa chua uống|drinking yogurt|probiotics milk|lactose free|không lactose|organic milk|sữa hữu cơ|whole milk|skim milk|low fat milk|2\% milk|vinamilk\b|th true milk|dutch lady|meadow fresh|anchor\b|devondale\b|nước trái cây|fruit juice|orange juice|nước cam|apple juice|nước táo|grape juice|nước nho|cranberry\b|pomegranate\b|nước ép|fresh juice|smoothie\b|detox juice|nước dừa|coconut water|nước lọc|purified water|mineral water|nước khoáng|sparkling water|nước có gas|alkaline water|nước kiềm|distilled water|nước cất|la vie\b|aquafina\b|dasani\b|evian\b|perrier\b|san pellegrino|nước ngọt|soft drink|soda\b|carbonated drink|cola\b|coca cola|pepsi\b|7up\b|sprite\b|fanta\b|mirinda\b|dr pepper|mountain dew|root beer|ginger ale|tonic water|nước tăng lực|energy drink|red bull|monster\b|rockstar\b|burn\b|sting\b|warrior\b|revive\b|powerade\b|gatorade\b|isotonic\b|sports drink|bia\b|beer\b|lager\b|ale\b|pilsner\b|wheat beer|stout\b|ipa\b|craft beer|bia thủ công|heineken\b|tiger\b|saigon beer|333\b|hanoi beer|budweiser\b|corona\b|stella artois|beck's\b|carlsberg\b|asahi\b|sapporo\b|kirin\b|tsingtao\b|rượu\b|alcohol\b|wine\b|red wine|white wine|rose wine|champagne\b|sparkling wine|prosecco\b|sake\b|soju\b|vodka\b|whiskey\b|whisky\b|bourbon\b|scotch\b|gin\b|rum\b|tequila\b|cognac\b|brandy\b|liqueur\b|rượu vang|rượu trắng|rượu cần|rượu thuốc|rượu nếp|ruou can|thuoc bac|mì tôm|instant noodles|ramen\b|mi goi|mì gói|mì ly|cup noodles|pho bo|mi quang|bun bo hue|omachi\b|hao hao|kokomi\b|ajinomoto\b|nissin\b|maruchan\b|shin ramyun|nongshim\b|ottogi\b|bún khô|dried vermicelli|miến khô|dried glass noodles|phở khô|dried pho|bánh phở|pho noodles|cháo ăn liền|instant porridge|cơm ăn liền|instant rice|gạo\b|rice\b|jasmine rice|gạo thơm|sticky rice|gạo nếp|brown rice|gạo lứt|black rice|gạo đen|red rice|gạo đỏ|basmati\b|arborio\b|sushi rice|gạo sushi|st25\b|st24\b|fragrant rice|long grain|short grain|medium grain|bột mì|flour\b|wheat flour|all purpose flour|bread flour|cake flour|self rising|gluten free flour|bột gạo|rice flour|bột năng|tapioca flour|bột sắn|cassava flour|bột ngô|corn flour|cornstarch\b|bột bắp|potato starch|bột khoai|đường\b|sugar\b|white sugar|brown sugar|đường nâu|coconut sugar|đường dừa|palm sugar|đường thốt nốt|rock sugar|đường phèn|caster sugar|icing sugar|đường bột|maple syrup|honey\b|mật ong|agave\b|stevia\b|artificial sweetener|muối\b|salt\b|sea salt|muối biển|rock salt|muối hạt|table salt|muối ăn|himalayan salt|kosher salt|iodized salt|muối i ốt|dầu ăn|cooking oil|vegetable oil|sunflower oil|dầu hướng dương|canola oil|olive oil|dầu ô liu|coconut oil|dầu dừa|sesame oil|dầu mè|peanut oil|dầu đậu phộng|palm oil|dầu cọ|avocado oil|dầu bơ|grapeseed oil|corn oil|dầu ngô|soybean oil|dầu đậu nành|nước mắm|fish sauce\b|premium fish sauce|phú quốc|phan thiết|red boat|squid brand|three crabs|golden boy|tương ớt|chili sauce|sriracha\b|sambal oelek|hot sauce|tabasco\b|tương đen|soy sauce|dark soy sauce|light soy sauce|kikkoman\b|lee kum kee|maggi\b|kimlan\b|mắm\b|fermented fish|mắm tôm|shrimp paste|mắm ruốc|fermented shrimp|hạt nêm|seasoning powder|knorr\b|aji-no-moto\b|maggi cube|bouillon cube|bột ngọt|msg\b|monosodium glutamate|mì chính|flavor enhancer|nước tương|oyster sauce|hoisin sauce|black bean sauce|bean paste|miso\b|tahini\b|dấm\b|vinegar\b|white vinegar|rice vinegar|dấm gạo|apple cider vinegar|balsamic vinegar|dấm balsamic|malt vinegar|snack\b|chips\b|potato chips|corn chips|tortilla chips|pringles\b|lays\b|doritos\b|cheetos\b|crackers\b|biscuit\b|cookies\b|bánh quy|oreo\b|ritz\b|saltines\b|graham crackers|popcorn\b|bắp rang|pretzels\b|nuts\b|peanuts\b|đậu phộng|almonds\b|hạnh nhân|cashews\b|hạt điều|walnuts\b|hạt óc chó|pistachios\b|hazelnuts\b|brazil nuts|macadamia\b|hạt macca|pecans\b|pine nuts|sunflower seeds|hạt hướng dương|pumpkin seeds|hạt bí|chia seeds|hạt chia|flax seeds|hemp seeds|sesame seeds|hạt mè|mixed nuts|trail mix|bánh kẹo|candy\b|sweets\b|kẹo\b|hard candy|gummy bears|jelly beans|lollipop\b|chocolate\b|socola|dark chocolate|milk chocolate|white chocolate|cocoa\b|cacao\b|hershey\b|cadbury\b|lindt\b|godiva\b|ferrero\b|toblerone\b|kit kat|snickers\b|mars\b|twix\b|bounty\b|almond joy|mounds\b|reese\b|milky way|3 musketeers|bánh kem|cake\b|cupcake\b|muffin\b|donut\b|danish\b|croissant\b|bread\b|bánh mì\b|baguette\b|whole wheat|white bread|rye bread|sourdough\b|pita\b|naan\b|tortilla\b|bagel\b|english muffin|dinner roll|bánh tráng|rice paper|spring roll wrapper|wonton wrapper|bánh ngọt|pastry\b|pie\b|tart\b|éclair\b|profiterole\b|macaron\b|tiramisu\b|cheesecake\b|ice cream|kem\b|gelato\b|sorbet\b|frozen yogurt|popsicle\b|ben jerry|häagen dazs|baskin robbins|dairy queen|wall's\b|magnolia\b|chè\b|vietnamese dessert|tapioca pearls|trân châu|coconut jelly|thạch dừa|grass jelly|thạch sương sáo|red bean|đậu đỏ|mung bean|đậu xanh|taro\b|khoai môn|jackfruit\b|mít\b|durian\b|sầu riêng|mango\b|xoài\b|lychee\b|vải\b|longan\b|nhãn\b|rambutan\b|chôm chôm|dragon fruit|thanh long|passion fruit|chanh dây|star fruit|khế\b|guava\b|ổi\b|papaya\b|đu đủ|coconut\b|dừa\b|banana\b|chuối\b|pineapple\b|dứa\b|khóm\b|orange\b|cam\b|grapefruit\b|bưởi\b|lemon\b|chanh\b|lime\b|chanh tây|apple\b|táo\b|pear\b|lê\b|grape\b|nho\b|strawberry\b|dâu tây|blueberry\b|raspberry\b|blackberry\b|cranberry\b|cherry\b|anh đào|peach\b|đào\b|plum\b|mận\b|apricot\b|kiwi\b|avocado\b|bơ\b|watermelon\b|dưa hấu|cantaloupe\b|honeydew\b|dried fruit|trái cây sấy|mít sấy|dried jackfruit|xoài sấy|dried mango|chuối sấy|banana chips|dâu tây sấy|dried strawberry|nho khô|raisins\b|dates\b|chà là|figs\b|sung\b|apricots\b|prunes\b|khô bò|beef jerky|thịt khô|dried meat|mực khô|dried squid|tôm khô|dried shrimp|cá khô|dried fish|rong biển|seaweed\b|nori\b|kelp\b|wakame\b|kombu\b|organic\b|hữu cơ|natural\b|tự nhiên|non gmo|gluten free|không gluten|vegan\b|vegetarian\b|halal\b|kosher\b|yến sào|bird nest|tổ yến|edible bird nest|đông trùng hạ thảo|cordyceps\b|nhân sâm|ginseng\b|red ginseng|korean ginseng|american ginseng|panax ginseng|nấm linh chi|reishi mushroom|lingzhi\b|shiitake\b|maitake\b|lion's mane|chaga\b|turkey tail|cordyceps mushroom|goji berry|kỷ tử|acai berry|superfood\b|antioxidant\b|omega 3|spirulina\b|chlorella\b|moringa\b|turmeric\b|nghệ\b|ginger\b|gừng\b|garlic\b|tỏi\b|onion\b|hành\b|herbs\b|thảo mộc|spices\b|gia vị|cinnamon\b|quế\b|cardamom\b|thảo quả|star anise|hồi\b|clove\b|đinh hương|nutmeg\b|nhục đậu khấu|black pepper|tiêu đen|white pepper|tiêu trắng|paprika\b|cumin\b|coriander\b|ngò\b|cilantro\b|basil\b|húng quế|mint\b|bạc hà|lemongrass\b|sả\b|galangal\b|riềng\b|curry powder|bột cà ri|chili powder|bột ớt|garlic powder|bột tỏi|onion powder|bột hành|seasoning mix|gia vị pha sẵn|five spice|ngũ vị hương|chinese cooking wine|shaoxing\b|mirin\b|cooking sake|rice wine|rượu nấu ăn|vanilla\b|vani\b|almond extract|coconut extract|food coloring|màu thực phẩm|baking powder|bột nở|baking soda|soda\b|yeast\b|men\b|gellan\b|agar\b|thạch\b|cornstarch\b|bột bắp|tapioca starch|bột năng/i },

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
