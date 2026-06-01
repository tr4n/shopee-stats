/* ─────────────────────────────────────────────────
   Main — boot, navigation, share modal, init pipeline.
   Depends on all other js/* files. Must be loaded last.
───────────────────────────────────────────────── */

/* ── Author info ─────────────────────────────── */
const authorInfoEl = document.getElementById("dashboard-author-info");
if (authorInfoEl && window.APP_CONFIG) {
  authorInfoEl.innerHTML = `${window.APP_CONFIG.authorIcon} <a href="${window.APP_CONFIG.authorLink}" target="_blank" style="color: var(--primary); text-decoration: none;">${window.APP_CONFIG.authorText}</a>`;
}

/* ── Navigation ──────────────────────────────── */
const views = document.querySelectorAll(".view");
const navBtns = document.querySelectorAll(".nav-item[data-view]");

function switchView(name) {
  views.forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
  navBtns.forEach((b) =>
    b.classList.toggle("active", b.getAttribute("data-view") === name),
  );

  // Trigger resize event so Chart.js can update layouts of newly visible canvases
  window.dispatchEvent(new Event("resize"));

  // If switching to orders view, re-run filtering and rendering after a short delay
  // to recreate the gradients with correct canvas dimensions once the view is visible.
  if (name === "orders" && typeof applyFiltersAndRender === "function") {
    setTimeout(() => {
      applyFiltersAndRender();
    }, 0);
  }
}

navBtns.forEach((btn) =>
  btn.addEventListener("click", () =>
    switchView(btn.getAttribute("data-view")),
  ),
);

/* ── Session storage ─────────────────────────── */
// Each dashboard session gets a millis-based ID stored in localStorage.
// Key schema: shopee_dash_data_<id>  →  serialised `d` object (with .cat on tiItems after classification)
const DASH_DATA_PREFIX = "shopee_dash_data_";

function getSessionId() {
  return new URLSearchParams(location.search).get("id") || null;
}

function saveDataToStorage(d) {
  const id = getSessionId();
  if (!id) return;
  try {
    localStorage.setItem(DASH_DATA_PREFIX + id, JSON.stringify(d));
  } catch (e) {
    console.warn("[Dashboard] Storage save failed (quota?):", e.message);
  }
}
window.saveDataToStorage = saveDataToStorage;

function cleanupStorage(currentId, extVersion) {
  try {
    if (extVersion) {
      const lastVersion = localStorage.getItem("shopee_last_ext_version");
      if (lastVersion && lastVersion !== extVersion) {
        console.log(`[Dashboard] Version changed from ${lastVersion} to ${extVersion}. Clearing cache.`);
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith(DASH_DATA_PREFIX) || key.startsWith("shopee_insight_cache_") || key === "shopee_insight_cache")) {
            localStorage.removeItem(key);
          }
        }
      }
      localStorage.setItem("shopee_last_ext_version", extVersion);
    }

    const dashDataKeys = [];
    const cacheKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(DASH_DATA_PREFIX)) {
        const idStr = key.substring(DASH_DATA_PREFIX.length);
        const ts = parseInt(idStr, 10);
        if (!isNaN(ts)) dashDataKeys.push({ key, ts });
      } else if (key.startsWith("shopee_insight_cache_")) {
        const tsStr = key.substring("shopee_insight_cache_".length);
        const ts = parseInt(tsStr, 10);
        if (!isNaN(ts)) cacheKeys.push({ key, ts });
      }
    }
    dashDataKeys.sort((a, b) => b.ts - a.ts);
    const activeTs = currentId ? parseInt(currentId, 10) : null;
    const keptTimestamps = [];
    const now = Date.now();
    for (const item of dashDataKeys) {
      if (now - item.ts > 3 * 24 * 3600 * 1000) { // 3 days
        localStorage.removeItem(item.key);
        console.log(`[Dashboard] Cleaned up expired dashboard data: ${item.key}`);
        continue;
      }
      if (item.ts === activeTs) {
        keptTimestamps.push(item.ts);
      } else if (keptTimestamps.length < 2) {
        keptTimestamps.push(item.ts);
      } else {
        localStorage.removeItem(item.key);
        console.log(`[Dashboard] Cleaned up old dashboard data: ${item.key}`);
      }
    }
    for (const item of cacheKeys) {
      const tsMs = item.ts * 1000;
      const isKept = keptTimestamps.some((k) => Math.abs(k - tsMs) < 2000);
      if (!isKept) {
        localStorage.removeItem(item.key);
        console.log(`[Dashboard] Cleaned up old insight cache: ${item.key}`);
      }
    }
  } catch (e) {
    console.warn("[Dashboard] Storage cleanup failed:", e.message);
  }
}

/* ── Parse / load data ───────────────────────── */
function parseData() {
  try {
    const params = new URLSearchParams(location.search);

    // Primary: load from storage by session ID (?id=MILLIS)
    const id = params.get("id");
    if (id) {
      const ts = parseInt(id, 10);
      if (!isNaN(ts) && Date.now() - ts > 3 * 24 * 3600 * 1000) { // 3 days
        localStorage.removeItem(DASH_DATA_PREFIX + id);
        console.log("[Dashboard] Removed expired dashboard data:", id);
        return null;
      }
      const raw = localStorage.getItem(DASH_DATA_PREFIX + id);
      return raw ? JSON.parse(raw) : null;
    }

    // Legacy: URL hash (#d=BASE64) — kept for backward compat
    const match = location.hash.match(/[#&]d=([^&]+)/);
    if (!match) return null;
    return JSON.parse(decodeURIComponent(escape(atob(match[1]))));
  } catch {
    return null;
  }
}

/* ── Handle first-time data injection ────────── */
// Supports two entry formats:
//   #d=BASE64  — hash (preferred: no URL encoding issues, works with file://)
//   ?d=BASE64  — query param (fallback: URLSearchParams decodes + as space, so we fix it)
// Stores payload under a millis ID, then redirects to clean ?id=MILLIS URL.
// Returns true if a redirect was triggered (boot should be skipped).
async function tryParseAsync(raw, paramMode) {
  if (!raw) return null;
  let trimmed = raw.trim();

  let mode = null;
  if (trimmed.startsWith("gz:") || trimmed.startsWith("gz=")) {
    mode = "gzip";
    trimmed = trimmed.substring(3);
  } else if (trimmed.startsWith("lz:") || trimmed.startsWith("lz=")) {
    mode = "lz";
    trimmed = trimmed.substring(3);
  } else if (trimmed.startsWith("d:") || trimmed.startsWith("d=")) {
    mode = "d";
    trimmed = trimmed.substring(2);
  } else if (paramMode) {
    mode = paramMode;
  }

  if (mode === "gzip") {
    try {
      let base64 = trimmed.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) base64 += "=";
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      if (typeof DecompressionStream !== "undefined") {
        const stream = new Blob([bytes])
          .stream()
          .pipeThrough(new DecompressionStream("gzip"));
        const text = await new Response(stream).text();
        return JSON.parse(text);
      }
    } catch (e) {
      console.error("[Dashboard] Gzip decompression failed:", e);
    }
  } else if (mode === "lz") {
    if (typeof LZString !== "undefined") {
      try {
        const decompressed =
          LZString.decompressFromEncodedURIComponent(trimmed);
        if (decompressed) return JSON.parse(decompressed);
      } catch {
        /* noop */
      }
    }
  } else if (mode === "d") {
    for (const s of [trimmed.replace(/ /g, "+"), trimmed]) {
      try {
        const bin = atob(s);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        /* noop */
      }
    }
  }

  // Fallbacks if mode execution failed/not matched
  if (!mode) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* noop */
    }

    if (typeof LZString !== "undefined") {
      try {
        const decompressed =
          LZString.decompressFromEncodedURIComponent(trimmed);
        if (decompressed) return JSON.parse(decompressed);
      } catch {
        /* noop */
      }
    }

    for (const s of [trimmed.replace(/ /g, "+"), trimmed]) {
      try {
        const bin = atob(s);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        /* noop */
      }
    }
  }
  return null;
}

