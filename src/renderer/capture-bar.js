// Capture Bar Window Logic
window.addEventListener('DOMContentLoaded', () => {
  const cancelBtn = document.getElementById('cancelBtn');

  cancelBtn.addEventListener('click', async () => {
    if (window.captureBarAPI) {
      await window.captureBarAPI.cancel();
    }
  });
});





