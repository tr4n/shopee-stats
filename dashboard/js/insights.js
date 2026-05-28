/* ─────────────────────────────────────────────────
   Insight Engine — Rule-based analysis functions
   and insight card renderer. Depends on helpers.js.
───────────────────────────────────────────────── */

function computeYearlyInsights(yd, d) {
  const items = [];
  const years = Object.keys(yd || {}).map(Number).sort((a, b) => a - b);
  if (!years.length) return items;

  const totalSpend = d.t || 0;
  const totalOrders = d.o || 0;
  const totalSaved = d.s || 0;

  // ═══ PHÂN TÍCH SỰ THỐNG TRỊ CỦA CÁC NĂM ═══
  const yearSpends = years.map(y => ({ year: y, spend: yd[y].t || 0, orders: yd[y].o || 0 }));
  const maxSpendYear = yearSpends.reduce((a, b) => a.spend >= b.spend ? a : b);
  const maxOrderYear = yearSpends.reduce((a, b) => a.orders >= b.orders ? a : b);
  
  const maxSpendPct = totalSpend > 0 ? Math.round((maxSpendYear.spend / totalSpend) * 100) : 0;
  const maxOrderPct = totalOrders > 0 ? Math.round((maxOrderYear.orders / totalOrders) * 100) : 0;

  if (maxSpendYear.year === maxOrderYear.year) {
    items.push({ 
      icon: '👑', 
      text: `**Năm ${maxSpendYear.year}** thống trị hoàn toàn: **${maxSpendPct}%** tổng chi tiêu (**${fmtVND(maxSpendYear.spend)}**) và **${maxOrderPct}%** tổng đơn hàng (**${fmtNum(maxOrderYear.orders)} đơn**).`
    });
  } else {
    items.push({ 
      icon: '📊', 
      text: `Năm **${maxSpendYear.year}** chi tiêu cao nhất (**${fmtVND(maxSpendYear.spend)}**, ${maxSpendPct}%), nhưng năm **${maxOrderYear.year}** chốt đơn nhiều nhất (**${fmtNum(maxOrderYear.orders)} đơn**, ${maxOrderPct}%).`
    });
  }

  // ═══ XU HƯỚNG TĂNG TRƯỞNG CHI TIẾT ═══
  if (years.length >= 2) {
    const lastY = years[years.length - 1];
    const prevY = years[years.length - 2];
    const lastData = yd[lastY];
    const prevData = yd[prevY];
    
    const spendGrowth = prevData.t > 0 ? ((lastData.t - prevData.t) / prevData.t) * 100 : 0;
    const orderGrowth = prevData.o > 0 ? ((lastData.o - prevData.o) / prevData.o) * 100 : 0;
    const aovLast = lastData.o > 0 ? lastData.t / lastData.o : 0;
    const aovPrev = prevData.o > 0 ? prevData.t / prevData.o : 0;
    const aovGrowth = aovPrev > 0 ? ((aovLast - aovPrev) / aovPrev) * 100 : 0;

    if (Math.abs(spendGrowth) >= 5) {
      const spendIcon = spendGrowth >= 0 ? '📈' : '📉';
      const spendLabel = spendGrowth >= 0 ? 'tăng' : 'giảm';
      const orderIcon = orderGrowth >= 0 ? '📦' : '📉';
      const orderLabel = orderGrowth >= 0 ? 'tăng' : 'giảm';
      
      items.push({ 
        icon: spendIcon, 
        text: `**${lastY} vs ${prevY}**: Chi tiêu **${spendLabel} ${Math.abs(spendGrowth).toFixed(1)}%**, đơn hàng **${orderLabel} ${Math.abs(orderGrowth).toFixed(1)}%**. AOV từ **${fmtVND(aovPrev)}** → **${fmtVND(aovLast)}** (**${aovGrowth >= 0 ? '+' : ''}${aovGrowth.toFixed(1)}%**).`
      });
    }

    // Phân tích độ ổn định chi tiêu
    if (years.length >= 3) {
      const growthRates = [];
      for (let i = 1; i < years.length; i++) {
        const prevSpend = yd[years[i - 1]].t || 0;
        const currSpend = yd[years[i]].t || 0;
        if (prevSpend > 0) growthRates.push(((currSpend - prevSpend) / prevSpend) * 100);
      }
      
      if (growthRates.length >= 2) {
        const avgGrowth = growthRates.reduce((s, r) => s + r, 0) / growthRates.length;
        const growthVariance = growthRates.reduce((s, r) => s + Math.pow(r - avgGrowth, 2), 0) / growthRates.length;
        const growthStdDev = Math.sqrt(growthVariance);

        if (growthStdDev < 15 && Math.abs(avgGrowth) < 10) {
          items.push({ 
            icon: '⚖️', 
            text: `**Tài chính ổn định**: Chi tiêu dao động nhẹ qua ${years.length} năm (độ lệch chuẩn ${growthStdDev.toFixed(1)}%), thể hiện khả năng quản lý ngân sách nhất quán.`
          });
        } else if (growthStdDev > 40) {
          items.push({ 
            icon: '🎢', 
            text: `**Biến động lớn**: Chi tiêu thay đổi mạnh qua các năm (độ lệch chuẩn ${growthStdDev.toFixed(1)}%). Có thể do thay đổi thu nhập hoặc nhu cầu cuộc sống.`
          });
        } else if (avgGrowth > 15) {
          items.push({ 
            icon: '🚀', 
            text: `**Tăng trưởng mạnh**: Chi tiêu tăng trung bình **${avgGrowth.toFixed(1)}%/năm** qua ${years.length} năm. Theo dõi để đảm bảo phù hợp với thu nhập.`
          });
        }
      }
    }
  }

  // ═══ PHÂN TÍCH HIỆU QUẢ TIẾT KIỆM NÂNG CAO ═══
  if (totalSpend > 0 && totalSaved > 0) {
    const actualPaid = totalSpend;
    const originalPrice = totalSpend + totalSaved;
    const savingsRate = (totalSaved / originalPrice) * 100;
    const avgSavingPerOrder = totalOrders > 0 ? totalSaved / totalOrders : 0;
    
    let hunterLevel = '';
    let hunterIcon = '💡';
    let actionableAdvice = '';

    if (savingsRate >= 25) {
      hunterLevel = `**Thợ Săn Voucher Huyền Thoại**: Tiết kiệm **${savingsRate.toFixed(1)}%** trên tổng giá gốc (**${fmtVND(totalSaved)}**/**${fmtVND(originalPrice)}**).`;
      hunterIcon = '🏆';
      actionableAdvice = `Trung bình **${fmtVND(avgSavingPerOrder)}/đơn**. Bạn đã thành thạo nghệ thuật săn voucher!`;
    } else if (savingsRate >= 15) {
      hunterLevel = `**Săn Voucher Chuyên Nghiệp**: Giảm **${savingsRate.toFixed(1)}%** chi phí nhờ khuyến mãi.`;
      hunterIcon = '⭐';
      actionableAdvice = `Trung bình **${fmtVND(avgSavingPerOrder)}/đơn**. Thử kết hợp thêm cashback apps để tối ưu hơn.`;
    } else if (savingsRate >= 8) {
      hunterLevel = `**Người mua thông minh**: Tiết kiệm **${savingsRate.toFixed(1)}%** qua các ưu đãi.`;
      hunterIcon = '💡';
      actionableAdvice = `Có thể cải thiện bằng cách theo dõi flash sale và stack nhiều mã giảm giá hơn.`;
    } else if (savingsRate >= 3) {
      hunterLevel = `**Mua sắm cơ bản**: Chỉ tiết kiệm **${savingsRate.toFixed(1)}%** từ khuyến mãi.`;
      hunterIcon = '📝';
      actionableAdvice = `Hãy thử dùng mã freeship, voucher seller và coin hoàn để tăng tỷ lệ tiết kiệm.`;
    } else {
      hunterLevel = `**Ít quan tâm khuyến mãi**: Tiết kiệm rất ít (**${savingsRate.toFixed(1)}%**).`;
      hunterIcon = '⚠️';
      actionableAdvice = `Bạn đang bỏ lỡ rất nhiều cơ hội tiết kiệm từ flash sale và voucher.`;
    }

    items.push({ icon: hunterIcon, text: `${hunterLevel} ${actionableAdvice}` });

    // So sánh với benchmark
    if (totalOrders >= 20) {
      const orderFrequency = totalOrders / years.length;
      if (orderFrequency >= 50 && savingsRate >= 12) {
        items.push({ 
          icon: '🎯', 
          text: `**Power User**: **${orderFrequency.toFixed(0)} đơn/năm** với tỷ lệ tiết kiệm **${savingsRate.toFixed(1)}%**. Bạn thuộc nhóm 10% người dùng hiệu quả nhất.`
        });
      } else if (orderFrequency >= 30 && savingsRate < 5) {
        items.push({ 
          icon: '💭', 
          text: `**Cơ hội cải thiện**: Với **${orderFrequency.toFixed(0)} đơn/năm**, bạn có thể tiết kiệm thêm hàng triệu đồng/năm nếu tăng tỷ lệ dùng voucher lên 10-15%.`
        });
      }
    }
  }

  // ═══ HIỆU QUẢ SỬ DỤNG PLATFORM ═══
  if (totalOrders > 0 && years.length > 0) {
    const avgOrderValue = totalSpend / totalOrders;
    const ordersPerYear = totalOrders / years.length;
    
    let userProfile = '';
    let profileIcon = '';
    
    if (avgOrderValue >= 500000 && ordersPerYear >= 50) {
      userProfile = `**Premium Shopper**: AOV **${fmtVND(avgOrderValue)}**, **${ordersPerYear.toFixed(0)} đơn/năm**. Bạn là khách hàng có giá trị cao.`;
      profileIcon = '💎';
    } else if (avgOrderValue >= 200000 && ordersPerYear >= 30) {
      userProfile = `**Active Shopper**: AOV **${fmtVND(avgOrderValue)}**, **${ordersPerYear.toFixed(0)} đơn/năm**. Thói quen mua sắm ổn định.`;
      profileIcon = '🛍️';
    } else if (ordersPerYear >= 100) {
      userProfile = `**Frequent Buyer**: **${ordersPerYear.toFixed(0)} đơn/năm** nhưng AOV khiêm tốn (**${fmtVND(avgOrderValue)}**). Bạn ưa chuộng mua sắm thường xuyên với giá trị nhỏ.`;
      profileIcon = '📦';
    } else if (avgOrderValue >= 300000) {
      userProfile = `**Selective Shopper**: AOV cao (**${fmtVND(avgOrderValue)}**) nhưng ít đơn (**${ordersPerYear.toFixed(0)}/năm**). Bạn cân nhắc kỹ trước khi mua.`;
      profileIcon = '🔍';
    } else {
      userProfile = `**Casual Shopper**: AOV **${fmtVND(avgOrderValue)}**, **${ordersPerYear.toFixed(0)} đơn/năm**. Mua sắm vừa phải.`;
      profileIcon = '🙂';
    }
    
    items.push({ icon: profileIcon, text: userProfile });

    // Gợi ý tối ưu hóa dựa trên profile
    if (avgOrderValue < 200000 && ordersPerYear >= 30) {
      items.push({ 
        icon: '💡', 
        text: `**Tip tối ưu hóa**: Thử gộp đơn hoặc mua combo để tăng AOV → nhận thêm voucher free ship và giảm phí vận chuyển.`
      });
    } else if (avgOrderValue >= 400000 && ordersPerYear < 20) {
      items.push({ 
        icon: '🎁', 
        text: `**Tip mở rộng**: Với sức mua tốt, hãy khám phá thêm danh mục sản phẩm mới hoặc thử các brand premium có trên platform.`
      });
    }
  }

  return items;
}

