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

  // Detect current (incomplete) year: compare last year in data vs scan year
  const scanYear = d && d.ts ? new Date(d.ts * 1000).getFullYear() : new Date().getFullYear();
  const lastYearInData = years[years.length - 1];
  const isLastYearCurrent = (lastYearInData === scanYear);

  // Count elapsed months for the current year
  const elapsedMonthsCurrent = isLastYearCurrent
    ? Object.values((yd[lastYearInData] || {}).m || {}).filter(v => v > 0).length
    : 12;

  // ═══ PHÂN TÍCH SỰ THỐNG TRỊ CỦA CÁC NĂM ═══
  const yearSpends = years.map(y => ({ year: y, spend: yd[y].t || 0, orders: yd[y].o || 0 }));
  const maxSpendYear = yearSpends.reduce((a, b) => a.spend >= b.spend ? a : b);
  const maxOrderYear = yearSpends.reduce((a, b) => a.orders >= b.orders ? a : b);
  
  const maxSpendPct = totalSpend > 0 ? Math.round((maxSpendYear.spend / totalSpend) * 100) : 0;
  const maxOrderPct = totalOrders > 0 ? Math.round((maxOrderYear.orders / totalOrders) * 100) : 0;

  const currentYearNote = isLastYearCurrent ? ` *(dữ liệu ${elapsedMonthsCurrent} tháng đầu năm)*` : '';

  if (maxSpendYear.year === maxOrderYear.year) {
    const isMaxCurrent = (maxSpendYear.year === scanYear);
    items.push({ 
      icon: '👑', 
      text: `**Năm ${maxSpendYear.year}**${isMaxCurrent ? currentYearNote : ''} thống trị hoàn toàn: **${maxSpendPct}%** tổng chi tiêu (**${fmtVND(maxSpendYear.spend)}**) và **${maxOrderPct}%** tổng đơn hàng (**${fmtNum(maxOrderYear.orders)} đơn**).`
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

    const isCurrentYear = (Number(lastY) === scanYear);

    // For current (incomplete) year: use YTD comparison with same period of previous year
    let spendGrowth, orderGrowth, avgMonthLast, avgMonthPrev, comparisonNote;

    if (isCurrentYear && elapsedMonthsCurrent > 0 && prevData.m) {
      // Find the latest month with data in current year to set the cutoff
      const monthsWithData = Object.entries(lastData.m || {})
        .filter(([, v]) => v > 0)
        .map(([m]) => Number(m));
      const latestMonth = monthsWithData.length > 0 ? Math.max(...monthsWithData) : elapsedMonthsCurrent;

      // Sum the same months (YTD) from previous year for fair comparison
      const ytdPrevSpend = Object.entries(prevData.m || {})
        .filter(([m]) => Number(m) <= latestMonth)
        .reduce((sum, [, v]) => sum + (v || 0), 0);

      spendGrowth = ytdPrevSpend > 0 ? ((lastData.t - ytdPrevSpend) / ytdPrevSpend) * 100 : 0;
      // Use proportional estimate for orders since monthly order breakdown is unavailable
      const ordersRatioInPrevYear = prevData.t > 0 ? ytdPrevSpend / prevData.t : (latestMonth / 12);
      const estimatedPrevOrders = Math.round((prevData.o || 0) * ordersRatioInPrevYear);
      orderGrowth = estimatedPrevOrders > 0 ? ((lastData.o - estimatedPrevOrders) / estimatedPrevOrders) * 100 : 0;

      avgMonthLast = lastData.t / Math.max(elapsedMonthsCurrent, 1);
      avgMonthPrev = ytdPrevSpend > 0 ? ytdPrevSpend / Math.max(elapsedMonthsCurrent, 1) : (prevData.t / 12);

      comparisonNote = ` *(${elapsedMonthsCurrent} tháng đầu năm, so cùng kỳ ${prevY})*`;
    } else {
      spendGrowth = prevData.t > 0 ? ((lastData.t - prevData.t) / prevData.t) * 100 : 0;
      orderGrowth = prevData.o > 0 ? ((lastData.o - prevData.o) / prevData.o) * 100 : 0;
      avgMonthLast = lastData.t / 12;
      avgMonthPrev = prevData.t / 12;
      comparisonNote = '';
    }

    const aovLast = lastData.o > 0 ? lastData.t / lastData.o : 0;
    const aovPrev = prevData.o > 0 ? prevData.t / prevData.o : 0;
    const aovGrowth = aovPrev > 0 ? ((aovLast - aovPrev) / aovPrev) * 100 : 0;

    if (Math.abs(spendGrowth) >= 5) {
      const spendIcon = spendGrowth >= 0 ? '📈' : '📉';
      const spendLabel = spendGrowth >= 0 ? 'tăng' : 'giảm';
      const orderLabel = orderGrowth >= 0 ? 'tăng' : 'giảm';
      
      items.push({ 
        icon: spendIcon, 
        text: `**${lastY} vs ${prevY}**${comparisonNote}: Chi tiêu **${spendLabel} ${Math.abs(spendGrowth).toFixed(1)}%** (TB tháng: **${fmtVND(Math.round(avgMonthPrev))}** → **${fmtVND(Math.round(avgMonthLast))}**), số đơn **${orderLabel} ${Math.abs(Math.round(orderGrowth))}%**.`
      });
    }

    // Phân tích độ ổn định chi tiêu (bỏ qua năm hiện tại chưa kết thúc)
    const yearsForStability = isCurrentYear ? years.slice(0, -1) : years;
    if (yearsForStability.length >= 3) {
      const growthRates = [];
      for (let i = 1; i < yearsForStability.length; i++) {
        const prevSpend = yd[yearsForStability[i - 1]].t || 0;
        const currSpend = yd[yearsForStability[i]].t || 0;
        if (prevSpend > 0) growthRates.push(((currSpend - prevSpend) / prevSpend) * 100);
      }
      
      if (growthRates.length >= 2) {
        const avgGrowth = growthRates.reduce((s, r) => s + r, 0) / growthRates.length;
        const growthVariance = growthRates.reduce((s, r) => s + Math.pow(r - avgGrowth, 2), 0) / growthRates.length;
        const growthStdDev = Math.sqrt(growthVariance);

        const stableYearCount = yearsForStability.length;
        if (growthStdDev < 15 && Math.abs(avgGrowth) < 10) {
          items.push({ 
            icon: '⚖️', 
            text: `**Tài chính ổn định**: Chi tiêu dao động nhẹ qua ${stableYearCount} năm (độ lệch chuẩn ${growthStdDev.toFixed(1)}%), thể hiện khả năng quản lý ngân sách nhất quán.`
          });
        } else if (growthStdDev > 40) {
          items.push({ 
            icon: '🎢', 
            text: `**Biến động lớn**: Chi tiêu thay đổi mạnh qua các năm (độ lệch chuẩn ${growthStdDev.toFixed(1)}%). Có thể do thay đổi thu nhập hoặc nhu cầu cuộc sống.`
          });
        } else if (avgGrowth > 15) {
          items.push({ 
            icon: '🚀', 
            text: `**Tăng trưởng mạnh**: Chi tiêu tăng trung bình **${avgGrowth.toFixed(1)}%/năm** qua ${stableYearCount} năm. Theo dõi để đảm bảo phù hợp với thu nhập.`
          });
        }
      }
    }
  }

  // ═══ PHÂN TÍCH HIỆU QUẢ TIẾT KIỆM NÂNG CAO ═══
  if (totalSpend > 0 && totalSaved > 0) {
    const originalPrice = totalSpend + totalSaved;
    const savingsRate = (totalSaved / originalPrice) * 100;
    // Quy về tiết kiệm TB tháng — dùng số tháng thực tế (năm hiện tại tính đến thời điểm hiện tại)
    const totalMonths = isLastYearCurrent
      ? (years.length - 1) * 12 + elapsedMonthsCurrent
      : years.length * 12;
    const avgSavingPerMonth = totalSaved / Math.max(totalMonths, 1);
    
    let hunterLevel = '';
    let hunterIcon = '💡';
    let actionableAdvice = '';

    if (savingsRate >= 25) {
      hunterLevel = `**Thợ Săn Voucher Huyền Thoại**: Tiết kiệm **${savingsRate.toFixed(1)}%** trên tổng giá gốc (**${fmtVND(totalSaved)}**/**${fmtVND(originalPrice)}**).`;
      hunterIcon = '🏆';
      actionableAdvice = `Tương đương **${fmtVND(Math.round(avgSavingPerMonth))}/tháng** — bạn đã thành thạo nghệ thuật săn voucher!`;
    } else if (savingsRate >= 15) {
      hunterLevel = `**Săn Voucher Chuyên Nghiệp**: Giảm **${savingsRate.toFixed(1)}%** chi phí nhờ khuyến mãi (**${fmtVND(totalSaved)}** tiết kiệm được).`;
      hunterIcon = '⭐';
      actionableAdvice = `Thử kết hợp thêm cashback apps để tối ưu hơn.`;
    } else if (savingsRate >= 8) {
      hunterLevel = `**Người mua thông minh**: Tiết kiệm **${savingsRate.toFixed(1)}%** qua các ưu đãi (**${fmtVND(totalSaved)}** tổng).`;
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

    // So sánh với benchmark — dùng số tháng thực tế khi năm hiện tại chưa kết thúc
    if (totalOrders >= 20) {
      const totalMonthsBenchmark = isLastYearCurrent
        ? (years.length - 1) * 12 + Math.max(elapsedMonthsCurrent, 1)
        : years.length * 12;
      const orderFrequency = (totalOrders / totalMonthsBenchmark) * 12;
      const avgSpendPerYear = (totalSpend / totalMonthsBenchmark) * 12;
      if (orderFrequency >= 50 && savingsRate >= 12) {
        items.push({ 
          icon: '🎯', 
          text: `**Chiến thần mua sắm**: **${orderFrequency.toFixed(0)} đơn/năm**, chi tiêu TB **${fmtVND(Math.round(avgSpendPerYear))}/năm**, tỷ lệ tiết kiệm **${savingsRate.toFixed(1)}%**. Bạn thuộc nhóm 10% người dùng hiệu quả nhất.`
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
    // Dùng số tháng thực tế để tính TB tháng chính xác hơn
    const totalMonthsForPlatform = isLastYearCurrent
      ? (years.length - 1) * 12 + Math.max(elapsedMonthsCurrent, 1)
      : years.length * 12;
    const ordersPerYear = (totalOrders / totalMonthsForPlatform) * 12;
    const avgSpendPerYear = (totalSpend / totalMonthsForPlatform) * 12;
    const avgSpendPerMonth = totalSpend / totalMonthsForPlatform;
    
    let userProfile = '';
    let profileIcon = '';
    
    if (avgOrderValue >= 500000 && ordersPerYear >= 50) {
      // Profile cao cấp: dùng chi tiêu TB/năm và TB/tháng thay cho TB/đơn
      userProfile = `**Khách hàng cao cấp**: Chi tiêu TB **${fmtVND(Math.round(avgSpendPerYear))}/năm** (**${fmtVND(Math.round(avgSpendPerMonth))}/tháng**), **${ordersPerYear.toFixed(0)} đơn/năm**. Bạn là khách hàng có giá trị cao.`;
      profileIcon = '💎';
    } else if (avgOrderValue >= 200000 && ordersPerYear >= 30) {
      userProfile = `**Người mua năng động**: Chi tiêu TB **${fmtVND(Math.round(avgSpendPerYear))}/năm** (**${ordersPerYear.toFixed(0)} đơn/năm**). Thói quen mua sắm đều đặn, ổn định.`;
      profileIcon = '🛍️';
    } else if (ordersPerYear >= 100) {
      userProfile = `**Người mua thường xuyên**: **${ordersPerYear.toFixed(0)} đơn/năm** — mua sắm rất thường xuyên, chi tiêu TB **${fmtVND(Math.round(avgSpendPerMonth))}/tháng**. Bạn ưa chuộng mua sắm nhỏ lẻ liên tục.`;
      profileIcon = '📦';
    } else if (avgOrderValue >= 300000) {
      userProfile = `**Người mua sắm chọn lọc**: Chỉ **${ordersPerYear.toFixed(0)} đơn/năm** nhưng mỗi đơn có giá trị cao — chi tiêu tập trung, cân nhắc kỹ trước khi mua.`;
      profileIcon = '🔍';
    } else {
      userProfile = `**Người mua sắm ngẫu hứng**: **${ordersPerYear.toFixed(0)} đơn/năm**, chi tiêu TB **${fmtVND(Math.round(avgSpendPerMonth))}/tháng**. Mua sắm vừa phải, không thường xuyên.`;
      profileIcon = '🙂';
    }
    
    items.push({ icon: profileIcon, text: userProfile });

    // Gợi ý tối ưu hóa dựa trên profile
    if (avgOrderValue < 200000 && ordersPerYear >= 30) {
      items.push({ 
        icon: '💡', 
        text: `**Tip tối ưu hóa**: Thử gộp đơn hoặc mua combo → nhận thêm voucher free ship và giảm phí vận chuyển, tiết kiệm đáng kể hơn mỗi tháng.`
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
  const yearOrders = (yd || {})[year]?.o || 0;
  const avgPerMonth = months.length > 0 ? Math.round(total / months.length) : 0;

  const MONTH_NAMES = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  const peakPct = Math.round((peak.v / total) * 100);
  items.push({ text: `**${MONTH_NAMES[peak.m]}** là tháng chi tiêu cao nhất — **${fmtVND(peak.v)}** (**${peakPct}%** cả năm).` });

  if (low.m !== peak.m) {
    items.push({ text: `**${MONTH_NAMES[low.m]}** chi tiêu thấp nhất — **${fmtVND(low.v)}**.` });
  }

  const avg = total / months.length;
  if (peak.v > 1.8 * avg && months.length > 1) {
    const ratio = (peak.v / avg).toFixed(1);
    items.push({ text: `Tháng cao điểm gấp **${ratio} lần** trung bình tháng (**${fmtVND(Math.round(avg))}**/tháng).` });
  }

  if (months.length === 12) {
    items.push({ text: `Mua sắm đều đặn cả **12/12 tháng** — thói quen chi tiêu ổn định.` });
  } else if (months.length <= 3) {
    items.push({ text: `Chỉ tập trung mua sắm **${months.length} tháng** trong năm, các tháng khác hầu như không chi tiêu.` });
  }

  const tetTotal = (monthData[1] || 0) + (monthData[2] || 0);
  if (tetTotal > 0 && total > 0) {
    const tetPct = Math.round((tetTotal / total) * 100);
    if (tetPct >= 20) {
      items.push({ text: `Mùa Tết (Tháng 1 & 2) chiếm **${tetPct}%** tổng chi tiêu năm ${year}.` });
    }
  }

  if (yearOrders > 0) {
    items.push({ text: `Năm ${year}: **${fmtNum(yearOrders)} đơn**, chi tiêu TB **${fmtVND(avgPerMonth)}/tháng**.` });
  }

  return items.slice(0, 5);
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
    items.push({ text: lifestyleAnalysis.text });
  }

  return items.slice(0, 5);
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
      tech: { text: `**Tín đồ công nghệ**: ${dominant[1].toFixed(1)}% chi tiêu cho công nghệ — luôn cập nhật xu hướng công nghệ mới.` },
      fashion: { text: `**Tín đồ thời trang**: ${dominant[1].toFixed(1)}% chi tiêu cho thời trang — quan tâm phong cách và xu hướng.` },
      beauty: { text: `**Chuyên gia làm đẹp**: ${dominant[1].toFixed(1)}% chi tiêu cho làm đẹp — đầu tư nghiêm túc cho việc chăm sóc bản thân.` },
      home: { text: `**Người chăm chút tổ ấm**: ${dominant[1].toFixed(1)}% chi tiêu cho nhà cửa — coi trọng không gian sống.` },
      food: { text: `**Tín đồ ẩm thực**: ${dominant[1].toFixed(1)}% chi tiêu cho thực phẩm — yêu thích ẩm thực chất lượng.` },
      sport: { text: `**Lối sống năng động**: ${dominant[1].toFixed(1)}% chi tiêu cho thể thao — ưu tiên sức khỏe và vận động.` },
      edu: { text: `**Người không ngừng học hỏi**: ${dominant[1].toFixed(1)}% chi tiêu cho giáo dục — đầu tư vào kiến thức bản thân.` }
    };
    return profiles[dominant[0]] || null;
  }
  
  const significant = Object.entries(lifestyle).filter(([, v]) => v >= 15).sort((a, b) => b[1] - a[1]);
  if (significant.length >= 2) {
    const labels = { tech: 'công nghệ', fashion: 'thời trang', beauty: 'làm đẹp', home: 'nhà cửa', food: 'thực phẩm', sport: 'thể thao', edu: 'giáo dục' };
    return {
      text: `**Phong cách sống đa chiều**: Cân bằng giữa ${significant.map(([k, v]) => `${labels[k] || k} (${v.toFixed(0)}%)`).join(', ')}.`
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
  const sorted = [...ti].sort((a, b) => b.s - a.s);

  const topSpend = sorted[0];
  if (topSpend) {
    const pct = Math.round((topSpend.s / total) * 100);
    items.push({ text: `**"${topSpend.n}"** chi nhiều nhất — **${fmtVND(topSpend.s)}** (**${pct}%** tổng chi tiêu).` });
  }

  const topCount = [...ti].sort((a, b) => b.c - a.c)[0];
  if (topCount && topCount.c > 1 && topCount.n !== topSpend?.n) {
    items.push({ text: `**"${topCount.n}"** mua nhiều lần nhất — **${fmtNum(topCount.c)} lần**.` });
  }

  const top5 = sorted.slice(0, 5);
  const top5Sum = top5.reduce((s, i) => s + i.s, 0);
  if (top5.length >= 3) {
    const pct = Math.round((top5Sum / total) * 100);
    items.push({ text: `Top ${top5.length} sản phẩm chiếm **${pct}%** tổng chi tiêu.` });
  }

  const repeatedCount = ti.filter(i => i.c >= 3).length;
  if (repeatedCount > 0) {
    items.push({ text: `**${repeatedCount} sản phẩm** được mua lặp từ 3 lần trở lên — có hàng "ruột" rõ ràng.` });
  }

  const highValItems = ti.filter(i => i.s >= 1000000).length;
  if (highValItems > 0) {
    items.push({ text: `**${highValItems} mặt hàng** chi tổng trên 1 triệu VNĐ — xu hướng đầu tư giá trị cao.` });
  }

  items.push({ text: `Tổng cộng **${fmtNum(ti.length)}** sản phẩm khác nhau đã mua.` });

  return items.slice(0, 5);
}

function renderInsightCard(id, insightItems) {
  const card = document.getElementById(id);
  const list = document.getElementById(id + '-list');

  if (!card || !list || !insightItems || !insightItems.length) return;

  list.innerHTML = insightItems.map(item =>
    `<li><span class="ins-bullet">•</span><span>${parseBold(item.text)}</span></li>`
  ).join('');
  card.style.display = '';
  reveal(card);
}
