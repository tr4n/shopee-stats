// Background service worker — simple message forwarding from content to popup.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward messages from content script to popup
  if (sender.tab) {
    chrome.runtime.sendMessage(message).catch(() => {});
    return false;
  }

  return false;
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[ShopeeAnalytics] Background started');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ShopeeAnalytics] Extension installed');
});
