/* ─────────────────────────────────────────────────
   AI narrative — Chrome 148+ web LanguageModel
   Depends on helpers.js, cache.js.
───────────────────────────────────────────────── */

// Global error handler to catch handleEvent and other issues
window.addEventListener('error', function(e) {
  if (e.message && e.message.includes('handleEvent')) {
    console.warn('Caught handleEvent error, likely from external library:', e);
    return true; // Prevent default error handling
  }
});

window.addEventListener('unhandledrejection', function(e) {
  console.warn('Unhandled promise rejection:', e.reason);
});

const AI_INSIGHT_SYSTEM = [
  'Bạn là một chuyên gia tâm lý tiêu dùng dùng phong cách bói toán làm ẩn dụ vui vẻ.',
  'Bạn nhận được hồ sơ tính cách người dùng ĐÃ ĐƯỢC PHÂN TÍCH SẴN (kiểu người, đặc điểm hành vi cụ thể).',
  'Nhiệm vụ: Viết 1-2 câu nhận xét tâm lý có chiều sâu, dí dỏm, phản ánh bản chất cảm xúc và động lực mua sắm thực sự đằng sau hành vi đó.',
  'QUY TẮC BẮT BUỘC:',
  '1. Câu đầu: nhận xét tâm lý thực chất về kiểu người này — cảm xúc ẩn sau hành vi mua sắm là gì, họ đang tìm kiếm điều gì.',
  '2. Câu sau (nếu có): thêm gia vị hài hước nhẹ nhàng kiểu bói toán — không bắt buộc nhưng nên có.',
  '3. TUYỆT ĐỐI KHÔNG liệt kê lại các đặc điểm đã có trong hồ sơ. Hãy diễn giải sáng tạo ở tầng sâu hơn.',
  '4. TUYỆT ĐỐI KHÔNG ghi số tiền, số đơn hàng, phần trăm, hay tên sản phẩm.',
  '5. TUYỆT ĐỐI KHÔNG dùng tiếng Anh. Viết 100% tiếng Việt thuần.',
  '6. Độ dài: đúng 1-2 câu, không dài hơn.'
].join(' ');

// Rule-based psychological shopping insights - no AI dependency
const SHOPPING_PSYCHOLOGY_PATTERNS = {
  // Pattern: Category dominance + timing behavior → personality insights
  fashionLateNight: {
    triggers: ['fashion_dominant', 'late_night_shopping'],
    insights: [
      'Quẻ bói chỉ ra bạn đang chịu ảnh hưởng của tâm lý muốn mua sắm quần áo lúc nửa đêm để tự an ủi tâm hồn sau ngày dài căng thẳng. Bạn liên tục tự thuyết phục bản thân rằng mua sắm để đổi mới hình ảnh, nhưng thực chất chỉ đang tìm kiếm niềm vui ngắn hạn lúc đêm khuya. Tinh tú mách bảo hãy tắt điện thoại trước mười giờ tối nếu không muốn ví tiền liên tục rơi vào trạng thái cần được giải cứu.',
      'Tinh tú chiếu mệnh cho thấy bạn dùng thời trang làm liệu pháp cân bằng cảm xúc sau những giờ làm việc mệt mỏi. Mỗi lần chốt đơn lúc khuya là một lần bạn tự thưởng cho mình một bộ trang phục mới, nhưng thực tế đống quần áo chưa mặc ngày càng nhiều lên trong tủ. Hãy cân nhắc xem bạn đang thực sự chăm sóc bản thân hay chỉ đang mua sắm trong vô thức khi lý trí ngủ quên.'
    ]
  },
  
  techUpgrade: {
    triggers: ['tech_dominant', 'high_avg_value'],
    insights: [
      'Vũ trụ nhìn thấu bạn dễ rơi vào ảo giác nâng cấp thiết bị để tối ưu hóa công việc mỗi khi nhìn thấy các sản phẩm công nghệ mới. Đây thực chất là một liệu pháp tiêu dùng để tạm thời trốn tránh những áp lực công việc hàng ngày. Tuy nhiên, năng suất làm việc thực tế không tăng lên tương ứng với số tiền bạn đã bỏ ra cho các đơn hàng đó.',
      'Tinh tú chỉ điểm bạn luôn tin tưởng rằng một thiết bị công nghệ hiện đại hơn sẽ giúp giải quyết sự trì hoãn trong công việc của mình. Thực tế là bạn chỉ đang tìm cách thỏa mãn cảm giác bất an về hiệu quả công việc bằng việc sở hữu những món đồ công nghệ đắt tiền. Ngân sách dành cho công nghệ của bạn đang quá tải, trong khi thứ cần nâng cấp thực sự là khả năng tập trung.'
    ]
  },

  beautyTherapy: {
    triggers: ['beauty_dominant', 'frequent_small_orders'],
    insights: [
      'Quẻ bói đọc vị bạn đang sử dụng mỹ phẩm như một liệu pháp phục hồi cảm xúc sau những ngày làm việc kiệt sức. Mỗi món đồ chăm sóc da hay làm đẹp nhỏ là một nỗ lực để tự thuyết phục rằng mình đang được yêu thương và chăm sóc tốt. Chỉ tiếc là trong khi làn da của bạn có thể đang rạng rỡ thì số dư tài khoản lại đang hao hụt nhanh chóng.',
      'Chòm sao hộ mệnh cho thấy bạn có thói quen chốt các đơn hàng làm đẹp nhỏ lẻ liên tục để duy trì cảm giác vui vẻ ngắn hạn. Bạn tự bào chữa rằng đây là khoản đầu tư cho nhan sắc khó có thể tiết kiệm, nhưng tổng số tiền từ những đơn nhỏ này cộng lại đang tạo ra một khoản thâm hụt đáng kể. Hãy học cách phân biệt giữa nhu cầu chăm sóc da thực tế và ham muốn mua sắm để giảm bớt căng thẳng.'
    ]
  },

  bargainHunter: {
    triggers: ['high_savings_rate', 'sale_focused'],
    insights: [
      'Bạn tự hào là người săn lùng ưu đãi thực thụ nhưng thực chất đang chịu ảnh hưởng tâm lý từ các chiến dịch giảm giá của sàn thương mại. Hội chứng sợ bỏ lỡ cơ hội tốt đã khiến bạn tích trữ nhiều món đồ ít khi dùng tới chỉ vì cảm giác mua được giá rẻ. Thần tài chỉ biết bất lực nhìn dòng tiền của bạn giảm dần qua từng mã miễn phí vận chuyển.',
      'Tinh tú chỉ điểm bạn đã vô tình trở thành người theo đuổi các chương trình khuyến mãi đầu và giữa tháng. Mỗi lần áp dụng thành công mã giảm giá sâu, bạn lại có cảm giác chiến thắng đầy phấn khích. Nhưng hãy nhớ rằng bạn chỉ thực sự tiết kiệm khi không mua những thứ mình không cần, thay vì tích trữ đống đồ giảm giá đang bám đầy bụi.'
    ]
  },

  impulseBuyer: {
    triggers: ['high_frequency', 'diverse_categories', 'low_planning'],
    insights: [
      'Khổ chủ đang có thói quen chốt đơn vô thức để xoa dịu những căng thẳng và lo âu tức thời trong cuộc sống hàng ngày. Sự tiện lợi của việc mua sắm trực tuyến khiến bạn dễ dàng đầu hàng trước những ham muốn nhất thời mà không hề có kế hoạch chi tiêu từ trước. Mỗi đơn hàng mang lại sự thỏa mãn ngắn hạn, nhưng cảm giác đó lại trôi đi rất nhanh ngay khi người giao hàng gõ cửa.',
      'Vũ trụ nhìn thấu bạn sử dụng việc chốt đơn như một cách giảm bớt áp lực tinh thần tức thời mỗi khi gặp khó khăn. Bạn mua sắm trải rộng từ đồ gia dụng, quần áo đến đồ ăn vặt mà không tập trung vào nhu cầu thực tế nào. Sự thiếu nhất quán này đang làm dòng tiền của bạn bị phân tán, hãy thiết lập quy tắc trì hoãn mua sắm vài ngày trước khi thanh toán giỏ hàng.'
    ]
  },

  foodComfort: {
    triggers: ['food_dominant', 'comfort_spending'],
    insights: [
      'Chòm sao hộ mệnh chỉ ra bạn là kiểu người dùng món ăn để vỗ về những áp lực cảm xúc và tìm kiếm sự ấm áp. Bạn dễ dàng tự thuyết phục bản thân rằng ăn ngon là cách tốt nhất để bù đắp năng lượng làm việc. Hệ quả là bạn có những khoảnh khắc hạnh phúc cùng ẩm thực nhưng ví tiền thì lại rơi vào tình trạng hao hụt nghiêm trọng.',
      'Tinh tú chiếu rọi cho thấy bạn có xu hướng chi tiêu thoải mái cho đồ ăn vặt và ẩm thực như một phần thưởng tự trao sau giờ làm việc. Đây là cách giải tỏa căng thẳng tự nhiên giúp bạn lấy lại tinh thần nhanh nhất. Tuy nhiên, việc đặt đồ ăn liên tục trên sàn trực tuyến đang làm giảm đáng kể khoản tiết kiệm dài hạn của bạn.'
    ]
  },

  homeMaker: {
    triggers: ['home_dominant', 'consistent_spending'],
    insights: [
      'Quẻ bói tiết lộ bạn đang sử dụng việc trang trí và nâng cấp không gian sống như một cách tìm kiếm sự bình yên trong tâm hồn. Bạn muốn tự tay chuẩn bị và kiểm soát mọi chi tiết nhỏ trong ngôi nhà của mình để tránh xa những biến động bên ngoài. Một không gian sống xinh đẹp là điều tuyệt vời, nhưng đừng để nó trở thành lý do để chi tiêu vượt quá giới hạn cho phép.',
      'Vũ trụ nhìn thấu bạn tin tưởng rằng một căn phòng hoàn hảo với đầy đủ các món đồ trang trí tinh tế sẽ mang lại niềm vui lâu dài. Nhưng thực chất, sự thỏa mãn khi sở hữu đồ gia dụng mới chỉ kéo dài vài ngày trước khi bạn tiếp tục tìm kiếm món đồ tiếp theo. Hãy học cách hài lòng với những gì đang có để giữ cho dòng tiền cá nhân luôn ở trạng thái an toàn.'
    ]
  },

  lifestyleSplurge: {
    triggers: ['high_avg_value', 'high_frequency'],
    insights: [
      'Quẻ bói chỉ ra bạn đang sống theo phong cách của một người chi tiêu phóng khoáng trên sàn thương mại với số lượng đơn nhiều và giá trị lớn. Bạn tin rằng cuộc sống cần được tận hưởng tối đa và luôn chọn phiên bản tốt nhất cho mọi thứ. Tinh tú khuyên bạn nên bắt đầu theo dõi dòng tiền nghiêm túc trước khi những khoản chi tiêu này ảnh hưởng đến kế hoạch tương lai.',
      'Tinh tú chiếu mệnh cho thấy bạn là người mua sắm chú trọng chất lượng sản phẩm, sẵn sàng chi tiêu mạnh tay một cách thường xuyên. Đây là thói quen của người có thu nhập ổn định hoặc đang yêu chiều bản thân quá mức bằng vật chất cao cấp. Hãy cẩn thận vì cảm giác tiêu dùng thoải mái này rất dễ gây nghiện và làm giảm khả năng kiểm soát tài chính khi cần thiết.'
    ]
  },

  budgetSaver: {
    triggers: ['high_savings_rate', 'frequent_small_orders'],
    insights: [
      'Quẻ bói đọc vị bạn là một người cực kỳ thực tế và chi tiết trong việc quản lý ngân sách cá nhân. Bạn chia nhỏ các đơn hàng và luôn tìm mọi cách để giảm chi phí xuống mức thấp nhất thông qua việc tích lũy điểm thưởng và mã giảm giá. Đây là một thói quen tốt, nhưng hãy cẩn thận đừng để việc so đo chi phí vận chuyển làm tốn quá nhiều thời gian quý báu của bạn.',
      'Vũ trụ nhìn thấu bạn luôn có cảm giác tự hào khi mua được những món đồ nhỏ với giá rẻ. Việc này giúp bạn kiểm soát ngân sách tốt nhưng đôi khi lại dẫn đến việc mua quá nhiều món đồ lặt vặt chất lượng thấp. Hãy nhớ rằng việc mua một sản phẩm chất lượng dùng lâu dài đôi khi sẽ tiết kiệm hơn việc mua nhiều món đồ rẻ tiền nhanh hỏng.'
    ]
  }
};

