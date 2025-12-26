// Global state
let selectedImages = [];
let processedImages = [];
let imagePreviews = new Map(); // Store image preview data URLs

// DOM Elements
const selectImagesBtn = document.getElementById('selectImagesBtn');
const dropZone = document.getElementById('dropZone');
const selectedImagesDiv = document.getElementById('selectedImages');
const settingsSection = document.getElementById('settingsSection');
const ratioSlider = document.getElementById('ratioSlider');
const ratioValue = document.getElementById('ratioValue');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const processBtn = document.getElementById('processBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsSection = document.getElementById('resultsSection');
const resultsSummary = document.getElementById('resultsSummary');
const saveBtn = document.getElementById('saveBtn');
const replaceBtn = document.getElementById('replaceBtn');
const notificationContainer = document.getElementById('notificationContainer');

// Notification System
function showNotification(title, message, type = 'info', duration = 5000) {
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

// Confirm dialog replacement
function showConfirm(title, message) {
  return new Promise((resolve) => {
    const notification = document.createElement('div');
    notification.className = 'notification notification-warning';
    notification.setAttribute('role', 'alertdialog');
    notification.setAttribute('aria-labelledby', 'confirm-title');
    notification.setAttribute('aria-describedby', 'confirm-message');
    
    notification.innerHTML = `
      <span class="notification-icon" aria-hidden="true">⚠</span>
      <div class="notification-content">
        <div class="notification-title" id="confirm-title">${escapeHtml(title)}</div>
        <div class="notification-message" id="confirm-message">${escapeHtml(message)}</div>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
          <button class="btn btn-success" id="confirm-yes" style="flex: 1; padding: 0.5rem 1rem; font-size: 0.875rem;">Yes</button>
          <button class="btn" id="confirm-no" style="flex: 1; padding: 0.5rem 1rem; font-size: 0.875rem; background: var(--bg-tertiary);">No</button>
        </div>
      </div>
    `;
    
    notificationContainer.appendChild(notification);
    
    const yesBtn = notification.querySelector('#confirm-yes');
    const noBtn = notification.querySelector('#confirm-no');
    
    yesBtn.focus();
    
    const cleanup = () => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    };
    
    yesBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
    
    noBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    
    yesBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cleanup();
        resolve(true);
      }
    });
    
    noBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cleanup();
        resolve(false);
      }
    });
  });
}

// Load image preview
async function loadImagePreview(imagePath) {
  if (imagePreviews.has(imagePath)) {
    return imagePreviews.get(imagePath);
  }
  
  try {
    const dataUrl = await window.electronAPI.getImagePreview(imagePath);
    if (dataUrl) {
      imagePreviews.set(imagePath, dataUrl);
      return dataUrl;
    }
    return null;
  } catch (error) {
    console.error('Error loading preview:', error);
    return null;
  }
}

// Event Listeners
selectImagesBtn.addEventListener('click', async () => {
  const images = await window.electronAPI.selectImages();
  if (images && images.length > 0) {
    selectedImages = images;
    await displaySelectedImages();
    settingsSection.style.display = 'block';
    resultsSection.style.display = 'none';
    showNotification('Images Selected', `Selected ${images.length} image(s)`, 'success', 3000);
  }
});

// Drag and Drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  // Check if files are being dragged
  if (e.dataTransfer.types.includes('Files')) {
    dropZone.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'copy';
  }
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  // Only remove if we're actually leaving the drop zone
  if (!dropZone.contains(e.relatedTarget)) {
    dropZone.classList.remove('drag-over');
  }
});

dropZone.addEventListener('dragend', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');
  
  const files = Array.from(e.dataTransfer.files).filter(file => {
    const ext = file.name.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext);
  });
  
  if (files.length === 0) {
    showNotification('Invalid Files', 'Please drop image files only (JPG, PNG, WebP, GIF, BMP)', 'error');
    return;
  }
  
  // Get full paths from Electron File objects
  // In Electron, File objects have a 'path' property when dropped from file system
  const paths = [];
  for (const file of files) {
    let filePath = null;
    
    // Check if file has path property (Electron file system drop)
    if (file.path) {
      filePath = file.path;
    } else {
      // For files without path (e.g., from browser), we can't use them directly
      // In Electron, this shouldn't happen for file system drops
      console.warn('File dropped without path property:', file.name);
      continue;
    }
    
    // Skip if already selected
    if (!selectedImages.includes(filePath)) {
      paths.push(filePath);
    }
  }
  
  if (paths.length === 0) {
    if (files.length > 0) {
      showNotification('No New Images', 'All dropped images are already selected', 'info');
    } else {
      showNotification('Invalid Files', 'Could not process dropped files', 'error');
    }
    return;
  }
  
  selectedImages = [...selectedImages, ...paths];
  await displaySelectedImages();
  settingsSection.style.display = 'block';
  resultsSection.style.display = 'none';
  showNotification('Images Added', `Added ${paths.length} image(s)`, 'success', 3000);
});

