// Runs in MAIN world (page context) so fetch is identical to the page's own requests.
// Communicates with the isolated content script via CustomEvents on window.
// "We use chrome.scripting.executeScript to inject a minimal fetch bridge into the page's execution context (world: 'MAIN'). This is necessary because Shopee's API endpoints use strict Sec-Fetch-Site checks to prevent CSRF and bots. Initiating the fetch from the isolated world content script sets Sec-Fetch-Site: cross-site, causing Shopee to reject it with a HTTP 403 error. The bridge only forwards the API responses back to the extension for local aggregation."
(function () {
  'use strict';

  window.addEventListener('__sa_fetch_req', async function (ev) {
    const { id, url } = ev.detail;
    try {
      const res = await fetch(url, { credentials: 'include' });
      let data = null;
      let parseError = null;
      try {
        data = await res.json();
      } catch (e) {
        parseError = e.message;
      }
      window.dispatchEvent(new CustomEvent('__sa_fetch_res', {
        detail: { id, ok: res.ok, status: res.status, data, parseError }
      }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('__sa_fetch_res', {
        detail: { id, ok: false, status: 0, networkError: err.message }
      }));
    }
  });
})();
