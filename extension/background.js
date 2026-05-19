// Background service worker — forwards content messages and runs AI classification.
importScripts('ai/aiClassificationService.js');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward messages from content script to popup
  if (sender.tab) {
    chrome.runtime.sendMessage(message).catch(() => {});
    return false;
  }

  if (message.type === 'AI_DIAG') {
    sendResponse({ ok: true, diag: ShopeeAIService.getDiagnostics() });
    return true;
  }

  if (message.type === 'AI_CHECK') {
    ShopeeAIService.checkAIAvailability()
      .then(available => sendResponse({ ok: true, available }))
      .catch(e => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (message.type === 'AI_CLASSIFY') {
    ShopeeAIService.classifyItemsBatch(message.items || [], null)
      .then(results => sendResponse({ ok: true, results }))
      .catch(e => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (message.type === 'AI_RESET_SESSION') {
    ShopeeAIService.destroySession();
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[ShopeeAnalytics] Background started, AI supported:', ShopeeAIService.isSupported());
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ShopeeAnalytics] Extension installed, AI diag:', ShopeeAIService.getDiagnostics());
});