function computeMonthlyInsights(yd, year) {
  const items = [];
  const monthData = (yd || {})[year]?.m || {};
  const months = Object.entries(monthData)
    .map(([m, v]) => ({ m: parseInt(m, 10), v }))
    .filter(x => x.v > 0)
    .sort((a, b) => a.m - b.m);
  if (!months.length) return items;

  const total = months.reduce((s, x) => s + x.v, 0);
  const peak = months.reduce((a, b) => a.v >= b.v ? a : b);
  const low = months.reduce((a, b) => a.v <= b.v ? a : b);

  const MONTH_NAMES = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  const peakPct = Math.round((peak.v / total) * 100);
  items.push({ icon: '★', text: `**${MONTH_NAMES[peak.m]}** là tháng chi tiêu cao nhất — **${fmtVND(peak.v)}** (**${peakPct}%** cả năm).` });

  if (low.m !== peak.m) {
    items.push({ icon: '↓', text: `**${MONTH_NAMES[low.m]}** chi tiêu thấp nhất — **${fmtVND(low.v)}**.` });
  }

  // So sánh chênh lệch tháng đỉnh điểm với trung bình các tháng
  const avg = total / months.length;
  if (peak.v > 1.8 * avg && months.length > 1) {
    const ratio = (peak.v / avg).toFixed(1);
    items.push({ icon: '🔥', text: `Chi tiêu tháng cao điểm (**${MONTH_NAMES[peak.m]}**) gấp **${ratio} lần** mức trung bình tháng của năm.` });
  }

  // Đánh giá tần suất mua sắm trong năm
  if (months.length === 12) {
    items.push({ icon: '📅', text: `Bạn duy trì thói quen mua sắm đều đặn cả **12/12 tháng** trong năm, không bỏ lỡ tháng nào.` });
  } else if (months.length <= 3) {
    items.push({ icon: '📅', text: `Bạn chỉ tập trung mua sắm vào **${months.length} tháng** trong năm, các tháng khác hầu như không chi tiêu.` });
  }

  // Đo lường biến động (cao nhất vs thấp nhất)
  if (low.v > 0 && peak.v > 2.5 * low.v) {
    const ratio = (peak.v / low.v).toFixed(1);
    items.push({ icon: '⚡', text: `Chi tiêu giữa các tháng biến động rất lớn: tháng cao nhất gấp **${ratio} lần** tháng thấp nhất.` });
  }

  // Phát hiện chi tiêu mùa Tết (Tháng 1 & 2)
  const tetTotal = (monthData[1] || 0) + (monthData[2] || 0);
  if (tetTotal > 0 && total > 0) {
    const tetPct = Math.round((tetTotal / total) * 100);
    if (tetPct >= 20) {
      items.push({ icon: '🧧', text: `Mùa mua sắm Tết (Tháng 1 & 2) chiếm đến **${tetPct}%** tổng chi tiêu cả năm.` });
    }
  }

  // Q4 detection (Oct-Nov-Dec)
  const q4Total = [10, 11, 12].reduce((s, m) => s + (monthData[m] || 0), 0);
  if (q4Total > 0 && total > 0) {
    const q4Pct = Math.round((q4Total / total) * 100);
    if (q4Pct >= 30) {
      items.push({ icon: '↑', text: `Quý 4 (Tháng 10–12) chiếm **${q4Pct}%** chi tiêu cả năm — mùa hội mua sắm cuối năm.` });
    }
  }

  // Average per active month
  if (months.length > 1) {
    items.push({ icon: '→', text: `Trung bình **${fmtVND(Math.round(total / months.length))}/tháng** có phát sinh mua sắm (${months.length} tháng).` });
  }

  return items;
}

