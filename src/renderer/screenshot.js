// Notification System (shared with renderer.js)
function showNotification(title, message, type = 'info', duration = 5000) {
  const notificationContainer = document.getElementById('notificationContainer');
  if (!notificationContainer) return;
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.setAttribute('role', 'alert');
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  notification.innerHTML = `
    <span class="notification-icon" aria-hidden="true">${icons[type] || icons.info}</span>
    <div class="notification-content">
      <div class="notification-title">${escapeHtml(title)}</div>
      <div class="notification-message">${escapeHtml(message)}</div>
    </div>
    <button class="notification-close" aria-label="Close notification" tabindex="0">×</button>
  `;
  
  const closeBtn = notification.querySelector('.notification-close');
  const closeNotification = () => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  };
  
  closeBtn.addEventListener('click', closeNotification);
  closeBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      closeNotification();
    }
  });
  
  notificationContainer.appendChild(notification);
  
  if (duration > 0) {
    setTimeout(closeNotification, duration);
  }
  
  return notification;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Tab switching
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');

    // Update active tab button
    tabButtons.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    // Update active tab content
    tabContents.forEach((content) => {
      content.classList.remove('active');
      if (content.id === `${targetTab}Tab`) {
        content.classList.add('active');
      }
    });
  });
  
  // Keyboard navigation for tabs
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const currentIndex = Array.from(tabButtons).indexOf(btn);
      const nextIndex = e.key === 'ArrowLeft' 
        ? (currentIndex - 1 + tabButtons.length) % tabButtons.length
        : (currentIndex + 1) % tabButtons.length;
      tabButtons[nextIndex].focus();
      tabButtons[nextIndex].click();
    }
  });
});

// Preset Screen Sizes
const PRESET_SCREEN_SIZES = {
  mobile: { name: 'Mobile', width: 375, height: 667 },
  tablet: { name: 'Tablet', width: 768, height: 1024 },
  laptop: { name: 'Laptop', width: 1366, height: 768 },
  desktop: { name: 'Desktop', width: 1920, height: 1080 }
};

// Single Capture
const screenshotUrl = document.getElementById('screenshotUrl');
const screenshotWidth = document.getElementById('screenshotWidth');
const screenshotHeight = document.getElementById('screenshotHeight');
const screenshotWait = document.getElementById('screenshotWait');
const screenshotExtraWait = document.getElementById('screenshotExtraWait');
const screenshotFullPage = document.getElementById('screenshotFullPage');
const screenshotLight = document.getElementById('screenshotLight');
const captureBtn = document.getElementById('captureBtn');
const captureBtnText = document.getElementById('captureBtnText');
const screenshotError = document.getElementById('screenshotError');
const screenshotPreview = document.getElementById('screenshotPreview');
const screenshotImage = document.getElementById('screenshotImage');
const copyScreenshotBtn = document.getElementById('copyScreenshotBtn');
const downloadScreenshotBtn = document.getElementById('downloadScreenshotBtn');

// Preset mode elements
const captureModeCustom = document.getElementById('captureModeCustom');
const captureModePresets = document.getElementById('captureModePresets');
const customSizeGroup = document.getElementById('customSizeGroup');
const presetSizeGroup = document.getElementById('presetSizeGroup');
const presetMobile = document.getElementById('presetMobile');
const presetTablet = document.getElementById('presetTablet');
const presetLaptop = document.getElementById('presetLaptop');
const presetDesktop = document.getElementById('presetDesktop');
const presetResults = document.getElementById('presetResults');
const presetResultsTitle = document.getElementById('presetResultsTitle');
const presetResultsGrid = document.getElementById('presetResultsGrid');
const screenshotPreviewPlaceholder = document.getElementById('screenshotPreviewPlaceholder');

let currentScreenshotBuffer = null;
let presetScreenshotBuffers = {}; // Store buffers for preset screenshots

