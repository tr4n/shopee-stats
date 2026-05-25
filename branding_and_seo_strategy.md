# Chiến lược Đặt Tên & Tối Ưu Tìm Kiếm (SEO/ASO) cho Chrome Extension Shopee Stats

Tài liệu này đề xuất các phương án đặt tên hấp dẫn nhằm tăng tỷ lệ nhấp chuột (CTR), tối ưu hóa từ khóa tìm kiếm trên Chrome Web Store (CWS) và định hình nội dung mô tả sản phẩm để tối đa hóa lượt tải về, đồng thời giải quyết các mối e ngại của người dùng về bảo mật.

---

## 1. Nghiên cứu Từ Khóa & Hành Vi Tìm Kiếm (Vietnamese Market)

Khi người dùng Việt Nam có nhu cầu kiểm tra số tiền đã chi tiêu trên Shopee, họ thường tìm kiếm các cụm từ sau trên Google và thanh tìm kiếm Chrome Web Store:

*   **Nhóm từ khóa có lượng tìm kiếm cao nhất (Primary Keywords):**
    *   `thống kê chi tiêu shopee` / `thong ke chi tieu shopee`
    *   `tính tổng tiền shopee` / `tinh tong tien shopee`
    *   `kiểm tra chi tiêu shopee` / `kiem tra chi tieu shopee`
*   **Nhóm từ khóa xu hướng & tính năng (Secondary & Trendy Keywords):**
    *   `shopee wrapped` / `shopee year in review` (Thịnh hành vào cuối năm hoặc dịp mua sắm lớn)
    *   `shopee analytics` / `shopee stats` (Người dùng chuyên nghiệp hoặc người bán/người mua sắm nhiều)
    *   `lịch sử mua sắm shopee` / `quản lý chi tiêu`
*   **Nhóm từ khóa về thuộc tính tin cậy (Trust Keywords):**
    *   `an toàn`, `bảo mật`, `không lộ thông tin` (Rất quan trọng vì người dùng cực kỳ lo sợ mất tài khoản Shopee).

> [!IMPORTANT]
> **Điểm mấu chốt cạnh tranh:** Nhiều người dùng hiện tại đang sử dụng các đoạn code JavaScript dán trực tiếp vào Console (F12) để xem chi tiêu. Phương pháp này tiềm ẩn nguy cơ bảo mật cực lớn (XSS, mất tài khoản). Extension của chúng ta chạy **100% local** và **không gửi dữ liệu đi đâu**, đây là điểm bán hàng độc nhất (USP) cần làm nổi bật trong tên và mô tả.

---

## 2. Các Phương Án Đặt Tên Đề Xuất (Tối đa 45 Ký tự)

Dưới đây là 3 hướng đặt tên tương ứng với các chiến lược tiếp cận khác nhau:

### Phương án A: Tối ưu SEO tối đa (Keyword-First)
*Tập trung hiển thị đầu tiên khi người dùng tìm kiếm từ khóa chính. Hướng đi thực dụng và mang lại lượt tải tự nhiên cao nhất.*

1.  **`Thống Kê Chi Tiêu Shopee - Shopee Analytics`** (43 ký tự)
    *   *Ưu điểm:* Chứa cả từ khóa tiếng Việt có volume lớn nhất và tên thương hiệu gốc của bạn.
2.  **`Tính Tổng Tiền Shopee - Thống Kê Chi Tiêu`** (41 ký tự)
    *   *Ưu điểm:* Giải quyết trực tiếp câu hỏi "Tôi đã tiêu bao nhiêu tiền trên Shopee?".
3.  **`Kiểm Tra Chi Tiêu Shopee - Shopee Analytics`** (43 ký tự)
    *   *Ưu điểm:* Cực kỳ tự nhiên, đánh trúng hành vi tìm kiếm tức thời của người dùng.

### Phương án B: Tập trung vào tính năng & Xu hướng (Feature & Trend Focused)
*Thu hút thế hệ trẻ, tạo sự tò mò và dễ dàng lan truyền (viral) trên các nền tảng mạng xã hội như TikTok, Facebook.*

1.  **`Shopee Wrapped - Thống Kê Chi Tiêu Shopee`** (41 ký tự)
    *   *Ưu điểm:* Ăn theo trend "Wrapped" (giống Spotify). Rất dễ thu hút người dùng tải về để chụp ảnh share mạng xã hội.
2.  **`Shopee Analytics Pro: Thống Kê Chi Tiêu AI`** (43 ký tự)
    *   *Ưu điểm:* Nhấn mạnh yếu tố công nghệ "AI" (Chrome Built-in AI) và độ chuyên nghiệp.

