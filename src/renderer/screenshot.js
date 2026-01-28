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

// Shared Configuration Elements
const sharedCaptureModeCustom = document.getElementById('sharedCaptureModeCustom');
const sharedCaptureModePresets = document.getElementById('sharedCaptureModePresets');
const sharedCustomSizeGroup = document.getElementById('sharedCustomSizeGroup');
const sharedPresetSizeGroup = document.getElementById('sharedPresetSizeGroup');
const sharedPresetMobile = document.getElementById('sharedPresetMobile');
const sharedPresetTablet = document.getElementById('sharedPresetTablet');
const sharedPresetLaptop = document.getElementById('sharedPresetLaptop');
const sharedPresetDesktop = document.getElementById('sharedPresetDesktop');
const sharedWidth = document.getElementById('sharedWidth');
const sharedHeight = document.getElementById('sharedHeight');
const sharedWait = document.getElementById('sharedWait');
const sharedExtraWait = document.getElementById('sharedExtraWait');
const sharedFullPage = document.getElementById('sharedFullPage');
const sharedLight = document.getElementById('sharedLight');

// Single Capture
const screenshotUrl = document.getElementById('screenshotUrl');
const captureBtn = document.getElementById('captureBtn');
const captureBtnText = document.getElementById('captureBtnText');
const screenshotError = document.getElementById('screenshotError');
const screenshotPreview = document.getElementById('screenshotPreview');
const screenshotImage = document.getElementById('screenshotImage');
const copyScreenshotBtn = document.getElementById('copyScreenshotBtn');
const downloadScreenshotBtn = document.getElementById('downloadScreenshotBtn');
const presetResults = document.getElementById('presetResults');
const presetResultsTitle = document.getElementById('presetResultsTitle');
const presetResultsGrid = document.getElementById('presetResultsGrid');
const presetDownloadZipBtn = document.getElementById('presetDownloadZipBtn');
const screenshotPreviewPlaceholder = document.getElementById('screenshotPreviewPlaceholder');

// Collapse/Expand
const singleCaptureSection = document.getElementById('singleCaptureSection');
const batchCaptureSection = document.getElementById('batchCaptureSection');
const singleCaptureHeader = document.getElementById('singleCaptureHeader');
const batchCaptureHeader = document.getElementById('batchCaptureHeader');

let currentScreenshotBuffer = null;
let presetScreenshotBuffers = {}; // Store buffers for preset screenshots
let batchCaptureResults = []; // { url, buffer }[] for "Download all as ZIP"

// Handle shared capture mode toggle
function updateSharedConfigVisibility() {
  if (sharedCaptureModeCustom.checked) {
    sharedCustomSizeGroup.style.display = 'block';
    sharedPresetSizeGroup.style.display = 'none';
  } else if (sharedCaptureModePresets.checked) {
    sharedCustomSizeGroup.style.display = 'none';
    sharedPresetSizeGroup.style.display = 'block';
  }
}

sharedCaptureModeCustom.addEventListener('change', () => {
  updateSharedConfigVisibility();
  presetResults.style.display = 'none';
  if (screenshotPreviewPlaceholder) screenshotPreviewPlaceholder.style.display = 'flex';
});