function computeCategoryInsights(cs, totalSpend) {
  const items = [];
  if (!cs || !cs.length) return items;

  const sorted = [...cs].sort((a, b) => b.s - a.s);
  const total = sorted.reduce((s, c) => s + c.s, 0) || totalSpend || 1;
  const totalItems = sorted.reduce((s, c) => s + (c.c || 0), 0);

  // ═══ PHÂN TÍCH SỰ THỐNG TRỊ DANH MỤC ═══
  const top1 = sorted[0];
  const top1Pct = Math.round((top1.s / total) * 100);
  const top1Name = top1.name || resolveCatLabel(top1);
  const top1Items = top1.c || 0;
  const top1AvgPrice = top1Items > 0 ? Math.round(top1.s / top1Items) : 0;

  if (top1Pct >= 40) {
    items.push({ 
      icon: '👑', 
      text: `**${top1Name}** thống trị với **${top1Pct}%** chi tiêu (**${fmtVND(top1.s)}**, ${top1Items} sản phẩm). Bạn có sở thích rõ ràng và chuyên sâu trong lĩnh vực này.`
    });
  } else if (top1Pct >= 25) {
    items.push({ 
      icon: '⭐', 
      text: `**${top1Name}** dẫn đầu với **${top1Pct}%** chi tiêu (**${fmtVND(top1.s)}**, ${top1Items} sản phẩm, giá TB **${fmtVND(top1AvgPrice)}**/sp). Đây là danh mục ưu tiên hàng đầu của bạn.`
    });
  } else {
    items.push({ 
      icon: '📊', 
      text: `**${top1Name}** dẫn đầu nhẹ với **${top1Pct}%** (**${fmtVND(top1.s)}**). Chi tiêu khá cân bằng giữa các danh mục, không có sự thiên lệch quá mạnh.`
    });
  }

  // ═══ PHÂN TÍCH TÍNH ĐA DẠNG & PHÂN BỐ ═══
  if (sorted.length >= 2) {
    const top2 = sorted[1];
    const top3 = sorted.length >= 3 ? sorted[2] : null;
    
    const top2Pct = Math.round((top2.s / total) * 100);
    const top2Name = top2.name || resolveCatLabel(top2);
    
    if (sorted.length >= 3) {
      const top3Pct = Math.round((top3.s / total) * 100);
      const top3Name = top3.name || resolveCatLabel(top3);
      const top3Total = top1Pct + top2Pct + top3Pct;
      
      if (top3Total <= 50) {
        items.push({ 
          icon: '🌈', 
          text: `**Mua sắm đa dạng cao**: Top 3 (**${top1Name}**, **${top2Name}**, **${top3Name}**) chỉ chiếm **${top3Total}%**. Bạn có nhu cầu phong phú trải rộng **${sorted.length} danh mục**.`
        });
      } else if (top3Total >= 75) {
        items.push({ 
          icon: '🎯', 
          text: `**Tập trung mạnh**: Top 3 (**${top1Name}** ${top1Pct}%, **${top2Name}** ${top2Pct}%, **${top3Name}** ${top3Pct}%) chiếm **${top3Total}%** tổng chi tiêu. Nhu cầu rất rõ ràng.`
        });
      } else {
        items.push({ 
          icon: '⚖️', 
          text: `**Cân bằng tốt**: Top 3 chiếm **${top3Total}%**, còn **${100 - top3Total}%** phân tán đều trong ${sorted.length - 3} danh mục khác.`
        });
      }
    }

    // So sánh chi tiết top 2
    if (top1Pct - top2Pct >= 15) {
      items.push({ 
        icon: '📈', 
        text: `**Khoảng cách lớn**: **${top1Name}** vượt trội **${top2Name}** với khoảng cách **${top1Pct - top2Pct}** điểm %. Sở thích có tính phân hóa rõ rệt.`
      });
    } else if (top1Pct - top2Pct <= 5) {
      items.push({ 
        icon: '🏆', 
        text: `**Đua sát nút**: **${top1Name}** (${top1Pct}%) và **${top2Name}** (${top2Pct}%) chỉ cách nhau **${top1Pct - top2Pct}** điểm %. Hai sở thích chính song hành.`
      });
    }
  }

  // ═══ PHÂN TÍCH GIÁ TRỊ TRUNG BÌNH THEO DANH MỤC ═══
  const categoriesWithAvgPrice = sorted
    .filter(c => (c.c || 0) > 0)
    .map(c => ({ ...c, avgPrice: c.s / c.c, name: c.name || resolveCatLabel(c) }))
    .sort((a, b) => b.avgPrice - a.avgPrice);

  if (categoriesWithAvgPrice.length >= 2) {
    const expensive = categoriesWithAvgPrice[0];
    const cheap = categoriesWithAvgPrice[categoriesWithAvgPrice.length - 1];
    
    if (expensive.avgPrice >= 2 * cheap.avgPrice) {
      const ratio = (expensive.avgPrice / cheap.avgPrice).toFixed(1);
      items.push({ 
        icon: '💎', 
        text: `**Phân khúc giá rõ rệt**: **${expensive.name}** có giá TB **${fmtVND(expensive.avgPrice)}/sp**, gấp **${ratio} lần** **${cheap.name}** (**${fmtVND(cheap.avgPrice)}/sp**). Bạn biết phân biệt đầu tư theo giá trị sản phẩm.`
      });
    }

    // Tìm danh mục có tỷ lệ quantity/spend cao (mua nhiều, giá rẻ)
    const volumeCategories = sorted
      .filter(c => (c.c || 0) >= 5 && c.s / c.c < 100000)
      .sort((a, b) => b.c - a.c);
    
    if (volumeCategories.length > 0) {
      const volumeCat = volumeCategories[0];
      const volumeName = volumeCat.name || resolveCatLabel(volumeCat);
      const volumeAvg = Math.round(volumeCat.s / volumeCat.c);
      items.push({ 
        icon: '📦', 
        text: `**Mua sắm số lượng**: **${volumeName}** với **${volumeCat.c} sản phẩm**, giá TB **${fmtVND(volumeAvg)}/sp**. Bạn thích tích trữ và mua theo lô lớn cho danh mục này.`
      });
    }
  }

  // ═══ PHÂN TÍCH LIFESTYLE & PERSONALITY ═══
  const lifestyleAnalysis = analyzeLifestyleFromCategories(sorted, total);
  if (lifestyleAnalysis) {
    items.push({ icon: lifestyleAnalysis.icon, text: lifestyleAnalysis.text });
  }

  // ═══ GỢ Ý TỐI ƯU HÓA ═══
  const optimizationTips = generateCategoryOptimizationTips(sorted, total);
  if (optimizationTips.length > 0) {
    items.push(...optimizationTips);
  }

  // ═══ BENCHMARK COMPARISON ═══
  if (sorted.length >= 1) {
    const categoryEfficiency = sorted.map(c => {
      const name = c.name || resolveCatLabel(c);
      const items = c.c || 0;
      return { name, efficiency: items > 0 ? c.s / items : 0, spend: c.s, items };
    }).filter(c => c.items >= 3).sort((a, b) => b.efficiency - a.efficiency);

    if (categoryEfficiency.length >= 2) {
      const efficient = categoryEfficiency[0];
      const inefficient = categoryEfficiency[categoryEfficiency.length - 1];
      
      if (efficient.efficiency >= 1.5 * inefficient.efficiency) {
        items.push({ 
          icon: '🧮', 
          text: `**Hiệu quả mua sắm**: **${efficient.name}** có hiệu quả cao (**${fmtVND(efficient.efficiency)}/sp**) so với **${inefficient.name}** (**${fmtVND(inefficient.efficiency)}/sp**). Xu hướng mua ít nhưng chất lượng cao vs mua nhiều giá rẻ.`
        });
      }
    }
  }

  return items;
}