const ARCHETYPE_PSYCHOLOGY_PATTERNS = {
  reformed: [
    'Quẻ bói chúc mừng bạn đã bước qua giai đoạn vung tay quá trán và đang hướng tới lối sống tiết kiệm, kỷ luật hơn. Những tinh tú nhận thấy sự nỗ lực kiềm chế ham muốn mua sắm tức thời để đổi lấy sự bình yên lâu dài cho ví tiền. Hãy tiếp tục giữ vững tinh thần thép này trước những đợt bão giảm giá sắp tới của vũ trụ.',
    'Tinh tú chiếu mệnh cho thấy bạn đang trải qua một cuộc cách mạng tư duy tài chính đầy tích cực. Việc chủ động giảm tần suất chốt đơn là minh chứng rõ rệt cho thấy lý trí đã giành lại quyền kiểm soát từ tay cảm xúc nhất thời. Đây là hành trình tự rèn luyện đầy gian truân nhưng quả ngọt mang lại chính là một tương lai tài chính vững vàng.',
    'Vũ trụ nhìn thấy sự chuyển mình rõ rệt trong thói quen chi tiêu của bạn thời gian gần đây. Bạn đã bắt đầu biết nói lời từ chối với những món đồ lấp lánh nhưng ít giá trị sử dụng thực tế để ưu tiên cho những mục tiêu dài hạn. Hãy tự hào vì bạn đang làm chủ cuộc chơi tiêu dùng chứ không còn bị các thuật toán mua sắm điều khiển.'
  ],
  night_owl: [
    'Quẻ bói chỉ ra màn hình điện thoại tối và giỏ hàng lúc nửa đêm là nơi trú ẩn tinh thần của bạn sau một ngày dài kiệt sức. Bạn không hẳn cần món đồ đó, mà chỉ thèm khát cảm giác được chiều chuộng bản thân khi cả thế giới đã ngủ say. Tinh tú mách bảo hãy tắt kết nối mạng trước mười giờ tối nếu không muốn tài khoản liên tục rơi vào trạng thái báo động.',
    'Chòm sao hộ mệnh tiết lộ rằng lý trí của bạn thường đi ngủ sớm hơn ngón tay chốt đơn vài tiếng đồng hồ. Những đơn hàng đặt lúc hai giờ sáng thực chất là tiếng cầu cứu của một tinh thần đang mệt mỏi cần được xoa dịu bằng niềm vui sở hữu đồ mới. Hãy cẩn thận kẻo niềm vui ngắn hạn lúc nửa đêm lại biến thành sự hối hận vào sáng hôm sau khi người giao hàng gõ cửa.',
    'Vũ trụ nhìn thấu bạn là người chuyên canh giờ hoàng đạo lúc nửa đêm để tìm kiếm sự bình yên trong tâm hồn qua việc mua sắm. Sự yên tĩnh của bóng tối khiến bạn dễ dàng đầu hàng trước những lời quảng cáo hấp dẫn hơn bao giờ hết. Lời khuyên từ tinh tú là hãy để điện thoại tránh xa tầm tay trước khi chìm vào giấc ngủ.'
  ],
  fashion_healer: [
    'Tinh tú chỉ ra bạn đang dùng quần áo và phụ kiện thời trang làm tấm lá chắn bảo vệ cảm xúc trước những áp lực bên ngoài. Mỗi bộ cánh mới được chốt đơn là một nỗ lực khoác lên mình một diện mạo tự tin và rạng rỡ hơn. Tuy nhiên, đống quần áo chưa cắt mác trong tủ đang âm thầm nhắc nhở rằng niềm vui thực sự không nằm ở việc sở hữu nhiều vải vóc.',
    'Quẻ bói đọc vị bạn xem việc mua sắm quần áo như một liệu pháp giải tỏa căng thẳng và tự thưởng cho bản thân sau những mệt mỏi. Bạn thường mơ mộng về những dịp đặc biệt để diện chúng, nhưng thực tế đống đồ mới vẫn nằm im lìm trong góc tủ. Hãy học cách yêu thương bản thân bằng những trải nghiệm tinh thần ý nghĩa thay vì tích trữ vật chất bên ngoài.',
    'Vũ trụ nhìn thấu gu thẩm mỹ tinh tế nhưng cũng đầy biến động cảm xúc của bạn qua từng đơn hàng thời trang. Việc thay đổi phong cách liên tục phản ánh hành trình tìm kiếm bản thân và định vị giá trị của chính bạn. Tinh tú khuyên bạn hãy tập trung vào những món đồ thực sự cơ bản và đa dụng trước khi chạy theo các xu hướng mới.'
  ],
  bargain_hunter: [
    'Quẻ bói đọc vị bạn là một người cực kỳ nhạy bén với các cơ hội giảm giá nhưng lại dễ rơi vào bẫy tâm lý mua vì rẻ chứ không vì cần. Hội chứng sợ bỏ lỡ cơ hội tốt khiến bạn tích trữ hàng tá thứ chỉ để thỏa mãn cảm giác chiến thắng thuật toán của sàn thương mại. Thần tài khuyên bạn nên nhớ rằng việc không mua gì mới là cách tiết kiệm trọn vẹn nhất.',
    'Tinh tú chiếu mệnh cho thấy bạn coi việc tìm kiếm mã giảm giá và quà tặng đi kèm như một trò chơi trí tuệ đầy phẩn khích. Mỗi lần chốt đơn thành công với giá hời là một lần bạn ngập tràn cảm giác tự hào và thỏa mãn. Thế nhưng, đống đồ giảm giá đang bám đầy bụi trong nhà đang phản ánh một thực tế chi tiêu chưa thực sự hiệu quả.',
    'Vũ trụ nhận thấy bạn là một người có khả năng tính toán vô cùng thông minh để tối ưu hóa chi phí nhờ các chương trình khuyến mãi. Bạn có khả năng áp dụng các loại ưu đãi cực kỳ nhanh chóng, nhưng đôi khi sự tập trung quá mức vào phần trăm giảm giá khiến bạn quên mất chất lượng thực tế. Hãy tỉnh táo để không trở thành người mua những món đồ không cần thiết chỉ vì chúng đang rẻ.'
  ],
  emotional: [
    'Quẻ bói tiết lộ giỏ hàng trực tuyến chính là cuốn nhật ký ghi lại những thăng trầm cảm xúc chân thực nhất của bạn. Khi vui bạn mua để ăn mừng, khi buồn bạn chốt đơn để giải sầu, và khi căng thẳng thì nút mua ngay trở thành phao cứu sinh. Tinh tú nhắc nhở rằng tiền có thể mua được sự thỏa mãn nhất thời, nhưng không thể chữa lành tận gốc những bất ổn bên trong.',
    'Chòm sao hộ mệnh nhận thấy dòng tiền của bạn biến động dữ dội theo nhịp sinh học của tâm trạng mỗi tháng. Bạn dễ dàng rơi vào trạng thái mua sắm cuồng nhiệt không kiểm soát khi cảm xúc lấn át lý trí, để rồi sau đó lại trải qua giai đoạn tiếc nuối và tự trách mình. Hãy tập thói quen để đồ trong giỏ hàng vài ngày trước khi thực hiện thanh toán.',
    'Vũ trụ nhìn thấu bạn là một người sống bản năng và để cảm xúc dẫn lối trong mọi quyết định mua sắm. Việc chốt đơn ngẫu hứng mang lại cho bạn cảm giác tự do và phấn khích tạm thời nhưng cũng tạo ra những áp lực tài chính không đáng có. Hãy tìm kiếm những cách giải tỏa tinh thần lành mạnh hơn để bảo vệ sự cân bằng cho ví tiền của mình.'
  ],
  premium_curator: [
    'Quẻ bói tôn vinh gu thẩm mỹ cao cấp và tư duy mua sắm chú trọng chất lượng hơn số lượng của bạn. Bạn hiểu rõ giá trị của bản thân và từ chối thỏa hiệp với những sản phẩm giá rẻ kém bền để đầu tư vào những giá trị lâu dài. Tinh tú chỉ khuyên bạn nên cân đối ngân sách để phong cách sống đẳng cấp không làm ảnh hưởng đến nguồn tiền dự phòng.',
    'Tinh tú chiếu mệnh cho thấy bạn là người có tiêu chuẩn rất cao và sẵn sàng chi trả xứng đáng cho những trải nghiệm và dịch vụ xuất sắc. Bạn tin rằng những món đồ cao cấp không chỉ phục vụ nhu cầu mà còn là tuyên ngôn về phong cách sống và sự tự tôn của bản thân. Hãy duy trì sự chọn lọc tinh tế này nhưng đừng để nó biến thành gánh nặng tài chính âm thầm.',
    'Vũ trụ nhận thấy bạn rất ít khi bị thu hút bởi các chương trình giảm giá đại trà vì bạn chỉ tập trung vào giá trị thực sự của sản phẩm. Tư duy tiêu dùng thông minh này giúp bạn tránh xa đống đồ rẻ tiền dễ hỏng, nhưng đôi khi cũng khiến bạn chi tiêu quá tay cho các món đồ xa xỉ. Hãy đặt ra giới hạn chi tiêu rõ ràng cho mỗi tháng để giữ mọi thứ luôn trong tầm kiểm soát.'
  ],
  rising_addict: [
    'Quẻ bói cảnh báo bạn đang bước vào giai đoạn say mê chốt đơn với tần suất và quy mô chi tiêu tăng trưởng rất nhanh. Bạn dường như đang bị cuốn vào vòng xoáy mua sắm khi mỗi ngày đều ngóng chờ những chuyến xe giao hàng mới. Tinh tú khuyên bạn hãy tạm dừng sử dụng các ứng dụng mua sắm một thời gian để lấy lại sự cân bằng trước khi ví tiền kiệt quệ.',
    'Chòm sao hộ mệnh phát hiện ra niềm đam mê mua sắm của bạn đang leo thang một cách âm thầm nhưng vô cùng mạnh mẽ. Những món đồ nhỏ ban đầu đã nhường chỗ cho những đơn hàng lớn hơn và thường xuyên hơn. Hãy tự hỏi bản thân xem bạn đang thực sự cần dùng những món đồ đó hay chỉ đang nghiện cảm giác được sở hữu chúng.',
    'Vũ trụ nhìn thấy mức độ phụ thuộc của bạn vào việc chốt đơn trực tuyến đang ở mức đáng lo ngại. Bạn tìm thấy sự phấn khích liên tục từ việc theo dõi hành trình đơn hàng và nhận bưu phẩm mỗi ngày. Tinh tú mách bảo hãy chuyển hướng nguồn năng lượng này sang các hoạt động thể chất hoặc học tập để bảo vệ tài khoản cá nhân.'
  ],
  morning_planner: [
    'Quẻ bói khen ngợi sự kỷ luật và tỉnh táo của bạn khi luôn mua sắm vào những thời điểm lý trí minh mẫn nhất trong ngày. Bạn hiếm khi đưa ra các quyết định bốc đồng nhờ thói quen lập kế hoạch chi tiết và phân bổ ngân sách vô cùng khoa học. Tinh tú chúc mừng bạn vì đã làm chủ hoàn toàn hành vi tiêu dùng của bản thân mà không bị thuật toán thao túng.',
    'Chòm sao hộ mệnh cho thấy bạn là tấm gương về sự kiên định và kiểm soát dòng tiền vô cùng xuất sắc. Bạn chỉ chốt đơn khi thực sự cần thiết và luôn cân nhắc kỹ lưỡng giữa mong muốn nhất thời và lợi ích lâu dài của món đồ. Hãy tiếp tục duy trì phong độ này để xây dựng một tương lai tài chính vững chắc và an toàn.',
    'Vũ trụ nhận thấy tư duy thực tế và logic chi phối toàn bộ các quyết định mua sắm của bạn từ trước đến nay. Bạn không bị ảnh hưởng bởi những lời quảng cáo thổi phồng hay các trào lưu nhất thời trên mạng xã hội. Sự điềm tĩnh này giúp bạn bảo vệ ví tiền của mình một cách hoàn hảo trước mọi cạm bẫy tiêu dùng trực tuyến.'
  ],
  seasonal: [
    'Quẻ bói chỉ ra bạn là người rất nhạy cảm với không khí lễ hội và thường có xu hướng chi tiêu bùng nổ theo các mùa trong năm. Khi không khí chuẩn bị Tết cận kề hay mùa mua sắm cuối năm đến, ví tiền của bạn lập tức tự động mở khóa để sắm sửa. Tinh tú nhắc nhở hãy chuẩn bị ngân sách dự phòng trước các mùa lễ hội để tránh bị rơi vào thế thụ động tài chính.',
    'Tinh tú chiếu mệnh cho thấy hành vi mua sắm của bạn chịu ảnh hưởng lớn từ thời tiết và các dịp đặc biệt trong năm. Bạn có thể im hơi lặng tiếng suốt nhiều tháng liền nhưng sẵn sàng chi tiêu mạnh tay vào mùa hè hoặc dịp cuối năm để chuẩn bị cho các chuyến đi hoặc quà tặng. Hãy phân bổ ngân sách đều hơn để không tạo ra những cú sốc tài chính đột ngột.',
    'Vũ trụ nhận thấy bạn coi việc mua sắm như một nghi thức để chào đón các mùa mới và kỷ niệm các dịp đặc biệt trong năm. Sự hào hứng chuẩn bị đồ đạc mang lại cho bạn niềm vui, nhưng cũng dễ khiến bạn chi tiêu vượt quá kế hoạch. Hãy lập danh sách những thứ thực sự cần thiết trước mỗi mùa để giữ cho ví tiền luôn an toàn.'
  ],
  beauty_selfcare: [
    'Quẻ bói đọc vị bạn đang biến các sản phẩm chăm sóc da và làm đẹp thành những liều thuốc tinh thần để tự xoa dịu bản thân sau những ngày dài áp lực. Mỗi sản phẩm dưỡng da hay làm đẹp mới là một lời tự tình rằng bạn xứng đáng được nâng niu và trân trọng. Tinh tú chỉ khuyên bạn nên yêu thương bản thân một cách tỉnh táo, đừng để diện mạo thăng hoa mà tài khoản lại héo hon.',
    'Chòm sao hộ mệnh thấy bạn dành rất nhiều tâm huyết và ngân sách để đầu tư vào vẻ bề ngoài cũng như sức khỏe của bản thân. Bạn tin rằng việc chăm sóc cơ thể là khoản đầu tư thông minh nhất và không bao giờ tiếc tiền cho việc này. Hãy tiếp tục chăm sóc bản thân nhưng hãy chọn lọc những sản phẩm thực sự phù hợp thay vì mua sắm theo trào lưu quảng cáo.',
    'Vũ trụ nhìn thấu khao khát hoàn thiện vẻ đẹp bản thân và tìm kiếm sự tự tin của bạn qua các đơn hàng mỹ phẩm. Việc thực hiện các bước dưỡng da mỗi tối giống như một nghi thức giúp bạn lấy lại sự bình yên trong tâm hồn. Hãy nhớ rằng vẻ đẹp rạng ngời nhất của bạn xuất phát từ sự an yên bên trong chứ không chỉ từ những sản phẩm đắt đỏ.'
  ],
  tech_optimizer: [
    'Quẻ bói chỉ ra bạn rất dễ bị mê hoặc bởi những thiết bị công nghệ mới với lời hứa hẹn sẽ tối ưu hóa hiệu suất làm việc hoặc nâng tầm cuộc sống. Đây thực chất là một cơ chế tâm lý giúp bạn tạo ra ảo giác về sự năng suất để trốn tránh áp lực công việc thực tế. Tinh tú mách bảo rằng thiết bị xịn chỉ là công cụ, thứ cần nâng cấp thực sự chính là sự tập trung của bạn.',
    'Tinh tú chiếu mệnh cho thấy bạn luôn tin tưởng một không gian làm việc hiện đại với các thiết bị thông minh sẽ mang lại nguồn cảm hứng bất tận. Bạn không ngần ngại chi tiêu cho những món đồ công nghệ cao để thỏa mãn đam mê sở hữu thiết bị mạnh mẽ. Hãy cẩn thận kẻo ngân sách cá nhân bị quá tải trước khi bạn kịp sử dụng hết tính năng của đống đồ công nghệ đó.',
    'Vũ trụ nhận thấy bạn là một người theo đuổi sự hoàn hảo về mặt kỹ thuật và luôn muốn sở hữu những giải pháp công nghệ tiên tiến nhất. Sở thích này giúp cuộc sống của bạn tiện nghi hơn nhưng cũng ngốn một lượng ngân sách lớn. Hãy đặt ra quy tắc đánh giá mức độ sử dụng thật kỹ trước khi quyết định chi tiền cho bất kỳ thiết bị mới nào.'
  ],
  home_nester: [
    'Quẻ bói tiết lộ bạn đang tìm kiếm cảm giác an toàn và kiểm soát cuộc sống thông qua việc liên tục trang trí, nâng cấp không gian sống của mình. Một ngôi nhà ấm cúng với đầy đủ tiện nghi chính là thánh đường giúp bạn tránh xa thế giới đầy biến động ngoài kia. Tinh tú khuyên bạn hãy trân trọng tổ ấm của mình nhưng đừng để việc mua sắm đồ gia dụng vượt quá khả năng tài chính thực tế.',
    'Chòm sao hộ mệnh nhìn thấy niềm vui giản dị nhưng sâu sắc của bạn khi tự tay chăm chút cho từng góc nhỏ trong căn nhà. Mỗi món đồ gia dụng tiện ích hay vật dụng trang trí mới chốt đơn là một viên gạch xây dựng nên cảm giác hạnh phúc gia đình. Hãy nhớ rằng sự ấm áp của tổ ấm đến từ tình cảm của những người sống trong đó chứ không phải từ số lượng đồ đạc bạn tích trữ.',
    'Vũ trụ nhận thấy bạn có xu hướng chi tiêu đều đặn cho các sản phẩm nhà cửa đời sống nhằm nâng cao chất lượng sinh hoạt hàng ngày. Bạn là người thực tế, yêu thích sự gọn gàng và luôn muốn tối ưu hóa không gian sống của mình. Hãy cân nhắc kỹ xem món đồ gia dụng tiếp theo có thực sự cần thiết hay chỉ làm chật chội thêm ngôi nhà của bạn.'
  ],
  food_lover: [
    'Quẻ bói chỉ ra bạn là kiểu người dùng hương vị ẩm thực để vỗ về những tổn thương cảm xúc và lấp đầy những khoảng trống tinh thần. Bộ não của bạn rất giỏi thuyết phục lý trí rằng ăn ngon là cách tốt nhất để tái tạo năng lượng làm việc sau những căng thẳng. Hệ quả là bạn có những khoảnh khắc hạnh phúc ngập tràn calo nhưng ví tiền thì lại rơi vào tình trạng hao hụt nghiêm trọng.',
    'Tinh tú chiếu rọi cho thấy bạn sẵn sàng chi tiêu thoải mái cho đồ ăn vặt và ẩm thực như một phần thưởng tự trao sau những giờ làm việc mệt mỏi. Đây là cơ chế giải tỏa căng thẳng vô cùng nhanh chóng và hiệu quả đối với bạn. Tuy nhiên, việc đặt đồ ăn liên tục trên các ứng dụng đang âm thầm bào mòn khoản tiết kiệm dài hạn của bạn một cách đáng ngại.',
    'Vũ trụ nhận thấy tình yêu lớn của bạn dành cho ẩm thực và niềm vui khám phá những món ăn mới lạ mỗi ngày. Bạn coi việc ăn uống là một trải nghiệm tận hưởng cuộc sống đích thực chứ không đơn thuần là nhu cầu sinh học bình thường. Hãy học cách tự nấu ăn nhiều hơn để vừa bảo vệ sức khỏe vừa giữ cho dòng tiền cá nhân luôn ở trạng thái an toàn.'
  ],
  family_center: [
    'Quẻ bói gửi lời tri ân sâu sắc đến tấm lòng chu đáo của bạn khi luôn đặt gia đình và những người thân yêu lên vị trí ưu tiên hàng đầu trong mọi đơn hàng. Bạn sẵn sàng chi tiêu hào phóng cho con cái, cha mẹ nhưng lại vô cùng tiết kiệm khi mua sắm cho bản thân. Tinh tú nhắc nhở rằng bạn cũng cần được yêu thương, hãy nhớ tự thưởng cho mình những món quà nhỏ xứng đáng.',
    'Chòm sao hộ mệnh thấy bạn là chỗ dựa vững chắc của cả nhà khi luôn lo toan chu đáo từ đồ dùng sinh hoạt cho đến các sản phẩm chăm sóc gia đình. Bạn tìm thấy niềm vui trong việc chăm sóc người khác và nhìn thấy người thân hạnh phúc. Tuy nhiên, hãy nhớ phân bổ một phần ngân sách riêng để chăm lo cho những sở thích cá nhân của chính bạn.',
    'Vũ trụ ghi nhận sự vun vén của bạn qua danh sách đơn hàng hầu hết đều dành cho tổ ấm và những người thân yêu. Bạn hiếm khi chi tiêu bốc đồng cho những thứ vô bổ của bản thân mà luôn tính toán lợi ích cho cả gia đình. Đây là một phẩm chất tuyệt vời nhưng đừng quên rằng việc tự chăm sóc tốt cho mình cũng là cách yêu thương gia đình tốt nhất.'
  ],
  free_spirit: [
    'Quẻ bói đọc vị bạn là một linh hồn tự do, yêu thích sự mới mẻ và luôn tò mò trải nghiệm nhiều lĩnh vực khác nhau trong cuộc sống. Danh mục mua sắm trải rộng của bạn phản ánh một tâm hồn rộng mở, ham học hỏi nhưng cũng rất nhanh chán. Tinh tú khuyên bạn nên tập trung năng lượng vào một vài sở thích nhất định để tránh lãng phí nguồn lực tài chính của bản thân.',
    'Tinh tú chiếu mệnh cho thấy bạn mua sắm vô cùng ngẫu hứng, từ đồ trang trí, dụng cụ thể thao cho đến các món đồ độc lạ không theo bất kỳ quy luật nào. Bạn dễ dàng bị thu hút bởi những ý tưởng mới mẻ trên mạng xã hội và chốt đơn ngay lập tức. Sự phân tán này đang làm dòng tiền của bạn bị rò rỉ ở nhiều nơi, hãy thiết lập mục tiêu tài chính cụ thể hơn.',
    'Vũ trụ nhận thấy bạn coi việc mua sắm như một chuyến phiêu lưu thú vị để khám phá thế giới xung quanh qua từng gói bưu phẩm. Bạn không ngại thử nghiệm những sản phẩm mới và luôn tìm kiếm nguồn cảm hứng từ những danh mục lạ lẫm. Hãy học cách quản lý giỏ hàng chặt chẽ hơn để chuyến phiêu lưu tiêu dùng này luôn mang lại niềm vui trọn vẹn.'
  ]
};