// Keyboard support for drop zone
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    selectImagesBtn.click();
  }
});

ratioSlider.addEventListener('input', (e) => {
  const value = e.target.value;
  ratioValue.textContent = `${value}%`;
  ratioSlider.setAttribute('aria-valuenow', value);
});

qualitySlider.addEventListener('input', (e) => {
  const value = e.target.value;
  qualityValue.textContent = value;
  qualitySlider.setAttribute('aria-valuenow', value);
});

processBtn.addEventListener('click', async () => {
  if (selectedImages.length === 0) {
    showNotification('No Images', 'Please select images first', 'warning');
    return;
  }
  
  settingsSection.style.display = 'none';
  progressSection.style.display = 'block';
  resultsSection.style.display = 'none';
  
  const ratio = ratioSlider.value / 100;
  const quality = parseInt(qualitySlider.value);
  
  try {
    progressFill.style.width = '10%';
    progressText.textContent = 'Starting processing...';
    
    // Process images with progress updates
    const total = selectedImages.length;
    let processed = 0;
    
    processedImages = await window.electronAPI.processImages({
      imagePaths: selectedImages,
      ratio: ratio,
      quality: quality,
    });
    
    // Update progress for each image
    processedImages.forEach((result, index) => {
      processed++;
      const progress = Math.min(10 + (processed / total) * 90, 100);
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `Processing ${processed}/${total} images...`;
      
      if (result.error) {
        showNotification('Processing Error', `Failed to process: ${result.originalPath.split('/').pop()}`, 'error', 3000);
      }
    });
    
    progressFill.style.width = '100%';
    progressText.textContent = 'Complete!';
    
    const successful = processedImages.filter((img) => !img.error).length;
    if (successful > 0) {
      showNotification('Processing Complete', `Successfully processed ${successful} image(s)`, 'success', 3000);
    }
    
    setTimeout(() => {
      showResults();
    }, 500);
  } catch (error) {
    progressText.textContent = `Error: ${error.message}`;
    showNotification('Processing Failed', error.message, 'error');
    console.error('Processing error:', error);
  }
});

saveBtn.addEventListener('click', async () => {
  if (processedImages.length === 0) {
    showNotification('No Processed Images', 'Please process images first', 'warning');
    return;
  }
  
  const saveFolder = await window.electronAPI.selectSaveFolder();
  if (!saveFolder) return;
  
  try {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="btn-icon">⏳</span> Saving...';
    
    const savedPaths = await window.electronAPI.saveImages({
      processedImages: processedImages,
      saveFolder: saveFolder,
    });
    
    showNotification(
      'Images Saved',
      `Successfully saved ${savedPaths.length} image(s) to:\n${saveFolder}`,
      'success',
      6000
    );
    resetApp();
  } catch (error) {
    showNotification('Save Failed', error.message, 'error');
    console.error('Save error:', error);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span class="btn-icon">💾</span> Save to Folder';
  }
});

replaceBtn.addEventListener('click', async () => {
  if (processedImages.length === 0) {
    showNotification('No Processed Images', 'Please process images first', 'warning');
    return;
  }
  
  const confirmed = await showConfirm(
    'Replace Original Images?',
    `Are you sure you want to replace ${processedImages.length} original image(s)?\n\nBackup copies will be created with "_backup" suffix.`
  );
  
  if (!confirmed) return;
  
  try {
    replaceBtn.disabled = true;
    replaceBtn.innerHTML = '<span class="btn-icon">⏳</span> Replacing...';
    
    const replacedPaths = await window.electronAPI.replaceImages({
      processedImages: processedImages,
    });
    
    showNotification(
      'Images Replaced',
      `Successfully replaced ${replacedPaths.length} image(s).\n\nBackup copies have been created.`,
      'success',
      6000
    );
    resetApp();
  } catch (error) {
    showNotification('Replace Failed', error.message, 'error');
    console.error('Replace error:', error);
  } finally {
    replaceBtn.disabled = false;
    replaceBtn.innerHTML = '<span class="btn-icon">🔄</span> Replace Originals';
  }
});

