import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('captureBarAPI', {
  cancel: () => ipcRenderer.invoke('cancel-screen-selection')
});





