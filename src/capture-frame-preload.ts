import { contextBridge, ipcRenderer } from 'electron';

let captureParams: any = null;

// Expose a debug log function via IPC
contextBridge.exposeInMainWorld('captureAPI', {
  log: (message: string, data?: any) => {
    ipcRenderer.send('capture-debug-log', { message, data, timestamp: Date.now() });
  },
  getCaptureParams: () => {
    ipcRenderer.send('capture-debug-log', { message: 'getCaptureParams called', data: { hasCachedParams: !!captureParams }, timestamp: Date.now() });
    return new Promise((resolve) => {
      if (captureParams) {
        ipcRenderer.send('capture-debug-log', { message: 'Returning cached params', timestamp: Date.now() });
        resolve(captureParams);
      } else {
        ipcRenderer.send('capture-debug-log', { message: 'Setting up IPC listener and sending request', timestamp: Date.now() });
        ipcRenderer.once('capture-params', (event, params) => {
          ipcRenderer.send('capture-debug-log', { message: 'Received capture-params IPC', data: { hasParams: !!params, sourceId: params?.sourceId }, timestamp: Date.now() });
          captureParams = params;
          resolve(params);
        });
        ipcRenderer.send('request-capture-params');
        ipcRenderer.send('capture-debug-log', { message: 'Sent request-capture-params IPC', timestamp: Date.now() });
      }
    });
  },
  sendResult: (result: any) => {
    ipcRenderer.send('capture-debug-log', { message: 'sendResult called', data: { success: result.success, hasDataUrl: !!result.dataUrl, error: result.error }, timestamp: Date.now() });
    ipcRenderer.send('capture-result', result);
    ipcRenderer.send('capture-debug-log', { message: 'Sent capture-result IPC', timestamp: Date.now() });
  }
});

// Log that preload script loaded - use setTimeout to ensure handler is registered
setTimeout(() => {
  try {
    ipcRenderer.send('capture-debug-log', { message: 'Preload script loaded and captureAPI exposed', timestamp: Date.now() });
  } catch (e) {
    // Handler might not be registered yet, that's okay
  }
}, 100);

