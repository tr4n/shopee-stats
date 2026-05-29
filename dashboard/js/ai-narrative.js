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
  'Ví dụ 1:',
  'Hồ sơ đã phân tích: Kiểu người "Tín Đồ Mua Khuya". Đặc điểm: Hay mua khuya (31% đơn sau 22h); Thích săn sale (68% chi ngày sale); Chi tiêu không đều (dao động lớn theo tháng).',
  'Nhận xét: Bạn dùng màn hình tối và giỏ hàng nửa đêm như một nghi lễ xoa dịu — không hẳn cần món đồ, mà cần cái cảm giác "mình vẫn đang làm gì đó cho bản thân". Tinh tú mách rằng ban ngày bạn kiểm soát rất tốt, nhưng đêm xuống thì ví tiền mất quyền bầu cử.',
  '',
  'Ví dụ 2:',
  'Hồ sơ đã phân tích: Kiểu người "Chiến Thần Săn Sale". Đặc điểm: Thích săn sale (73% chi ngày sale); Mua sắm thường xuyên (trung bình nhiều đơn/tháng); Hay mua cuối tuần.',
  'Nhận xét: Não bộ bạn đã được lập trình để coi "giảm giá" là phần thưởng, không phải món đồ — mỗi đơn hàng chốt là một chiến thắng dopamine thuần túy, bất kể có dùng hay không. Chòm sao hộ mệnh chứng nhận: đây là loại hạnh phúc rẻ nhất và đắt nhất cùng một lúc.',
  '',
  'Ví dụ 3:',
  'Hồ sơ đã phân tích: Kiểu người "Người Mua Chọn Lọc". Đặc điểm: Ưa đồ chất lượng (giá trị đơn cao); Mua sắm thưa thớt; Chi tiêu tăng dần theo năm.',
  'Nhận xét: Bạn không mua nhiều, nhưng mỗi lần mua là một tuyên ngôn — rằng bạn xứng đáng có thứ tốt, và thứ rẻ tiền chỉ tốn tiền hai lần. Tinh tú chiếu rọi: đây là tư duy cao cấp, chỉ tiếc ví tiền đôi khi không đồng thuận với tiêu chuẩn của bạn.',
  '',
  'Ví dụ 4:',
  'Hồ sơ đã phân tích: Kiểu người "Người Mua Sắm Cảm Xúc". Đặc điểm: Chi tiêu không đều (CV cao); Hay mua cuối tuần; Đa dạng danh mục.',
  'Nhận xét: Với bạn, mua sắm không phải kế hoạch — đó là phản xạ cảm xúc, một nút "reset" cho tâm trạng. Vũ trụ ghi nhận: bạn đang dùng giỏ hàng như nhật ký cảm xúc, và mỗi đơn hàng là một trang viết về trạng thái nội tâm hôm đó.'
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

  // Serve from cache — render profile + cached AI narrative
  if (cached !== null) {
    aiEl.innerHTML = renderAIInsight(cached, cardId, profile);
    aiEl.style.display = '';
    _aiAvailabilityPromise.then(avail => {
      const refreshBtn = aiEl.querySelector('.ai-refresh-btn');
      if (refreshBtn) refreshBtn.style.display = (avail && !_aiInsightDisabled) ? '' : 'none';
    });
    return;
  }

  // No cache — if profile available render archetype+traits immediately
  if (profile) {
    aiEl.innerHTML = renderAIInsight(null, cardId, profile);
    aiEl.style.display = '';
  } else {
    aiEl.style.display = 'none';
    aiEl.innerHTML = '';
  }

  if (_aiInsightDisabled) {
    if (!profile) _tryRuleBasedFallback(aiEl, cardId, fallbackFn);
    return;
  }

  _aiAvailabilityPromise.then(avail => {
    if (!avail || _aiInsightDisabled) {
      if (!profile) _tryRuleBasedFallback(aiEl, cardId, fallbackFn);
      return;
    }

    if (profile || autoRun) {
      // Profile shown OR auto-run: skip analyze button, go directly to AI
      setTimeout(() => {
        const stillEmpty = _getInsightText(ck) === null;
        if (stillEmpty && !_aiInsightRunning.has(cardId) && !_aiInsightDisabled) {
          _executeAIInsight(cardId);
        }
      }, profile ? 100 : 600);
    } else {
      // No profile, not auto-run: show analyze button
      aiEl.style.display = '';
      aiEl.innerHTML = renderAnalyzeButton(cardId);
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
  if (!args || _aiInsightDisabled) return;
  if (_aiInsightRunning.has(cardId)) return;

  const aiEl = document.getElementById(cardId + '-ai');
  if (!aiEl) return;

  _aiInsightRunning.add(cardId);

  const profile = args.profile;
  const ck = args.cacheKey || cardId;

  if (profile) {
    // Two-step: profile already shown — add inline loading in the narrative zone
    let narrativeEl = aiEl.querySelector('.ai-narrative');
    if (!narrativeEl) {
      aiEl.insertAdjacentHTML('beforeend',
        `<div class="ai-narrative"><div class="ai-narrative-label">AI nhận xét</div>` +
        `<div class="ai-narrative-body"><span class="ai-narrative-loading">🔮 Đang phân tích tính cách...</span></div></div>`
      );
    } else {
      const body = narrativeEl.querySelector('.ai-narrative-body');
      if (body) body.innerHTML = '<span class="ai-narrative-loading">🔮 Đang phân tích tính cách...</span>';
    }
    aiEl.style.display = '';
  } else {
    // No profile: full loading state replaces card content
    const loadingStatuses = [
      "🔮 Chrome AI đang đọc vị...",
      "🧠 Chrome AI đang phân tích tính cách...",
      "💫 Chrome AI đang kết nối...",
      "🍿 Đợi tí, Chrome AI đang khởi động..."
    ];
    const status = loadingStatuses[Math.floor(Math.random() * loadingStatuses.length)];
    aiEl.innerHTML = `
      <div class="ai-loading-container">
        <svg class="ai-loading-icon spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        <div class="ai-loading-text">
          <div class="ai-loading-status">${status}</div>
          <div class="ai-loading-note">Chrome AI chạy offline 100% trên thiết bị, bảo mật dữ liệu tuyệt đối.</div>
        </div>
      </div>`;
    aiEl.classList.add('loading');
    aiEl.style.display = '';
  }

  const session = await getAIInsightSession();
  if (!session || typeof session.prompt !== 'function') {
    // Remove loading indicator, keep profile visible
    const narrativeEl = aiEl.querySelector('.ai-narrative');
    if (narrativeEl) narrativeEl.remove();
    if (!profile) {
      aiEl.classList.remove('loading');
      // Only show analyze button if AI might become available later
      if (!_aiInsightDisabled) aiEl.innerHTML = renderAnalyzeButton(cardId);
      else aiEl.style.display = 'none';
    }
    _aiInsightRunning.delete(cardId);
    return;
  }

  try {
    const fullPrompt = _buildFullPrompt(args);
    let resultText = '';

    if (profile) {
      // Stream directly into narrative section
      let narrativeEl = aiEl.querySelector('.ai-narrative');
      if (!narrativeEl) {
        aiEl.insertAdjacentHTML('beforeend',
          `<div class="ai-narrative"><div class="ai-narrative-label">AI nhận xét</div><div class="ai-narrative-body"></div></div>`
        );
        narrativeEl = aiEl.querySelector('.ai-narrative');
      }
      if (!narrativeEl) { _aiInsightRunning.delete(cardId); return; } // guard
      const narrativeBody = narrativeEl.querySelector('.ai-narrative-body');

      if (typeof session.promptStreaming === 'function') {
        const stream = session.promptStreaming(fullPrompt);
        for await (const chunk of stream) {
          resultText = chunk;
          if (narrativeBody) narrativeBody.innerHTML = renderSentencesHTML(chunk);
        }
      } else {
        resultText = await session.prompt(fullPrompt);
        if (narrativeBody && resultText) narrativeBody.innerHTML = renderSentencesHTML(resultText.trim());
      }

      const finalText = resultText ? resultText.trim() : '';
      if (finalText) {
        _saveInsightText(ck, finalText);
        narrativeEl.classList.add('ai-narrative--appear');
        const refreshBtn = aiEl.querySelector('.ai-refresh-btn');
        if (refreshBtn) refreshBtn.style.display = '';
      } else {
        // No AI output — remove the narrative section but keep the profile card visible
        narrativeEl.remove();
      }
    } else {
      // Legacy: stream into shell body
      aiEl.classList.remove('loading');
      aiEl.innerHTML = renderAIInsightShell(cardId);
      const bodyEl = aiEl.querySelector('.insight-ai-body');

      if (typeof session.promptStreaming === 'function') {
        const stream = session.promptStreaming(fullPrompt);
        for await (const chunk of stream) {
          resultText = chunk;
          if (bodyEl) bodyEl.innerHTML = renderSentencesHTML(chunk);
        }
      } else {
        resultText = await session.prompt(fullPrompt);
        aiEl.classList.remove('loading');
      }

      if (resultText && resultText.trim()) {
        const text = resultText.trim();
        _saveInsightText(ck, text);
        aiEl.innerHTML = renderAIInsight(text, cardId, null);
        const body = aiEl.querySelector('.insight-ai-body');
        if (body) body.classList.add('insight-ai-body--appear');
        const refreshBtn = aiEl.querySelector('.ai-refresh-btn');
        if (refreshBtn) refreshBtn.style.display = '';
        aiEl.style.display = '';
      } else {
        aiEl.style.display = 'none';
      }
    }
  } catch (e) {
    console.warn('[Dashboard] AI insight failed:', e);
    if (isAIFatalError(e)) {
      _aiInsightDisabled = true;
      _aiInsightSession = null;
      if (profile) {
        // Preserve profile card — just remove the narrative section
        const narrativeEl = aiEl.querySelector('.ai-narrative');
        if (narrativeEl) narrativeEl.remove();
      } else {
        aiEl.innerHTML = '';
        aiEl.style.display = 'none';
      }
      hideAllAIButtons();
    } else {
      if (profile) {
        const narrativeEl = aiEl.querySelector('.ai-narrative');
        if (narrativeEl) narrativeEl.remove();
      } else {
        aiEl.classList.remove('loading');
        aiEl.innerHTML = renderAnalyzeButton(cardId);
      }
    }
  } finally {
    aiEl.classList.remove('loading');
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
    return { label: 'Hay mua khuya', evidence: `${pct}% đơn đặt sau 22h`, icon: '🌙' };
  },
  payday_buyer: (d) => {
    const pct = Math.round((d.temporal?.paydayPct || 0) * 100);
    if (pct < 28) return null;
    return { label: 'Mua nhiều đầu/giữa tháng', evidence: `${pct}% đơn ngày 1–3 & 15–17`, icon: '💸' };
  },
  morning_planner: (d) => {
    const pct = Math.round((d.temporal?.morningPct || 0) * 100);
    if (pct < 28) return null;
    return { label: 'Mua buổi sáng', evidence: `${pct}% đơn đặt 8h–12h`, icon: '☀️' };
  },
  weekend_shopper: (d) => {
    const pct = Math.round((d.temporal?.weekendPct || 0) * 100);
    if (pct < 30) return null;
    return { label: 'Cuối tuần hay mua sắm', evidence: `${pct}% đơn thứ 7–CN`, icon: '📅' };
  },
  lunch_shopper: (d) => {
    const pct = Math.round((d.temporal?.lunchPct || 0) * 100);
    if (pct < 15) return null;
    return { label: 'Mua giờ nghỉ trưa', evidence: `${pct}% đơn 11h–14h`, icon: '🍱' };
  },
  sale_focused: (d) => {
    const pct = Math.round(((d.saleStats?.saleSpend || 0) / Math.max(d.saleStats?.totalSpend || 1, 1)) * 100);
    if (pct < 30) return null;
    return { label: 'Thích săn sale', evidence: `${pct}% chi vào ngày khuyến mãi`, icon: '🎯' };
  },
  sale_only_buyer: (d) => {
    const pct = Math.round(((d.saleStats?.saleSpend || 0) / Math.max(d.saleStats?.totalSpend || 1, 1)) * 100);
    if (pct < 75) return null;
    return { label: 'Chỉ mua khi có sale', evidence: `${pct}% chi vào ngày sale`, icon: '🔥' };
  },
  full_price_loyal: (d) => {
    const pct = Math.round(((d.saleStats?.saleSpend || 0) / Math.max(d.saleStats?.totalSpend || 1, 1)) * 100);
    if (pct > 25 || (d.totalOrders || 0) < 8) return null;
    return { label: 'Không phụ thuộc vào sale', evidence: `Chỉ ${pct}% chi vào ngày giảm giá`, icon: '🛡️' };
  },
  volatile_spender: (d) => {
    if (!d.variance?.isVolatile) return null;
    const minStr = fmtVND(d.variance.minVal || 0);
    const maxStr = fmtVND(d.variance.maxVal || 0);
    return { label: 'Chi tiêu không đều', evidence: `Từ ${minStr} đến ${maxStr}/tháng`, icon: '📊' };
  },
  consistent_spender: (d) => {
    if (!d.variance?.isConsistent) return null;
    const avgStr = fmtVND(d.variance.mean || 0);
    return { label: 'Chi tiêu đều đặn', evidence: `Ổn định ~${avgStr}/tháng`, icon: '📐' };
  },
  binge_then_quiet: (d) => {
    if (!d.variance?.isBinge) return null;
    const MONTHS_VN = ['', 'T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
    const mn = d.variance.bingeMonth;
    const yr = d.variance.bingeYear;
    const ratio = d.variance.mean > 0 ? (d.variance.maxVal / d.variance.mean).toFixed(1) : '?';
    const label = mn ? `${MONTHS_VN[mn]}${yr ? '/' + yr : ''}` : 'một tháng';
    return { label: 'Có tháng mua bùng phát', evidence: `${label} nhiều hơn ${ratio}x tháng bình thường`, icon: '💥' };
  },
  high_frequency: (d) => {
    const perMonth = Math.round((d.totalOrders || 0) / Math.max(d.activeMonths || 1, 1));
    if (perMonth < 3) return null;
    return { label: 'Mua sắm thường xuyên', evidence: `Trung bình ~${perMonth} đơn/tháng`, icon: '🛍️' };
  },
  high_avg_value: (d) => {
    const avg = d.avgOrderValue || 0;
    if (avg < 300000) return null;
    return { label: 'Ưa đồ chất lượng', evidence: `Trung bình ${fmtVND(avg)}/đơn`, icon: '💎' };
  },
  selective_luxury: (d) => {
    const avg = d.avgOrderValue || 0;
    if (avg < 450000) return null;
    return { label: 'Thiên về hàng cao cấp', evidence: `Trung bình ${fmtVND(avg)}/đơn`, icon: '👑' };
  },
  anti_premium: (d) => {
    const avg = d.avgOrderValue || 0;
    const orders = d.totalOrders || 0;
    if (avg >= 120000 || orders < 25) return null;
    return { label: 'Ưa đồ giá tốt', evidence: `Trung bình ${fmtVND(avg)}/đơn`, icon: '🏷️' };
  },
  growing_spender: (d) => {
    if (!d.yoy?.isGrowing) return null;
    const pct = d.yoy.pctChange;
    return { label: 'Chi tiêu ngày càng tăng', evidence: `Tăng ${pct}% từ ${d.yoy.firstYear}→${d.yoy.lastYear}`, icon: '📈' };
  },
  reformed_spender: (d) => {
    if (!d.yoy?.isReformed) return null;
    const pct = Math.abs(d.yoy.pctChange);
    return { label: 'Đang cắt giảm chi tiêu', evidence: `Giảm ${pct}% từ ${d.yoy.firstYear}→${d.yoy.lastYear}`, icon: '🌱' };
  },
  high_savings_rate: (d) => {
    const saved = d.totalSaved || 0;
    const total = d.totalSpend || 0;
    if (!saved || !total) return null;
    const pct = Math.round((saved / (saved + total)) * 100);
    if (pct < 10) return null;
    return { label: 'Tiết kiệm tốt nhờ sale', evidence: `${pct}% giá trị đã tiết kiệm được`, icon: '💰' };
  },
  diverse_categories: (d) => {
    const n = d.catCount || 0;
    if (n < 5) return null;
    return { label: 'Khám phá đa dạng', evidence: `${n} danh mục khác nhau`, icon: '🗂️' };
  },
  self_care_priority: (d) => {
    const pct = Math.round((d.selfCareRatio || 0) * 100);
    if (pct < 28) return null;
    return { label: 'Ưu tiên chăm sóc bản thân', evidence: `${pct}% chi cho làm đẹp & sức khỏe`, icon: '✨' };
  },
  family_buyer: (d) => {
    const pct = Math.round((d.familyRatio || 0) * 100);
    if (pct < 15) return null;
    return { label: 'Mua nhiều cho gia đình', evidence: `${pct}% chi cho đồ trẻ em/gia đình`, icon: '👨‍👩‍👧' };
  },
  year_end_spiker: (d) => {
    const pct = Math.round((d.q4Ratio || 0) * 100);
    if (pct < 40) return null;
    return { label: 'Tập trung mua cuối năm', evidence: `${pct}% chi tiêu tháng 10–12`, icon: '🎄' };
  },
  tet_buyer: (d) => {
    const pct = Math.round((d.q1Ratio || 0) * 100);
    if (pct < 30) return null;
    return { label: 'Mua nhiều dịp Tết', evidence: `${pct}% chi tiêu tháng 1–2`, icon: '🧧' };
  },
  summer_binge: (d) => {
    const pct = Math.round((d.summerRatio || 0) * 100);
    if (pct < 30) return null;
    return { label: 'Mua nhiều mùa hè', evidence: `${pct}% chi tiêu tháng 6–8`, icon: '☀️' };
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

// 2.9 Show rule-based profile on non-AI sections (no AI call)
// sectionType: 'monthly' | 'categories' | 'sales' | 'items'
function showProfileInsight(cardId, profile, sectionType) {
  if (!profile) return;
  const aiEl = document.getElementById(cardId + '-ai');
  if (!aiEl) return;

  // Filter traits relevant to this section
  const relevantKeys = SECTION_TRAITS[sectionType];
  let displayTraits = profile.traits.slice(0, 2);
  if (relevantKeys) {
    const filtered = profile.traits.filter(t => relevantKeys.includes(t.key));
    if (filtered.length > 0) {
      displayTraits = filtered.slice(0, 2);
    } else {
      // Fallback: try to build traits directly from section-relevant builders
      const fallback = [];
      const dataCtx = profile.dataCtx || {};
      for (const k of relevantKeys) {
        if (fallback.length >= 2) break;
        if (!TRAIT_BUILDERS[k]) continue;
        const t = TRAIT_BUILDERS[k](dataCtx);
        if (t) fallback.push({ key: k, ...t });
      }
      if (fallback.length > 0) displayTraits = fallback;
    }
  }

  const sectionProfile = { ...profile, traits: displayTraits };
  aiEl.innerHTML = renderCompactProfile(sectionProfile);
  aiEl.style.display = '';
}

window.analyzeShoppingPersonality = analyzeShoppingPersonality;
window.showProfileInsight = showProfileInsight;
window.enrichWithAI = enrichWithAI;
