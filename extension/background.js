// Background script to handle message forwarding between content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward messages from content script to all connected popups
  if (sender.tab) {
    // Forward the message to popup if it's open
    chrome.runtime.sendMessage(message).catch(() => {
      // Silently ignore if popup is not open
    });
  }
  
  return false; // Don't keep the message channel open
});

// Handle extension context invalidation
chrome.runtime.onStartup.addListener(() => {
  console.log('[ShopeeAnalytics] Background script started');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ShopeeAnalytics] Extension installed/updated');
});