// Helper functions for advanced category analysis
function analyzeLifestyleFromCategories(categories, total) {
  const lifestyle = {
    tech: 0, fashion: 0, beauty: 0, home: 0, food: 0, sport: 0, edu: 0, hobby: 0
  };

  categories.forEach(c => {
    const name = (c.name || resolveCatLabel(c)).toLowerCase();
    const pct = (c.s / total) * 100;
    
    if (name.includes('điện tử') || name.includes('tech') || name.includes('điện thoại') || name.includes('máy tính') || name.includes('camera')) {
      lifestyle.tech += pct;
    } else if (name.includes('thời trang') || name.includes('fashion') || name.includes('quần áo') || name.includes('giày') || name.includes('túi')) {
      lifestyle.fashion += pct;
    } else if (name.includes('làm đẹp') || name.includes('beauty') || name.includes('sức khỏe') || name.includes('mỹ phẩm') || name.includes('skincare')) {
      lifestyle.beauty += pct;
    } else if (name.includes('nhà cửa') || name.includes('home') || name.includes('đời sống') || name.includes('gia dụng') || name.includes('nội thất')) {
      lifestyle.home += pct;
    } else if (name.includes('thực phẩm') || name.includes('food') || name.includes('ăn') || name.includes('đồ uống') || name.includes('bách hóa')) {
      lifestyle.food += pct;
    } else if (name.includes('thể thao') || name.includes('sport') || name.includes('du lịch') || name.includes('outdoor')) {
      lifestyle.sport += pct;
    } else if (name.includes('sách') || name.includes('edu') || name.includes('học') || name.includes('văn phòng')) {
      lifestyle.edu += pct;
    }
  });

  const dominant = Object.entries(lifestyle).reduce((a, b) => b[1] > a[1] ? b : a);
  
  if (dominant[1] >= 30) {
    const profiles = {
      tech: { icon: '💻', text: `**Tech Enthusiast**: ${dominant[1].toFixed(1)}% chi tiêu cho công nghệ. Bạn luôn cập nhật xu hướng tech mới và coi trọng hiệu suất, tính năng.` },
      fashion: { icon: '👗', text: `**Fashion Forward**: ${dominant[1].toFixed(1)}% chi tiêu cho thời trang. Bạn quan tâm đến phong cách, xu hướng và cách thể hiện cá tính qua trang phục.` },
      beauty: { icon: '✨', text: `**Beauty Guru**: ${dominant[1].toFixed(1)}% chi tiêu cho làm đẹp. Bạn đầu tư nghiêm túc cho skincare và chăm sóc bản thân.` },
      home: { icon: '🏠', text: `**Homemaker**: ${dominant[1].toFixed(1)}% chi tiêu cho nhà cửa. Bạn coi trọng không gian sống, thích tạo nên một tổ ấm hoàn hảo.` },
      food: { icon: '🍜', text: `**Foodie**: ${dominant[1].toFixed(1)}% chi tiêu cho thực phẩm. Bạn yêu thích ẩm thực và coi trọng chất lượng cuộc sống qua đồ ăn.` },
      sport: { icon: '🏃', text: `**Active Lifestyle**: ${dominant[1].toFixed(1)}% chi tiêu cho thể thao. Bạn ưa tiên sức khỏe, thích vận động và trải nghiệm outdoor.` },
      edu: { icon: '📚', text: `**Lifelong Learner**: ${dominant[1].toFixed(1)}% chi tiêu cho giáo dục. Bạn đầu tư vào kiến thức và phát triển kỹ năng bản thân.` }
    };
    return profiles[dominant[0]] || null;
  }
  
  // Mixed lifestyle analysis
  const significant = Object.entries(lifestyle).filter(([k, v]) => v >= 15).sort((a, b) => b[1] - a[1]);
  if (significant.length >= 2) {
    return {
      icon: '🎨',
      text: `**Lifestyle đa chiều**: Cân bằng giữa **${significant.map(([k, v]) => `${k} (${v.toFixed(0)}%)`).join(', ')}**. Phản ánh nhu cầu sống phong phú và cân bằng.`
    };
  }
  
  return null;
}