const AI_FEW_SHOT_EXAMPLES = [
  'Ví dụ 1:',
  'Hồ sơ đã phân tích: Kiểu người "Tín Đồ Mua Khuya". Đặc điểm: Hay mua khuya (31% đơn sau 22h); Thích săn sale (68% chi ngày sale); Chi tiêu không đều (dao động lớn theo tháng).',
  'Nhận xét: Bạn dùng màn hình tối và giỏ hàng nửa đêm như một nghi lễ xoa dịu — không hẳn cần món đồ, mà cần cái cảm giác "mình vẫn đang làm gì đó cho bản thân". Tinh tú mách rằng ban ngày bạn kiểm soát rất tốt, nhưng đêm xuống thì ví tiền mất quyền bầu cử.',
  '',
  'Ví dụ 2:',
  'Hồ sơ đã phân tích: Kiểu người "Chiến Thần Săn Sale". Đặc điểm: Thích săn sale (73% chi ngày sale); Mua sắm thường xuyên (trung bình nhiều đơn/tháng); Hay mua cuối tuần.',
  'Nhận xét: Não bộ bạn đã được lập trình để coi "giảm giá" là phần thưởng, không phải món đồ — mỗi đơn hàng chốt là một chiến thắng để có được sự thỏa mãn cảm xúc ngắn hạn, bất kể có dùng hay không. Chòm sao hộ mệnh chứng nhận: đây là loại hạnh phúc dễ đạt được và cũng tốn kém nhất cùng một lúc.',
  '',
  'Ví dụ 3:',
  'Hồ sơ đã phân tích: Kiểu người "Người Mua Chọn Lọc". Đặc điểm: Ưa đồ chất lượng (giá trị đơn cao); Mua sắm thưa thớt; Chi tiêu tăng dần theo năm.',
  'Nhận xét: Bạn không mua nhiều, nhưng mỗi lần mua là một tuyên ngôn — rằng bạn xứng đáng có thứ tốt, và thứ rẻ tiền chỉ tốn tiền mua lại lần hai. Tinh tú chiếu rọi: đây là tư duy cao cấp, chỉ tiếc ví tiền đôi khi không đồng thuận với tiêu chuẩn của bạn.',
  '',
  'Ví dụ 4:',
  'Hồ sơ đã phân tích: Kiểu người "Người Mua Sắm Cảm Xúc". Đặc điểm: Chi tiêu không đều (CV cao); Hay mua cuối tuần; Đa dạng danh mục.',
  'Nhận xét: Với bạn, mua sắm không phải kế hoạch — đó là phản xạ cảm xúc, một nút khởi động lại cho tâm trạng. Vũ trụ ghi nhận: bạn đang dùng giỏ hàng như nhật ký cảm xúc, và mỗi đơn hàng là một trang viết về trạng thái nội tâm hôm đó.'
].join('\n');


