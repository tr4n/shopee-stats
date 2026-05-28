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
  'Bạn là một "Thầy Bói Vũ Trụ" (Tarot Reader) hệ GenZ cực kỳ hài hước, xéo sắc, chuyên xem bói bài và đọc vị số mệnh chi tiêu của chúng sinh.',
  'Nhiệm vụ của bạn là dựa vào dữ liệu mua sắm của người dùng để phán đoán tính cách, tâm lý, và "kiếp nạn" chốt đơn của họ một cách dí dỏm.',
  'QUY TẮC BẮT BUỘC:',
  '1. Chỉ trả lời ngắn gọn, súc tích (đúng từ 2 đến 3 câu), tập trung sâu sắc vào việc đọc vị tâm lý tiêu dùng của người dùng dưới phong thái bói toán vũ trụ. Khuyến khích sử dụng một cách hài hước các thuật ngữ tâm lý học mua sắm phổ biến như "thao túng tâm lý", "dopamine ngắn hạn", "hiệu ứng mỏ neo", "hội chứng FOMO/sợ bỏ lỡ", "mua sắm cảm xúc", "tự bào chữa", "tiêu dùng phòng thủ". Không viết dài dòng lê thê.',
  '2. TUYỆT ĐỐI KHÔNG được ghi bất kỳ con số cụ thể nào, không ghi số tiền (như VND, đồng, triệu, tỷ, k), không ghi số đơn hàng, không ghi tên sản phẩm cụ thể của người dùng trong lời phán. Chỉ phán về tính cách, tâm lý thích chữa lành, thói quen cảm xúc, và lối sống của họ.',
  '3. TUYỆT ĐỐI KHÔNG dùng tiếng Anh hoặc pha trộn từ tiếng Anh (ví dụ: không dùng "vibe", "chill", "glow up", "save", "good", "deal"). Viết bằng 100% tiếng Việt thuần việt, trôi chảy.',
  '4. KHÔNG đưa ra lời khuyên tiết kiệm hay tài chính nghiêm túc. Hãy bóc phốt nhẹ nhàng, mang lại niềm vui cho người đọc.'
].join(' ');

