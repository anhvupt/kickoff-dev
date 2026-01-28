import { desktopCapturer, screen, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

export interface ScreenSource {
  id: string;
  name: string;
  thumbnail: Electron.NativeImage;
  display_id: string;
}

export interface DisplayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  id: number;
  scaleFactor: number;
}

/**
 * Get all available screen sources for capture
 */
export async function getScreenSources(): Promise<ScreenSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1, height: 1 }, // Minimal size, we don't need thumbnails
    fetchWindowIcons: false
  });

  return sources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail,
    display_id: source.display_id || ''
  }));
}

/**
 * Get all displays with their bounds
 */
export function getDisplays(): DisplayBounds[] {
  const displays = screen.getAllDisplays();
  return displays.map((display, index) => ({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    id: display.id,
    scaleFactor: display.scaleFactor
  }));
}

/**
 * Find which display contains the given coordinates
 */
export function getDisplayForPoint(x: number, y: number): DisplayBounds | null {
  // Use Electron's getDisplayNearestPoint for accurate display detection
  const electronDisplay = screen.getDisplayNearestPoint({ x, y });
  const displays = getDisplays();
  return displays.find(d => d.id === electronDisplay.id) || null;
}

/**
 * Check if macOS Screen Recording permission is granted
 */
export async function checkScreenRecordingPermission(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return true; // Not macOS, assume permission granted
  }

  try {
    // Try to get sources - if permission is denied, this will return sanitized frames
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 100, height: 100 },
      fetchWindowIcons: false
    });

    if (sources.length === 0) {
      return false;
    }

    // Check if thumbnail is sanitized (permission denied)
    // Sanitized thumbnails are typically solid colors or very low quality
    const testThumbnail = sources[0].thumbnail;
    const size = testThumbnail.getSize();
    
    // If thumbnail is very small or empty, likely permission issue
    if (size.width < 10 || size.height < 10) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking screen recording permission:', error);
    return false;
  }
}

/**
 * Capture a specific area of the screen using getUserMedia
 */