async function checkAndHandleUrlData() {
  const gzMatch = location.hash.match(/[#&]gz=([^&]*)/);
  const lzMatch = location.hash.match(/[#&]lz=([^&]*)/);
  const hashMatch = location.hash.match(/[#&]d=([^&]+)/);
  const qMatch = location.search.match(/[?&]d=([^&]*)/);

  let raw = null;
  let paramMode = null;
  if (gzMatch) {
    raw = gzMatch[1];
    paramMode = "gzip";
  } else if (lzMatch) {
    raw = lzMatch[1];
    paramMode = "lz";
  } else if (hashMatch) {
    raw = hashMatch[1];
    paramMode = "d";
  } else if (qMatch) {
    raw = qMatch[1];
    paramMode = "d";
  }

  if (!raw) {
    // Check if the hash itself is directly a prefixed key
    const hash = decodeURIComponent(location.hash.substring(1)).trim();
    if (
      hash.startsWith("gz:") ||
      hash.startsWith("lz:") ||
      hash.startsWith("d:") ||
      hash.startsWith("gz=") ||
      hash.startsWith("lz=") ||
      hash.startsWith("d=")
    ) {
      raw = hash;
    }
  }

  if (!raw) return false;

  const parsed = await tryParseAsync(raw, paramMode);
  if (parsed?.t) {
    const id = parsed.ts ? parsed.ts * 1000 : Date.now();
    localStorage.setItem(DASH_DATA_PREFIX + id, JSON.stringify(parsed));
    location.replace("result.html?id=" + id);
    return true;
  }

  console.error(
    "[Dashboard] Failed to parse data from URL (hash or query param)",
  );
  return false;
}

/* ── Chrome AI Support Check ─────────────────── */
let chromeAISupportStatus = "Đang kiểm tra...";
(async () => {
  try {
    if (typeof LanguageModel !== "undefined") {
      const status = await getSystemAIAvailability();
      if (status === "readily" || status === "available") {
        chromeAISupportStatus = "Có hỗ trợ (Sẵn sàng sử dụng)";
      } else if (status === "after-download" || status === "downloadable") {
        chromeAISupportStatus = "Có hỗ trợ (Cần tải thêm model)";
      } else if (status === "downloading") {
        chromeAISupportStatus = "Có hỗ trợ (Đang tải model...)";
      } else {
        chromeAISupportStatus = `Không hỗ trợ (Trạng thái: ${status})`;
      }
    } else if (typeof ai !== "undefined" && ai.languageModel) {
      const capabilities = await ai.languageModel.capabilities();
      if (
        capabilities &&
        [
          "available",
          "readily",
          "downloadable",
          "after-download",
          "downloading",
        ].includes(capabilities.available)
      ) {
        if (
          capabilities.available === "readily" ||
          capabilities.available === "available"
        ) {
          chromeAISupportStatus = "Có hỗ trợ (Sẵn sàng sử dụng - window.ai)";
        } else if (
          capabilities.available === "after-download" ||
          capabilities.available === "downloadable"
        ) {
          chromeAISupportStatus = "Có hỗ trợ (Cần tải thêm model - window.ai)";
        } else if (capabilities.available === "downloading") {
          chromeAISupportStatus = "Có hỗ trợ (Đang tải model... - window.ai)";
        } else {
          chromeAISupportStatus = `Không hỗ trợ (window.ai: ${capabilities.available})`;
        }
      } else {
        chromeAISupportStatus = "Không hỗ trợ (window.ai không khả dụng)";
      }
    } else {
      chromeAISupportStatus =
        "Không hỗ trợ (Trình duyệt không có API Chrome AI)";
    }
  } catch (e) {
    chromeAISupportStatus = `Không hỗ trợ (Lỗi: ${e.message})`;
  }
})();

/* ── Support Modal ───────────────────────────── */
function showSupportToast(msg, isError = false) {
  let toast = document.getElementById("support-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "support-toast";
    toast.style.cssText =
      "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.3s, bottom 0.3s;opacity:0;pointer-events:none;font-weight:500;";
    document.body.appendChild(toast);
  }
  toast.style.background = isError
    ? "var(--red, #ef4444)"
    : "var(--primary, #26aa99)";
  toast.innerHTML = msg;
  // Trigger reflow
  void toast.offsetWidth;
  toast.style.opacity = "1";
  toast.style.bottom = "30px";
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.bottom = "20px";
  }, 3000);
}
function setupSupportButton(d) {
  const btn = document.getElementById("btn-support");
  const btnNoData = document.getElementById("btn-support-no-data");
  const btnRating = document.getElementById("btn-rating-support-trigger");
  const modal = document.getElementById("support-modal");
  const closeBtn = document.getElementById("btn-close-support");
  const sendBtn = document.getElementById("btn-send-support");

  if (modal) {
    const descEl = document.getElementById("support-desc");
    const contactEl = document.getElementById("support-contact");
    const statusEl = document.getElementById("support-status");
    const lineCounterEl = document.getElementById("support-line-counter");
    const charCounterEl = document.getElementById("support-char-counter");
    const typeButtons = modal.querySelectorAll(".support-type-btn");
    const spinnerEl = sendBtn.querySelector(".btn-spinner");
    const btnTextEl = sendBtn.querySelector(".btn-text");

    const updateCounters = () => {
      if (!descEl) return;
      let text = descEl.value;
      
      // Limit to 10 lines
      let lines = text.split('\n');
      if (lines.length > 10) {
        lines = lines.slice(0, 10);
        descEl.value = lines.join('\n');
        
        if (lineCounterEl) {
          lineCounterEl.classList.add("support-counter-warning");
          setTimeout(() => lineCounterEl.classList.remove("support-counter-warning"), 300);
        }
      }
      
      const currentLines = descEl.value.split('\n').length;
      const currentChars = descEl.value.length;
      
      if (lineCounterEl) {
        lineCounterEl.textContent = `${currentLines}/10 dòng`;
        if (currentLines >= 10) {
          lineCounterEl.classList.add("support-counter-warning");
        } else {
          lineCounterEl.classList.remove("support-counter-warning");
        }
      }
      
      if (charCounterEl) {
        charCounterEl.textContent = `${currentChars}/500 ký tự`;
        if (currentChars >= 500) {
          charCounterEl.classList.add("support-counter-warning");
        } else {
          charCounterEl.classList.remove("support-counter-warning");
        }
      }
    };

    if (descEl) {
      descEl.addEventListener("input", updateCounters);
      descEl.addEventListener("paste", () => {
        setTimeout(updateCounters, 10);
      });
      
      descEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const lines = descEl.value.split('\n');
          if (lines.length >= 10) {
            e.preventDefault();
            if (lineCounterEl) {
              lineCounterEl.classList.add("support-counter-warning");
              setTimeout(() => lineCounterEl.classList.remove("support-counter-warning"), 300);
            }
          }
        }
      });
    }

    typeButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        typeButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    const showSupportStatus = (msg, isError = false) => {
      if (!statusEl) return;
      statusEl.className = isError ? "status-error" : "status-success";
      statusEl.innerHTML = isError ? `<span>⚠️</span> ${msg}` : `<span>🎉</span> ${msg}`;
    };

    const resetForm = () => {
      if (descEl) {
        descEl.value = "";
        descEl.disabled = false;
      }
      if (contactEl) {
        contactEl.value = "";
        contactEl.disabled = false;
      }
      typeButtons.forEach((b) => {
        b.disabled = false;
        if (b.getAttribute("data-type") === "suggestion") b.classList.add("active");
        else b.classList.remove("active");
      });
      if (statusEl) {
        statusEl.className = "hidden";
        statusEl.textContent = "";
      }
      if (spinnerEl) spinnerEl.classList.add("hidden");
      if (btnTextEl) btnTextEl.textContent = "Gửi phản hồi";
      sendBtn.disabled = false;
      updateCounters();
    };

    if (btn) {
      btn.addEventListener("click", () => {
        resetForm();
        modal.classList.add("active");
      });
    }

    if (btnNoData) {
      btnNoData.addEventListener("click", () => {
        resetForm();
        modal.classList.add("active");
      });
    }

    if (btnRating) {
      btnRating.addEventListener("click", (e) => {
        e.preventDefault();
        resetForm();
        modal.classList.add("active");
      });
    }

    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });

    sendBtn.addEventListener("click", async () => {
      const lastSentStr = localStorage.getItem("shopee_support_last_sent");
      if (lastSentStr) {
        const lastSent = parseInt(lastSentStr, 10);
        if (Date.now() - lastSent < 60000) {
          const waitTime = Math.ceil((60000 - (Date.now() - lastSent)) / 1000);
          showSupportStatus(`Bạn thao tác quá nhanh. Vui lòng thử lại sau ${waitTime} giây!`, true);
          return;
        }
      }



      const bodyText = descEl ? descEl.value.trim() : "";
      if (!bodyText) {
        showSupportStatus("Vui lòng nhập nội dung mô tả phản hồi!", true);
        if (descEl) descEl.focus();
        return;
      }

      // Collect type and contact
      const activeTypeBtn = modal.querySelector(".support-type-btn.active");
      const type = activeTypeBtn ? activeTypeBtn.getAttribute("data-type") : "bug";
      const typeLabels = {
        bug: "🐛 Bug",
        suggestion: "💡 Suggestion",
        other: "💬 Other"
      };
      const typeLabel = typeLabels[type] || "Suggestion";
      const contactVal = contactEl ? contactEl.value.trim() : "";

      // Combine type + contact info + body text into desc field
      const desc = `[Type: ${typeLabel}]` + 
                   (contactVal ? `\n[Contact: ${contactVal}]` : "") + 
                   `\n\n${bodyText}`;

      const info = (() => {
        const ua = navigator.userAgent;
        let browser = "Unknown";
        if (ua.includes("CocCoc")) browser = "Cốc Cốc";
        else if (ua.includes("OPR") || ua.includes("Opera")) browser = "Opera";
        else if (ua.includes("Edg")) browser = "Edge";
        else if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";

        let os = "Unknown";
        if (ua.includes("Windows")) os = "Windows";
        else if (ua.includes("Macintosh") || ua.includes("Mac OS X")) os = "macOS";
        else if (ua.includes("Linux")) os = "Linux";
        else if (ua.includes("Android")) os = "Android";
        else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

        return {
          browser: browser,
          os: os,
          screen: `${window.screen.width}x${window.screen.height}`,
          dpr: window.devicePixelRatio || 1,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          dataDate: (() => {
            if (!d || !d.ts) return "Unknown";
            let ts = d.ts;
            if (ts < 10000000000) ts = ts * 1000;
            return new Date(ts).toLocaleString("en-US");
          })(),
          summary:
            d && d.t !== undefined && d.o !== undefined
              ? `${d.o} orders - ${d.t.toLocaleString("en-US")} VND`
              : "Unknown",
          chromeAI: (() => {
            const status = typeof chromeAISupportStatus !== "undefined" ? chromeAISupportStatus : "";
            if (status.includes("Sẵn sàng")) return "Supported (Ready)";
            if (status.includes("tải thêm")) return "Supported (Need model download)";
            if (status.includes("Đang tải")) return "Supported (Downloading model)";
            if (status.includes("Không hỗ trợ")) return "Not supported";
            return status || "Unknown";
          })(),
          extVersion: (() => {
            if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest) {
              return chrome.runtime.getManifest().version;
            }
            return d && d.ev ? d.ev : "Unknown";
          })(),
        };
      })();

      const deviceInfoStr = [
        `Browser     : ${info.browser}`,
        `OS          : ${info.os}`,
        `Screen      : ${info.screen} (DPR ${info.dpr})`,
        `Viewport    : ${info.viewport}`,
        `Data Date   : ${info.dataDate}`,
        `Summary     : ${info.summary}`,
        `Chrome AI   : ${info.chromeAI}`,
        `Ext Version : ${info.extVersion}`,
      ].join("\n");

      // Set loading state
      sendBtn.disabled = true;
      if (spinnerEl) spinnerEl.classList.remove("hidden");
      if (btnTextEl) btnTextEl.textContent = "Đang gửi...";
      if (descEl) descEl.disabled = true;
      if (contactEl) contactEl.disabled = true;
      typeButtons.forEach(b => b.disabled = true);
      if (statusEl) statusEl.className = "hidden";

      try {
        let compressed = "";
        if (d) {
          const jsonStr = JSON.stringify(d);
          try {
            if (typeof CompressionStream !== "undefined") {
              const stream = new Blob([jsonStr])
                .stream()
                .pipeThrough(new CompressionStream("gzip"));
              const buffer = await new Response(stream).arrayBuffer();
              let binary = "";
              const bytes = new Uint8Array(buffer);
              for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              compressed =
                "gz=" +
                btoa(binary)
                  .replace(/\+/g, "-")
                  .replace(/\//g, "_")
                  .replace(/=+$/, "");
            }
          } catch (e) {
            console.warn("[Dashboard] Gzip compression failed:", e);
          }

          if (!compressed) {
            try {
              if (typeof LZString !== "undefined") {
                compressed =
                  "lz=" + LZString.compressToEncodedURIComponent(jsonStr);
              }
            } catch (e) {
              console.warn("[Dashboard] LZString compression failed:", e);
            }
          }

          if (!compressed) {
            const bytes = new TextEncoder().encode(jsonStr);
            let bin = "";
            for (let i = 0; i < bytes.length; i++)
              bin += String.fromCharCode(bytes[i]);
            compressed = "d=" + btoa(bin);
          }
        }

        const payload = {
          secret: "shopee_stats_anti_spam_secret_2026",
          time: new Date().toISOString(),
          device: deviceInfoStr,
          desc: desc,
          data: compressed
        };

        const WEBAPP_URL =
          "https://script.google.com/macros/s/AKfycbyy797dN68snuKJli45jVCaxjLGf7M8VIZk9M-lC6zmlG2BEMihvi1Qp92OuXm8uRhm/exec";

        const response = await fetch(WEBAPP_URL, {
          method: "POST",
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
        });

        const resText = await response.text();

        if (resText === "success") {
          localStorage.setItem("shopee_support_last_sent", Date.now());
          showSupportStatus("Gửi phản hồi thành công! Cảm ơn bạn rất nhiều.");
          if (spinnerEl) spinnerEl.classList.add("hidden");
          if (btnTextEl) btnTextEl.textContent = "✓ Đã gửi thành công";
          
          setTimeout(() => {
            modal.classList.remove("active");
            resetForm();
          }, 2000);
        } else if (resText === "duplicate") {
          showSupportStatus("Phản hồi này đã được ghi nhận trước đó.", true);
          // re-enable
          sendBtn.disabled = false;
          if (spinnerEl) spinnerEl.classList.add("hidden");
          if (btnTextEl) btnTextEl.textContent = "Gửi phản hồi";
          if (descEl) descEl.disabled = false;
          if (contactEl) contactEl.disabled = false;
          typeButtons.forEach(b => b.disabled = false);
        } else {
          const errMsgs = {
            "error_missing_payload": "Dữ liệu gửi lên bị thiếu.",
            "error_invalid_json": "Gói dữ liệu không đúng định dạng.",
            "error_unauthorized": "Mã xác thực không hợp lệ.",
            "error_invalid_timestamp": "Thời gian gửi lệch quá mức (có thể đồng hồ máy bạn bị sai).",
            "error_invalid_signature": "Xác thực chữ ký gói tin thất bại.",
            "error_replay_detected": "Yêu cầu gửi lặp lại bị chặn (Replay Attack).",
            "error_invalid_data_structure": "Dữ liệu Shopee Stats gửi lên bị giả mạo hoặc sai định dạng.",
            "rate_limit_exceeded": "Bạn đã gửi quá nhanh (tối đa 20 phản hồi / 10 phút). Vui lòng thử lại sau.",
            "error_payload_too_large": "Nội dung phản hồi vượt quá 1000 ký tự.",
            "error_data_too_large": "Dữ liệu nén vượt quá kích thước cho phép."
          };
          const friendlyMsg = errMsgs[resText] || resText || "Lỗi không xác định từ server.";
          throw new Error(friendlyMsg);
        }
      } catch (e) {
        showSupportStatus(`Gửi thất bại: ${e.message}`, true);
        // re-enable
        sendBtn.disabled = false;
        if (spinnerEl) spinnerEl.classList.add("hidden");
        if (btnTextEl) btnTextEl.textContent = "Gửi phản hồi";
        if (descEl) descEl.disabled = false;
        if (contactEl) contactEl.disabled = false;
        typeButtons.forEach(b => b.disabled = false);
      }
    });
  }
}