// Generate psychological insights based on shopping patterns
function generatePsychologicalInsight(data, profile) {
  // Check profile archetype first for highly specific rule-based insights
  if (profile && profile.archetype && profile.archetype.key) {
    const archKey = profile.archetype.key;
    const patterns = ARCHETYPE_PSYCHOLOGY_PATTERNS[archKey];
    if (patterns && patterns.length > 0) {
      const insightIndex = Math.floor(Math.random() * patterns.length);
      return patterns[insightIndex];
    }
  }

  const triggers = analyzeBehaviorTriggers(data);
  const matchedPatterns = [];
  
  // Match patterns based on triggers
  Object.entries(SHOPPING_PSYCHOLOGY_PATTERNS).forEach(([patternKey, pattern]) => {
    const matchCount = pattern.triggers.filter(trigger => triggers.includes(trigger)).length;
    if (matchCount > 0) {
      matchedPatterns.push({ 
        pattern: patternKey, 
        data: pattern, 
        score: matchCount / pattern.triggers.length 
      });
    }
  });
  
  // Sort by match score and pick the best one
  matchedPatterns.sort((a, b) => b.score - a.score);
  
  if (matchedPatterns.length > 0) {
    const bestMatch = matchedPatterns[0];
    const insights = bestMatch.data.insights;
    // Rotate through insights to provide variety
    const insightIndex = Math.floor(Math.random() * insights.length);
    return insights[insightIndex];
  }
  
  // Fallback generic insights based on primary trigger
  return generateFallbackInsight(triggers);
}

function analyzeBehaviorTriggers(data) {
  const triggers = [];
  const { stats, categories, totalSpend, totalOrders } = data;
  
  // Analyze category dominance
  if (categories && categories.length > 0) {
    const topCategory = categories[0];
    const topCatPct = totalSpend > 0 ? (topCategory.s / totalSpend) * 100 : 0;
    const catName = (topCategory.name || '').toLowerCase();
    
    if (topCatPct >= 30) {
      if (catName.includes('thời trang') || catName.includes('fashion')) triggers.push('fashion_dominant');
      if (catName.includes('điện tử') || catName.includes('tech')) triggers.push('tech_dominant');
      if (catName.includes('làm đẹp') || catName.includes('beauty')) triggers.push('beauty_dominant');
      if (catName.includes('thực phẩm') || catName.includes('food')) triggers.push('food_dominant');
      if (catName.includes('nhà cửa') || catName.includes('home')) triggers.push('home_dominant');
    }
  }
  
  // Analyze shopping timing
  if (stats) {
    const totalSaleOrders = (stats.double?.orders || 0) + (stats.mid?.orders || 0) + (stats.end?.orders || 0);
    const totalMidnightOrders = (stats.double?.midnightOrders || 0) + (stats.mid?.midnightOrders || 0) + (stats.end?.midnightOrders || 0);
    
    if (totalSaleOrders > 0 && totalMidnightOrders / totalSaleOrders >= 0.2) {
      triggers.push('late_night_shopping');
    }
    
    const totalSaleSpend = (stats.double?.spend || 0) + (stats.mid?.spend || 0) + (stats.end?.spend || 0);
    if (totalSpend > 0 && totalSaleSpend / totalSpend >= 0.6) {
      triggers.push('sale_focused');
    }
  }
  
  // Analyze spending patterns
  if (totalOrders > 0 && totalSpend > 0) {
    const avgOrderValue = totalSpend / totalOrders;
    if (avgOrderValue >= 400000) triggers.push('high_avg_value');
    if (avgOrderValue <= 150000 && totalOrders >= 30) triggers.push('frequent_small_orders');
    if (totalOrders >= 50) triggers.push('high_frequency');
  }
  
  // Analyze savings behavior
  if (data.totalSaved > 0 && totalSpend > 0) {
    const savingsRate = (data.totalSaved / (totalSpend + data.totalSaved)) * 100;
    if (savingsRate >= 15) triggers.push('high_savings_rate');
  }
  
  // Analyze diversity
  if (categories && categories.length >= 6) {
    const top3Share = categories.slice(0, 3).reduce((s, c) => s + c.s, 0);
    if (totalSpend > 0 && (top3Share / totalSpend) <= 0.6) {
      triggers.push('diverse_categories');
    }
  }
  
  // Analyze planning behavior
  if (categories && categories.length >= 5 && totalOrders >= 20) {
    const smallCategories = categories.filter(c => (c.s / totalSpend) * 100 < 8).length;
    if (smallCategories >= 3) triggers.push('low_planning');
  }
  
  // Analyze consistency
  if (totalOrders >= 20 && categories && categories.length <= 4) {
    triggers.push('consistent_spending');
  }
  
  // Analyze comfort spending
  if (totalOrders >= 15 && categories) {
    const comfortCategories = categories.filter(c => {
      const name = (c.name || '').toLowerCase();
      return name.includes('thực phẩm') || name.includes('food') || 
             name.includes('làm đẹp') || name.includes('beauty') ||
             name.includes('nhà cửa') || name.includes('home');
    });
    const comfortSpend = comfortCategories.reduce((s, c) => s + c.s, 0);
    if (totalSpend > 0 && (comfortSpend / totalSpend) >= 0.4) {
      triggers.push('comfort_spending');
    }
  }
  
  return triggers;
}