// Rule-based psychological shopping insights - no AI dependency
const SHOPPING_PSYCHOLOGY_PATTERNS = {
  // Pattern: Category dominance + timing behavior → personality insights
  fashionLateNight: {
    triggers: ['fashion_dominant', 'late_night_shopping'],
    insights: [
      'Quẻ bói chỉ ra bạn đang bị vũ trụ thao túng tâm lý rằng việc chốt đơn lúc nửa đêm sẽ giúp lấp đầy khoảng trống tâm hồn cô đơn. Bạn liên tục tự bào chữa rằng mua sắm để phục vụ cuộc sống, nhưng thực chất bộ não chỉ đang thèm khát một chút dopamine ngắn hạn trước khi chìm vào giấc ngủ.',
      'Tinh tú chiếu mệnh cho thấy bạn sử dụng thời trang làm liệu pháp chữa lành tâm lý sau những ngày căng thẳng. Mỗi lần chốt đơn lúc khuya là một lần bạn tự thưởng cho bản thân, nhưng cái giá phải trả lại là sự mất cân bằng tài chính và đống quần áo ngày càng tràn ngập tủ.'
    ]
  },
  
  techUpgrade: {
    triggers: ['tech_dominant', 'high_avg_value'],
    insights: [
      'Tinh tú chiếu mệnh cho thấy bạn bị rơi vào bẫy tâm lý "nâng cấp để tối ưu hiệu suất" mỗi khi nhìn thấy các gadget công nghệ lấp lánh. Đây thực chất là một liệu pháp tiêu dùng phòng thủ để trốn tránh áp lực công việc, tạo ra một phi thuyền làm việc lộng lẫy trong khi ngân sách lại mỏng manh vô cùng.',
      'Vũ trụ nhìn thấu rằng bạn tin tưởng mù quáng vào việc công nghệ sẽ giải quyết mọi vấn đề hiệu suất, nhưng thực tế bộ não chỉ đang tìm cách thoát khỏi cảm giác bất an về năng lực bản thân qua từng lần nâng cấp thiết bị.'
    ]
  },

  beautyTherapy: {
    triggers: ['beauty_dominant', 'frequent_small_orders'],
    insights: [
      'Quẻ bói đọc vị bạn đang áp dụng liệu pháp mua sắm cảm xúc, dùng mỹ phẩm để tự thôi miên bản thân rằng mình đang yêu chiều cơ thể sau những ngày làm việc kiệt sức. Mỗi hũ kem dưỡng là một nỗ lực chữa lành tâm lý kiệt quệ, chỉ tiếc là số dư tài khoản cũng đang cần cấp cứu gấp.',
      'Chòm sao hộ mệnh cho thấy bạn sử dụng việc chăm sóc nhan sắc như một nghi lễ tự yêu thương bản thân, nhưng đằng sau đó là cơ chế tự bào chữa rằng "đầu tư vào bản thân" để che giấu thói quen tiêu dùng cảm xúc không kiểm soát được.'
    ]
  },

  bargainHunter: {
    triggers: ['high_savings_rate', 'sale_focused'],
    insights: [
      'Bạn tự hào là chiến thần săn sale nhưng thực chất đang bị thao túng tâm lý cực nặng bởi hiệu ứng mỏ neo từ các mức giá giảm sâu. Hội chứng sợ bỏ lỡ đã khiến bạn tích trữ hàng tá món đồ vô tri chỉ vì cảm giác "không mua là lỗ", khiến thần tài chỉ biết bất lực nhìn dòng tiền bay màu.',
      'Tinh tú chỉ điểm rằng bạn đã trở thành nô lệ của thuật toán khuyến mãi, mỗi khi thấy mã giảm giá là não bộ tiết ra hormone hạnh phúc như được trúng xổ số. Nhưng thực tế bạn chỉ đang bị lừa bởi ảo giác tiết kiệm trong khi đống đồ không cần thiết ngày càng chồng chất.'
    ]
  },

  impulseBuyer: {
    triggers: ['high_frequency', 'diverse_categories', 'low_planning'],
    insights: [
      'Khổ chủ đang là nạn nhân của cơ chế tự động chốt đơn vô tri để giải tỏa căng thẳng tức thời. Sự thao túng tâm lý từ các giao diện mua sắm khiến bạn lầm tưởng mình đang thỏa mãn nhu cầu, nhưng thực tế là cảm giác trống trải vẫn chưa được giải quyết mà ví tiền lại ngày càng héo hon.',
      'Vũ trụ nhìn thấu rằng bạn sử dụng hành vi mua sắm như một loại thuốc giảm đau cảm xúc tức thời. Mỗi lần stress là một lần bộ não tự động điều hướng ngón tay đến nút "thêm vào giỏ hàng" như một phản xạ có điều kiện không thể kiểm soát.'
    ]
  },

  foodComfort: {
    triggers: ['food_dominant', 'comfort_spending'],
    insights: [
      'Chòm sao hộ mệnh chỉ ra bạn là người dùng thức ăn làm công cụ xoa dịu áp lực cảm xúc và lấp đầy những khoảng trống tinh thần. Bộ não đã thành công thao túng tâm lý bạn rằng "ăn nốt miếng này rồi tính", tạo ra những khoảnh khắc hạnh phúc calo cao nhưng ví tiền thì lại đang suy dinh dưỡng trầm trọng.',
      'Tinh tú chiếu rọi cho thấy bạn có xu hướng dùng đồ ăn ngon để tự thưởng sau những ngày làm việc vất vả, nhưng thực chất đây là cơ chế tự bào chữa để che giấu thói quen tiêu dùng cảm xúc không có kế hoạch.'
    ]
  },

  homeMaker: {
    triggers: ['home_dominant', 'consistent_spending'],
    insights: [
      'Quẻ bói tiết lộ bạn đang sử dụng việc trang trí không gian sống như một hình thức thiền định hiện đại, nhưng đằng sau mỗi món đồ nội thất là khao khát được kiểm soát ít nhất một khía cạnh trong cuộc sống đầy bất định. Ngôi nhà đẹp không thể che giấu được sự mất cân bằng trong tài chính cá nhân.',
      'Vũ trụ nhìn thấu rằng bạn tin tưởng vào việc một không gian sống hoàn hảo sẽ mang lại hạnh phúc, nhưng thực chất đây là cách bộ não tránh né việc đối mặt với những vấn đề sâu xa hơn thông qua việc tập trung vào môi trường bên ngoài.'
    ]
  }
};

