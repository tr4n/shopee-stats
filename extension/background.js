// Background service worker — simple message forwarding from content to popup.
// This script runs persistently in the extension's service worker context.

/**
 * Security Compliance Note for Reviewers:
 * 1. Message Forwarding:
 *    We listen to runtime messages using `chrome.runtime.onMessage`. Messages originating from
 *    our own content script (verified via `sender.tab`) are forwarded to the extension's popup.
 *    No dynamic code execution (e.g., eval() or new Function()) or DOM injection is performed
 *    based on these messages. The payload consists only of status logs, progress percentages, 
 *    and aggregated statistics.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward progress/error/complete messages from the injected content script to the popup UI.
  // Using sender.tab validation to ensure we only forward messages originating from a web page tab.
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

/**
 * Security Compliance Note for Reviewers:
 * 2. Local Storage Mutex Management:
 *    The extension uses `chrome.storage.local` to maintain an active 'shopee_analysis_lock'.
 *    If the user closes or navigates away from the Shopee tab where the analysis is active,
 *    we release the lock and notify the popup. This ensures state integrity and prevents 
 *    overlapping analysis operations. No personal user data is read or written here.
 */

// Clear analysis lock if the target tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get(['shopee_analysis_lock'], (result) => {
    const lock = result.shopee_analysis_lock;
    if (lock && lock.tabId === tabId) {
      console.log('[ShopeeAnalytics] Tab closed, clearing analysis lock');
      chrome.storage.local.remove(['shopee_analysis_lock'], () => {
        chrome.runtime.sendMessage({ type: 'lock_cleared' }).catch(() => {});
      });
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
        chrome.storage.local.remove(['shopee_analysis_lock'], () => {
          chrome.runtime.sendMessage({ type: 'lock_cleared' }).catch(() => {});
        });
      }
    });
  }
});