sharedCaptureModePresets.addEventListener('change', () => {
  updateSharedConfigVisibility();
  if (screenshotPreview) screenshotPreview.style.display = 'none';
  if (screenshotPreviewPlaceholder) screenshotPreviewPlaceholder.style.display = 'flex';
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

  const isPresetMode = sharedCaptureModePresets.checked;
  
  if (isPresetMode) {
    // Check if at least one preset is selected
    const selectedPresets = [];
    if (sharedPresetMobile.checked) selectedPresets.push('mobile');
    if (sharedPresetTablet.checked) selectedPresets.push('tablet');
    if (sharedPresetLaptop.checked) selectedPresets.push('laptop');
    if (sharedPresetDesktop.checked) selectedPresets.push('desktop');

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
    if (presetDownloadZipBtn) presetDownloadZipBtn.style.display = 'none';

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
          fullPage: sharedFullPage.checked,
          wait: sharedWait.value,
          extraWait: parseInt(sharedExtraWait.value) || 0,
          light: sharedLight.checked
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

    if (presetDownloadZipBtn) presetDownloadZipBtn.style.display = successCount > 0 ? 'inline-flex' : 'none';

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
        width: parseInt(sharedWidth.value) || 1200,
        height: parseInt(sharedHeight.value) || 630,
        fullPage: sharedFullPage.checked,
        wait: sharedWait.value,
        extraWait: parseInt(sharedExtraWait.value) || 0,
        light: sharedLight.checked
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
const saveUrlSetBtn = document.getElementById('saveUrlSetBtn');
const loadUrlSetSelect = document.getElementById('loadUrlSetSelect');
const savedUrlSetsList = document.getElementById('savedUrlSetsList');
const captureBatchBtn = document.getElementById('captureBatchBtn');
const captureBatchBtnText = document.getElementById('captureBatchBtnText');
const batchResults = document.getElementById('batchResults');
const batchResultsTitle = document.getElementById('batchResultsTitle');
const batchResultsGrid = document.getElementById('batchResultsGrid');
const batchDownloadZipBtn = document.getElementById('batchDownloadZipBtn');

let savedUrlSetsCache = [];

function getBatchUrlsAsArray() {
  return batchUrls.value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function hasValidBatchUrls() {
  const urls = getBatchUrlsAsArray();
  if (urls.length === 0) return false;
  try {
    urls.forEach((u) => new URL(u));
    return true;
  } catch {
    return false;
  }
}

function setSaveUrlSetButtonState() {
  if (saveUrlSetBtn) saveUrlSetBtn.disabled = !hasValidBatchUrls();
}

async function refreshSavedUrlSets() {
  if (!window.electronAPI?.getSavedUrlSets) return;
  try {
    const sets = await window.electronAPI.getSavedUrlSets();
    savedUrlSetsCache = sets;
    if (loadUrlSetSelect) {
      const selected = loadUrlSetSelect.value;
      loadUrlSetSelect.innerHTML = '<option value="">— Load a set —</option>';
      sets.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        loadUrlSetSelect.appendChild(opt);
      });
      if (selected && sets.some((s) => s.id === selected)) loadUrlSetSelect.value = selected;
    }
    if (savedUrlSetsList) {
      savedUrlSetsList.innerHTML = '';
      sets.forEach((s) => {
        const li = document.createElement('li');
        li.className = 'saved-url-set-item';
        const loadBtn = document.createElement('button');
        loadBtn.type = 'button';
        loadBtn.className = 'btn btn-success';
        loadBtn.textContent = 'Load';
        loadBtn.addEventListener('click', () => {
          batchUrls.value = (s.urls || []).join('\n');
          if (loadUrlSetSelect) loadUrlSetSelect.value = s.id;
        });
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn btn-warning';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', async () => {
          if (!window.electronAPI?.deleteUrlSet) return;
          await window.electronAPI.deleteUrlSet(s.id);
          refreshSavedUrlSets();
        });
        li.appendChild(document.createTextNode(s.name + ' '));
        li.appendChild(loadBtn);
        li.appendChild(delBtn);
        savedUrlSetsList.appendChild(li);
      });
    }
  } catch (_) {}
}

// Modal for URL set name input
function showUrlSetNameModal(callback) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.cssText = 'background: var(--bg-secondary); padding: 2rem; border-radius: 12px; min-width: 400px; max-width: 90vw;';
  
  const title = document.createElement('h3');
  title.textContent = 'Save URL Set';
  title.style.cssText = 'margin: 0 0 1rem 0; color: var(--text-primary);';
  
  const label = document.createElement('label');
  label.textContent = 'Name for this URL set:';
  label.style.cssText = 'display: block; margin-bottom: 0.5rem; color: var(--text-secondary);';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = 'My URL set';
  input.className = 'form-input';
  input.style.cssText = 'width: 100%; margin-bottom: 1rem;';
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const name = input.value.trim();
      if (name) {
        modal.remove();
        callback(name);
      }
    } else if (e.key === 'Escape') {
      modal.remove();
      callback(null);
    }
  });
  
  const buttonRow = document.createElement('div');
  buttonRow.style.cssText = 'display: flex; gap: 0.5rem; justify-content: flex-end;';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-warning';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    modal.remove();
    callback(null);
  });
  
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-success';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', () => {
    const name = input.value.trim();
    if (name) {
      modal.remove();
      callback(name);
    } else {
      showNotification('Name required', 'Please enter a name for the URL set', 'warning');
    }
  });
  
  buttonRow.appendChild(cancelBtn);
  buttonRow.appendChild(saveBtn);
  
  modalContent.appendChild(title);
  modalContent.appendChild(label);
  modalContent.appendChild(input);
  modalContent.appendChild(buttonRow);
  modal.appendChild(modalContent);
  
  document.body.appendChild(modal);
  input.focus();
  input.select();
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      callback(null);
    }
  });
}

