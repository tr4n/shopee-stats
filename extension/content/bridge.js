// Runs in MAIN world (page context) so fetch is identical to the page's own requests.
// Communicates with the isolated content script via CustomEvents on window.

/**
 * Security & Design Compliance Note for CWS Reviewers:
 * 
 * 1. Why MAIN world injection?
 *    Shopee's APIs enforce strict anti-CSRF measures, checking request headers like `Sec-Fetch-Site`.
 *    If we fetch directly from the extension's ISOLATED world content script, the browser sets 
 *    `Sec-Fetch-Site: cross-site`, which triggers a HTTP 403 Forbidden error from Shopee's server.
 *    To work around this, we inject this minimal bridge into the MAIN world (page context). Fetches 
 *    initiated here appear as `Sec-Fetch-Site: same-origin`, matching Shopee's own script requests.
 * 
 * 2. Privacy & Data Handling:
 *    - `credentials: 'include'`: Required to attach the user's active session cookie so the Shopee API
 *      can return the logged-in user's own order history.
 *    - No External Data Transmission: All data fetched is returned immediately to the isolated content 
 *      script via custom DOM events (`__sa_fetch_res`). No data is sent to external servers.
 *    - No dynamic code execution occurs: This bridge only resolves API endpoints to JSON and passes 
 *      the structured statistics payload back.
 */
(function () {
  'use strict';

  // Listen to custom fetch requests from the isolated content script.
  window.addEventListener('__sa_fetch_req', async function (ev) {
    const { id, url } = ev.detail;
    
    // Safety check: Ensure the requested URL belongs strictly to Shopee's official domain.
    // This prevents the bridge from being hijacked to fetch third-party sites.
    if (typeof url !== 'string' || !url.startsWith('https://shopee.vn/')) {
      window.dispatchEvent(new CustomEvent('__sa_fetch_res', {
        detail: { id, ok: false, status: 400, parseError: 'Invalid target URL host' }
      }));
      return;
    }

    try {
      // Execute the same-origin fetch with the active session credentials.
      const res = await fetch(url, { credentials: 'include' });
      let data = null;
      let parseError = null;
      
      try {
        data = await res.json();
      } catch (e) {
        parseError = e.message;
      }

      // Dispatch the response payload back to the isolated content script.
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