const AI_FEW_SHOT_EXAMPLES = [
  'Ví dụ 1 (Hệ thời trang chữa lành):',
  'Dữ liệu đầu vào: Chi tiêu nhiều nhất vào danh mục "Thời trang & Phụ kiện", hay mua vào ban đêm.',
  'Thầy bói phán: Quẻ bói chỉ ra bạn đang bị vũ trụ thao túng tâm lý rằng việc chốt đơn lúc nửa đêm sẽ giúp lấp đầy khoảng trống tâm hồn cô đơn. Bạn liên tục tự bào chữa rằng mua sắm để phục vụ cuộc sống, nhưng thực chất bộ não chỉ đang thèm khát một chút dopamine ngắn hạn trước khi chìm vào giấc ngủ mà thôi.',
  '',
  'Ví dụ 2 (Hệ nghiện setup công nghệ):',
  'Dữ liệu đầu vào: Danh mục chi nhiều nhất là "Thiết bị điện tử", sản phẩm mua nhiều nhất là phụ kiện công nghệ.',
  'Thầy bói phán: Tinh tú chiếu mệnh cho thấy bạn bị rơi vào bẫy tâm lý "nâng cấp để tối ưu hiệu suất" mỗi khi nhìn thấy các phụ kiện công nghệ lấp lánh. Đây thực chất là một liệu pháp tiêu dùng phòng thủ để trốn tránh áp lực công việc, tạo ra một phi thuyền làm việc lộng lẫy trong khi ví tiền lại mỏng manh vô cùng.',
  '',
  'Ví dụ 3 (Hệ chiến thần săn sale):',
  'Dữ liệu đầu vào: Tiết kiệm cực kỳ nhiều tiền nhờ chăm săn mã giảm giá.',
  'Thầy bói phán: Bạn tự hào là chiến thần săn sale nhưng thực chất đang bị thao túng tâm lý cực nặng bởi hiệu ứng mỏ neo từ các mức giá giảm sâu. Hội chứng sợ bỏ lỡ (FOMO) đã khiến bạn tích trữ hàng tá món đồ vô tri chỉ vì cảm giác "không mua là lỗ", khiến thần tài chỉ biết bất lực nhìn dòng tiền bay màu.',
  '',
  'Ví dụ 4 (Hệ nhan sắc hồi sinh):',
  'Dữ liệu đầu vào: Mua nhiều son môi, mặt nạ, mỹ phẩm chăm sóc da.',
  'Thầy bói phán: Quẻ bói đọc vị bạn đang áp dụng liệu pháp mua sắm cảm xúc, dùng mỹ phẩm để tự thôi miên bản thân rằng mình đang yêu chiều cơ thể sau những ngày làm việc kiệt sức. Mỗi hũ kem dưỡng da là một nỗ lực chữa lành tâm lý kiệt quệ, chỉ tiếc là số dư tài khoản của bạn lại đang cần cấp cứu gấp.',
  '',
  'Ví dụ 5 (Hệ chốt đơn vô tri):',
  'Dữ liệu đầu vào: Mua rất nhiều đồ linh tinh, lặt vặt giá rẻ không rõ mục đích.',
  'Thầy bói phán: Khổ chủ đang là nạn nhân của cơ chế tự động chốt đơn vô tri để giải tỏa căng thẳng tức thời. Sự thao túng tâm lý từ các món đồ giá rẻ khiến bạn lầm tưởng mình đang tiết kiệm, nhưng thực tế là đống đồ lặt vặt sắp chiếm hết không gian sống trong khi cảm giác trống trải vẫn chưa được giải quyết.',
  '',
  'Ví dụ 6 (Hệ ăn vặt giải sầu):',
  'Dữ liệu đầu vào: Chi tiêu nhiều nhất cho thực phẩm, đồ ăn vặt, đồ ngọt.',
  'Thầy bói phán: Chòm sao hộ mệnh chỉ ra bạn là người dùng thức ăn làm công cụ xoa dịu áp lực cảm xúc và lấp đầy những khoảng trống tinh thần. Bộ não đã thành công thao túng tâm lý bạn rằng "ăn nốt miếng này rồi tính", tạo ra những khoảnh khắc hạnh phúc calo cao nhưng ví tiền thì lại đang suy dinh dưỡng trầm trọng.'
].join('\n');