function generateFallbackInsight(triggers) {
  const fallbacks = {
    high_frequency: [
      'Vũ trụ nhìn thấu rằng bạn đã biến việc chốt đơn thành một thói quen gần như vô thức để đối phó với những căng thẳng hàng ngày. Mỗi thông báo về đơn hàng mới như một liều thuốc giải tỏa cảm xúc nhỏ giúp bạn tạm quên đi những áp lực cuộc sống. Tuy nhiên, niềm vui này trôi qua rất nhanh và thứ ở lại duy nhất là chiếc ví ngày một mỏng đi.',
      'Chòm sao hộ mệnh phát hiện tần suất mua sắm dày đặc của bạn phản ánh sự thiếu hụt cảm giác bình yên trong cuộc sống thường nhật. Bạn chốt đơn liên tục để lấp đầy những khoảng trống thời gian và tạo cảm giác mình luôn bận rộn. Tinh tú khuyên bạn hãy tìm kiếm những thói quen lành mạnh khác để thay thế cho hành vi mua sắm vô thức này.',
      'Quẻ bói chỉ ra việc nhận bưu phẩm mỗi ngày đã trở thành nguồn động lực chính giúp bạn duy trì năng lượng làm việc. Bạn bị phụ thuộc vào cảm giác mở hộp quà mới để xoa dịu những áp lực tinh thần đè nặng. Hãy tỉnh táo nhìn nhận lại xem bạn đang thực sự sử dụng các món đồ đó hay chỉ đang mua sắm để trốn tránh thực tại.'
    ],
    
    diverse_categories: [
      'Tinh tú chiếu mệnh cho thấy bạn có xu hướng mua sắm dàn trải để tìm kiếm cảm giác hài lòng từ nhiều nguồn khác nhau. Đây là dấu hiệu của một tâm hồn đang tìm kiếm sự viên mãn nhưng chưa xác định được điều mình thực sự cần. Hãy thử dừng lại một nhịp để hiểu rõ bản thân trước khi tiếp tục thêm đồ vào giỏ hàng.',
      'Vũ trụ nhận thấy danh mục mua sắm trải rộng phản ánh sự tò mò vô hạn nhưng cũng là biểu hiện của việc thiếu định hướng chi tiêu rõ ràng. Bạn dễ bị cuốn vào các xu hướng mới trên mạng xã hội và muốn trải nghiệm mọi thứ cùng một lúc. Tinh tú khuyên bạn hãy thiết lập một ngân sách cụ thể cho từng mục tiêu để bảo vệ dòng tiền cá nhân.',
      'Quẻ bói đọc vị bạn là người có sở thích đa dạng và luôn muốn thử nghiệm những điều mới lạ trong cuộc sống. Việc mua sắm lan man giúp bạn thỏa mãn tính hiếu kỳ nhất thời nhưng cũng khiến ví tiền của bạn bị hao hụt ở nhiều nơi. Hãy học cách chọn lọc và đầu tư sâu sắc vào một vài sở thích thực sự có giá trị lâu dài.'
    ],
    
    sale_focused: [
      'Quẻ bói tiết lộ bạn đang chịu ảnh hưởng lớn của tâm lý thích đồ giá rẻ, luôn bị hấp dẫn bởi các nhãn giảm giá đỏ chót. Cảm giác chiến thắng khi áp dụng được mã giảm giá đã che mờ khả năng phán đoán của bạn về giá trị thực dụng của sản phẩm. Bạn đang tiêu tiền để mua cảm giác tiết kiệm chứ không phải mua món đồ mình thực sự cần.',
      'Tinh tú chiếu mệnh cho thấy bạn là người có thói quen săn lùng khuyến mãi vô cùng kiên trì mỗi khi có cơ hội. Bạn cảm thấy hân hoan khi mua được món đồ dưới giá trị thông thường, bất kể nhu cầu sử dụng thực tế ra sao. Thần tài nhắc nhở rằng việc không mua sắm mới thực sự là cách tiết kiệm toàn diện nhất.',
      'Vũ trụ nhìn thấu bạn dễ dàng bị thao túng tâm lý bởi các chiêu trò tiếp thị giảm giá và miễn phí vận chuyển của sàn thương mại. Bạn thường chốt đơn vội vã chỉ vì sợ bỏ lỡ một ưu đãi hời mà quên mất chất lượng sản phẩm. Hãy bình tĩnh phân tích giá trị thực tế của món hàng trước khi quyết định bấm nút thanh toán.'
    ],
    
    late_night_shopping: [
      'Chòm sao hộ mệnh chỉ ra những lúc đêm khuya là thời điểm bạn dễ bị thao túng tâm lý nhất, khi lý trí đã mệt mỏi và cảm xúc lên ngôi. Việc chốt đơn lúc này như một cách để tự an ủi bản thân sau một ngày dài căng thẳng. Lời khuyên từ vũ trụ là hãy để điện thoại ở xa giường ngủ để bảo vệ tài khoản của bạn.',
      'Quẻ bói nhận định các đơn hàng phát sinh vào lúc nửa đêm chính là tiếng lòng thổn thức của một tâm hồn đang cần được vỗ về. Bóng tối làm gia tăng cảm giác trống trải khiến bạn dễ dàng đầu hàng trước những ham muốn tiêu dùng bộc phát. Hãy tắt các ứng dụng mua sắm trước khi lên giường để đảm bảo cả giấc ngủ ngon và sự an toàn cho ví tiền.',
      'Tinh tú chiếu rọi cho thấy bạn có thói quen lướt điện thoại vô thức trước khi đi ngủ và kết thúc bằng một vài đơn hàng bất ngờ. Sự tiện lợi của việc thanh toán nhanh chóng khiến bạn chi tiêu trong trạng thái nửa tỉnh nửa mơ. Vũ trụ khuyên bạn hãy thay thế thói quen này bằng việc đọc sách hoặc thư giãn tinh thần để tìm kiếm sự bình yên thực sự.'
    ]
  };
  
  for (const trigger of triggers) {
    if (fallbacks[trigger]) {
      const options = fallbacks[trigger];
      const index = Math.floor(Math.random() * options.length);
      return options[index];
    }
  }
  
  const defaultOptions = [
    'Vũ trụ nhìn thấy trong bạn một tâm hồn đang tìm kiếm sự cân bằng giữa nhu cầu thực tế và khao khát cảm xúc thông qua hành vi mua sắm. Đây là cuộc hành trình tự khám phá bản thân qua từng quyết định tiêu dùng và tự rút ra bài học cho mình.',
    'Tinh tú chiếu mệnh cho thấy bạn là người luôn cân nhắc giữa việc yêu chiều bản thân và trách nhiệm quản lý tài chính cá nhân. Mỗi đơn hàng chốt thành công là một trải nghiệm thú vị giúp bạn hiểu rõ hơn về nhu cầu và phong cách sống của chính mình.',
    'Quẻ bói nhận thấy hành trình mua sắm của bạn phản ánh sự trưởng thành và thích nghi không ngừng với nhịp sống hiện đại. Hãy tiếp tục duy trì sự thông thái và tỉnh táo trong tiêu dùng để luôn làm chủ dòng tiền cá nhân một cách tốt nhất.'
  ];
  
  const defaultIndex = Math.floor(Math.random() * defaultOptions.length);
  return defaultOptions[defaultIndex];
}

let _aiInsightSession = null;
let _aiInsightDisabled = false;
// Per-card running lock — Set of cardIds currently executing AI
const _aiInsightRunning = new Set();
// Stores call args per cardId so re-analysis can be triggered without re-running the full pipeline
const _aiInsightCallArgs = {};

// Returns cached AI text for a key, or null if none
function _getInsightText(ck) {
  if (!_dashCache) return null;
  const v = _dashCache.insights[ck];
  if (!v) return null;
  // backward-compat: if stored as array, take first entry
  return Array.isArray(v) ? (v[0] || null) : String(v);
}

// Save AI text to cache
function _saveInsightText(ck, text) {
  if (!_dashCache) return;
  _dashCache.insights[ck] = text;
  saveDashCache();
}

// Render rule-based fallback when Chrome AI is unavailable and no profile
function _tryRuleBasedFallback(aiEl, cardId, fallbackFn) {
  if (typeof fallbackFn === 'function') {
    try {
      const text = fallbackFn();
      if (text) {
        aiEl.style.display = '';
        aiEl.innerHTML = renderAIInsight(text, cardId, null);
        return;
      }
    } catch (e) { /* ignore */ }
  }
  aiEl.style.display = 'none';
}

function isAIFatalError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  return msg.includes('crashed too many times') ||
    msg.includes('unable to create a session') ||
    msg.includes('model not available');
}

function hideAllAIButtons() {
  document.querySelectorAll('.ai-analyze-wrap').forEach(el => {
    el.style.display = 'none';
  });
  document.querySelectorAll('.ai-refresh-btn').forEach(el => {
    el.remove();
  });
  // Hide containers that have NO content at all (no AI sentences AND no profile card)
  document.querySelectorAll('.insight-ai').forEach(el => {
    const hasContent = el.querySelector('.insight-ai-sentence') ||
                       el.querySelector('.ai-archetype') ||
                       el.querySelector('.ai-traits');
    if (!hasContent) el.style.display = 'none';
  });
}

async function getAIInsightSession() {
  if (_aiInsightDisabled) return null;
  if (_aiInsightSession) return _aiInsightSession;
  try {
    const status = await getSystemAIAvailability();
    const isAvail = ['available', 'readily'].includes(status);
    if (!isAvail) return null;
    _aiInsightSession = await createAISession({
      initialPrompts: [{ role: 'system', content: AI_INSIGHT_SYSTEM }],
      temperature: 0.9
    });
    return _aiInsightSession;
  } catch (e) {
    if (isAIFatalError(e)) {
      console.warn('[Dashboard] AI model fatally broken, disabling AI insights:', e.message);
      _aiInsightDisabled = true;
      hideAllAIButtons();
    }
    return null;
  }
}

let _isAIAvailable = false;
let _aiAvailabilityResolve;
const _aiAvailabilityPromise = new Promise((resolve) => {
  _aiAvailabilityResolve = resolve;
});

async function checkAIAvailability() {
  try {
    const status = await getSystemAIAvailability();
    if (status === 'available' || status === 'readily') {
      const testSession = await createAISession().catch(() => null);
      if (testSession) {
        await destroyAISession(testSession);
        _isAIAvailable = true;
        _aiAvailabilityResolve(true);
      } else {
        _isAIAvailable = false;
        _aiAvailabilityResolve(false);
      }
    } else if (status === 'downloading' || status === 'after-download' || status === 'downloadable') {
      // Model download in progress, check again in 5s
      setTimeout(checkAIAvailability, 5000);
    } else {
      _isAIAvailable = false;
      _aiAvailabilityResolve(false);
    }
  } catch (e) {
    _isAIAvailable = false;
    _aiAvailabilityResolve(false);
  }
}
checkAIAvailability();

_aiAvailabilityPromise.then(avail => {
  _isAIAvailable = avail;
  if (avail && typeof classifyKharItems === 'function') {
    const runLateClassification = () => {
      if (!window.currentDashData) {
        if (!runLateClassification.retries) runLateClassification.retries = 0;
        if (runLateClassification.retries < 10) {
          runLateClassification.retries++;
          setTimeout(runLateClassification, 200);
        }
        return;
      }
      const tiItems = window.currentDashData.ti || [];
      const uncategorizedCount = tiItems.filter(item => isInvalidCat(item.cat)).length;
      if (uncategorizedCount > 0) {
        console.log('[Dashboard] AI model became available late. Running background category classification for', uncategorizedCount, 'items.');
        classifyKharItems(tiItems, window.currentDashData).catch(e => {
          console.error('[Dashboard] Late AI category classification failed:', e);
        });
      }
    };
    runLateClassification();
  }
});

// enrichWithAI — orchestrates two-step rendering: profile (instant) + AI narrative (streamed)
// cacheKey: optional override for cache lookup
// fallbackFn: optional () => string for rule-based text when Chrome AI unavailable
// autoRun: if true, skip analyze button and go straight to AI execution
// profile: PersonalityProfile | null — when provided, archetype+traits render immediately
function enrichWithAI(cardId, context, specificPrompt, cacheKey, fallbackFn, autoRun, profile) {
  _aiInsightCallArgs[cardId] = { context, specificPrompt, cacheKey, fallbackFn, profile };

  const aiEl = document.getElementById(cardId + '-ai');
  if (!aiEl) return;

  const ck = cacheKey || cardId;
  const cached = _getInsightText(ck);

  // Hide initially to prevent flickering or showing AI features when not available
  aiEl.style.display = 'none';
  aiEl.innerHTML = '';
  _aiAvailabilityPromise.then(avail => {
    if (!avail || _aiInsightDisabled) {
      const dataForInsight = {
        stats: (window.currentDashData && window.currentDashData.oss) || window._oss || null,
        categories: (window.currentDashData && window.currentDashData.cs) || [],
        totalSpend: (window.currentDashData && window.currentDashData.t) || 0,
        totalOrders: (window.currentDashData && window.currentDashData.o) || 0,
        totalSaved: (window.currentDashData && window.currentDashData.s) || 0
      };
      
      const localInsight = typeof generatePsychologicalInsight === 'function'
        ? generatePsychologicalInsight(dataForInsight, profile)
        : '';
        
      if (profile || (localInsight && localInsight.trim())) {
        aiEl.innerHTML = renderAIInsight(localInsight || '', cardId, profile);
        aiEl.style.display = '';
        
        const refreshBtn = aiEl.querySelector('.ai-refresh-btn');
        if (refreshBtn) refreshBtn.style.display = 'none';
      } else {
        aiEl.style.display = 'none';
        aiEl.innerHTML = '';
      }
      return;
    }

    // Serve from cache — render profile + cached AI narrative
    if (cached !== null) {
      aiEl.innerHTML = renderAIInsight(cached, cardId, profile);
      aiEl.style.display = '';
      const refreshBtn = aiEl.querySelector('.ai-refresh-btn');
      if (refreshBtn) {
        refreshBtn.style.display = 'none';
      }
      return;
    }

    if (autoRun) {
      // Auto-run enabled: show loading/profile immediately and run AI
      if (profile) {
        aiEl.innerHTML = renderAIInsight(null, cardId, profile);
      }
      aiEl.style.display = '';
      setTimeout(() => {
        const stillEmpty = _getInsightText(ck) === null;
        if (stillEmpty && !_aiInsightRunning.has(cardId) && !_aiInsightDisabled) {
          _executeAIInsight(cardId);
        }
      }, profile ? 100 : 600);
    } else {
      // Show analyze button, don't auto-run
      aiEl.innerHTML = renderAnalyzeButton(cardId);
      aiEl.style.display = '';
    }
  });
}

