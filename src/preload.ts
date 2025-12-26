import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectImages: () => ipcRenderer.invoke('select-images'),
  selectSaveFolder: () => ipcRenderer.invoke('select-save-folder'),
  processImages: (data: { imagePaths: string[]; ratio: number; quality: number }) =>
    ipcRenderer.invoke('process-images', data),
  saveImages: (data: { processedImages: any[]; saveFolder: string }) =>
    ipcRenderer.invoke('save-images', data),
  replaceImages: (data: { processedImages: any[] }) =>
    ipcRenderer.invoke('replace-images', data),
  captureScreenshot: (data: {
    url: string;
    width?: number;
    height?: number;
    fullPage?: boolean;
    wait?: string;
    extraWait?: number;
    light?: boolean;
  }) => ipcRenderer.invoke('capture-screenshot', data),
  captureScreenshotsBatch: (data: {
    urls: string[];
    width?: number;
    height?: number;
    fullPage?: boolean;
    wait?: string;
    extraWait?: number;
    light?: boolean;
  }) => ipcRenderer.invoke('capture-screenshots-batch', data),
  saveScreenshot: (data: { buffer: ArrayBuffer; filename?: string }) =>
    ipcRenderer.invoke('save-screenshot', data),
  getImagePreview: (imagePath: string) =>
    ipcRenderer.invoke('get-image-preview', imagePath),
});

