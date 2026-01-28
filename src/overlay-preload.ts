import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('overlayAPI', {
  getOverlayPosition: () => ipcRenderer.invoke('get-overlay-position'),
  captureArea: (data: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke('capture-screen-area', data),
  finishSelection: (result: any) =>
    ipcRenderer.invoke('finish-screen-selection', result),
  cancelSelection: () =>
    ipcRenderer.invoke('cancel-screen-selection')
});

