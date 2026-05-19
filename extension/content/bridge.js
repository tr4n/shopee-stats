// Runs in MAIN world (page context) so fetch is identical to the page's own requests.
// Communicates with the isolated content script via CustomEvents on window.
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