// Helper Functions
async function displaySelectedImages() {
  selectedImagesDiv.innerHTML = '';
  
  if (selectedImages.length === 0) {
    return;
  }
  
  for (const path of selectedImages) {
    const item = document.createElement('div');
    item.className = 'image-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    
    const fileName = path.split('/').pop() || path.split('\\').pop();
    
    // Show loading state first
    item.innerHTML = `
      <div style="height: 120px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); background: var(--bg-tertiary); border-radius: 4px;">
        <span>Loading...</span>
      </div>
      <div class="image-item-info">${escapeHtml(fileName)}</div>
      <button class="image-item-remove" aria-label="Remove ${escapeHtml(fileName)}" tabindex="0">×</button>
    `;
    
    selectedImagesDiv.appendChild(item);
    
    // Load preview asynchronously
    const preview = await loadImagePreview(path);
    
    if (preview) {
      const imgContainer = item.querySelector('div');
      imgContainer.innerHTML = `<img src="${preview}" alt="${escapeHtml(fileName)}" loading="lazy">`;
    } else {
      const imgContainer = item.querySelector('div');
      imgContainer.innerHTML = '<span style="color: var(--text-muted);">Preview unavailable</span>';
    }
    
    const removeBtn = item.querySelector('.image-item-remove');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeImage(path);
    });
    
    removeBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        removeImage(path);
      }
    });
    
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeImage(path);
      }
    });
  }
}

function removeImage(path) {
  selectedImages = selectedImages.filter(p => p !== path);
  imagePreviews.delete(path);
  displaySelectedImages();
  
  if (selectedImages.length === 0) {
    settingsSection.style.display = 'none';
  }
  
  showNotification('Image Removed', 'Image removed from selection', 'info', 2000);
}

function showResults() {
  progressSection.style.display = 'none';
  resultsSection.style.display = 'block';
  
  const successful = processedImages.filter((img) => !img.error).length;
  const failed = processedImages.filter((img) => img.error).length;
  
  let summary = `Processed ${successful} image(s) successfully.`;
  if (failed > 0) {
    summary += ` ${failed} failed.`;
  }
  
  if (successful > 0) {
    const totalOriginalSize = processedImages
      .filter((img) => !img.error)
      .reduce((sum, img) => sum + (img.originalSize || 0), 0);
    const totalNewSize = processedImages
      .filter((img) => !img.error)
      .reduce((sum, img) => sum + (img.size || 0), 0);
    const savings = ((1 - totalNewSize / totalOriginalSize) * 100).toFixed(1);
    
    summary += `\nSize reduction: ${savings}%`;
  }
  
  resultsSummary.textContent = summary;
}

function resetApp() {
  selectedImages = [];
  processedImages = [];
  imagePreviews.clear();
  selectedImagesDiv.innerHTML = '';
  settingsSection.style.display = 'none';
  progressSection.style.display = 'none';
  resultsSection.style.display = 'none';
  ratioSlider.value = 100;
  ratioValue.textContent = '100%';
  qualitySlider.value = 85;
  qualityValue.textContent = '85';
  progressFill.style.width = '0%';
}

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
  // Tab navigation with Ctrl/Cmd
  if ((e.ctrlKey || e.metaKey) && e.key === '1') {
    e.preventDefault();
    document.getElementById('minimizerTabBtn').click();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === '2') {
    e.preventDefault();
    document.getElementById('screenshotTabBtn').click();
  }
  
  // Escape to close notifications
  if (e.key === 'Escape') {
    const notifications = notificationContainer.querySelectorAll('.notification');
    if (notifications.length > 0) {
      const lastNotification = notifications[notifications.length - 1];
      const closeBtn = lastNotification.querySelector('.notification-close');
      if (closeBtn) closeBtn.click();
    }
  }
});