function generateCategoryOptimizationTips(categories, total) {
  const tips = [];
  
  // Tip về consolidation cho categories nhỏ lẻ
  const smallCategories = categories.filter(c => (c.s / total) * 100 < 5 && (c.c || 0) <= 2);
  if (smallCategories.length >= 3) {
    const smallTotal = smallCategories.reduce((s, c) => s + c.s, 0);
    const smallPct = (smallTotal / total) * 100;
    tips.push({
      icon: '💡',
      text: `**Gợi ý tối ưu**: Bạn có ${smallCategories.length} danh mục chi tiêu rất ít (${smallPct.toFixed(1)}% tổng). Cân nhắc tập trung vào các danh mục chính để tận dụng tốt hơn ưu đãi bundled.`
    });
  }

  // Tip về seasonal shopping
  const top1Cat = categories[0];
  if (top1Cat && (top1Cat.s / total) * 100 >= 25) {
    const catName = (top1Cat.name || resolveCatLabel(top1Cat)).toLowerCase();
    if (catName.includes('thời trang') || catName.includes('fashion')) {
      tips.push({
        icon: '📅',
        text: `**Tip mùa vụ**: Danh mục thời trang chiếm lớn → nên theo dõi flash sale end-of-season (3-4-9-10) và shopping festivals để tiết kiệm 30-50%.`
      });
    } else if (catName.includes('điện tử') || catName.includes('tech')) {
      tips.push({
        icon: '⚡',
        text: `**Tip công nghệ**: Chi tiêu tech cao → follow các đợt ra mắt sản phẩm mới để săn deal on previous-gen với giá tốt hơn 20-40%.`
      });
    }
  }

  return tips;
}