/* ── Share Modal ─────────────────────────────── */
function setupShareButtons(d) {
  const modal = document.getElementById("share-modal");
  const previewImg = document.getElementById("share-preview-img");
  const themeSelect = document.getElementById("share-theme-select");
  const hideAmountCb = document.getElementById("share-hide-amount");
  const hideNamesCb = document.getElementById("share-hide-names");
  const btnCopy = document.getElementById("btn-modal-copy");
  const btnDownload = document.getElementById("btn-modal-download");

  let currentOptions = { cardType: "overview" };
  let currentDataUrl = "";

  const getBeat = (t) => {
    // CẬP NHẬT ĐỊNH KỲ (Cứ mỗi 6 tháng - Lần cuối: Tháng 5/2026)
    // Nguồn dữ liệu tham khảo: Báo cáo TMĐT Việt Nam năm 2025/2026 (Metric, VECOM)
    // Chi tiêu trung bình TMĐT đầu người khoảng 10.5M VNĐ/năm, trung vị khoảng 6.5M - 7M VNĐ/năm.
    const thresholds = [
      { max: 1500000, beat: 15 },    // Nhóm mua sắm trải nghiệm / cực ít
      { max: 4000000, beat: 35 },    // Nhóm mua sắm thỉnh thoảng
      { max: 7000000, beat: 50 },    // Ngưỡng trung vị (Median Shopper)
      { max: 15000000, beat: 65 },   // Bắt đầu chi tiêu nhiều (Beat ~65% Shopee VN)
      { max: 35000000, beat: 80 },   // Tín đồ mua sắm thực thụ
      { max: 70000000, beat: 90 },   // Siêu cấp chốt đơn
      { max: 120000000, beat: 95 },  // Khách hàng VIP
      { max: 250000000, beat: 98 },  // Siêu VIP
      { max: Infinity, beat: 99 }    // Whale / Cổ Đông Chiến Lược
    ];
    for (const item of thresholds) {
      if (t <= item.max) return item.beat;
    }
    return 99;
  };

  async function updatePreview() {
    if (!window.generateDashboardShareCard) return;
    const curYear = new Date().getFullYear();
    const targetYear = currentOptions.year || curYear;
    let yearlySpend = d.yd && d.yd[targetYear] ? d.yd[targetYear].t : d.t;
    
    // Extrapolate current year spending to get a fair percentile ranking
    if (targetYear === curYear && d.yd && d.yd[curYear]) {
      const monthsElapsed = new Date().getMonth() + 1;
      yearlySpend = yearlySpend * (12 / monthsElapsed);
    }

    const opts = {
      ...currentOptions,
      theme: themeSelect.value,
      hideAmount: hideAmountCb.checked,
      hideNames: hideNamesCb.checked,
      beat: getBeat(yearlySpend),
      year: targetYear,
    };
    previewImg.style.opacity = "0.5";
    try {
      currentDataUrl = await window.generateDashboardShareCard(d, opts);
      previewImg.src = currentDataUrl;
    } catch (e) {
      console.error(e);
    }
    previewImg.style.opacity = "1";
  }

  function openModal(cardType, extraOpts = {}) {
    currentOptions = { cardType, ...extraOpts };
    modal.classList.add("active");
    updatePreview();
  }

  document.getElementById("btn-close-modal").addEventListener("click", () => {
    modal.classList.remove("active");
  });

  themeSelect.addEventListener("change", updatePreview);
  hideAmountCb.addEventListener("change", updatePreview);
  hideNamesCb.addEventListener("change", updatePreview);

  document.querySelectorAll(".btn-share-trigger").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-type");
      if (type === "monthly") {
        const selYear = window.currentMonthlySelection.year;
        let selMonth = window.currentMonthlySelection.month;
        if (!selMonth && d.yd && d.yd[selYear] && d.yd[selYear].m) {
          const topMonth = Object.entries(d.yd[selYear].m).sort(
            (a, b) => b[1] - a[1],
          )[0];
          selMonth = topMonth ? topMonth[0] : null;
        }
        openModal(type, { month: selMonth, year: selYear });
      } else {
        openModal(type);
      }
    });
  });

  btnDownload.addEventListener("click", () => {
    if (!currentDataUrl) return;
    const link = document.createElement("a");
    link.href = currentDataUrl;
    link.download = `shopee-analytics-${currentOptions.cardType}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  btnCopy.addEventListener("click", async () => {
    if (!currentDataUrl) return;
    const orig = btnCopy.innerHTML;
    btnCopy.innerHTML = "Đang copy...";
    try {
      const res = await fetch(currentDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      btnCopy.innerHTML = "✓ Đã copy!";
    } catch (err) {
      console.error(err);
      btnCopy.innerHTML = "❌ Lỗi";
    } finally {
      setTimeout(() => {
        btnCopy.innerHTML = orig;
      }, 2000);
    }
  });
}

/* ── Dashboard Rating Card ────────────────────── */
function setupDashboardRatingCard(d) {
  const ratingCard = document.getElementById("sidebar-rating-box");
  const starsContainer = document.getElementById("sidebar-stars");
  const stars = starsContainer
    ? starsContainer.querySelectorAll(".s-star")
    : [];
  const thankyouEl = document.getElementById("sidebar-rating-thankyou");
  const feedbackEl = document.getElementById("sidebar-rating-feedback");
  const subtextEl = document.getElementById("sidebar-rating-subtext");

  if (!ratingCard) return;

  // Show the card permanently
  ratingCard.style.display = "flex";

  let selectedValue = 0;

  const highlightStars = (val) => {
    stars.forEach((star) => {
      const v = parseInt(star.getAttribute("data-value"));
      if (v <= val) {
        star.classList.add("hovered");
      } else {
        star.classList.remove("hovered");
      }
    });
  };

  const resetStars = () => {
    stars.forEach((star) => {
      const v = parseInt(star.getAttribute("data-value"));
      star.classList.remove("hovered");
      if (v <= selectedValue) {
        star.classList.add("selected");
      } else {
        star.classList.remove("selected");
      }
    });
  };

  stars.forEach((star) => {
    star.addEventListener("mouseenter", () => {
      starsContainer.classList.add("has-hovered");
      highlightStars(parseInt(star.getAttribute("data-value")));
    });

    star.addEventListener("mouseleave", () => {
      starsContainer.classList.remove("has-hovered");
      resetStars();
    });

    star.addEventListener("click", () => {
      selectedValue = parseInt(star.getAttribute("data-value"));
      resetStars();

      if (selectedValue === 5) {
        if (subtextEl) subtextEl.classList.add("hidden");
        if (thankyouEl) thankyouEl.classList.remove("hidden");
        if (feedbackEl) feedbackEl.classList.add("hidden");

        setTimeout(() => {
          window.open(
            "https://chromewebstore.google.com/detail/shopee-analytics-pro-th%E1%BB%91n/jcflofioiopfchfelgbpbndplhpfeapm/reviews",
            "_blank",
          );

          // Re-enable and reset widget after a short delay so it remains interactive and clean
          setTimeout(() => {
            if (subtextEl) subtextEl.classList.remove("hidden");
            if (thankyouEl) thankyouEl.classList.add("hidden");
            selectedValue = 0;
            resetStars();
          }, 2000);
        }, 1000);
      } else {
        if (subtextEl) subtextEl.classList.add("hidden");
        if (thankyouEl) thankyouEl.classList.add("hidden");
        if (feedbackEl) feedbackEl.classList.remove("hidden");
      }
    });
  });
}

/* ── Boot ────────────────────────────────────── */
(async function () {
  const hasRaw = await checkAndHandleUrlData();
  if (hasRaw) return;
  const d = parseData();

  if (!d || !d.t) {
    console.warn("[Dashboard] No data or invalid data, showing no-data view");
    renderNoData();
    setupSupportButton(null);
  } else {
    cleanupStorage(getSessionId(), d.ev);
    _dashCache = loadDashCache(d.ts, d.ev || '');

    let _categorizationFinished = false;
    let _activeYear = null;
    let _activeCatYear = "all";
    window.currentYearSelection = "all";

    const CAT_VN_TO_EN = {
      "💄 Sức khỏe & Làm đẹp": "Beauty & Health",
      "👗 Thời trang & Phụ kiện": "Fashion & Accessories",
      "💻 Điện tử & Công nghệ": "Electronics & Tech",
      "🏠 Nhà cửa & Đời sống": "Home & Living",
      "💪 Thể thao & Du lịch": "Sports & Travel",
      "📚 Giải trí & Giáo dục": "Entertainment & Education",
      "🏷️ Khác": "Others / Uncategorized",
    };

    function translateCategoryToEnglish(name) {
      const clean = String(name || "").trim();
      for (const [vn, en] of Object.entries(CAT_VN_TO_EN)) {
        if (clean.includes(vn) || vn.includes(clean)) {
          return en;
        }
      }
      let text = clean
        .replace(
          /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g,
          "",
        )
        .trim();
      const textLower = text.toLowerCase();
      if (textLower.includes("sức khỏe") || textLower.includes("làm đẹp"))
        return "Beauty & Health";
      if (textLower.includes("thời trang") || textLower.includes("phụ kiện"))
        return "Fashion & Accessories";
      if (
        textLower.includes("điện thoại") ||
        textLower.includes("máy tính") ||
        textLower.includes("điện tử") ||
        textLower.includes("công nghệ")
      )
        return "Electronics & Tech";
      if (textLower.includes("nhà cửa") || textLower.includes("đời sống"))
        return "Home & Living";
      if (textLower.includes("thể thao") || textLower.includes("du lịch"))
        return "Sports & Travel";
      if (
        textLower.includes("giải trí") ||
        textLower.includes("giáo dục") ||
        textLower.includes("sách")
      )
        return "Entertainment & Education";
      if (textLower.includes("trẻ em") || textLower.includes("đồ chơi"))
        return "Kids & Toys";
      if (textLower.includes("ô tô") || textLower.includes("xe máy"))
        return "Automotive";
      if (textLower.includes("đồng hồ")) return "Watches";
      if (textLower.includes("máy ảnh")) return "Cameras";
      return text || "Others";
    }

    function fmtVNDEng(n) {
      n = Math.round(n || 0);
      if (n >= 1e9)
        return (n / 1e9).toFixed(1).replace(".0", "") + " billion VND";
      if (n >= 1e6)
        return (n / 1e6).toFixed(1).replace(".0", "") + " million VND";
      if (n >= 1e3) return (n / 1e3).toFixed(1).replace(".0", "") + "k VND";
      return n.toLocaleString("en-US") + " VND";
    }

    function triggerMonthlyAIInsight(d, yr, profile) {
      // No-op
    }
    window.triggerMonthlyAIInsight = triggerMonthlyAIInsight;

    function triggerSingleMonthAIInsight(d, year, monthStr) {
      // No-op
    }
    window.triggerSingleMonthAIInsight = triggerSingleMonthAIInsight;

    function triggerYearlyAIInsight(d, profile) {
      const yearEntries = Object.entries(d.yd || {})
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .filter(([, v]) => v.t > 0);

      let maxYear = null, maxYearVal = 0;
      for (const [y, v] of yearEntries) {
        if (v.t > maxYearVal) { maxYearVal = v.t; maxYear = y; }
      }

      const context = profile ? profile.aiContext : yearEntries
        .map(([y, v]) => `Năm ${y}: ${fmtVND(v.t)}`).join(", ");

      const specificPrompt = profile
        ? `Hồ sơ tính cách: ${profile.aiContext}\n\nYêu cầu: Viết 1-2 câu nhận xét tâm lý sâu sắc về hành trình mua sắm nhiều năm của người này. Không liệt kê lại đặc điểm, không số tiền, không tiếng Anh.`
        : `Chi tiêu qua các năm: ${context}. Năm đỉnh điểm: ${maxYear}. Viết 1-2 câu nhận xét ngắn về xu hướng. Không số tiền.`;

      enrichWithAI(
        "insight-yearly",
        context,
        specificPrompt,
        "insight-yearly-all",
        null,
        false,
        profile,
      );
    }
    window.triggerYearlyAIInsight = triggerYearlyAIInsight;

    function getItemsForYear(mi, year, tiItems) {
      const prefix = year + "-";

      const catLookup = {};
      for (const item of tiItems || []) {
        if (item.cat && !isInvalidCat(item.cat)) {
          const k = item.n.toLowerCase().substring(0, 40);
          catLookup[k] = item.cat;
        }
      }

      const map = {};
      for (const key of Object.keys(mi || {})) {
        if (!key.startsWith(prefix)) continue;
        for (const item of mi[key] || []) {
          const k = item.n.toLowerCase().substring(0, 120);
          const k40 = item.n.toLowerCase().substring(0, 40);
          if (!map[k]) {
            map[k] = { n: item.n, s: 0, c: 0 };
            let cat = item.cat;
            if (cat && LEGACY_CAT_NAMES[cat]) {
              cat = LEGACY_CAT_NAMES[cat];
            }
            if (cat && !isInvalidCat(cat)) {
              map[k].cat = cat;
            } else if (catLookup[k40]) {
              map[k].cat = catLookup[k40];
            } else if (_dashCache.cats[k] || _dashCache.cats[k40]) {
              map[k].cat = _dashCache.cats[k] || _dashCache.cats[k40];
            } else {
              const kwCat = classifyByNameSync(item.n);
              if (kwCat !== "🏷️ Khác") map[k].cat = kwCat;
            }
          }
          map[k].s += item.s || 0;
          map[k].c += item.c || 0;
        }
      }
      return Object.values(map).sort((a, b) => b.s - a.s);
    }

    function categorizeMiItems(d, tiItems) {
      if (!d.mi) return;
      const catLookup = {};
      for (const item of tiItems || []) {
        if (item.cat && !isInvalidCat(item.cat)) {
          const k = item.n.toLowerCase().substring(0, 40);
          catLookup[k] = item.cat;
        }
      }

      for (const key of Object.keys(d.mi)) {
        for (const item of d.mi[key] || []) {
          if (item.cat && LEGACY_CAT_NAMES[item.cat]) {
            item.cat = LEGACY_CAT_NAMES[item.cat];
          }
          if (item.cat && !isInvalidCat(item.cat)) continue;

          const k = item.n.toLowerCase().substring(0, 120);
          const k40 = item.n.toLowerCase().substring(0, 40);

          if (catLookup[k40]) {
            item.cat = catLookup[k40];
          } else if (_dashCache.cats[k] || _dashCache.cats[k40]) {
            item.cat = _dashCache.cats[k] || _dashCache.cats[k40];
          } else {
            const kwCat = classifyByNameSync(item.n);
            item.cat = kwCat || "🏷️ Khác";
          }
        }
      }
    }
    window.categorizeMiItems = categorizeMiItems;

    function triggerCategoryAIInsight(cs, ti, total, cacheKey, year, profile) {
      // No-op
    }
    window.triggerCategoryAIInsight = triggerCategoryAIInsight;

    function triggerSingleCategoryAIInsight(cs, ti, total, catName, year, overallTotal) {
      // No-op
    }
    window.triggerSingleCategoryAIInsight = triggerSingleCategoryAIInsight;

    window.computeSingleMonthInsights = function (d, year, monthStr) {
      const items = [];
      const ym = `${year}-${monthStr}`;
      const monthItems = (d.mi && d.mi[ym]) || [];
      if (!monthItems.length) return items;

      const monthTotal =
        (d.yd[year] && d.yd[year].m && d.yd[year].m[monthStr]) || 0;
      items.push({ text: `Tổng chi tiêu trong **Tháng ${monthStr}/${year}** là **${fmtVND(monthTotal)}**.`,
      });

      const yearData = d.yd[year] || {};
      const monthEntries = Object.entries(yearData.m || {}).filter(
        ([, v]) => v > 0,
      );
      if (monthEntries.length > 1) {
        const avg = (yearData.t || 0) / monthEntries.length;
        const diffPct = Math.round(((monthTotal - avg) / avg) * 100);
        if (diffPct > 0) {
          items.push({ text: `Mức chi tiêu này **cao hơn ${diffPct}%** so với trung bình tháng của năm ${year} (**${fmtVND(Math.round(avg))}**).`,
          });
        } else if (diffPct < 0) {
          items.push({ text: `Mức chi tiêu này **thấp hơn ${Math.abs(diffPct)}%** so với trung bình tháng của năm ${year} (**${fmtVND(Math.round(avg))}**).`,
          });
        }
      }

      const topItem = monthItems[0];
      if (topItem) {
        const pct = Math.round((topItem.s / Math.max(monthTotal, 1)) * 100);
        items.push({ text: `Sản phẩm chi nhiều nhất: **"${topItem.n}"** — **${fmtVND(topItem.s)}** (chiếm **${pct}%** của tháng).`,
        });
      }

      const totalLuot = monthItems.reduce((s, i) => s + (i.c || 1), 0);
      items.push({ text: `Tổng cộng bạn đã mua **${totalLuot} lượt sản phẩm** trong tháng này.`,
      });

      return items.slice(0, 5);
    };

    window.computeSingleCategoryInsights = function (
      catName,
      catTotal,
      catCount,
      catItems,
      overallTotal,
    ) {
      const items = [];
      items.push({
        text: `Tổng chi tiêu danh mục **${catName}**: **${fmtVND(catTotal)}** (${catCount} lượt mua).`,
      });

      if (overallTotal > 0) {
        const pct = Math.round((catTotal / overallTotal) * 100);
        items.push({
          text: `Chiếm **${pct}%** tổng chi tiêu trong kỳ được chọn.`,
        });
      }

      if (catItems.length > 0) {
        const top1 = catItems[0];
        const pctTop1 = Math.round((top1.s / Math.max(catTotal, 1)) * 100);
        items.push({
          text: `Sản phẩm chi nhiều nhất: **"${top1.n}"** — **${fmtVND(top1.s)}** (${pctTop1}% danh mục).`,
        });
      }

      const avgPrice = Math.round(catTotal / Math.max(catCount, 1));
      items.push({
        text: `Giá TB/lượt mua: **${fmtVND(avgPrice)}/món**.`,
      });

      return items;
    };

    window.clearYearlySelection = function (d) {
      window.currentYearSelection = "all";

      const card = document.getElementById("card-yearly-items");
      if (card) card.style.display = "none";

      if (yearlyChart) {
        const years = Object.keys(d.yd || {}).sort();
        const ctx = document.getElementById('chart-yearly').getContext('2d');
        const currentYearStr = String(new Date().getFullYear());
        const gradients = years.map(y => {
          const grad = ctx.createLinearGradient(0, 0, 0, 300);
          if (y === currentYearStr) {
            grad.addColorStop(0, '#ee4d2d');
            grad.addColorStop(1, '#ff8060');
          } else {
            grad.addColorStop(0, 'rgba(203, 213, 225, 0.95)');
            grad.addColorStop(1, 'rgba(148, 163, 184, 0.45)');
          }
          return grad;
        });
        yearlyChart.data.datasets[0].backgroundColor = gradients;
        yearlyChart.update();
      }

      renderInsightCard("insight-yearly", computeYearlyInsights(d.yd || {}, d));
    };

    window.clearMonthlySelection = function (d) {
      if (window.currentMonthlySelection) {
        window.currentMonthlySelection.month = null;
      }

      const miCard = document.getElementById("card-monthly-items");
      if (miCard) miCard.style.display = "none";

      const yr =
        (window.currentMonthlySelection &&
          window.currentMonthlySelection.year) ||
        Object.keys(d.yd || {}).sort((a, b) => b - a)[0];

      if (monthlyChart) {
        const ctx = document.getElementById('chart-monthly').getContext('2d');
        const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
        const ydata = d.yd[yr];
        if (ydata) {
          const vals = months.map(m => ydata.m[m] || 0);
          const peakVal = Math.max(...vals, 1);
          const barColors = vals.map(v => {
            const grad = ctx.createLinearGradient(0, 0, 0, 320);
            if (v === peakVal && v > 0) {
              grad.addColorStop(0, '#ee4d2d');
              grad.addColorStop(1, '#ff8060');
            } else {
              grad.addColorStop(0, 'rgba(238, 77, 45, 0.45)');
              grad.addColorStop(1, 'rgba(238, 77, 45, 0.1)');
            }
            return grad;
          });
          monthlyChart.data.datasets[0].backgroundColor = barColors;
          monthlyChart.update();
        }
      }

      renderInsightCard("insight-monthly", computeMonthlyInsights(d.yd, yr));
      triggerMonthlyAIInsight(d, yr);
    };

    function switchCategoryYear(year, d, tiItems) {
      _activeCatYear = year;

      let cs, ti, total;
      if (year === "all") {
        cs = d.cs;
        ti = tiItems;
        total = d.t;
        const sub = document.getElementById("cat-subtitle");
        if (sub) sub.textContent = "Phân bổ chi tiêu theo từng danh mục Shopee";
      } else {
        ti = getItemsForYear(d.mi, year, tiItems);
        for (const item of ti) {
          if (!item.cat) item.cat = "🏷️ Khác";
        }
        cs = buildCsFromTi(ti);
        total = (d.yd[year] || {}).t || 0;
        const sub = document.getElementById("cat-subtitle");
        if (sub)
          sub.textContent = `Danh mục năm ${year} · dữ liệu top 20 sản phẩm/tháng`;
      }

      document.getElementById("card-cat-items").style.display = "none";
      document
        .querySelectorAll("#cat-bars .cat-row")
        .forEach((r) => r.classList.remove("cat-row-active"));

      renderCategories(cs, ti, total, year);
      renderInsightCard(
        "insight-categories",
        computeCategoryInsights(cs, total),
      );

      if (_categorizationFinished) {
        const key =
          year === "all"
            ? "insight-categories-all"
            : `insight-categories-${year}`;
        triggerCategoryAIInsight(cs, ti, total, key, year);
      }
    }

    function renderCatYearPills(d, tiItems) {
      const years = Object.keys(d.yd || {}).sort((a, b) => b - a);
      if (!years.length) return;
      const container = document.getElementById("cat-year-pills");
      if (!container) return;
      const allPills = ["all", ...years];
      container.innerHTML = allPills
        .map(
          (y, i) =>
            `<button class="pill${i === 0 ? " active" : ""}" data-catyear="${y}">${y === "all" ? "Tất cả" : "Năm " + y}</button>`,
        )
        .join("");
      container.querySelectorAll(".pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          container
            .querySelectorAll(".pill")
            .forEach((p) => p.classList.remove("active"));
          btn.classList.add("active");
          switchCategoryYear(btn.getAttribute("data-catyear"), d, tiItems);
        });
      });
    }

    function runAIInsightsNarrative(d) {
      window.runAIInsightsNarrative = runAIInsightsNarrative;

      // Compute global personality profile once — reused by all sections
      const globalProfile = typeof analyzeShoppingPersonality === 'function'
        ? analyzeShoppingPersonality(d)
        : null;

      // Store globally so trigger functions can access it
      window._globalPersonalityProfile = globalProfile;

      // 1. Yearly Overview — ONLY section with AI narrative
      triggerYearlyAIInsight(d, globalProfile);
    }

    async function initDashboard() {
      window.currentDashData = d;

      const reverseCatMap = {
        'b': 'beauty_health',
        'f': 'fashion',
        't': 'tech',
        'h': 'home',
        's': 'sport',
        'e': 'edu'
      };

      // Normalize `ti` if it is in array format [n, s, c, cat, op, dp]
      if (d.ti && d.ti.length && Array.isArray(d.ti[0])) {
        d.ti = d.ti.map(arr => ({
          n: arr[0],
          s: arr[1],
          c: arr[2],
          cat: reverseCatMap[arr[3]] || arr[3],
          op: arr[4] || 0,
          dp: arr[5] || 0
        }));
      }

      // Normalize `ol` if it is in array format [t, f, r, c, n, ot]
      if (d.ol && d.ol.length && Array.isArray(d.ol[0])) {
        d.ol = d.ol.map(arr => ({
          t: arr[0],
          f: arr[1],
          r: arr[2],
          c: reverseCatMap[arr[3]] || arr[3],
          n: arr[4],
          ot: arr[5] || arr[0]
        }));
      }
      if (d.ol && d.ol.length) {
        for (const order of d.ol) {
          if (order.n) order.n = formatItemNameForDisplay(order.n);
        }
      }

      // Normalize `mi` (monthly items) if it is in array format [n, s, c, cat, op, dp]
      if (d.mi) {
        for (const key of Object.keys(d.mi)) {
          if (d.mi[key] && d.mi[key].length && Array.isArray(d.mi[key][0])) {
            d.mi[key] = d.mi[key].map(arr => ({
              n: arr[0],
              s: arr[1],
              c: arr[2],
              cat: reverseCatMap[arr[3]] || arr[3],
              op: arr[4] || 0,
              dp: arr[5] || 0
            }));
          }
        }
      }

      // Load categories first so keyword classification is ready!
      await initializeCategories();

      // Clean up item names from mathematical symbols, homoglyphs, and zero-width spaces for legacy/imported data
      if (d.ti && d.ti.length) {
        for (const item of d.ti) {
          if (item.n) {
            item.n = formatItemNameForDisplay(item.n);
          }
        }
      }
      if (d.mi) {
        for (const key of Object.keys(d.mi)) {
          for (const item of d.mi[key] || []) {
            if (item.n) {
              item.n = formatItemNameForDisplay(item.n);
            }
          }
        }
      }

      // Fallback: if ti is absent from the export, derive it by aggregating mi (monthly items)
      if (!d.ti || !d.ti.length) {
        const miMap = {};
        for (const key of Object.keys(d.mi || {})) {
          for (const item of d.mi[key] || []) {
            const k = item.n.toLowerCase().substring(0, 120);
            if (!miMap[k]) miMap[k] = { n: item.n, s: 0, c: 0 };
            miMap[k].s += item.s || 0;
            miMap[k].c += item.c || 0;
          }
        }
        d.ti = Object.values(miMap).sort((a, b) => b.s - a.s);
        console.log("[Dashboard] ti derived from mi:", d.ti.length, "items");
      }

      const tiItems = d.ti || [];

      // Convert raw legacy numeric category IDs first
      for (const item of tiItems) {
        if (item.cat && LEGACY_CAT_NAMES[item.cat]) {
          item.cat = LEGACY_CAT_NAMES[item.cat];
        }
      }

      // 1. Apply cached AI overrides from previous sessions
      for (const item of tiItems) {
        if (!isInvalidCat(item.cat)) continue;
        const key = item.n.toLowerCase().substring(0, 120);
        if (_dashCache.cats[key]) item.cat = _dashCache.cats[key];
      }

      // 2. Initialize with default category for unclassified items
      for (const item of tiItems) {
        if (isInvalidCat(item.cat)) item.cat = "🏷️ Khác";
      }

      // 2b. Categorize mi items with whatever is currently available (cached / keyword)
      categorizeMiItems(d, tiItems);

      // 3. Build initial catStats from classified ti
      d.cs = buildCsFromTi(tiItems);

      // 4. Render layout synchronously so UI appears instantly
      document.title = `Dashboard — ${fmtVND(d.t)} · Shopee Analytics`;
      document.getElementById("data-date").textContent = fmtDate(d.ts);
      document.getElementById("subtitle-overview").textContent =
        `${fmtVND(d.t)} tổng chi tiêu · ${fmtNum(d.o)} đơn hàng`;

      renderKpi(d);
      renderYearlyChart(d.yd || {}, d);
      renderPeriod(d.ps || {});

      renderYearPills(d.yd || {}, (yr) => {
        _activeYear = yr;
        renderMonthly(d.yd, yr, d);
        const monthlyItems = computeMonthlyInsights(d.yd, yr);
        renderInsightCard("insight-monthly", monthlyItems);

        if (_categorizationFinished) {
          triggerMonthlyAIInsight(d, yr);
        }
      });

      renderTopItems(tiItems);
      renderCategories(d.cs, tiItems);
      renderCatYearPills(d, tiItems);

      // Expose pre-aggregated order stats and total count for orders.js
      window._oss = d.oss || null;
      window._totalOrderCount = d.o || 0;
      renderOrders(d.ol || []);

      // Render static insight cards
      renderInsightCard("insight-yearly", computeYearlyInsights(d.yd || {}, d));
      renderInsightCard("insight-items", computeItemInsights(tiItems, d.t));
      renderInsightCard(
        "insight-categories",
        computeCategoryInsights(d.cs, d.t),
      );

      // Render monthly insight for default year
      const defaultYears = Object.keys(d.yd || {})
        .map(Number)
        .sort((a, b) => b - a);
      if (defaultYears.length) {
        renderInsightCard(
          "insight-monthly",
          computeMonthlyInsights(d.yd, defaultYears[0]),
        );
      }

      // Add listeners for limits
      document
        .getElementById("items-limit-select")
        ?.addEventListener("change", renderTopItemsList);
      document
        .getElementById("monthly-limit-select")
        ?.addEventListener("change", renderMonthlyItemsList);

      setupShareButtons(d);
      setupSupportButton(d);
      setupDashboardRatingCard(d);

      // 5. Run async keyword classification (background)
      const alreadyCategorized = tiItems.every(
        (item) => !isInvalidCat(item.cat),
      );
      if (!alreadyCategorized) {
        try {
          let hasUpdates = false;
          let count = 0;
          for (const item of tiItems) {
            if (isInvalidCat(item.cat)) {
              if (count++ % 50 === 0) {
                await new Promise((resolve) => setTimeout(resolve, 0)); // Yield to main thread
              }
              const newCat = await classifyByNameDash(item.n);
              if (newCat !== "🏷️ Khác") {
                item.cat = newCat;
                hasUpdates = true;
              }
            }
          }

          if (hasUpdates) {
            d.cs = buildCsFromTi(tiItems);
            renderCategories(d.cs, tiItems);
            renderTopItems(tiItems);
            // Clear cached AI insights since categorization changed
            if (_dashCache && _dashCache.insights) {
              _dashCache.insights = {};
              saveDashCache();
            }
            // Persist progress so partial results survive a page refresh
            saveDataToStorage(d);
            runAIInsightsNarrative(d);
          }
        } catch (error) {
          console.error(
            "[Dashboard] Error in async keyword classification:",
            error,
          );
        }

        // 6. Run AI category classification if any remaining uncategorized items
        const uncategorizedCount = tiItems.filter((item) =>
          isInvalidCat(item.cat),
        ).length;
        if (uncategorizedCount > 0) {
          classifyKharItems(tiItems, d).catch((e) => {
            console.error("[Dashboard] AI category classification failed:", e);
          });
        }
      } else {
        // Skip classification if already loaded from storage
      }

      function updateDashboardUIAfterClassification() {
        categorizeMiItems(d, tiItems);
        d.cs = buildCsFromTi(tiItems);

        // Persist classified data
        saveDataToStorage(d);

        // Re-render UI components
        renderTopItems(tiItems);
        renderOrders(d.ol || []);

        // Re-render static rule-based cards with final categorized data
        renderInsightCard(
          "insight-yearly",
          computeYearlyInsights(d.yd || {}, d),
        );
        renderInsightCard("insight-items", computeItemInsights(tiItems, d.t));

        // Re-render categories respecting the active year filter
        if (_activeCatYear !== "all") {
          switchCategoryYear(_activeCatYear, d, tiItems);
        } else {
          renderCategories(d.cs, tiItems);
          renderInsightCard(
            "insight-categories",
            computeCategoryInsights(d.cs, d.t),
          );
        }

        // Set up AI insight buttons (user must click to trigger analysis)
        runAIInsightsNarrative(d);
      }
      window.updateDashboardUIAfterClassification =
        updateDashboardUIAfterClassification;

      // 7. Categorization is now 100% finished — update final state
      _categorizationFinished = true;
      updateDashboardUIAfterClassification();
    }

    initDashboard();
  }
})();
