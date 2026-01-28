// Screen Selection Tab Logic
// #region agent log
console.log('[DEBUG] screen-selection.js loaded');
// #endregion

// Wait for DOM to be ready
function initScreenSelection() {
  const startScreenSelectionBtn = document.getElementById('startScreenSelectionBtn');
  const startSelectionBtnText = document.getElementById('startSelectionBtnText');
  const screenSelectionError = document.getElementById('screenSelectionError');
  const screenSelectionPreview = document.getElementById('screenSelectionPreview');
  const screenSelectionImage = document.getElementById('screenSelectionImage');
  const screenSelectionPreviewPlaceholder = document.getElementById('screenSelectionPreviewPlaceholder');
  const copyScreenSelectionBtn = document.getElementById('copyScreenSelectionBtn');
  const downloadScreenSelectionBtn = document.getElementById('downloadScreenSelectionBtn');
  const enableScreenBlurBtn = document.getElementById('enableScreenBlurBtn');
  const clearScreenBlurBtn = document.getElementById('clearScreenBlurBtn');
  const screenBlurBtnText = document.getElementById('screenBlurBtnText');
  const screenSelectionBlurCanvas = document.getElementById('screenSelectionBlurCanvas');
  const screenSelectionPreviewContainer = document.getElementById('screenSelectionPreviewContainer');

  // #region agent log
  console.log('[DEBUG] Elements found:', {
    startScreenSelectionBtn: !!startScreenSelectionBtn,
    hasElectronAPI: !!window.electronAPI,
    hasStartMethod: !!(window.electronAPI && window.electronAPI.startScreenSelection)
  });
  if (!startScreenSelectionBtn) {
    console.error('[DEBUG] startScreenSelectionBtn not found!');
    return;
  }
  // #endregion

  // State
  let currentScreenSelectionBuffer = null;
  let originalScreenSelectionBuffer = null;
  let blurSelectionActive = false;
  let blurRegions = [];
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let currentRect = null;

  // Start screen selection
  startScreenSelectionBtn.addEventListener('click', async () => {
    // #region agent log
    console.log('[DEBUG A] Button clicked', {btnExists:!!startScreenSelectionBtn,apiExists:!!window.electronAPI});
    fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-selection.js:45',message:'Button clicked',data:{btnExists:!!startScreenSelectionBtn,apiExists:!!window.electronAPI},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      startScreenSelectionBtn.disabled = true;
      startSelectionBtnText.textContent = 'Preparing...';
      screenSelectionError.style.display = 'none';

      // #region agent log
      console.log('[DEBUG B] Calling startScreenSelection', {hasMethod:!!window.electronAPI?.startScreenSelection});
      fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-selection.js:54',message:'Calling startScreenSelection',data:{hasMethod:!!window.electronAPI?.startScreenSelection},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const result = await window.electronAPI.startScreenSelection();
      // #region agent log
      console.log('[DEBUG B] startScreenSelection result', result);
      fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-selection.js:58',message:'startScreenSelection result',data:{success:result?.success,error:result?.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      if (result.success) {
        startSelectionBtnText.textContent = 'Selecting...';
        // Wait for result via IPC event
      } else {
        const errorMsg = result.message || result.error || 'Failed to start screen selection';
        showScreenSelectionError(errorMsg);
        if (result.error === 'SCREEN_RECORDING_PERMISSION_REQUIRED') {
          showNotification(
            'Permission Required',
            'Please enable Screen Recording permission in System Preferences and restart the app.',
            'error',
            10000
          );
        }
        startScreenSelectionBtn.disabled = false;
        startSelectionBtnText.textContent = 'Start Selection';
      }
    } catch (error) {
      console.error('[DEBUG] Error in startScreenSelection:', error);
      showScreenSelectionError(error.message || 'Unknown error occurred');
      startScreenSelectionBtn.disabled = false;
      startSelectionBtnText.textContent = 'Start Selection';
    }
  });

  // Listen for screen selection result
  window.electronAPI.onScreenSelectionResult((result) => {
    // #region agent log
    console.log('[DEBUG G] Result received', result);
    fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-selection.js:78',message:'Result received',data:{hasResult:!!result,success:result?.success,hasBuffer:!!result?.buffer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    startScreenSelectionBtn.disabled = false;
    startSelectionBtnText.textContent = 'Start Selection';

    if (result && result.success) {
      // #region agent log
      console.log('[DEBUG G] Processing successful result', {
        hasBuffer: !!result.buffer,
        bufferLength: result.buffer?.length,
        hasDataUrl: !!result.dataUrl,
        dataUrlLength: result.dataUrl?.length,
        hasImage: !!screenSelectionImage,
        hasPreview: !!screenSelectionPreview
      });
      // #endregion
      // Convert array back to Uint8Array
      currentScreenSelectionBuffer = new Uint8Array(result.buffer);
      originalScreenSelectionBuffer = new Uint8Array(result.buffer);
      
      // #region agent log
      console.log('[DEBUG G] Setting image src', {dataUrlLength: result.dataUrl?.length});
      // #endregion
      screenSelectionImage.src = result.dataUrl;
      
      // #region agent log
      console.log('[DEBUG G] Showing preview', {
        previewExists: !!screenSelectionPreview,
        placeholderExists: !!screenSelectionPreviewPlaceholder
      });
      // #endregion
      screenSelectionPreview.style.display = 'block';
      screenSelectionPreviewPlaceholder.style.display = 'none';
      
      // Reset blur state
      blurRegions = [];
      blurSelectionActive = false;
      enableScreenBlurBtn.classList.remove('active');
      clearScreenBlurBtn.style.display = 'none';
      screenBlurBtnText.textContent = 'Select Area to Blur';
      setupBlurCanvas();
      
      showNotification('Screen Captured', 'Selection captured successfully', 'success', 2000);
    } else {
      // #region agent log
      console.log('[DEBUG G] Result failed or cancelled', {result});
      // #endregion
      const errorMsg = result?.message || result?.error || 'Screen selection was cancelled';
      showScreenSelectionError(errorMsg);
      if (result?.error === 'SCREEN_RECORDING_PERMISSION_REQUIRED') {
        showNotification(
          'Permission Required',
          'Please enable Screen Recording permission in System Preferences and restart the app.',
          'error',
          10000
        );
      }
    }
  });

  // Copy to clipboard
  copyScreenSelectionBtn.addEventListener('click', async () => {
    if (!currentScreenSelectionBuffer) {
      showNotification('No Screenshot', 'Please capture a screen selection first', 'warning');
      return;
    }

    try {
      // Ensure we have the latest blurred version
      if (blurRegions.length > 0) {
        await applyBlurToImage();
      }
      
      const blob = new Blob([currentScreenSelectionBuffer], { type: 'image/png' });
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      
      const originalText = copyScreenSelectionBtn.innerHTML;
      copyScreenSelectionBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
      copyScreenSelectionBtn.classList.add('copied-feedback');
      showNotification('Copied', 'Screen selection copied to clipboard', 'success', 2000);
      setTimeout(() => {
        copyScreenSelectionBtn.innerHTML = originalText;
        copyScreenSelectionBtn.classList.remove('copied-feedback');
      }, 2000);
    } catch (error) {
      showNotification('Copy Failed', error.message, 'error');
    }
  });

  // Download
  downloadScreenSelectionBtn.addEventListener('click', async () => {
    if (!currentScreenSelectionBuffer) {
      showNotification('No Screenshot', 'Please capture a screen selection first', 'warning');
      return;
    }

    try {
      // Ensure we have the latest blurred version
      if (blurRegions.length > 0) {
        await applyBlurToImage();
      }
      
      const filename = `screen-selection-${Date.now()}.png`;
      const savedPath = await window.electronAPI.saveScreenshot({
        buffer: Array.from(currentScreenSelectionBuffer),
        filename
      });

      if (savedPath) {
        const originalText = downloadScreenSelectionBtn.innerHTML;
        downloadScreenSelectionBtn.innerHTML = '<span class="btn-icon">✓</span> Saved!';
        showNotification('Screen Selection Saved', `Saved to: ${savedPath}`, 'success', 4000);
        setTimeout(() => {
          downloadScreenSelectionBtn.innerHTML = originalText;
        }, 2000);
      }
    } catch (error) {
      showNotification('Save Failed', error.message, 'error');
    }
  });

  function showScreenSelectionError(message) {
    screenSelectionError.textContent = message;
    screenSelectionError.style.display = 'block';
    showNotification('Screen Selection Error', message, 'error');
  }

  // Blur Selection Functions (reused from screenshot.js)
  function setupBlurCanvas() {
    if (!screenSelectionImage.complete || !screenSelectionImage.naturalWidth) {
      screenSelectionImage.onload = setupBlurCanvas;
      return;
    }

    const img = screenSelectionImage;
    const imgWidth = img.offsetWidth;
    const imgHeight = img.offsetHeight;
    
    screenSelectionBlurCanvas.width = imgWidth;
    screenSelectionBlurCanvas.height = imgHeight;
    screenSelectionBlurCanvas.style.width = imgWidth + 'px';
    screenSelectionBlurCanvas.style.height = imgHeight + 'px';
    screenSelectionBlurCanvas.style.top = '1rem';
    screenSelectionBlurCanvas.style.left = '1rem';
    
    const ctx = screenSelectionBlurCanvas.getContext('2d');
    ctx.clearRect(0, 0, screenSelectionBlurCanvas.width, screenSelectionBlurCanvas.height);
    drawBlurRegions();
  }

  function drawBlurRegions() {
    const ctx = screenSelectionBlurCanvas.getContext('2d');
    ctx.clearRect(0, 0, screenSelectionBlurCanvas.width, screenSelectionBlurCanvas.height);
    
    blurRegions.forEach(region => {
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(region.x, region.y, region.width, region.height);
      
      const handleSize = 8;
      ctx.fillStyle = '#6366f1';
      ctx.setLineDash([]);
      ctx.fillRect(region.x - handleSize/2, region.y - handleSize/2, handleSize, handleSize);
      ctx.fillRect(region.x + region.width - handleSize/2, region.y - handleSize/2, handleSize, handleSize);
      ctx.fillRect(region.x - handleSize/2, region.y + region.height - handleSize/2, handleSize, handleSize);
      ctx.fillRect(region.x + region.width - handleSize/2, region.y + region.height - handleSize/2, handleSize, handleSize);
    });
    
    if (currentRect) {
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    }
  }

  function getImageCoordinates(e) {
    const canvas = screenSelectionBlurCanvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = screenSelectionImage.naturalWidth / screenSelectionImage.offsetWidth;
    const scaleY = screenSelectionImage.naturalHeight / screenSelectionImage.offsetHeight;
    
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    return {
      x: canvasX * scaleX,
      y: canvasY * scaleY,
      displayX: canvasX,
      displayY: canvasY
    };
  }

  async function applyBlurToImage() {
    if (blurRegions.length === 0) {
      currentScreenSelectionBuffer = originalScreenSelectionBuffer;
      return;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0);
        
        blurRegions.forEach(region => {
          const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
          const blurred = blurImageData(imageData, 20);
          ctx.putImageData(blurred, region.x, region.y);
        });
        
        canvas.toBlob((blob) => {
          blob.arrayBuffer().then(buffer => {
            currentScreenSelectionBuffer = new Uint8Array(buffer);
            screenSelectionImage.src = canvas.toDataURL('image/png');
            resolve();
          });
        }, 'image/png');
      };
      img.src = screenSelectionImage.src;
    });
  }

  function blurImageData(imageData, radius) {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    const result = new Uint8ClampedArray(imageData.data);
    
    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        
        for (let dx = -radius; dx <= radius; dx++) {
          const px = Math.min(Math.max(x + dx, 0), width - 1);
          const idx = (y * width + px) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
        }
        
        const idx = (y * width + x) * 4;
        result[idx] = r / (2 * radius + 1);
        result[idx + 1] = g / (2 * radius + 1);
        result[idx + 2] = b / (2 * radius + 1);
        result[idx + 3] = a / (2 * radius + 1);
      }
    }
    
    // Vertical pass
    const temp = new Uint8ClampedArray(result);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
          const py = Math.min(Math.max(y + dy, 0), height - 1);
          const idx = (py * width + x) * 4;
          r += temp[idx];
          g += temp[idx + 1];
          b += temp[idx + 2];
          a += temp[idx + 3];
        }
        
        const idx = (y * width + x) * 4;
        result[idx] = r / (2 * radius + 1);
        result[idx + 1] = g / (2 * radius + 1);
        result[idx + 2] = b / (2 * radius + 1);
        result[idx + 3] = a / (2 * radius + 1);
      }
    }
    
    return new ImageData(result, width, height);
  }

  // Blur selection event handlers
  enableScreenBlurBtn.addEventListener('click', () => {
    blurSelectionActive = !blurSelectionActive;
    if (blurSelectionActive) {
      enableScreenBlurBtn.classList.add('active');
      screenBlurBtnText.textContent = 'Blur Mode Active (Click to disable)';
      screenSelectionBlurCanvas.classList.add('active');
      setupBlurCanvas();
      // #region agent log
      console.log('[DEBUG] Blur mode enabled', {blurSelectionActive, isDrawing});
      // #endregion
    } else {
      enableScreenBlurBtn.classList.remove('active');
      screenBlurBtnText.textContent = 'Select Area to Blur';
      screenSelectionBlurCanvas.classList.remove('active');
      // Reset drawing state when disabling
      isDrawing = false;
      currentRect = null;
      drawBlurRegions();
      // #region agent log
      console.log('[DEBUG] Blur mode disabled', {blurSelectionActive, isDrawing});
      // #endregion
    }
  });

  clearScreenBlurBtn.addEventListener('click', () => {
    blurRegions = [];
    currentRect = null;
    drawBlurRegions();
    applyBlurToImage().then(() => {
      showNotification('Blur Cleared', 'All blur regions have been removed', 'success', 2000);
    });
    clearScreenBlurBtn.style.display = blurRegions.length > 0 ? 'block' : 'none';
  });

  // Canvas mouse events for selection
  screenSelectionBlurCanvas.addEventListener('mousedown', (e) => {
    // #region agent log
    console.log('[DEBUG] Blur mousedown', {blurSelectionActive, isDrawing});
    // #endregion
    if (!blurSelectionActive) {
      // #region agent log
      console.log('[DEBUG] Blur not active, ignoring mousedown');
      // #endregion
      return;
    }
    
    isDrawing = true;
    const coords = getImageCoordinates(e);
    startX = coords.displayX;
    startY = coords.displayY;
    
    currentRect = {
      x: startX,
      y: startY,
      width: 0,
      height: 0
    };
    
    // #region agent log
    console.log('[DEBUG] Blur selection started', {startX, startY, coords});
    // #endregion
  });

  screenSelectionBlurCanvas.addEventListener('mousemove', (e) => {
    if (!blurSelectionActive || !isDrawing) return;
    
    const coords = getImageCoordinates(e);
    currentRect.width = coords.displayX - startX;
    currentRect.height = coords.displayY - startY;
    
    drawBlurRegions();
  });

  screenSelectionBlurCanvas.addEventListener('mouseup', async (e) => {
    // #region agent log
    console.log('[DEBUG] Blur mouseup', {blurSelectionActive, isDrawing});
    // #endregion
    if (!blurSelectionActive || !isDrawing) return;
    
    isDrawing = false;
    const coords = getImageCoordinates(e);
    const img = screenSelectionImage;
    const scaleX = img.naturalWidth / img.offsetWidth;
    const scaleY = img.naturalHeight / img.offsetHeight;
    
    const rect = {
      x: Math.min(startX, coords.displayX) * scaleX,
      y: Math.min(startY, coords.displayY) * scaleY,
      width: Math.abs(coords.displayX - startX) * scaleX,
      height: Math.abs(coords.displayY - startY) * scaleY
    };
    
    // #region agent log
    console.log('[DEBUG] Blur rect calculated', {rect, startX, startY, coords});
    // #endregion
    
    if (rect.width > 10 && rect.height > 10) {
      blurRegions.push(rect);
      
      await applyBlurToImage();
      showNotification('Blur Applied', 'Area has been blurred', 'success', 2000);
      
      clearScreenBlurBtn.style.display = 'block';
      
      // Reset selection state so user can select another area immediately
      // Keep blur mode active (blurSelectionActive stays true) so they can continue blurring
      isDrawing = false;
      startX = 0;
      startY = 0;
      currentRect = null;
      drawBlurRegions(); // Clear the current rectangle drawing
      
      // #region agent log
      console.log('[DEBUG] Blur applied, state reset', {blurSelectionActive, isDrawing, blurRegionsCount: blurRegions.length, canDrawAgain: blurSelectionActive && !isDrawing});
      // #endregion
    } else {
      // Selection too small, just reset
      isDrawing = false;
      currentRect = null;
      drawBlurRegions();
      // #region agent log
      console.log('[DEBUG] Selection too small, reset', {rect});
      // #endregion
    }
  });

  // Update canvas when image loads or window resizes
  window.addEventListener('resize', () => {
    if (screenSelectionPreview && screenSelectionPreview.style.display !== 'none') {
      setTimeout(setupBlurCanvas, 100);
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScreenSelection);
} else {
  initScreenSelection();
}
