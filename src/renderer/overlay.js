// Overlay window script for screen selection
let isSelecting = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let canvas, ctx, infoDiv, instructions;
let overlayPosition = { x: 0, y: 0 };

window.addEventListener('DOMContentLoaded', async () => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'overlay.js:4',message:'Overlay DOMContentLoaded',data:{hasWindow:!!window,hasOverlayAPI:!!window.overlayAPI},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  // Get overlay window position from main process
  if (window.overlayAPI && window.overlayAPI.getOverlayPosition) {
    try {
      overlayPosition = await window.overlayAPI.getOverlayPosition();
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'overlay.js:15',message:'Got overlay position',data:overlayPosition,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'overlay.js:20',message:'Failed to get overlay position',data:{error:err?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    }
  }
  
  canvas = document.getElementById('selectionCanvas');
  ctx = canvas.getContext('2d');
  infoDiv = document.getElementById('selectionInfo');
  instructions = document.getElementById('instructions');

  // Set canvas size to match window
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Mouse down - start selection
  window.addEventListener('mousedown', (e) => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'overlay.js:25',message:'Mouse down',data:{x:e.clientX,y:e.clientY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    currentX = e.clientX;
    currentY = e.clientY;
    instructions.classList.add('hidden');
    drawSelection();
  });

  // Mouse move - update selection
  window.addEventListener('mousemove', (e) => {
    if (isSelecting) {
      currentX = e.clientX;
      currentY = e.clientY;
      drawSelection();
    }
  });

  // Mouse up - finish selection
  window.addEventListener('mouseup', async (e) => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'overlay.js:40',message:'Mouse up',data:{isSelecting,hasOverlayAPI:!!window.overlayAPI},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    if (isSelecting) {
      isSelecting = false;
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      // Only capture if selection is meaningful
      if (width > 10 && height > 10) {
        // Get screen coordinates using overlay window position
        const screenX = x + overlayPosition.x;
        const screenY = y + overlayPosition.y;
        // #region agent log
        console.log('[DEBUG] Selection coordinates', {
          canvasCoords: {x, y, width, height},
          overlayPosition,
          windowScreen: {screenX: window.screenX, screenY: window.screenY},
          finalCoords: {screenX, screenY, width, height}
        });
        fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'overlay.js:75',message:'Calling captureArea',data:{canvasX:x,canvasY:y,screenX,screenY,width,height,overlayX:overlayPosition.x,overlayY:overlayPosition.y,windowScreenX:window.screenX,windowScreenY:window.screenY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion

        // Send selection to main process
        if (window.overlayAPI) {
          const result = await window.overlayAPI.captureArea({
            x: screenX,
            y: screenY,
            width,
            height
          });
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'overlay.js:61',message:'captureArea result',data:{success:result?.success,error:result?.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
          // #endregion

          if (result.success) {
            // Send result back to main window
            await window.overlayAPI.finishSelection(result);
            // #region agent log
            fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'overlay.js:66',message:'Called finishSelection',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
            // #endregion
          } else {
            await window.overlayAPI.cancelSelection();
          }
        }
      } else {
        // Selection too small, cancel
        if (window.overlayAPI) {
          await window.overlayAPI.cancelSelection();
        }
      }
    }
  });

  // ESC key to cancel
  window.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      if (window.overlayAPI) {
        await window.overlayAPI.cancelSelection();
      }
    }
  });

  function drawSelection() {
    if (!isSelecting) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      infoDiv.style.display = 'none';
      return;
    }

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear selection area (show original screen)
    ctx.clearRect(x, y, width, height);

    // Draw selection border
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);

    // Draw corner handles
    const handleSize = 8;
    ctx.fillStyle = '#6366f1';
    ctx.setLineDash([]);
    ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize);
    ctx.fillRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
    ctx.fillRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize);

    // Update info display
    infoDiv.textContent = `${width} × ${height} px`;
    infoDiv.style.display = 'block';
    infoDiv.style.left = (x + 10) + 'px';
    infoDiv.style.top = (y + height + 15) + 'px';
  }
});