if (saveUrlSetBtn) {
  saveUrlSetBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const urls = getBatchUrlsAsArray().filter((u) => {
        try {
          new URL(u);
          return true;
        } catch {
          return false;
        }
      });
      
      if (urls.length === 0) {
        showNotification('No valid URLs', 'Enter at least one valid URL to save', 'warning');
        return;
      }
      
      if (!window.electronAPI?.saveUrlSet) {
        console.error('saveUrlSet API not available');
        showNotification('Error', 'Save URL set feature not available', 'error');
        return;
      }
      
      showUrlSetNameModal(async (name) => {
        if (!name) return;
        
        try {
          const result = await window.electronAPI.saveUrlSet({ name, urls });
          console.log('URL set saved:', result);
          showNotification('URL set saved', `"${name}" saved with ${urls.length} URL(s)`, 'success');
          await refreshSavedUrlSets();
        } catch (error) {
          console.error('Error saving URL set:', error);
          showNotification('Save failed', error.message || 'Failed to save URL set', 'error');
        }
      });
    } catch (error) {
      console.error('Error in save URL set handler:', error);
      showNotification('Error', error.message || 'An error occurred', 'error');
    }
  });
}
if (loadUrlSetSelect) {
  loadUrlSetSelect.addEventListener('change', () => {
    const id = loadUrlSetSelect.value;
    const set = savedUrlSetsCache.find((s) => s.id === id);
    if (set && set.urls) batchUrls.value = set.urls.join('\n');
  });
}
if (batchUrls) batchUrls.addEventListener('input', setSaveUrlSetButtonState);


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
  batchCaptureResults = [];
  if (batchDownloadZipBtn) batchDownloadZipBtn.style.display = 'none';

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
        width: parseInt(sharedWidth.value) || 1200,
        height: parseInt(sharedHeight.value) || 630,
        fullPage: sharedFullPage.checked,
        wait: sharedWait.value,
        extraWait: parseInt(sharedExtraWait.value) || 0,
        light: sharedLight.checked
      });

      const screenshotResult = result[0];
      doneCount++;
      progressFill.style.width = '100%';
      batchResultsTitle.textContent = `Results (${doneCount}/${urls.length})`;

      if (screenshotResult.success) {
        successCount++;
        const domain = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `screenshot-${domain}-${i}.png`;
        const bufferArray = screenshotResult.buffer; // Store buffer array
        batchCaptureResults.push({ url, buffer: bufferArray, filename });

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

  if (batchDownloadZipBtn) batchDownloadZipBtn.style.display = successCount > 0 ? 'inline-flex' : 'none';

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

if (batchDownloadZipBtn) {
  batchDownloadZipBtn.addEventListener('click', async () => {
    if (!batchCaptureResults.length || !window.electronAPI?.saveScreenshotsZip) return;
    const entries = batchCaptureResults.map((r) => ({
      filename: r.filename || `screenshot-${String(r.url).replace(/[^a-zA-Z0-9.]/g, '_')}.png`,
      buffer: r.buffer
    }));
    const result = await window.electronAPI.saveScreenshotsZip({ entries });
    if (result.canceled) return;
    if (result.success && result.path) {
      showNotification('ZIP saved', `Saved to ${result.path}`, 'success', 4000);
    } else if (!result.success && result.error) {
      showNotification('ZIP failed', result.error, 'error');
    }
  });
}

if (presetDownloadZipBtn) {
  presetDownloadZipBtn.addEventListener('click', async () => {
    const keys = Object.keys(presetScreenshotBuffers || {});
    if (!keys.length || !window.electronAPI?.saveScreenshotsZip) return;
    let host = 'page';
    try {
      host = new URL(screenshotUrl.value).hostname.replace(/[^a-zA-Z0-9]/g, '_');
    } catch (_) {}
    const entries = keys.map((presetKey) => ({
      filename: `screenshot-${presetKey}-${host}.png`,
      buffer: presetScreenshotBuffers[presetKey]
    }));
    const result = await window.electronAPI.saveScreenshotsZip({ entries });
    if (result.canceled) return;
    if (result.success && result.path) {
      showNotification('ZIP saved', `Saved to ${result.path}`, 'success', 4000);
    } else if (!result.success && result.error) {
      showNotification('ZIP failed', result.error, 'error');
    }
  });
}

// URL capture settings: load defaults and debounced save
function debounce(fn, ms) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

async function loadUrlCaptureSettings() {
  if (!window.electronAPI?.getUrlCaptureSettings) return;
  try {
    const s = await window.electronAPI.getUrlCaptureSettings();
    if (s.defaultSizeMode === 'presets') {
      sharedCaptureModePresets.checked = true;
      sharedCaptureModeCustom.checked = false;
      sharedCustomSizeGroup.style.display = 'none';
      sharedPresetSizeGroup.style.display = 'block';
    } else {
      sharedCaptureModeCustom.checked = true;
      sharedCaptureModePresets.checked = false;
      sharedCustomSizeGroup.style.display = 'block';
      sharedPresetSizeGroup.style.display = 'none';
    }
    sharedPresetMobile.checked = (s.defaultPresets || []).includes('mobile');
    sharedPresetTablet.checked = (s.defaultPresets || []).includes('tablet');
    sharedPresetLaptop.checked = (s.defaultPresets || []).includes('laptop');
    sharedPresetDesktop.checked = (s.defaultPresets || []).includes('desktop');
    const w = s.defaultWidth ?? 1200;
    const h = s.defaultHeight ?? 630;
    sharedWidth.value = String(w);
    sharedHeight.value = String(h);
  } catch (_) {}
}

function persistUrlCaptureSettings() {
  if (!window.electronAPI?.setUrlCaptureSettings) return;
  const defaultPresets = [];
  if (sharedPresetMobile.checked) defaultPresets.push('mobile');
  if (sharedPresetTablet.checked) defaultPresets.push('tablet');
  if (sharedPresetLaptop.checked) defaultPresets.push('laptop');
  if (sharedPresetDesktop.checked) defaultPresets.push('desktop');
  window.electronAPI.setUrlCaptureSettings({
    defaultSizeMode: sharedCaptureModePresets.checked ? 'presets' : 'custom',
    defaultPresets,
    defaultWidth: parseInt(sharedWidth.value, 10) || 1200,
    defaultHeight: parseInt(sharedHeight.value, 10) || 630
  });
}

const debouncedPersist = debounce(persistUrlCaptureSettings, 500);

[sharedCaptureModeCustom, sharedCaptureModePresets, sharedPresetMobile, sharedPresetTablet, sharedPresetLaptop, sharedPresetDesktop].forEach((el) => {
  if (el) el.addEventListener('change', debouncedPersist);
});
[sharedWidth, sharedHeight].forEach((el) => {
  if (el) el.addEventListener('input', debouncedPersist);
});

loadUrlCaptureSettings();
refreshSavedUrlSets();
setSaveUrlSetButtonState();
updateSharedConfigVisibility(); // Set initial visibility based on loaded settings

// Collapse/Expand functionality
let expandedSection = 'single'; // Default: single expanded

function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  const isSingle = sectionId === 'singleCaptureSection';
  const otherSectionId = isSingle ? 'batchCaptureSection' : 'singleCaptureSection';
  const otherSection = document.getElementById(otherSectionId);
  
  if (expandedSection === sectionId) {
    // Collapse current section
    section.classList.add('collapsed');
    expandedSection = null;
  } else {
    // Expand this section, collapse the other
    if (expandedSection) {
      otherSection.classList.add('collapsed');
    }
    section.classList.remove('collapsed');
    expandedSection = sectionId;
  }
  
  // Update chevrons
  const chevrons = document.querySelectorAll('.section-chevron');
  chevrons.forEach((chevron) => {
    const parentSection = chevron.closest('.collapsible-section');
    if (parentSection.classList.contains('collapsed')) {
      chevron.textContent = '▶';
    } else {
      chevron.textContent = '▼';
    }
  });
}

if (singleCaptureHeader) {
  singleCaptureHeader.addEventListener('click', () => toggleSection('singleCaptureSection'));
}

if (batchCaptureHeader) {
  batchCaptureHeader.addEventListener('click', () => toggleSection('batchCaptureSection'));
}