// Builds the prompt sent to AI
function _buildFullPrompt(args) {
  const profile = args.profile;
  // When profile is available, use pre-formatted aiContext as primary input
  if (profile && profile.aiContext) {
    return `VÍ DỤ THAM KHẢO GIỌNG VĂN (BẮT CHƯỚC PHONG CÁCH NÀY):
${AI_FEW_SHOT_EXAMPLES}

HỒ SƠ ĐÃ PHÂN TÍCH:
${profile.aiContext}

YÊU CẦU: Viết 1-2 câu nhận xét tâm lý có chiều sâu, dí dỏm về người này. Diễn giải sáng tạo — đừng liệt kê lại đặc điểm đã có. Không nhắc số tiền, không dùng tiếng Anh.`;
  }
  // Legacy path: raw context strings
  return `VÍ DỤ THAM KHẢO GIỌNG VĂN:
${AI_FEW_SHOT_EXAMPLES}

DỮ LIỆU THỰC TẾ:
${args.context}

YÊU CẦU:
${args.specificPrompt}

Nhận xét ngắn gọn (1-2 câu), không ghi số tiền hay con số cụ thể, không dùng tiếng Anh:`;
}

// Internal AI runner — called by runAIInsight and rerunAIInsight
async function _executeAIInsight(cardId) {
  const args = _aiInsightCallArgs[cardId];
  if (!args) return;
  if (_aiInsightRunning.has(cardId)) return;

  const aiEl = document.getElementById(cardId + '-ai');
  if (!aiEl) return;

  _aiInsightRunning.add(cardId);

  const profile = args.profile;
  const ck = args.cacheKey || cardId;

  try {
    // Generate local rule-based psychological insight
    const dataForInsight = {
      stats: (window.currentDashData && window.currentDashData.oss) || window._oss || null,
      categories: (window.currentDashData && window.currentDashData.cs) || [],
      totalSpend: (window.currentDashData && window.currentDashData.t) || 0,
      totalOrders: (window.currentDashData && window.currentDashData.o) || 0,
      totalSaved: (window.currentDashData && window.currentDashData.s) || 0
    };
    const localInsight = generatePsychologicalInsight(dataForInsight, profile);

    if (localInsight && localInsight.trim()) {
      const text = localInsight.trim();
      _saveInsightText(ck, text);
      aiEl.innerHTML = renderAIInsight(text, cardId, profile);
      aiEl.style.display = '';
      const refreshBtn = aiEl.querySelector('.ai-refresh-btn');
      if (refreshBtn) refreshBtn.style.display = 'none';
    } else {
      if (profile) {
        aiEl.innerHTML = renderAIInsight(null, cardId, profile);
        aiEl.style.display = '';
      } else {
        aiEl.style.display = 'none';
      }
    }
  } catch (e) {
    console.warn('[Dashboard] Local psychological insight failed:', e);
    if (profile) {
      aiEl.innerHTML = renderAIInsight(null, cardId, profile);
      aiEl.style.display = '';
    } else {
      aiEl.style.display = 'none';
    }
  } finally {
    _aiInsightRunning.delete(cardId);
  }
}

// User-triggered: called by the "Phân tích..." button
window.runAIInsight = async function (cardId) {
  await _executeAIInsight(cardId);
};

// User-triggered: re-run AI to get a fresh narrative ("↻" button)
window.rerunAIInsight = async function (cardId) {
  const args = _aiInsightCallArgs[cardId];
  if (!args) return;

  const ck = args.cacheKey || cardId;
  // Clear cache so _executeAIInsight generates fresh text
  if (_dashCache) {
    delete _dashCache.insights[ck];
    saveDashCache();
  }

  const aiEl = document.getElementById(cardId + '-ai');
  if (aiEl) {
    const btn = aiEl.querySelector('.ai-refresh-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<svg class="refresh-icon spin" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg><span>Đang phân tích...</span>`;
    }
    // If profile shown: just remove the narrative section so it re-streams below
    if (args.profile) {
      const narrativeEl = aiEl.querySelector('.ai-narrative');
      if (narrativeEl) narrativeEl.remove();
    }
  }

  await _executeAIInsight(cardId);
};

document.addEventListener('click', (e) => {
  const analyzeBtn = e.target.closest('.ai-analyze-btn[data-ai-card]');
  if (analyzeBtn) {
    e.preventDefault();
    const cardId = analyzeBtn.getAttribute('data-ai-card');
    if (cardId && typeof window.runAIInsight === 'function') {
      window.runAIInsight(cardId);
    }
    return;
  }
  const refreshBtn = e.target.closest('.ai-refresh-btn[data-ai-card]');
  if (refreshBtn) {
    e.preventDefault();
    const cardId = refreshBtn.getAttribute('data-ai-card');
    if (cardId && typeof window.rerunAIInsight === 'function') {
      window.rerunAIInsight(cardId);
    }
  }
});

// Copy current AI narrative to clipboard with visual feedback
window.copyAIInsight = function (cardId) {
  const args = _aiInsightCallArgs[cardId];
  if (!args) return;
  const ck = args.cacheKey || cardId;
  const text = _getInsightText(ck);
  if (!text) return;

  navigator.clipboard.writeText(text).then(() => {
    const aiEl = document.getElementById(cardId + '-ai');
    if (!aiEl) return;
    const copyBtn = aiEl.querySelector('.ai-copy-btn');
    if (!copyBtn) return;
    const originalHTML = copyBtn.innerHTML;
    copyBtn.innerHTML = '<span style="font-size:10px;white-space:nowrap">✓ Đã chép</span>';
    copyBtn.style.color = 'var(--green)';
    setTimeout(() => {
      copyBtn.innerHTML = originalHTML;
      copyBtn.style.color = '';
    }, 1800);
  }).catch(() => {});
};

// ═══════════════════════════════════════════════
//   PERSONALITY ANALYSIS ENGINE v2 (rule-based)
// ═══════════════════════════════════════════════

// 2.1 Enhanced temporal patterns from order list
function computeTemporalPatterns(ol) {
  if (!ol || !ol.length) {
    return { nightPct: 0, weekendPct: 0, lunchPct: 0, morningPct: 0, paydayPct: 0, peakHour: null, totalOrders: 0 };
  }
  const hourCounts = new Array(24).fill(0);
  const dowCounts = new Array(7).fill(0);
  let valid = 0, nightCount = 0, lunchCount = 0, morningCount = 0, paydayCount = 0;

  for (const o of ol) {
    const ts = o.ot || o.t;
    if (!ts || ts <= 0) continue;
    const p = toVnParts(ts);
    hourCounts[p.hour]++;
    dowCounts[p.weekday]++;
    if (p.hour >= 22 || p.hour < 3) nightCount++;
    if (p.hour >= 11 && p.hour < 14) lunchCount++;
    if (p.hour >= 8 && p.hour < 12) morningCount++;
    // Payday: 1-3 và 15-17 tháng (phát lương đầu & giữa tháng ở VN)
    if ((p.day >= 1 && p.day <= 3) || (p.day >= 15 && p.day <= 17)) paydayCount++;
    valid++;
  }

  if (valid === 0) return { nightPct: 0, weekendPct: 0, lunchPct: 0, morningPct: 0, paydayPct: 0, peakHour: null, totalOrders: 0 };

  const weekendCount = dowCounts[0] + dowCounts[6]; // CN=0, T7=6
  let peakHour = 0;
  for (let h = 1; h < 24; h++) {
    if (hourCounts[h] > hourCounts[peakHour]) peakHour = h;
  }

  return {
    nightPct: nightCount / valid,
    weekendPct: weekendCount / valid,
    lunchPct: lunchCount / valid,
    morningPct: morningCount / valid,
    paydayPct: paydayCount / valid,
    peakHour,
    totalOrders: valid
  };
}

// 2.2 Sale behavior stats (prefer d.oss pre-aggregated, fallback to ol)
function computeSaleStats(d) {
  const result = {
    totalSpend: 0, saleSpend: 0,
    totalOrders: d.o || 0, saleOrders: 0, midnightOrders: 0
  };

  if (window._oss) {
    const years = Object.keys(window._oss);
    for (const yr of years) {
      for (const type of ['double', 'mid', 'end', 'regular']) {
        const e = window._oss[yr]?.[type];
        if (!e) continue;
        result.totalSpend += e[0] || 0;
        result.midnightOrders += e[3] || 0;
        if (type !== 'regular') { result.saleSpend += e[0] || 0; result.saleOrders += e[2] || 0; }
      }
    }
    if (!result.totalSpend) result.totalSpend = d.t || 0;
  } else {
    result.totalSpend = d.t || 0;
    for (const o of (d.ol || [])) {
      if (!o.t || !o.f) continue;
      const p = toVnParts(o.t);
      const isDouble = p.day === p.month;
      const isMid = p.day === 15 || p.day === 16;
      const isEnd = p.day >= 25 || p.day <= 1;
      if (isDouble || isMid || isEnd) { result.saleSpend += o.f; result.saleOrders++; }
      if (p.hour < 2) result.midnightOrders++;
    }
  }
  return result;
}

// 2.3a Monthly spending variance + binge detection
function computeSpendingVariance(yd) {
  if (!yd) return { cv: 0, isVolatile: false, isConsistent: true, isBinge: false };
  const values = [];
  // Also collect entries by (year, month) for binge detection
  const monthEntries = []; // [{yr, mn, val}]
  for (const [yr, ydata] of Object.entries(yd)) {
    if (!ydata.m) continue;
    for (const [mn, v] of Object.entries(ydata.m)) {
      if (v > 0) { values.push(v); monthEntries.push({ yr: Number(yr), mn: Number(mn), val: v }); }
    }
  }
  if (values.length < 3) return { cv: 0, isVolatile: false, isConsistent: true, isBinge: false };

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
  const cv = mean > 0 ? stdDev / mean : 0;
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);

  // Find binge month (month where spend > 2.5x mean)
  const bingePeak = monthEntries.find(e => e.val >= mean * 2.5);
  const isBinge = maxVal >= mean * 3;

  return {
    cv,
    isVolatile: cv > 0.6,
    isConsistent: cv < 0.3,
    maxVal, minVal, mean,
    isBinge,
    bingeMonth: bingePeak?.mn || null,
    bingeYear: bingePeak?.yr || null,
  };
}

// 2.3b Year-over-year trend (with percentage change)
function computeYoYTrend(yd) {
  if (!yd) return { isGrowing: false, isReformed: false };
  const entries = Object.entries(yd)
    .map(([y, v]) => [Number(y), v.t || 0]).filter(([, t]) => t > 0)
    .sort((a, b) => a[0] - b[0]);
  if (entries.length < 2) return { isGrowing: false, isReformed: false };
  const [firstYear, firstVal] = entries[0];
  const [lastYear, lastVal] = entries[entries.length - 1];
  const pctChange = firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 100) : 0;
  return {
    isGrowing: lastVal > firstVal * 1.3,
    isReformed: lastVal < firstVal * 0.7,
    firstVal, lastVal, firstYear, lastYear, pctChange
  };
}

