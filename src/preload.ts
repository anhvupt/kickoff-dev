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
});

