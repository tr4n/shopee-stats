(function() {
  'use strict';
  
  console.log('[ShopeeAnalytics] Bridge script initialized');
  
  let messageQueue = [];
  let isExtensionReady = true;

  function transmitToCore(payload) {
    if (!chrome.runtime || !chrome.runtime.id) {
      console.warn('[ShopeeAnalytics] Extension context invalidated, queueing message:', payload);
      isExtensionReady = false;
      messageQueue.push(payload);
      return;
    }
    
    try {
      console.log('[ShopeeAnalytics] Transmitting message:', payload.type);
      chrome.runtime.sendMessage(payload).catch(e => {
        console.warn('[ShopeeAnalytics] Message transmission failed:', e);
        // Try to queue the message for retry
        if (!messageQueue.includes(payload)) {
          messageQueue.push(payload);
        }
      });
    } catch (err) {
      console.warn('[ShopeeAnalytics] Sync error in message transmission:', err);
      // Queue message for retry
      if (!messageQueue.includes(payload)) {
        messageQueue.push(payload);
      }
    }
  }
  
  // Try to flush queued messages periodically
  function flushMessageQueue() {
    if (messageQueue.length === 0) return;
    
    if (chrome.runtime && chrome.runtime.id) {
      console.log(`[ShopeeAnalytics] Flushing ${messageQueue.length} queued messages`);
      isExtensionReady = true;
      const toSend = [...messageQueue];
      messageQueue = [];
      
      for (const payload of toSend) {
        transmitToCore(payload);
      }
    }
  }
  
  // Check extension readiness periodically
  setInterval(() => {
    if (!isExtensionReady) {
      flushMessageQueue();
    }
  }, 1000);

  window.addEventListener("message", event => {
    // Only accept messages from the same frame
    // Bỏ qua check event.source !== window vì chạy khác world (MAIN và ISOLATED)
    
    // Only accept messages containing our specific type
    if (!event.data || !event.data.type || !event.data.type.startsWith('SHOPEE_STATS_')) {
      return;
    }
    
    const messageData = event.data;
    console.log('[ShopeeAnalytics] Received message from content script:', messageData.type);
    
      try {
        switch(messageData.type) {
          case "SHOPEE_STATS_COMPLETE":
            transmitToCore({ 
              type: "complete", 
              data: messageData.data,
              timestamp: Date.now()
            });
            break;
            
          case "SHOPEE_STATS_ERROR":
            transmitToCore({ 
              type: "error", 
              message: messageData.message || 'Lỗi không xác định',
              timestamp: Date.now()
            });
            break;
            
          case "SHOPEE_STATS_PROGRESS":
            transmitToCore({
              type: "progress",
              message: messageData.message,
              processed: messageData.processed || 0,
              total: messageData.total || 0,
              pct: messageData.pct || -1,
              timestamp: Date.now()
            });
            break;
            
          case "SHOPEE_STATS_HEARTBEAT":
            // Forward heartbeat to show script is alive
            transmitToCore({
              type: "heartbeat",
              timestamp: messageData.timestamp || Date.now()
            });
            break;
            
          default:
            console.warn('[ShopeeAnalytics] Unknown message type:', messageData.type);
            break;
        }
    } catch (err) {
      console.error('[ShopeeAnalytics] Error processing message:', err);
      // Send error message to popup
      transmitToCore({
        type: "error",
        message: "Lỗi xử lý thông điệp nội bộ. Vui lòng thử lại.",
        timestamp: Date.now()
      });
    }
  });

})();