// 2.4 Archetype definitions with scoring weights
const ARCHETYPE_DEFINITIONS = {
  reformed:        { key: 'reformed',        label: 'Người Đang Tỉnh Ngộ',        icon: '🌱', w: { reformed_spender: 8 } },
  night_owl:       { key: 'night_owl',       label: 'Tín Đồ Mua Khuya',            icon: '🦉', w: { night_owl: 5, late_night_shopping: 3, fashion_dominant: 1 } },
  fashion_healer:  { key: 'fashion_healer',  label: 'Người Chữa Lành Cảm Xúc',    icon: '🌙', w: { fashion_dominant: 5, fashionLateNight: 4, night_owl: 2 } },
  bargain_hunter:  { key: 'bargain_hunter',  label: 'Chiến Thần Săn Sale',          icon: '🎯', w: { sale_focused: 5, sale_only_buyer: 4, high_savings_rate: 3, weekend_shopper: 1 } },
  emotional:       { key: 'emotional',       label: 'Người Mua Sắm Cảm Xúc',      icon: '🌊', w: { volatile_spender: 5, binge_buyer: 3, impulseBuyer: 2, diverse_categories: 1 } },
  premium_curator: { key: 'premium_curator', label: 'Người Mua Chọn Lọc',          icon: '💎', w: { premium_buyer: 5, selective_luxury: 5, full_price_loyal: 3, high_avg_value: 2 } },
  rising_addict:   { key: 'rising_addict',   label: 'Người Đang "Bị Cuốn"',        icon: '📈', w: { growing_spender: 6, high_frequency: 2 } },
  morning_planner: { key: 'morning_planner', label: 'Người Mua Có Kế Hoạch',       icon: '📋', w: { morning_planner: 4, payday_buyer: 4, consistent_spender: 3, full_price_loyal: 2 } },
  seasonal:        { key: 'seasonal',        label: 'Người Mua Theo Mùa',           icon: '🎄', w: { year_end_spiker: 5, tet_buyer: 5, summer_binge: 4 } },
  beauty_selfcare: { key: 'beauty_selfcare', label: 'Người Tự Yêu Thương',         icon: '✨', w: { beauty_dominant: 5, self_care_priority: 5, beautyTherapy: 3 } },
  tech_optimizer:  { key: 'tech_optimizer',  label: 'Nhà Đầu Tư Hiệu Suất',        icon: '💻', w: { tech_dominant: 6, techUpgrade: 3, high_avg_value: 1 } },
  home_nester:     { key: 'home_nester',     label: 'Người Tạo Tổ Ấm',             icon: '🏡', w: { home_dominant: 6, homeMaker: 4, consistent_spending: 1 } },
  food_lover:      { key: 'food_lover',      label: 'Người Sống Để Ăn Ngon',        icon: '🍜', w: { food_dominant: 6, foodComfort: 4, comfort_spending: 2 } },
  family_center:   { key: 'family_center',   label: 'Người Mua Vì Gia Đình',        icon: '👨‍👩‍👧', w: { family_buyer: 8 } },
  free_spirit:     { key: 'free_spirit',     label: 'Người Khám Phá Đa Dạng',      icon: '🛍️', w: { diverse_categories: 3, low_planning: 2, high_frequency: 1 } },
};

// Scoring-based archetype resolution — highest score wins
function resolveArchetype(triggers) {
  const triggerSet = new Set(triggers);
  let best = ARCHETYPE_DEFINITIONS.free_spirit, bestScore = 0;
  for (const archDef of Object.values(ARCHETYPE_DEFINITIONS)) {
    let score = 0;
    for (const [trigger, weight] of Object.entries(archDef.w)) {
      if (triggerSet.has(trigger)) score += weight;
    }
    if (score > bestScore) { bestScore = score; best = archDef; }
  }
  return { key: best.key, label: best.label, icon: best.icon };
}