### Phương án C: Bảo mật & Uy tín (Trust-Oriented)
*Nhấn mạnh sự an toàn tuyệt đối so với các phương pháp Console Script trôi nổi.*

1.  **`Thống Kê Chi Tiêu Shopee An Toàn 100%`** (36 ký tự)
    *   *Ưu điểm:* Xóa bỏ rào cản tâm lý sợ mất tài khoản của người dùng ngay từ cái nhìn đầu tiên.

---

## 3. Tối ưu hóa Metadata trong `manifest.json`

Chúng ta nên cập nhật các thuộc tính trong file [manifest.json](file:///Users/harry/Documents/projects/shopee-stats/extension/manifest.json) để tối ưu hóa SEO.

### Đề xuất cấu trúc mới:
```json
{
  "manifest_version": 3,
  "name": "Thống Kê Chi Tiêu Shopee - Shopee Analytics",
  "short_name": "Shopee Stats",
  "version": "2.2.4",
  "description": "Tính tổng tiền và thống kê chi tiết chi tiêu Shopee theo tháng/năm. Tích hợp AI phân loại thông minh, bảo mật 100% offline.",
  ...
}
```

*   **`name` (Tối đa 45 ký tự):** Thay vì `"Shopee Analytics Pro - Thống Kê Chi Tiêu"` (46 ký tự - bị quá giới hạn hiển thị tốt trên store), ta đổi thành `"Thống Kê Chi Tiêu Shopee - Shopee Analytics"` (43 ký tự) để đẩy từ khóa có lượt tìm kiếm cao nhất lên đầu.
*   **`short_name` (Tối đa 12 ký tự):** Rút ngắn từ `"Shopee Analytics"` (16 ký tự) xuống `"Shopee Stats"` (12 ký tự) để tránh bị cắt cụt trên thanh công cụ của trình duyệt Chrome.
*   **`description` (Tối đa 132 ký tự):** Viết lại để tích hợp từ khóa: *tổng tiền*, *thống kê*, *chi tiêu Shopee*, *AI*, *bảo mật*.
    *   *Bản cũ:* `"Tiện ích phân tích và thống kê chi tiết số tiền bạn đã mua sắm trên Shopee theo từng tháng và năm. Trải nghiệm ngay!"` (116 ký tự).
    *   *Bản mới (122 ký tự):* `"Tính tổng tiền và thống kê chi tiết chi tiêu Shopee theo tháng/năm. Tích hợp AI phân loại thông minh, bảo mật 100% offline."`

---

## 4. Bản Mô Tả Chi Tiết trên Cửa Hàng (Long Store Description)
*Đây là văn bản hiển thị trên trang chi tiết sản phẩm của Chrome Web Store (Tối đa 16.000 ký tự). Đoạn mô tả này cần được tối ưu để Google Index tìm kiếm tốt.*

```markdown
🔍 BẠN ĐÃ TIÊU BAO NHIÊU TIỀN TRÊN SHOPEE?

Có bao giờ bạn giật mình khi nhìn lại số tiền mua sắm trên Shopee mỗi tháng? Bạn muốn kiểm soát tài chính cá nhân tốt hơn nhưng không biết bắt đầu từ đâu?

"Thống Kê Chi Tiêu Shopee - Shopee Analytics" là công cụ hoàn hảo giúp bạn biến toàn bộ lịch sử mua sắm Shopee thành những biểu đồ phân tích tài chính cực kỳ trực quan, sinh động và hoàn toàn bảo mật.

--------------------------------------------------

🌟 CÁC TÍNH NĂNG NỔI BẬT

1. 📊 THỐNG KÊ TỔNG QUAN CHÍNH XÁC:
- Biết ngay tổng số tiền bạn đã chi tiêu từ trước đến nay trên Shopee.
- Thống kê tổng số đơn hàng đã đặt, số lượng sản phẩm và số tiền tiết kiệm được nhờ áp mã giảm giá.

2. 📈 PHÂN TÍCH THEO CHU KỲ (THÁNG/NĂM):
- Biểu đồ cột trực quan giúp bạn so sánh chi tiêu giữa các tháng hoặc các năm.
- Nhận diện các tháng cao điểm mua sắm để kịp thời điều chỉnh ngân sách.

3. 🏷️ TỰ ĐỘNG PHÂN LOẠI DANH MỤC BẰNG AI:
- Áp dụng công nghệ AI nội bộ (Chrome Built-in AI) tự động nhận diện và gom các đơn hàng vào 5 nhóm chính: Công nghệ, Thể thao, Nhà cửa, Thời trang, Khác.
- Biểu đồ hình quạt giúp bạn thấu hiểu thói quen tiêu dùng cá nhân.

4. 🏆 TOP SẢN PHẨM "NGỐN TIỀN" NHẤT:
- Danh sách những món đồ bạn đã mua nhiều nhất hoặc tốn nhiều hầu bao nhất.
- AI hỗ trợ lọc sạch các từ khóa quảng cáo rác từ tiêu đề sản phẩm giúp thông tin rõ ràng, mạch lạc.

5. ✨ SHOPEE WRAPPED - CHIA SẺ PHONG CÁCH:
- Tạo ngay ảnh thẻ tóm tắt chi tiêu trong năm cực đẹp mắt (tương tự Spotify Wrapped).
- Dễ dàng tải về để chia sẻ lên Facebook, TikTok hay Instagram để "khoe" hoặc bàn luận cùng bạn bè.

--------------------------------------------------

🛡️ AN TOÀN & BẢO MẬT TUYỆT ĐỐI (100% LOCAL & OFFLINE)

- CẢNH BÁO: Hiện nay có nhiều đoạn mã code F12 (Console Script) trôi nổi trên mạng được giới thiệu để tính tổng tiền Shopee. Việc sao chép và dán các đoạn mã này cực kỳ nguy hiểm, có thể dẫn đến việc tài khoản của bạn bị chiếm đoạt hoặc rò rỉ thông tin cá nhân.
- AN TOÀN VỚI SHOPEE ANALYTICS: Tiện ích của chúng tôi chạy cục bộ 100% trên trình duyệt của bạn. Tất cả dữ liệu hóa đơn, lịch sử mua sắm và thậm chí cả AI phân tích đều hoạt động OFFLINE (thông qua Chrome Built-in AI/Gemini Nano). Không một byte dữ liệu nào được gửi đến bất kỳ máy chủ bên ngoài nào. Bạn hoàn toàn có thể yên tâm sử dụng!

--------------------------------------------------

🚀 HƯỚNG DẪN SỬ DỤNG NHANH

1. Nhấn nút "Thêm vào Chrome" để cài đặt tiện ích.
2. Truy cập trang web Shopee.vn và đăng nhập tài khoản của bạn.
3. Nhấp vào biểu tượng Tiện ích Shopee Analytics trên thanh công cụ trình duyệt.
4. Nhấn nút "Bắt đầu phân tích" và đợi trong giây lát để hệ thống tổng hợp báo cáo trực quan cho bạn.

Hãy cài đặt ngay hôm nay để trở thành người tiêu dùng thông thái và làm chủ tài chính cá nhân của mình!
```

---

## 5. Chiến Lược Tăng Trưởng (ASO Growth Hacks)

Để tăng lượt tải tự nhiên nhanh chóng trên Chrome Web Store:

1.  **Thiết Kế Hình Ảnh Chụp Màn Hình (Screenshots) Bắt Mắt:**
    *   Không chụp toàn màn hình một cách đơn điệu. Hãy thiết kế hình ảnh dạng slide giới thiệu có ghi chú bằng chữ lớn (Ví dụ: Slide 1: *"Tổng chi tiêu Shopee trong 1 giây"*, Slide 2: *"Phân loại danh mục bằng AI"*).
    *   Tập trung vào biểu đồ tròn và wrapped card chia sẻ vì đó là những giao diện bắt mắt nhất.
2.  **Tạo Điểm Chạm Đánh Giá (Review Prompt):**
    *   Khi người dùng chạy xong tính năng thống kê và thấy biểu đồ đẹp mắt, hãy hiển thị một popup nhỏ/nút bấm tinh tế: *"Tiện ích này có ích với bạn? Hãy tặng 5 sao trên Chrome Store để ủng hộ tác giả nhé!"*. Đánh giá 5 sao là yếu tố xếp hạng tìm kiếm hàng đầu của Chrome Web Store.
3.  **Tận dụng Xu Hướng Chia Sẻ Mạng Xã Hội:**
    *   Ở màn hình Wrapped, khuyến khích người dùng chụp ảnh và đăng kèm hashtag `#ShopeeWrapped #ShopeeAnalytics`. Bạn có thể tham gia vào các nhóm Facebook về mua sắm Shopee, tài chính cá nhân để chia sẻ tiện ích này như một giải pháp thay thế an toàn cho Console Script.