export async function captureScreenArea(
  x: number,
  y: number,
  width: number,
  height: number,
  displayId?: number
): Promise<Buffer> {
  const log = (msg: string, data?: any) => {
    if (data !== undefined) {
      console.log(`[ScreenCapture] ${msg}`, data);
    } else {
      console.log(`[ScreenCapture] ${msg}`);
    }
  };

  log('captureScreenArea called', { x, y, width, height, displayId });

  // Get all displays
  const displays = getDisplays();
  
  // Determine target display using getDisplayNearestPoint
  let targetDisplay: DisplayBounds | null = null;
  if (displayId !== undefined) {
    targetDisplay = displays.find(d => d.id === displayId) || null;
  } else {
    // Use getDisplayNearestPoint to find the correct display
    const electronDisplay = screen.getDisplayNearestPoint({ x, y });
    targetDisplay = displays.find(d => d.id === electronDisplay.id) || null;
  }

  if (!targetDisplay) {
    throw new Error('Could not determine target display');
  }

  log('Target display found', {
    displayId: targetDisplay.id,
    displayBounds: { x: targetDisplay.x, y: targetDisplay.y, width: targetDisplay.width, height: targetDisplay.height },
    scaleFactor: targetDisplay.scaleFactor,
    requestedCoords: { x, y, width, height }
  });

  // Get all screen sources
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1, height: 1 }, // Minimal, we don't use thumbnails
    fetchWindowIcons: false
  });

  log('Available sources', sources.map(s => ({
    id: s.id,
    name: s.name,
    display_id: s.display_id
  })));

  // Find the source matching the target display
  // Match by display_id === String(display.id)
  const source = sources.find(s => s.display_id === String(targetDisplay!.id));

  if (!source) {
    throw new Error(`Could not find screen source for display ${targetDisplay.id}`);
  }

  log('Selected source', {
    sourceId: source.id,
    sourceName: source.name,
    sourceDisplayId: source.display_id,
    targetDisplayId: targetDisplay.id
  });

  // Calculate crop coordinates in device pixels
  const relativeX = x - targetDisplay.x;
  const relativeY = y - targetDisplay.y;
  const cropX = relativeX * targetDisplay.scaleFactor;
  const cropY = relativeY * targetDisplay.scaleFactor;
  const cropWidth = width * targetDisplay.scaleFactor;
  const cropHeight = height * targetDisplay.scaleFactor;

  log('Crop coordinates (device pixels)', {
    relativeCoords: { relativeX, relativeY },
    devicePixelCoords: { cropX, cropY, cropWidth, cropHeight },
    scaleFactor: targetDisplay.scaleFactor
  });

  // Create a hidden window to use getUserMedia
  const captureWindow = new BrowserWindow({
    width: targetDisplay.width,
    height: targetDisplay.height,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'capture-frame-preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Listen to console messages from the capture window
  captureWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const msg = `Capture window console [${level}]: ${message}`;
    console.error(msg, { line, sourceId });
    log(msg, { line, sourceId });
  });
  
  captureWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    const msg = `Capture window failed to load: ${errorCode} - ${errorDescription}`;
    console.error(msg, { validatedURL });
    log(msg, { errorCode, errorDescription, validatedURL });
  });
  
  // Listen for page errors
  captureWindow.webContents.on('page-title-updated', () => {
    log('Capture window title updated');
  });
  
  // Enable console logging
  captureWindow.webContents.on('did-finish-load', () => {
    log('Capture window finished loading, executing script check');
    // Wait a bit for scripts to execute
    setTimeout(() => {
      // Check if script executed by looking for DOM marker
      captureWindow.webContents.executeJavaScript(`
        (() => {
          const canvas = document.getElementById('canvas');
          const scriptExecuted = canvas && canvas.getAttribute('data-script-executed') === 'true';
          const scriptText = document.querySelector('script')?.textContent || '';
          return {
            scriptExecuted,
            hasCanvas: !!canvas,
            hasCaptureAPI: typeof window.captureAPI !== 'undefined',
            captureAPILog: typeof window.captureAPI?.log === 'function',
            captureAPIGetParams: typeof window.captureAPI?.getCaptureParams === 'function',
            captureAPISendResult: typeof window.captureAPI?.sendResult === 'function',
            scriptLength: scriptText.length,
            documentReadyState: document.readyState
          };
        })();
      `).then(result => {
        log('Script execution check result', result);
        if (!result.scriptExecuted) {
          log('WARNING: Script tag did not execute - canvas marker not found');
          // Try to manually trigger the script
          log('Attempting to manually execute capture script...');
          captureWindow.webContents.executeJavaScript(`
            if (typeof window.captureAPI !== 'undefined' && window.captureAPI.getCaptureParams) {
              window.captureAPI.getCaptureParams().then(params => {
                console.error('[Manual] Got params:', params);
                // Continue with capture...
                navigator.mediaDevices.getUserMedia({
                  audio: false,
                  video: {
                    mandatory: {
                      chromeMediaSource: 'desktop',
                      chromeMediaSourceId: params.sourceId
                    }
                  }
                }).then(stream => {
                  console.error('[Manual] getUserMedia succeeded');
                  const video = document.createElement('video');
                  video.srcObject = stream;
                  video.autoplay = true;
                  video.playsInline = true;
                  video.onloadedmetadata = () => {
                    video.play();
                    setTimeout(() => {
                      const canvas = document.getElementById('canvas');
                      canvas.width = params.displayWidth * params.scaleFactor;
                      canvas.height = params.displayHeight * params.scaleFactor;
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                      stream.getTracks().forEach(t => t.stop());
                      const croppedCanvas = document.createElement('canvas');
                      croppedCanvas.width = params.cropWidth;
                      croppedCanvas.height = params.cropHeight;
                      const croppedCtx = croppedCanvas.getContext('2d');
                      croppedCtx.drawImage(canvas, params.cropX, params.cropY, params.cropWidth, params.cropHeight, 0, 0, params.cropWidth, params.cropHeight);
                      const dataUrl = croppedCanvas.toDataURL('image/png');
                      window.captureAPI.sendResult({ success: true, dataUrl });
                      console.error('[Manual] Result sent');
                    }, 500);
                  };
                }).catch(err => {
                  console.error('[Manual] getUserMedia error:', err);
                  window.captureAPI.sendResult({ success: false, error: err.message });
                });
              }).catch(err => {
                console.error('[Manual] getCaptureParams error:', err);
                window.captureAPI.sendResult({ success: false, error: err.message });
              });
            } else {
              console.error('[Manual] window.captureAPI not available');
            }
          `).catch(err => {
            log('Failed to manually execute script', { error: err.message });
          });
        }
        if (!result.hasCaptureAPI) {
          log('WARNING: window.captureAPI not available after page load');
        }
      }).catch(err => {
        log('Failed to execute test script', { error: err.message });
      });
    }, 500);
  });

  // Set up IPC handlers BEFORE loading the page
  let paramsRequested = false;
  
  // Debug log handler
  const debugLogHandler = (event: Electron.IpcMainEvent, data: { message: string; data?: any; timestamp: number }) => {
    if (event.sender === captureWindow.webContents) {
      const msg = `[CaptureFrame] ${data.message}`;
      console.error(msg, data.data || {});
      log(msg, data);
    }
  };
  ipcMain.on('capture-debug-log', debugLogHandler);
  
  const paramsHandler = (event: Electron.IpcMainEvent) => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-capture-service.ts:200',message:'Params handler called',data:{senderId:event.sender.id,isCaptureWindow:event.sender===captureWindow.webContents},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (event.sender === captureWindow.webContents) {
      log('Params requested by capture window');
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-capture-service.ts:204',message:'Sending capture params',data:{sourceId:source.id,displayWidth:targetDisplay!.width,displayHeight:targetDisplay!.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      paramsRequested = true;
      event.sender.send('capture-params', {
        sourceId: source.id,
        displayWidth: targetDisplay!.width,
        displayHeight: targetDisplay!.height,
        scaleFactor: targetDisplay!.scaleFactor,
        cropX,
        cropY,
        cropWidth,
        cropHeight
      });
    }
  };
  ipcMain.on('request-capture-params', paramsHandler);
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-capture-service.ts:216',message:'IPC handler registered for request-capture-params',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // Set up result handler
  const resultPromise = new Promise<{ success: boolean; dataUrl?: string; error?: string }>((resolve, reject) => {
    const resultHandler = (event: Electron.IpcMainEvent, result: any) => {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-capture-service.ts:222',message:'Result handler called',data:{senderId:event.sender.id,isCaptureWindow:event.sender===captureWindow.webContents,hasResult:!!result,success:result?.success},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (event.sender === captureWindow.webContents) {
        log('Capture result received', { success: result.success, hasDataUrl: !!result.dataUrl, error: result.error });
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-capture-service.ts:225',message:'Resolving with result',data:{success:result.success,hasDataUrl:!!result.dataUrl,error:result.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        resolve(result);
        ipcMain.removeListener('capture-result', resultHandler);
      }
    };
    ipcMain.on('capture-result', resultHandler);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-capture-service.ts:227',message:'IPC handler registered for capture-result',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Timeout after 15 seconds
    setTimeout(() => {
      ipcMain.removeListener('capture-result', resultHandler);
      log('Capture timeout - no result received');
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-capture-service.ts:232',message:'Capture timeout triggered',data:{paramsRequested},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      reject(new Error('Capture timeout - no result received from capture window'));
    }, 15000);
  });

  try {
    // Load the capture HTML
    log('Loading capture frame HTML...');
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-capture-service.ts:240',message:'About to load capture frame HTML',data:{htmlPath:path.join(__dirname, '../src/renderer/capture-frame.html')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    await captureWindow.loadFile(path.join(__dirname, '../src/renderer/capture-frame.html'));
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-capture-service.ts:242',message:'Capture frame HTML loaded',data:{isLoading:captureWindow.webContents.isLoading()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Wait for window to finish loading and script to execute
    await new Promise<void>((resolve) => {
      const checkReady = () => {
        if (captureWindow.webContents.isLoading()) {
          captureWindow.webContents.once('did-finish-load', () => {
            log('Capture window loaded');
            // #region agent log
            fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-capture-service.ts:247',message:'did-finish-load event fired',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            // Give more time for preload and script to initialize
            setTimeout(resolve, 500);
          });
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/6b4d2c66-2517-4873-af08-1a414435d58b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'screen-capture-service.ts:252',message:'Window already loaded, waiting 500ms for script',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          setTimeout(resolve, 500);
        }
      };
      checkReady();
    });

    // Wait a bit for params request (with timeout)
    await new Promise<void>((resolve, reject) => {
      if (paramsRequested) {
        resolve();
        return;
      }
      const checkInterval = setInterval(() => {
        if (paramsRequested) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!paramsRequested) {
          reject(new Error('Capture window did not request params'));
        }
      }, 5000);
    });

    log('Params sent, waiting for capture result');

    // Wait for capture result
    const result = await resultPromise;

    // Clean up
    ipcMain.removeListener('request-capture-params', paramsHandler);
    ipcMain.removeListener('capture-debug-log', debugLogHandler);
    if (!captureWindow.isDestroyed()) {
      captureWindow.close();
    }

    if (!result.success) {
      throw new Error(result.error || 'Capture failed');
    }

    if (!result.dataUrl) {
      throw new Error('No image data received');
    }

    // Convert data URL to buffer
    const base64Data = result.dataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    log('Capture successful', {
      bufferSize: buffer.length,
      cropSize: { width: cropWidth, height: cropHeight }
    });

    return buffer;
  } catch (error) {
    ipcMain.removeListener('request-capture-params', paramsHandler);
    ipcMain.removeListener('capture-debug-log', debugLogHandler);
    if (!captureWindow.isDestroyed()) {
      captureWindow.close();
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('Capture error', { error: errorMessage });
    throw new Error(`Screen capture failed: ${errorMessage}`);
  }
}

/**
 * Capture full screen of a specific display
 */
export async function captureFullScreen(displayId?: number): Promise<Buffer> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1, height: 1 },
    fetchWindowIcons: false
  });

  let source = sources[0];
  
  if (displayId !== undefined) {
    const foundSource = sources.find(s => {
      const sDisplayId = parseInt(s.display_id || '0', 10);
      return sDisplayId === displayId;
    });
    if (foundSource) {
      source = foundSource;
    }
  }

  return source.thumbnail.toPNG();
}

