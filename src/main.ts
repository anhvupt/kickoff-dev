import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import sharp from 'sharp';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: '#0a0e27'
  });

  mainWindow.loadFile(path.join(__dirname, '../src/renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('select-images', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Images',
        extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']
      }
    ]
  });

  if (result.canceled) return null;
  return result.filePaths;
});

ipcMain.handle('select-save-folder', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle(
  'process-images',
  async (event, { imagePaths, ratio, quality }) => {
    const results = [];

    for (const imagePath of imagePaths) {
      try {
        const image = sharp(imagePath);
        const metadata = await image.metadata();

        // Calculate new dimensions based on ratio
        const newWidth = Math.round((metadata.width || 0) * ratio);
        const newHeight = Math.round((metadata.height || 0) * ratio);

        // Process image
        const buffer = await image
          .resize(newWidth, newHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: quality || 85 })
          .toBuffer();

        results.push({
          originalPath: imagePath,
          buffer: buffer,
          width: newWidth,
          height: newHeight,
          size: buffer.length,
          originalSize: (await fs.stat(imagePath)).size
        });
      } catch (error) {
        results.push({
          originalPath: imagePath,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
);

ipcMain.handle(
  'save-images',
  async (event, { processedImages, saveFolder }) => {
    const savedPaths = [];

    for (let i = 0; i < processedImages.length; i++) {
      const image = processedImages[i];
      if (image.error) continue;

      const originalName = path.basename(
        image.originalPath,
        path.extname(image.originalPath)
      );
      const savePath = path.join(saveFolder, `${originalName}_minimized.jpg`);

      await fs.writeFile(savePath, image.buffer);
      savedPaths.push(savePath);
    }

    return savedPaths;
  }
);

ipcMain.handle('replace-images', async (event, { processedImages }) => {
  const replacedPaths = [];

  for (const image of processedImages) {
    if (image.error) continue;

    const originalPath = image.originalPath;
    const ext = path.extname(originalPath);
    const backupPath = originalPath.replace(ext, `_backup${ext}`);

    // Create backup
    await fs.copyFile(originalPath, backupPath);

    // Replace original
    await fs.writeFile(originalPath, image.buffer);
    replacedPaths.push(originalPath);
  }

  return replacedPaths;
});