// Handle capture mode toggle
captureModeCustom.addEventListener('change', () => {
  if (captureModeCustom.checked) {
    customSizeGroup.style.display = 'block';
    presetSizeGroup.style.display = 'none';
    presetResults.style.display = 'none';
    screenshotPreviewPlaceholder.style.display = 'flex';
  }
});

captureModePresets.addEventListener('change', () => {
  if (captureModePresets.checked) {
    customSizeGroup.style.display = 'none';
    presetSizeGroup.style.display = 'block';
    screenshotPreview.style.display = 'none';
    screenshotPreviewPlaceholder.style.display = 'flex';
  }
});

captureBtn.addEventListener('click', async () => {
  const url = screenshotUrl.value.trim();
  if (!url) {
    showError('Please enter a URL');
    return;
  }

  try {
    new URL(url);
  } catch {
    showError('Invalid URL format');
    return;
  }

  const isPresetMode = captureModePresets.checked;
  
  if (isPresetMode) {
    // Check if at least one preset is selected
    const selectedPresets = [];
    if (presetMobile.checked) selectedPresets.push('mobile');
    if (presetTablet.checked) selectedPresets.push('tablet');
    if (presetLaptop.checked) selectedPresets.push('laptop');
    if (presetDesktop.checked) selectedPresets.push('desktop');

    if (selectedPresets.length === 0) {
      showError('Please select at least one preset size');
      return;
    }

    // Capture with presets
    captureBtn.disabled = true;
    captureBtnText.textContent = 'Capturing...';
    screenshotError.style.display = 'none';
    presetResults.style.display = 'block';
    document.getElementById('screenshotPreviewPlaceholder').style.display = 'none';
    presetResultsGrid.innerHTML = '';
    presetResultsTitle.textContent = `Results (0/${selectedPresets.length})`;
    presetScreenshotBuffers = {};

    let doneCount = 0;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedPresets.length; i++) {
      const presetKey = selectedPresets[i];
      const preset = PRESET_SCREEN_SIZES[presetKey];

      // Create placeholder card with progress
      const card = document.createElement('div');
      card.className = 'batch-result-card';
      card.innerHTML = `
        <div class="batch-result-url" title="${preset.name}">${preset.name} (${preset.width}×${preset.height})</div>
        <div class="batch-item-progress">
          <div class="batch-item-progress-bar">
            <div class="batch-item-progress-fill" style="width: 0%"></div>
          </div>
          <span>Processing...</span>
        </div>
      `;
      presetResultsGrid.appendChild(card);
      
      const progressFill = card.querySelector('.batch-item-progress-fill');
      const progressText = card.querySelector('.batch-item-progress span');

      try {
        progressFill.style.width = '50%';
        progressText.textContent = 'Capturing...';
        
        const result = await window.electronAPI.captureScreenshotPresets({
          url,
          presets: [presetKey],
          fullPage: screenshotFullPage.checked,
          wait: screenshotWait.value,
          extraWait: parseInt(screenshotExtraWait.value) || 0,
          light: screenshotLight.checked
        });

        const screenshotResult = result[0];
        doneCount++;
        progressFill.style.width = '100%';
        presetResultsTitle.textContent = `Results (${doneCount}/${selectedPresets.length})`;

        if (screenshotResult.success) {
          successCount++;
          const filename = `screenshot-${presetKey}-${Date.now()}.png`;
          const bufferArray = screenshotResult.buffer;
          presetScreenshotBuffers[presetKey] = bufferArray;

          card.innerHTML = `
            <div class="batch-result-url" title="${preset.name}">${preset.name} (${preset.width}×${preset.height})</div>
            <img src="${screenshotResult.dataUrl}" alt="Screenshot" class="batch-result-image">
            <div class="batch-result-actions">
              <button class="btn btn-success copy-preset-btn" data-preset="${presetKey}">
                <span class="btn-icon">📋</span> Copy
              </button>
              <button class="btn btn-success download-preset-btn" data-preset="${presetKey}">
                <span class="btn-icon">💾</span> Download
              </button>
            </div>
          `;

          // Add event listeners for copy and download
          const copyBtn = card.querySelector('.copy-preset-btn');
          const downloadBtn = card.querySelector('.download-preset-btn');

          copyBtn.addEventListener('click', async () => {
            try {
              const buffer = new Uint8Array(bufferArray);
              const blob = new Blob([buffer], { type: 'image/png' });
              const item = new ClipboardItem({ 'image/png': blob });
              await navigator.clipboard.write([item]);
              
              const originalText = copyBtn.innerHTML;
              copyBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
              copyBtn.classList.add('copied-feedback');
              showNotification('Copied', 'Screenshot copied to clipboard', 'success', 2000);
              setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.classList.remove('copied-feedback');
              }, 2000);
            } catch (error) {
              showNotification('Copy Failed', error.message, 'error');
            }
          });

          downloadBtn.addEventListener('click', async () => {
            try {
              const savedPath = await window.electronAPI.saveScreenshot({
                buffer: bufferArray,
                filename: filename
              });

              if (savedPath) {
                const originalText = downloadBtn.innerHTML;
                downloadBtn.innerHTML = '<span class="btn-icon">✓</span> Saved!';
                showNotification('Saved', `Screenshot saved to: ${savedPath}`, 'success', 3000);
                setTimeout(() => {
                  downloadBtn.innerHTML = originalText;
                }, 2000);
              }
            } catch (error) {
              showNotification('Save Failed', error.message, 'error');
            }
          });
        } else {
          errorCount++;
          card.innerHTML = `
            <div class="batch-result-url" title="${preset.name}">${preset.name} (${preset.width}×${preset.height})</div>
            <div class="batch-result-error">Error: ${screenshotResult.error || 'Unknown error'}</div>
          `;
        }
      } catch (error) {
        errorCount++;
        doneCount++;
        progressFill.style.width = '100%';
        presetResultsTitle.textContent = `Results (${doneCount}/${selectedPresets.length})`;
        card.innerHTML = `
          <div class="batch-result-url" title="${preset.name}">${preset.name} (${preset.width}×${preset.height})</div>
          <div class="batch-result-error">Error: ${error.message || 'Unknown error'}</div>
        `;
      }
    }

    // Show completion notification
    if (successCount > 0) {
      showNotification(
        'Preset Capture Complete',
        `Successfully captured ${successCount} of ${selectedPresets.length} screenshot(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
        successCount === selectedPresets.length ? 'success' : 'warning',
        5000
      );
    } else {
      showNotification('Preset Capture Failed', 'All screenshots failed to capture', 'error', 5000);
    }

    captureBtn.disabled = false;
    captureBtnText.textContent = 'Capture';
  } else {
    // Original custom size capture
    captureBtn.disabled = true;
    captureBtnText.textContent = 'Capturing...';
    screenshotError.style.display = 'none';
    screenshotPreview.style.display = 'none';
    presetResults.style.display = 'none';
    screenshotPreviewPlaceholder.style.display = 'flex';

    try {
      const result = await window.electronAPI.captureScreenshot({
        url,
        width: parseInt(screenshotWidth.value) || 1200,
        height: parseInt(screenshotHeight.value) || 630,
        fullPage: screenshotFullPage.checked,
        wait: screenshotWait.value,
        extraWait: parseInt(screenshotExtraWait.value) || 0,
        light: screenshotLight.checked
      });

      if (result.success) {
        // Convert array back to Uint8Array for clipboard
        currentScreenshotBuffer = new Uint8Array(result.buffer);
        screenshotImage.src = result.dataUrl;
        screenshotPreview.style.display = 'block';
        screenshotPreviewPlaceholder.style.display = 'none';
      } else {
        showError(result.error || 'Failed to capture screenshot');
      }
    } catch (error) {
      showError(error.message || 'Unknown error occurred');
    } finally {
      captureBtn.disabled = false;
      captureBtnText.textContent = 'Capture';
    }
  }
});

copyScreenshotBtn.addEventListener('click', async () => {
  if (!currentScreenshotBuffer) {
    showNotification('No Screenshot', 'Please capture a screenshot first', 'warning');
    return;
  }

  try {
    const blob = new Blob([currentScreenshotBuffer], { type: 'image/png' });
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    
    // Show feedback
    const originalText = copyScreenshotBtn.innerHTML;
    copyScreenshotBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
    copyScreenshotBtn.classList.add('copied-feedback');
    showNotification('Copied', 'Screenshot copied to clipboard', 'success', 2000);
    setTimeout(() => {
      copyScreenshotBtn.innerHTML = originalText;
      copyScreenshotBtn.classList.remove('copied-feedback');
    }, 2000);
  } catch (error) {
    showNotification('Copy Failed', error.message, 'error');
  }
});

downloadScreenshotBtn.addEventListener('click', async () => {
  if (!currentScreenshotBuffer) {
    showNotification('No Screenshot', 'Please capture a screenshot first', 'warning');
    return;
  }

  try {
    const filename = `screenshot-${Date.now()}.png`;
    const savedPath = await window.electronAPI.saveScreenshot({
      buffer: Array.from(currentScreenshotBuffer),
      filename
    });

    if (savedPath) {
      // Show feedback
      const originalText = downloadScreenshotBtn.innerHTML;
      downloadScreenshotBtn.innerHTML = '<span class="btn-icon">✓</span> Saved!';
      showNotification('Screenshot Saved', `Saved to: ${savedPath}`, 'success', 4000);
      setTimeout(() => {
        downloadScreenshotBtn.innerHTML = originalText;
      }, 2000);
    }
  } catch (error) {
    showNotification('Save Failed', error.message, 'error');
  }
});

function showError(message) {
  screenshotError.textContent = message;
  screenshotError.style.display = 'block';
  showNotification('Screenshot Error', message, 'error');
}

// Batch Capture
const batchUrls = document.getElementById('batchUrls');
const batchWidth = document.getElementById('batchWidth');
const batchHeight = document.getElementById('batchHeight');
const batchWait = document.getElementById('batchWait');
const batchExtraWait = document.getElementById('batchExtraWait');
const batchFullPage = document.getElementById('batchFullPage');
const batchLight = document.getElementById('batchLight');
const captureBatchBtn = document.getElementById('captureBatchBtn');
const captureBatchBtnText = document.getElementById('captureBatchBtnText');
const batchResults = document.getElementById('batchResults');
const batchResultsTitle = document.getElementById('batchResultsTitle');
const batchResultsGrid = document.getElementById('batchResultsGrid');

captureBatchBtn.addEventListener('click', async () => {
  const urlsText = batchUrls.value.trim();
  if (!urlsText) {
    showNotification('No URLs', 'Please enter at least one URL', 'warning');
    return;
  }

  const urls = urlsText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (urls.length === 0) {
    showNotification('Invalid URLs', 'Please enter at least one valid URL', 'warning');
    return;
  }

  captureBatchBtn.disabled = true;
  captureBatchBtnText.textContent = 'Capturing...';
  batchResults.style.display = 'block';
  document.getElementById('batchResultsPlaceholder').style.display = 'none';
  batchResultsGrid.innerHTML = '';
  batchResultsTitle.textContent = `Results (0/${urls.length})`;

  let doneCount = 0;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    // Create placeholder card with progress
    const card = document.createElement('div');
    card.className = 'batch-result-card';
    card.innerHTML = `
      <div class="batch-result-url" title="${url}">${url}</div>
      <div class="batch-item-progress">
        <div class="batch-item-progress-bar">
          <div class="batch-item-progress-fill" style="width: 0%"></div>
        </div>
        <span>Processing...</span>
      </div>
    `;
    batchResultsGrid.appendChild(card);
    
    const progressFill = card.querySelector('.batch-item-progress-fill');
    const progressText = card.querySelector('.batch-item-progress span');

    try {
      // Update progress
      progressFill.style.width = '50%';
      progressText.textContent = 'Capturing...';
      
      const result = await window.electronAPI.captureScreenshotsBatch({
        urls: [url],
        width: parseInt(batchWidth.value) || 1200,
        height: parseInt(batchHeight.value) || 630,
        fullPage: batchFullPage.checked,
        wait: batchWait.value,
        extraWait: parseInt(batchExtraWait.value) || 0,
        light: batchLight.checked
      });

      const screenshotResult = result[0];
      doneCount++;
      progressFill.style.width = '100%';
      batchResultsTitle.textContent = `Results (${doneCount}/${urls.length})`;

      if (screenshotResult.success) {
        successCount++;
        const domain = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `screenshot-${domain}-${Date.now()}.png`;
        const bufferArray = screenshotResult.buffer; // Store buffer array

        card.innerHTML = `
          <div class="batch-result-url" title="${url}">${url}</div>
          <img src="${screenshotResult.dataUrl}" alt="Screenshot" class="batch-result-image">
          <div class="batch-result-actions">
            <button class="btn btn-success copy-batch-btn" data-index="${i}">
              <span class="btn-icon">📋</span> Copy
            </button>
            <button class="btn btn-success download-batch-btn" data-index="${i}" data-url="${url}">
              <span class="btn-icon">💾</span> Download
            </button>
          </div>
        `;

        // Add event listeners
        const copyBtn = card.querySelector('.copy-batch-btn');
        const downloadBtn = card.querySelector('.download-batch-btn');

        copyBtn.addEventListener('click', async () => {
          try {
            const buffer = new Uint8Array(bufferArray);
            const blob = new Blob([buffer], { type: 'image/png' });
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
            copyBtn.classList.add('copied-feedback');
            showNotification('Copied', 'Screenshot copied to clipboard', 'success', 2000);
            setTimeout(() => {
              copyBtn.innerHTML = originalText;
              copyBtn.classList.remove('copied-feedback');
            }, 2000);
          } catch (error) {
            showNotification('Copy Failed', error.message, 'error');
          }
        });

        downloadBtn.addEventListener('click', async () => {
          try {
            const savedPath = await window.electronAPI.saveScreenshot({
              buffer: bufferArray,
              filename: filename
            });

            if (savedPath) {
              const originalText = downloadBtn.innerHTML;
              downloadBtn.innerHTML = '<span class="btn-icon">✓</span> Saved!';
              showNotification('Saved', `Screenshot saved to: ${savedPath}`, 'success', 3000);
              setTimeout(() => {
                downloadBtn.innerHTML = originalText;
              }, 2000);
            }
          } catch (error) {
            showNotification('Save Failed', error.message, 'error');
          }
        });
      } else {
        errorCount++;
        card.innerHTML = `
          <div class="batch-result-url" title="${url}">${url}</div>
          <div class="batch-result-error">Error: ${screenshotResult.error || 'Unknown error'}</div>
        `;
      }
    } catch (error) {
      errorCount++;
      doneCount++;
      progressFill.style.width = '100%';
      batchResultsTitle.textContent = `Results (${doneCount}/${urls.length})`;
      card.innerHTML = `
        <div class="batch-result-url" title="${url}">${url}</div>
        <div class="batch-result-error">Error: ${error.message || 'Unknown error'}</div>
      `;
    }
  }

  // Show completion notification
  if (successCount > 0) {
    showNotification(
      'Batch Capture Complete',
      `Successfully captured ${successCount} of ${urls.length} screenshot(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
      successCount === urls.length ? 'success' : 'warning',
      5000
    );
  } else {
    showNotification('Batch Capture Failed', 'All screenshots failed to capture', 'error', 5000);
  }

  captureBatchBtn.disabled = false;
  captureBatchBtnText.textContent = 'Capture All';
});

