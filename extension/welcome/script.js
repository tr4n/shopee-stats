// welcome/script.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('[ShopeeStats] Welcome page initialized successfully.');

  // Track start button interaction (if needed)
  const btnStartNow = document.getElementById('btn-start-now');
  if (btnStartNow) {
    btnStartNow.addEventListener('click', () => {
      console.log('[ShopeeStats] User clicked: Start statistics redirect button.');
    });
  }
});