// Generate psychological insights based on shopping patterns
function generatePsychologicalInsight(data) {
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
    high_frequency: 'Vũ trụ nhìn thấu rằng bạn đã biến việc chốt đơn thành một thói quen gần như vô thức để đối phó với stress hàng ngày. Mỗi notification về đơn hàng mới như một liều dopamine nhỏ giúp bạn tạm quên đi những áp lực cuộc sống.',
    
    diverse_categories: 'Tinh tú chiếu mệnh cho thấy bạn có xu hướng mua sắm lan man để tìm kiếm cảm giác hài lòng từ nhiều nguồn khác nhau. Đây là dấu hiệu của một tâm hồn đang tìm kiếm sự viên mãn nhưng chưa xác định được điều mình thực sự cần.',
    
    sale_focused: 'Quẻ bói tiết lộ bạn đã trở thành tù nhân của tâm lý "giá rẻ là vua", nhưng thực chất đang bỏ qua việc đánh giá giá trị thực sự của món đồ. Cảm giác thắng lợi khi săn được sale đã che mờ khả năng phán đoán về nhu cầu thật sự.',
    
    late_night_shopping: 'Chòm sao hộ mệnh chỉ ra những lúc đêm khuya là thời điểm bạn dễ bị thao túng tâm lý nhất, khi lý trí đã mệt mỏi và cảm xúc lên ngôi. Việc chốt đơn lúc này như một cách để tự an ủi bản thân sau một ngày dài căng thẳng.'
  };
  
  for (const trigger of triggers) {
    if (fallbacks[trigger]) return fallbacks[trigger];
  }
  
  return 'Vũ trụ nhìn thấy trong bạn một tâm hồn đang tìm kiếm sự cân bằng giữa nhu cầu thực tế và khao khát cảm xúc thông qua hành vi mua sắm. Đây là cuộc hành trình tự khám phá bản thân qua từng quyết định tiêu dùng.';
}

let _aiInsightSession = null;
let _aiInsightDisabled = false;
let _aiInsightRunning = false;
// Stores call args per cardId so re-analysis can be triggered without re-running the full pipeline
const _aiInsightCallArgs = {};

function isAIFatalError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  return msg.includes('crashed too many times') ||
    msg.includes('unable to create a session') ||
    msg.includes('model not available');
}