// 2.5 Trait builders — concrete evidence with real numbers
const TRAIT_BUILDERS = {
  night_owl: (d) => {
    const pct = Math.round((d.temporal?.nightPct || 0) * 100);
    if (pct < 10) return null;
    return { 
      label: 'Hay mua khuya', 
      evidence: `${pct}% đơn đặt sau 22h`, 
      description: `Bạn thường mua sắm vào ban đêm với ${pct}% số đơn được đặt sau 22h.`,
      icon: '🌙' 
    };
  },
  payday_buyer: (d) => {
    const pct = Math.round((d.temporal?.paydayPct || 0) * 100);
    if (pct < 28) return null;
    return { 
      label: 'Mua nhiều đầu/giữa tháng', 
      evidence: `${pct}% đơn ngày 1–3 & 15–17`, 
      description: `Bạn thường chi tiêu nhiều vào dịp nhận lương đầu/giữa tháng, chiếm ${pct}% số đơn vào các ngày 1–3 và 15–17.`,
      icon: '💸' 
    };
  },
  morning_planner: (d) => {
    const pct = Math.round((d.temporal?.morningPct || 0) * 100);
    if (pct < 28) return null;
    return { 
      label: 'Mua buổi sáng', 
      evidence: `${pct}% đơn đặt 8h–12h`, 
      description: `Bạn có thói quen mua sắm vào buổi sáng với ${pct}% số đơn được đặt từ 8h đến 12h.`,
      icon: '☀️' 
    };
  },
  weekend_shopper: (d) => {
    const pct = Math.round((d.temporal?.weekendPct || 0) * 100);
    if (pct < 30) return null;
    return { 
      label: 'Cuối tuần hay mua sắm', 
      evidence: `${pct}% đơn thứ 7–CN`, 
      description: `Bạn hay mua sắm thư giãn vào cuối tuần, với khoảng ${pct}% số đơn đặt vào thứ 7 và Chủ Nhật.`,
      icon: '📅' 
    };
  },
  lunch_shopper: (d) => {
    const pct = Math.round((d.temporal?.lunchPct || 0) * 100);
    if (pct < 15) return null;
    return { 
      label: 'Mua giờ nghỉ trưa', 
      evidence: `${pct}% đơn 11h–14h`, 
      description: `Bạn thường tranh thủ chốt đơn vào giờ nghỉ trưa, chiếm ${pct}% số đơn phát sinh trong khoảng 11h–14h.`,
      icon: '🍱' 
    };
  },
  sale_focused: (d) => {
    const pct = Math.round(((d.saleStats?.saleSpend || 0) / Math.max(d.saleStats?.totalSpend || 1, 1)) * 100);
    if (pct < 30) return null;
    return { 
      label: 'Thích săn sale', 
      evidence: `${pct}% chi vào ngày khuyến mãi`, 
      description: `Bạn là người tích cực săn sale khi dành ra ${pct}% tổng chi tiêu vào các ngày khuyến mãi.`,
      icon: '🎯' 
    };
  },
  sale_only_buyer: (d) => {
    const pct = Math.round(((d.saleStats?.saleSpend || 0) / Math.max(d.saleStats?.totalSpend || 1, 1)) * 100);
    if (pct < 75) return null;
    return { 
      label: 'Chỉ mua khi có sale', 
      evidence: `${pct}% chi vào ngày sale`, 
      description: `Bạn hầu như chỉ mua sắm khi có ưu đãi lớn với ${pct}% ngân sách chi vào ngày sale.`,
      icon: '🔥' 
    };
  },
  full_price_loyal: (d) => {
    const pct = Math.round(((d.saleStats?.saleSpend || 0) / Math.max(d.saleStats?.totalSpend || 1, 1)) * 100);
    if (pct > 25 || (d.totalOrders || 0) < 8) return null;
    return { 
      label: 'Không phụ thuộc vào sale', 
      evidence: `Chỉ ${pct}% chi vào ngày giảm giá`, 
      description: `Bạn mua sắm theo nhu cầu và không phụ thuộc vào sale (chỉ ${pct}% chi tiêu vào ngày giảm giá).`,
      icon: '🛡️' 
    };
  },
  volatile_spender: (d) => {
    if (!d.variance?.isVolatile) return null;
    const minStr = fmtVND(d.variance.minVal || 0);
    const maxStr = fmtVND(d.variance.maxVal || 0);
    return { 
      label: 'Chi tiêu không đều', 
      evidence: `Từ ${minStr} đến ${maxStr}/tháng`, 
      description: `Chi tiêu hàng tháng của bạn biến động khá lớn, dao động từ mức thấp ${minStr} đến mức cao nhất là ${maxStr}/tháng.`,
      icon: '📊' 
    };
  },
  consistent_spender: (d) => {
    if (!d.variance?.isConsistent) return null;
    const avgStr = fmtVND(d.variance.mean || 0);
    return { 
      label: 'Chi tiêu đều đặn', 
      evidence: `Ổn định ~${avgStr}/tháng`, 
      description: `Bạn duy trì thói quen quản lý chi tiêu rất đều đặn, ổn định ở mức trung bình khoảng ${avgStr} mỗi tháng.`,
      icon: '📐' 
    };
  },
  binge_then_quiet: (d) => {
    if (!d.variance?.isBinge) return null;
    const MONTHS_VN = ['', 'T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
    const mn = d.variance.bingeMonth;
    const yr = d.variance.bingeYear;
    const ratio = d.variance.mean > 0 ? (d.variance.maxVal / d.variance.mean).toFixed(1) : '?';
    const label = mn ? `${MONTHS_VN[mn]}${yr ? '/' + yr : ''}` : 'một tháng';
    return { 
      label: 'Có tháng mua bùng phát', 
      evidence: `${label} nhiều hơn ${ratio}x tháng bình thường`, 
      description: `Bạn có giai đoạn mua sắm bùng phát đột ngột, cụ thể là vào ${label} tiêu nhiều hơn ${ratio} lần tháng bình thường.`,
      icon: '💥' 
    };
  },
  high_frequency: (d) => {
    const perMonth = Math.round((d.totalOrders || 0) / Math.max(d.activeMonths || 1, 1));
    if (perMonth < 3) return null;
    return { 
      label: 'Mua sắm thường xuyên', 
      evidence: `Trung bình ~${perMonth} đơn/tháng`, 
      description: `Tần suất chốt đơn của bạn khá dày dặn, trung bình khoảng ${perMonth} đơn hàng mỗi tháng.`,
      icon: '🛍️' 
    };
  },
  high_avg_value: (d) => {
    const avg = d.avgOrderValue || 0;
    if (avg < 300000) return null;
    return { 
      label: 'Ưa đồ chất lượng', 
      evidence: `Trung bình ${fmtVND(avg)}/đơn`, 
      description: `Bạn ưu tiên lựa chọn các sản phẩm chất lượng hoặc có giá trị cao, trung bình đạt ${fmtVND(avg)} cho mỗi đơn hàng.`,
      icon: '💎' 
    };
  },
  selective_luxury: (d) => {
    const avg = d.avgOrderValue || 0;
    if (avg < 450000) return null;
    return { 
      label: 'Thiên về hàng cao cấp', 
      evidence: `Trung bình ${fmtVND(avg)}/đơn`, 
      description: `Gu mua sắm của bạn nghiêng về các mặt hàng cao cấp, giá trị trung bình mỗi đơn hàng lên tới ${fmtVND(avg)}.`,
      icon: '👑' 
    };
  },
  anti_premium: (d) => {
    const avg = d.avgOrderValue || 0;
    const orders = d.totalOrders || 0;
    if (avg >= 120000 || orders < 25) return null;
    return { 
      label: 'Ưa đồ giá tốt', 
      evidence: `Trung bình ${fmtVND(avg)}/đơn`, 
      description: `Bạn ưa chuộng các sản phẩm bình dân hoặc có ưu đãi tốt, trung bình chỉ chi khoảng ${fmtVND(avg)} cho một đơn hàng.`,
      icon: '🏷️' 
    };
  },
  growing_spender: (d) => {
    if (!d.yoy?.isGrowing) return null;
    const pct = d.yoy.pctChange;
    return { 
      label: 'Chi tiêu ngày càng tăng', 
      evidence: `Tăng ${pct}% từ ${d.yoy.firstYear}→${d.yoy.lastYear}`, 
      description: `Mức độ mua sắm của bạn có xu hướng ngày càng tăng mạnh, tăng trưởng ${pct}% từ năm ${d.yoy.firstYear} lên năm ${d.yoy.lastYear}.`,
      icon: '📈' 
    };
  },
  reformed_spender: (d) => {
    if (!d.yoy?.isReformed) return null;
    const pct = Math.abs(d.yoy.pctChange);
    return { 
      label: 'Đang cắt giảm chi tiêu', 
      evidence: `Giảm ${pct}% từ ${d.yoy.firstYear}→${d.yoy.lastYear}`, 
      description: `Bạn đang thắt chặt chi tiêu rất hiệu quả, cắt giảm được ${pct}% chi phí so với giai đoạn trước.`,
      icon: '🌱' 
    };
  },
  high_savings_rate: (d) => {
    const saved = d.totalSaved || 0;
    const total = d.totalSpend || 0;
    if (!saved || !total) return null;
    const pct = Math.round((saved / (saved + total)) * 100);
    if (pct < 10) return null;
    return { 
      label: 'Tiết kiệm tốt nhờ sale', 
      evidence: `${pct}% giá trị đã tiết kiệm được`, 
      description: `Bạn đã tối ưu ngân sách rất tốt khi tiết kiệm được khoảng ${pct}% giá trị các món hàng nhờ áp mã giảm giá.`,
      icon: '💰' 
    };
  },
  diverse_categories: (d) => {
    const n = d.catCount || 0;
    if (n < 5) return null;
    return { 
      label: 'Khám phá đa dạng', 
      evidence: `${n} danh mục khác nhau`, 
      description: `Nhu cầu tiêu dùng của bạn rất đa dạng khi mua sắm trải rộng trên ${n} nhóm sản phẩm khác nhau.`,
      icon: '🗂️' 
    };
  },
  self_care_priority: (d) => {
    const pct = Math.round((d.selfCareRatio || 0) * 100);
    if (pct < 28) return null;
    return { 
      label: 'Ưu tiên chăm sóc bản thân', 
      evidence: `${pct}% chi cho làm đẹp & sức khỏe`, 
      description: `Bạn rất quan tâm và yêu chiều cơ thể khi dành ra ${pct}% ngân sách cho danh mục sức khỏe & làm đẹp.`,
      icon: '✨' 
    };
  },
  family_buyer: (d) => {
    const pct = Math.round((d.familyRatio || 0) * 100);
    if (pct < 15) return null;
    return { 
      label: 'Mua nhiều cho gia đình', 
      evidence: `${pct}% chi cho đồ trẻ em/gia đình`, 
      description: `Bạn dành nhiều sự chăm chút cho tổ ấm của mình với ${pct}% chi tiêu hướng về các sản phẩm gia đình, mẹ & bé.`,
      icon: '👨‍👩‍👧' 
    };
  },
  year_end_spiker: (d) => {
    const pct = Math.round((d.q4Ratio || 0) * 100);
    if (pct < 40) return null;
    return { 
      label: 'Tập trung mua cuối năm', 
      evidence: `${pct}% chi tiêu tháng 10–12`, 
      description: `Mua sắm của bạn tập trung rất mạnh vào mùa lễ hội cuối năm, riêng quý IV (tháng 10–12) chiếm ${pct}% cả năm.`,
      icon: '🎄' 
    };
  },
  tet_buyer: (d) => {
    const pct = Math.round((d.q1Ratio || 0) * 100);
    if (pct < 30) return null;
    return { 
      label: 'Mua nhiều dịp Tết', 
      evidence: `${pct}% chi tiêu tháng 1–2`, 
      description: `Bạn thường có đợt chi tiêu bận rộn nhất vào dịp sắm sửa đón Tết (tháng 1 & tháng 2), chiếm ${pct}% tổng chi tiêu năm.`,
      icon: '🧧' 
    };
  },
  summer_binge: (d) => {
    const pct = Math.round((d.summerRatio || 0) * 100);
    if (pct < 30) return null;
    return { 
      label: 'Mua nhiều mùa hè', 
      evidence: `${pct}% chi tiêu tháng 6–8`, 
      description: `Chi tiêu của bạn sôi động nhất vào dịp hè từ tháng 6 đến tháng 8, chiếm khoảng ${pct}% ngân sách cả năm.`,
      icon: '☀️' 
    };
  },
};

// Trait priority order per section context
const SECTION_TRAITS = {
  yearly:     null, // show all (full profile on overview)
  monthly:    ['night_owl', 'payday_buyer', 'morning_planner', 'weekend_shopper', 'volatile_spender',
               'consistent_spender', 'binge_then_quiet', 'growing_spender', 'reformed_spender', 'lunch_shopper'],
  categories: ['diverse_categories', 'self_care_priority', 'family_buyer', 'high_avg_value',
               'selective_luxury', 'sale_focused', 'anti_premium'],
  sales:      ['sale_focused', 'sale_only_buyer', 'full_price_loyal', 'high_savings_rate',
               'night_owl', 'weekend_shopper'],
  items:      ['high_avg_value', 'selective_luxury', 'anti_premium', 'high_frequency',
               'diverse_categories', 'sale_focused'],
};

function buildTraitList(triggers, data, maxTraits = 4) {
  const triggerSet = new Set(triggers);
  // Master priority: show most "interesting" traits first
  const masterOrder = [
    'reformed_spender', 'binge_then_quiet', 'night_owl', 'sale_only_buyer',
    'volatile_spender', 'payday_buyer', 'self_care_priority', 'family_buyer',
    'sale_focused', 'high_avg_value', 'selective_luxury', 'growing_spender',
    'consistent_spender', 'morning_planner', 'high_frequency', 'weekend_shopper',
    'full_price_loyal', 'year_end_spiker', 'tet_buyer', 'summer_binge',
    'high_savings_rate', 'diverse_categories', 'lunch_shopper', 'anti_premium',
  ];
  const traits = [];
  for (const key of masterOrder) {
    if (traits.length >= maxTraits) break;
    if (!triggerSet.has(key) || !TRAIT_BUILDERS[key]) continue;
    const trait = TRAIT_BUILDERS[key](data);
    if (trait) traits.push({ key, ...trait });
  }
  return traits;
}

// 2.6 Build AI context string from profile
function buildAIContext(profile) {
  if (!profile) return '';
  const traitSummary = profile.traits.map(t => `${t.label} (${t.evidence})`).join('; ');
  const parts = [`Kiểu người: "${profile.archetype.label}"`];
  if (traitSummary) parts.push(`Đặc điểm nổi bật: ${traitSummary}`);
  return parts.join('. ') + '.';
}

// 2.7 Extended trigger analysis
function analyzeExtendedTriggers(d, temporal, saleStats, variance, yoy, extras) {
  const triggers = analyzeBehaviorTriggers({
    stats: null,
    categories: d.cs || [],
    totalSpend: d.t || 0,
    totalOrders: d.o || 0,
    totalSaved: d.s || 0
  });

  // Temporal
  if ((temporal.nightPct || 0) > 0.18) triggers.push('night_owl');
  if ((temporal.weekendPct || 0) > 0.35) triggers.push('weekend_shopper');
  if ((temporal.lunchPct || 0) > 0.18) triggers.push('lunch_shopper');
  if ((temporal.morningPct || 0) > 0.28) triggers.push('morning_planner');
  if ((temporal.paydayPct || 0) > 0.28) triggers.push('payday_buyer');

  // Variance
  if (variance.isVolatile) triggers.push('volatile_spender');
  if (variance.isConsistent) triggers.push('consistent_spender');
  if (variance.isBinge) triggers.push('binge_buyer');

  // YoY
  if (yoy.isGrowing) triggers.push('growing_spender');
  if (yoy.isReformed) triggers.push('reformed_spender');

  // Sale behavior
  const spendBase = saleStats.totalSpend || d.t || 1;
  const saleRatio = saleStats.saleSpend / spendBase;
  if (saleRatio >= 0.55 && !triggers.includes('sale_focused')) triggers.push('sale_focused');
  if (saleRatio >= 0.78) triggers.push('sale_only_buyer');
  if (saleRatio < 0.20 && (d.o || 0) > 10) triggers.push('full_price_loyal');

  // Value tier
  const totalOrders = d.o || 0;
  const avgVal = totalOrders > 0 ? (d.t || 0) / totalOrders : 0;
  if (avgVal >= 550000 && totalOrders < 25) triggers.push('premium_buyer');
  if (avgVal >= 450000) triggers.push('selective_luxury');
  if (avgVal < 110000 && totalOrders > 30) triggers.push('anti_premium');

  // Category-derived
  if ((extras.selfCareRatio || 0) >= 0.28) triggers.push('self_care_priority');
  if ((extras.familyRatio || 0) >= 0.18) triggers.push('family_buyer');

  // Seasonal
  const yd = d.yd || {};
  let q4T = 0, q1T = 0, summerT = 0, yrTotal = 0;
  for (const yr of Object.values(yd)) {
    for (const [mn, v] of Object.entries(yr.m || {})) {
      const m = Number(mn);
      yrTotal += v || 0;
      if (m >= 10) q4T += v || 0;
      if (m <= 2) q1T += v || 0;
      if (m >= 6 && m <= 8) summerT += v || 0;
    }
  }
  if (yrTotal > 0) {
    if (q4T / yrTotal > 0.48) triggers.push('year_end_spiker');
    if (q1T / yrTotal > 0.38) triggers.push('tet_buyer');
    if (summerT / yrTotal > 0.32) triggers.push('summer_binge');
  }

  return [...new Set(triggers)];
}

// 2.8 Main entry point
function analyzeShoppingPersonality(d) {
  if (!d) return null;

  const ol = d.ol || [];
  const yd = d.yd || {};
  const cs = d.cs || [];

  const temporal = computeTemporalPatterns(ol);
  const saleStats = computeSaleStats(d);
  const variance = computeSpendingVariance(yd);
  const yoy = computeYoYTrend(yd);

  const totalOrders = d.o || 0;
  const totalSpend = d.t || 0;
  const avgOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0;

  let activeMonths = 0;
  for (const yr of Object.values(yd)) {
    if (yr.m) activeMonths += Object.values(yr.m).filter(v => v > 0).length;
  }
  activeMonths = Math.max(activeMonths, 1);

  const catCount = cs.filter(c => c.name !== '🏷️ Khác' && c.name !== 'Khác').length;

  // Category ratios for special detections
  const selfCareSpend = cs.filter(c => {
    const n = (c.name || '').toLowerCase();
    return n.includes('làm đẹp') || n.includes('beauty') || n.includes('sức khỏe') ||
           n.includes('health') || n.includes('chăm sóc') || n.includes('skincare');
  }).reduce((s, c) => s + c.s, 0);

  const familySpend = cs.filter(c => {
    const n = (c.name || '').toLowerCase();
    return n.includes('trẻ em') || n.includes('baby') || n.includes('kids') ||
           n.includes('đồ chơi') || n.includes('toy') || n.includes('mẹ & bé') ||
           n.includes('sơ sinh') || n.includes('bé');
  }).reduce((s, c) => s + c.s, 0);

  // Seasonal ratios
  let q4T = 0, q1T = 0, summerT = 0, yrTotal = 0;
  for (const yr of Object.values(yd)) {
    for (const [mn, v] of Object.entries(yr.m || {})) {
      const m = Number(mn);
      yrTotal += v || 0;
      if (m >= 10) q4T += v || 0;
      if (m <= 2) q1T += v || 0;
      if (m >= 6 && m <= 8) summerT += v || 0;
    }
  }

  const extras = {
    selfCareRatio: totalSpend > 0 ? selfCareSpend / totalSpend : 0,
    familyRatio: totalSpend > 0 ? familySpend / totalSpend : 0,
  };

  const dataCtx = {
    temporal, saleStats, variance, yoy,
    totalOrders, totalSpend, avgOrderValue, activeMonths, catCount,
    totalSaved: d.s || 0,
    selfCareRatio: extras.selfCareRatio,
    familyRatio: extras.familyRatio,
    q4Ratio: yrTotal > 0 ? q4T / yrTotal : 0,
    q1Ratio: yrTotal > 0 ? q1T / yrTotal : 0,
    summerRatio: yrTotal > 0 ? summerT / yrTotal : 0,
  };

  const triggers = analyzeExtendedTriggers(d, temporal, saleStats, variance, yoy, extras);
  const archetype = resolveArchetype(triggers);
  const traits = buildTraitList(triggers, dataCtx);

  const profile = { archetype, traits, triggers, dataCtx };
  profile.aiContext = buildAIContext(profile);
  profile.totalOrders = totalOrders;
  return profile;
}

function showProfileInsight(cardId, profile, sectionType) {
  // No-op: Only Overview screen has the Shopping Profile section
}

window.analyzeShoppingPersonality = analyzeShoppingPersonality;
window.showProfileInsight = showProfileInsight;
window.enrichWithAI = enrichWithAI;
