(function() {
  'use strict';

  function transmitToCore(payload) {
    if (!chrome.runtime || !chrome.runtime.id) {
      // Context might have been invalidated
      return;
    }
    
    try {
      chrome.runtime.sendMessage(payload).catch(e => {
        // Silently catch extension reloads
      });
    } catch (err) {
      // Catch sync errors
    }
  }

  window.addEventListener("message", event => {
    // Only accept messages from the same frame
    if (event.source !== window || !event.data) return;
    
    const messageData = event.data;
    
    switch(messageData.type) {
      case "SHOPEE_STATS_COMPLETE":
        transmitToCore({ type: "complete", data: messageData.data });
        break;
      case "SHOPEE_STATS_ERROR":
        transmitToCore({ type: "error", message: messageData.message });
        break;
      case "SHOPEE_STATS_PROGRESS":
        transmitToCore({
          type: "progress",
          message: messageData.message,
          processed: messageData.processed,
          total: messageData.total,
          pct: messageData.pct
        });
        break;
    }
  });

})();