function computeItemInsights(ti, totalSpend) {
  const items = [];
  if (!ti || !ti.length) return items;

  const total = totalSpend || ti.reduce((s, i) => s + i.s, 0) || 1;

  // Top by spend
  const topSpend = [...ti].sort((a, b) => b.s - a.s)[0];
  if (topSpend) {
    const pct = Math.round((topSpend.s / total) * 100);
    items.push({ icon: '★', text: `Chi nhiều nhất: **"${topSpend.n}"** — **${fmtVND(topSpend.s)}** (**${pct}%** tổng chi tiêu).` });
  }

  // Top by count
  const topCount = [...ti].sort((a, b) => b.c - a.c)[0];
  if (topCount && topCount.c > 1) {
    items.push({ icon: '→', text: `Mua nhiều lần nhất: **"${topCount.n}"** — **${fmtNum(topCount.c)} lần**.` });
  }

  // Top 5 concentration
  const top5 = [...ti].sort((a, b) => b.s - a.s).slice(0, 5);
  const top5Sum = top5.reduce((s, i) => s + i.s, 0);
  if (top5Sum > 0 && top5.length === 5) {
    const pct = Math.round((top5Sum / total) * 100);
    items.push({ icon: '↑', text: `Top 5 sản phẩm chiếm **${pct}%** tổng chi tiêu.` });
  }

  // Số lượng sản phẩm mua lặp lại nhiều lần
  const repeatedCount = ti.filter(i => i.c >= 3).length;
  if (repeatedCount > 0) {
    items.push({ icon: '🔄', text: `Có **${repeatedCount} sản phẩm** được bạn mua lặp lại từ 3 lần trở lên.` });
  }

  // Sản phẩm giá trị cao (tổng tích lũy sản phẩm trên 1M)
  const highValItems = ti.filter(i => i.s >= 1000000).length;
  if (highValItems > 0) {
    items.push({ icon: '💎', text: `Có **${highValItems} mặt hàng** bạn đã chi tổng cộng trên 1 triệu VNĐ.` });
  }

  // Thói quen mua đồ nhỏ lẻ lặp lại
  const cheapRepeatItem = [...ti]
    .filter(i => i.c >= 3 && (i.s / i.c) < 50000)
    .sort((a, b) => b.c - a.c)[0];
  if (cheapRepeatItem) {
    items.push({ icon: '🛍️', text: `Sản phẩm giá rẻ (< 50k) chốt đơn nhiều lần: **"${cheapRepeatItem.n}"** (**${cheapRepeatItem.c} lần**), hãy gom mua combo để tối ưu ship.` });
  }

  // Unique products count
  items.push({ icon: '→', text: `Tổng cộng có **${fmtNum(ti.length)}** sản phẩm khác nhau đã mua.` });

  return items;
}

function renderInsightCard(id, insightItems) {
  const card = document.getElementById(id);
  const list = document.getElementById(id + '-list');

  if (!card || !list || !insightItems || !insightItems.length) return;

  list.innerHTML = insightItems.map(item =>
    `<li><span class="ins-icon">${item.icon}</span><span>${parseBold(item.text)}</span></li>`
  ).join('');
  card.style.display = '';
  reveal(card);
}
