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

// Clear analysis lock if the target tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get(['shopee_analysis_lock'], (result) => {
    const lock = result.shopee_analysis_lock;
    if (lock && lock.tabId === tabId) {
      console.log('[ShopeeAnalytics] Tab closed, clearing analysis lock');
      chrome.storage.local.remove(['shopee_analysis_lock']);
    }
  });
});

// Clear analysis lock if the target tab is navigated or reloaded
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.storage.local.get(['shopee_analysis_lock'], (result) => {
      const lock = result.shopee_analysis_lock;
      if (lock && lock.tabId === tabId) {
        console.log('[ShopeeAnalytics] Tab navigated or reloaded, clearing analysis lock');
        chrome.storage.local.remove(['shopee_analysis_lock']);
      }
    });
  }
});