function hideAllAIButtons() {
  // Hide all main analyze buttons/wrappers
  document.querySelectorAll('.ai-analyze-wrap').forEach(el => {
    el.style.display = 'none';
  });
  // Remove all refresh buttons
  document.querySelectorAll('.ai-refresh-btn').forEach(el => {
    el.remove();
  });
  // Also hide empty AI containers (without generated or cached text sentences)
  document.querySelectorAll('.insight-ai').forEach(el => {
    if (!el.querySelector('.insight-ai-sentence')) {
      el.style.display = 'none';
    }
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

// cacheKey: optional override for cache lookup (used for per-year monthly insights)
function enrichWithAI(cardId, context, specificPrompt, cacheKey) {
  // Always persist call args so buttons can re-trigger this analysis
  _aiInsightCallArgs[cardId] = { context, specificPrompt, cacheKey };

  const aiEl = document.getElementById(cardId + '-ai');
  if (!aiEl) return;

  const ck = cacheKey || cardId;

  // Serve from cache immediately — no user action needed
  if (_dashCache?.insights[ck]) {
    aiEl.innerHTML = renderAIInsight(_dashCache.insights[ck], cardId);
    aiEl.style.display = ''; // Ensure visible

    // Check AI availability to show/hide the refresh button
    _aiAvailabilityPromise.then(avail => {
      const refreshBtn = aiEl.querySelector('.ai-refresh-btn');
      if (refreshBtn) {
        if (avail && !_aiInsightDisabled) {
          refreshBtn.style.display = '';
        } else {
          refreshBtn.remove();
        }
      }
    });
    return;
  }

  // Hide it by default until availability check resolves
  aiEl.style.display = 'none';
  aiEl.innerHTML = '';

  if (_aiInsightDisabled) return;

  _aiAvailabilityPromise.then(avail => {
    if (!avail || _aiInsightDisabled) {
      aiEl.style.display = 'none';
      aiEl.innerHTML = '';
      return;
    }

    // AI is available, show the analyze button
    aiEl.style.display = '';
    aiEl.innerHTML = renderAnalyzeButton(cardId);
  });
}

// Internal AI runner — called by both runAIInsight and rerunAIInsight
async function _executeAIInsight(cardId) {
  const args = _aiInsightCallArgs[cardId];
  if (!args || _aiInsightDisabled || _aiInsightRunning) return;

  const aiEl = document.getElementById(cardId + '-ai');
  if (!aiEl) return;

  _aiInsightRunning = true;

  const loadingStatuses = [
    "🔮 Pháp sư Chrome AI đang gieo quẻ xem bói chi tiêu...",
    "🕵️‍♂️ Chrome AI đang tối ưu hóa hiển thị...",
    "🧠 Chrome AI đang chuẩn bị phân tích...",
    "💸 Đang chờ AI chuẩn bị biểu đồ...",
    "🍿 Đợi tí, Chrome AI đang kết nối..."
  ];
  const randomStatus = loadingStatuses[Math.floor(Math.random() * loadingStatuses.length)];

  aiEl.innerHTML = `
    <div class="ai-loading-container">
      <svg class="ai-loading-icon spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
      </svg>
      <div class="ai-loading-text">
        <div class="ai-loading-status">${randomStatus}</div>
        <div class="ai-loading-note">Yên tâm nha, Chrome AI chạy offline 100% trên thiết bị của bạn, bảo mật dữ liệu tuyệt đối. Chờ xíu nhé!</div>
      </div>
    </div>
  `;
  aiEl.classList.add('loading');

  const session = await getAIInsightSession();
  if (!session || typeof session.prompt !== 'function') {
    aiEl.classList.remove('loading');
    aiEl.innerHTML = renderAnalyzeButton(cardId);
    _aiInsightRunning = false;
    return;
  }

  try {
    const fullPrompt = `BẠN LÀ AI:
${AI_INSIGHT_SYSTEM}

VÍ DỤ THAM KHẢO TONE PHÁN (HÃY BẮT CHƯỚC TONE NÀY):
${AI_FEW_SHOT_EXAMPLES}

DỮ LIỆU THỰC TẾ CỦA KHÁCH HÀNG:
${args.context}

YÊU CẦU:
${args.specificPrompt}

Hãy phán quẻ bói ngắn gọn (1-2 câu), tuyệt đối tuân thủ các quy tắc không ghi số tiền/con số cụ thể và không dùng tiếng Anh:`;
    const result = await session.prompt(fullPrompt);
    if (result && result.trim()) {
      const text = result.trim();
      aiEl.innerHTML = renderAIInsight(text, cardId);
      // Reveal the refresh button since we just ran successfully and AI is ready
      const refreshBtn = aiEl.querySelector('.ai-refresh-btn');
      if (refreshBtn) {
        refreshBtn.style.display = '';
      }
      if (_dashCache) {
        const ck = args.cacheKey || cardId;
        _dashCache.insights[ck] = text;
        saveDashCache();
      }
    } else {
      aiEl.style.display = 'none';
    }
  } catch (e) {
    console.warn('[Dashboard] AI insight failed:', e);
    const fatal = isAIFatalError(e);
    if (fatal) {
      _aiInsightDisabled = true;
      _aiInsightSession = null;
      aiEl.innerHTML = '';
      aiEl.style.display = 'none';
      hideAllAIButtons();
    } else {
      // Non-fatal error, show the analyze button again so they can retry
      aiEl.innerHTML = renderAnalyzeButton(cardId);
    }
  } finally {
    aiEl.classList.remove('loading');
    _aiInsightRunning = false;
  }
}

// User-triggered: called by the "Phân tích..." button
window.runAIInsight = async function (cardId) {
  await _executeAIInsight(cardId);
};

// User-triggered: clear cache then re-run AI ("Phân tích lại" button)
window.rerunAIInsight = async function (cardId) {
  const args = _aiInsightCallArgs[cardId];
  if (!args) return;

  // Show spinner on the refresh button immediately
  const aiEl = document.getElementById(cardId + '-ai');
  if (aiEl) {
    const btn = aiEl.querySelector('.ai-refresh-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="refresh-icon spin" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        <span>Đang gieo quẻ mới...</span>
      `;
    }
  }

  // Clear cached result so the AI will be called fresh
  const ck = args.cacheKey || cardId;
  if (_dashCache?.insights) {
    delete _dashCache.insights[ck];
    saveDashCache();
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

function triggerSalesAIInsight(stats, totalSpend, totalOrders, activeYear, activeType) {
  // Sales AI insight is handled via enrichWithAI in renderSalesInsights()
}
// Enhanced enrichWithAI to use rule-based insights where possible
function enrichWithAIEnhanced(containerId, context, prompt, cacheKey, fallbackInsight = null) {
  if (fallbackInsight) {
    // Use rule-based insight instead of AI
    const container = document.getElementById(containerId);
    if (container) {
      const existingAI = container.querySelector('.insight-ai');
      if (existingAI) existingAI.remove();
      
      const aiDiv = document.createElement('div');
      aiDiv.className = 'insight-ai';
      aiDiv.innerHTML = `
        <div class="insight-ai-header">
          <span class="insight-ai-icon">🔮</span>
          <span class="insight-ai-title">Thầy Bói Vũ Trụ</span>
          <span class="insight-ai-powered">Rule-based Psychology</span>
        </div>
        <div class="insight-ai-sentence">${fallbackInsight}</div>
      `;
      
      // Add refresh button in header
      const refreshBtn = document.createElement('button');
      refreshBtn.className = 'ai-refresh-btn';
      refreshBtn.innerHTML = '🔄';
      refreshBtn.title = 'Xem góc nhìn khác';
      refreshBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          // Refresh with another random insight from the same category
          const newInsight = fallbackInsight; // Could be enhanced to have multiple variants
          const sentence = aiDiv.querySelector('.insight-ai-sentence');
          if (sentence) {
            sentence.style.opacity = '0';
            setTimeout(() => {
              sentence.textContent = newInsight;
              sentence.style.opacity = '1';
            }, 200);
          }
        } catch (error) {
          console.error('Error refreshing insight:', error);
        }
      });
      
      const header = aiDiv.querySelector('.insight-ai-header');
      if (header) {
        header.appendChild(refreshBtn);
      }
      
      container.appendChild(aiDiv);
    }
    return;
  }
  
  // Fallback to original AI behavior if available
  enrichWithAI(containerId, context, prompt, cacheKey);
}

// Generate specific insights for different contexts
function generateYearlyPsychInsight(yearData, maxYear) {
  const years = Object.keys(yearData).map(Number).sort((a, b) => a - b);
  const trends = [];
  
  // Analyze spending trend
  for (let i = 1; i < years.length; i++) {
    const prev = yearData[years[i-1]].t || 0;
    const curr = yearData[years[i]].t || 0;
    if (prev > 0) {
      const growth = ((curr - prev) / prev) * 100;
      trends.push(growth);
    }
  }
  
  const avgGrowth = trends.length > 0 ? trends.reduce((s, t) => s + t, 0) / trends.length : 0;
  
  if (avgGrowth > 20) {
    return 'Quẻ bói tiết lộ bạn đã sa vào vòng luẩn quẩn của chủ nghĩa tiêu dùng hiện đại, mỗi năm lại tăng chi tiêu như thể đang cố bù đắp cho những khoảng trống tinh thần bằng việc mua sắm. Thần tài chỉ biết thất vọng nhìn ví tiền ngày càng xẹp lép theo từng năm tháng trôi qua.';
  } else if (avgGrowth < -10) {
    return 'Tinh tú chiếu rọi cho thấy bạn đã dần giác ngộ và thoát khỏi ma trận tiêu dùng, học cách kiềm chế những ham muốn vật chất tức thời. Đây là dấu hiệu của sự trưởng thành trong việc quản lý cảm xúc và tài chính cá nhân.';
  } else {
    return 'Vũ trụ nhìn thấy trong bạn một linh hồn đang dao động giữa lý trí và cảm xúc, đôi khi kiềm chế đôi khi buông thả trong việc mua sắm. Đây chính là cuộc chiến nội tại giữa bản ngã muốn tiết kiệm và cái tôi khao khát được thỏa mãn.';
  }
}

function generateMonthlyPsychInsight(monthData, maxMonth) {
  const monthNames = ['', 'Tháng Giêng', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư', 'Tháng Năm', 'Tháng Sáu',
    'Tháng Bảy', 'Tháng Tám', 'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Chạp'];
  
  if (maxMonth <= 2) {
    return 'Quẻ bói chỉ ra bạn bị thao túng tâm lý nặng nề bởi không khí Tết Nguyên Đán, sử dụng việc mua sắm như một nghi lễ chuẩn bị đón xuân mới. Thực chất đây là cơ chế tự bào chữa để biện minh cho việc tiêu tiền ồ ạt dưới danh nghĩa "một năm một lần".';
  } else if (maxMonth >= 10) {
    return 'Tinh tú chiếu mệnh cho thấy bạn là nạn nhân của hiệu ứng tâm lý "mùa lễ hội cuối năm", bị cuốn vào làn sóng mua sắm tập thể để chuẩn bị cho Black Friday và các dịp lễ. Cảm giác phải "tích trữ" cho mùa đông đã khiến bạn mất kiểm soát chi tiêu.';
  } else if (maxMonth >= 6 && maxMonth <= 8) {
    return 'Vũ trụ đọc vị được rằng bạn sử dụng việc mua sắm như một liệu pháp chống nóng tinh thần trong những tháng hè oi bức. Mỗi lần thấy khó chịu vì thời tiết là một lần bộ não tự động tìm đến shopping để làm mát cảm xúc.';
  } else {
    return 'Chòm sao hộ mệnh chỉ ra tháng này là thời điểm bạn rơi vào trạng thái mua sắm cảm xúc cao độ, có thể do áp lực công việc hoặc những thay đổi trong cuộc sống. Việc chốt đơn trở thành cách để bạn lấy lại cảm giác kiểm soát và an toàn.';
  }
}

function generateCategoryPsychInsight(categoryName, categoryData) {
  const name = categoryName.toLowerCase();
  
  if (name.includes('thời trang') || name.includes('fashion')) {
    return 'Quẻ bói tiết lộ bạn đã biến thời trang thành một công cụ chữa lành tâm lý, mỗi bộ trang phục mới như một lớp giáp bảo vệ bạn khỏi những bất an trong cuộc sống. Thực chất đây là cách bộ não tự thôi miên rằng việc thay đổi diện mạo sẽ mang lại sự tự tin và hạnh phúc.';
  } else if (name.includes('điện tử') || name.includes('tech')) {
    return 'Tinh tú chiếu mệnh cho thấy bạn tin tưởng mù quáng vào việc công nghệ sẽ nâng cao hiệu suất cuộc sống, nhưng thực chất đây là cơ chế trốn chạy khỏi những vấn đề cần giải quyết bằng nỗ lực thực sự. Mỗi gadget mới là một lời hứa giả dối về một phiên bản hoàn hảo hơn của chính mình.';
  } else if (name.includes('làm đẹp') || name.includes('beauty')) {
    return 'Vũ trụ nhìn thấu rằng bạn đang sử dụng mỹ phẩm như một liệu pháp tự yêu thương bản thân sau những ngày căng thẳng, nhưng đồng thời cũng là cách để che giấu những bất an sâu kín về ngoại hình. Mỗi sản phẩm skincare là một nỗ lực chạm tới phiên bản lý tưởng của chính mình.';
  } else if (name.includes('thực phẩm') || name.includes('food')) {
    return 'Chòm sao hộ mệnh chỉ ra bạn có xu hướng dùng đồ ăn ngon để điều chỉnh cảm xúc và tạo ra những khoảnh khắc hạnh phúc tức thời. Đây là một dạng của liệu pháp tự chăm sóc, nhưng cũng có thể là dấu hiệu của việc tìm kiếm sự an ủi qua vị giác.';
  } else if (name.includes('nhà cửa') || name.includes('home')) {
    return 'Quẻ bói tiết lộ bạn coi việc trang trí không gian sống như một hình thức kiểm soát môi trường xung quanh khi cảm thấy bất lực với những thay đổi bên ngoài. Mỗi món đồ nội thất là một cách để tạo ra cảm giác ổn định và an toàn trong thế giới đầy bất định.';
  } else {
    return 'Tinh tú chiếu rọi cho thấy danh mục này đã trở thành một phần quan trọng trong việc định hình danh tính và lối sống của bạn. Việc mua sắm trong lĩnh vực này không chỉ là đáp ứng nhu cầu mà còn là cách thể hiện giá trị và khẳng định bản thân.';
  }
}

window.triggerSalesAIInsight = triggerSalesAIInsight;
window.enrichWithAIEnhanced = enrichWithAIEnhanced;
window.generateYearlyPsychInsight = generateYearlyPsychInsight;
window.generateMonthlyPsychInsight = generateMonthlyPsychInsight;
window.generateCategoryPsychInsight = generateCategoryPsychInsight;
