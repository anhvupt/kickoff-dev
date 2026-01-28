import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  screen,
  desktopCapturer
} from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import sharp from 'sharp';
import { captureScreenshot, closeBrowser } from './screenshot-service';
import {
  captureScreenArea,
  getDisplayForPoint,
  checkScreenRecordingPermission
} from './screen-capture-service';

let mainWindow: BrowserWindow | null = null;
let captureBarWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

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

app.on('window-all-closed', async () => {
  await closeBrowser();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await closeBrowser();
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

// Screenshot IPC Handlers
ipcMain.handle(
  'capture-screenshot',
  async (event, { url, width, height, fullPage, wait, extraWait, light }) => {
    try {
      // Validate URL
      if (!url) {
        throw new Error('URL is required');
      }

      try {
        new URL(url);
      } catch {
        throw new Error('Invalid URL format');
      }

      const buffer = await captureScreenshot(url, {
        width: width || 1200,
        height: height || 630,
        fullPage: fullPage || false,
        wait: wait || 'load',
        extraWait: extraWait || 0,
        light: light || false
      });

      // Convert buffer to base64 for data URL and array for IPC
      const base64 = buffer.toString('base64');
      const bufferArray = Array.from(buffer);

      return {
        success: true,
        buffer: bufferArray,
        dataUrl: `data:image/png;base64,${base64}`
      };
    } catch (error) {
      console.error('Screenshot error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
);

ipcMain.handle(
  'capture-screenshots-batch',
  async (event, { urls, width, height, fullPage, wait, extraWait, light }) => {
    const results = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i].trim();
      if (!url) continue;

      try {
        new URL(url);
      } catch {
        results.push({
          url,
          success: false,
          error: 'Invalid URL format'
        });
        continue;
      }

      try {
        const buffer = await captureScreenshot(url, {
          width: width || 1200,
          height: height || 630,
          fullPage: fullPage || false,
          wait: wait || 'load',
          extraWait: extraWait || 0,
          light: light || false
        });

        const base64 = buffer.toString('base64');
        const bufferArray = Array.from(buffer);

        results.push({
          url,
          success: true,
          buffer: bufferArray,
          dataUrl: `data:image/png;base64,${base64}`
        });
      } catch (error) {
        results.push({
          url,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
);

// Preset screen sizes
const PRESET_SCREEN_SIZES = {
  mobile: { name: 'Mobile', width: 375, height: 667 },
  tablet: { name: 'Tablet', width: 768, height: 1024 },
  laptop: { name: 'Laptop', width: 1366, height: 768 },
  desktop: { name: 'Desktop', width: 1920, height: 1080 }
};

ipcMain.handle(
  'capture-screenshot-presets',
  async (event, { url, presets, fullPage, wait, extraWait, light }) => {
    const results = [];

    // Validate URL
    if (!url) {
      return [{ success: false, error: 'URL is required' }];
    }

    try {
      new URL(url);
    } catch {
      return [{ success: false, error: 'Invalid URL format' }];
    }

    for (let i = 0; i < presets.length; i++) {
      const presetKey = presets[i];
      const preset =
        PRESET_SCREEN_SIZES[presetKey as keyof typeof PRESET_SCREEN_SIZES];

      if (!preset) {
        results.push({
          preset: presetKey,
          success: false,
          error: 'Invalid preset key'
        });
        continue;
      }

      try {
        const buffer = await captureScreenshot(url, {
          width: preset.width,
          height: preset.height,
          fullPage: fullPage || false,
          wait: wait || 'load',
          extraWait: extraWait || 0,
          light: light || false
        });

        const base64 = buffer.toString('base64');
        const bufferArray = Array.from(buffer);

        results.push({
          preset: presetKey,
          presetName: preset.name,
          success: true,
          buffer: bufferArray,
          dataUrl: `data:image/png;base64,${base64}`
        });
      } catch (error) {
        results.push({
          preset: presetKey,
          presetName: preset.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
);

ipcMain.handle('save-screenshot', async (event, { buffer, filename }) => {
  if (!mainWindow) return null;

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename || `screenshot-${Date.now()}.png`,
    filters: [{ name: 'PNG Images', extensions: ['png'] }]
  });

  if (result.canceled || !result.filePath) return null;

  // Convert array back to buffer
  const bufferData = Buffer.from(buffer);
  await fs.writeFile(result.filePath, bufferData);
  return result.filePath;
});

ipcMain.handle('get-image-preview', async (event, imagePath) => {
  try {
    const buffer = await fs.readFile(imagePath);
    const base64 = buffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase().slice(1);
    const mimeType =
      {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
        bmp: 'image/bmp'
      }[ext] || 'image/jpeg';

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error reading image preview:', error);
    return null;
  }
});

// Screen Selection IPC Handlers
ipcMain.handle('start-screen-selection', async () => {
  try {
    if (!mainWindow) {
      return { success: false, error: 'Main window not available' };
    }

    // Check macOS Screen Recording permission
    if (process.platform === 'darwin') {
      const hasPermission = await checkScreenRecordingPermission();
      if (!hasPermission) {
        return {
          success: false,
          error: 'SCREEN_RECORDING_PERMISSION_REQUIRED',
          message:
            'Screen Recording permission is required. Please enable it in System Preferences > Security & Privacy > Privacy > Screen Recording, then restart the app.'
        };
      }
    }

    // Hide main window
    mainWindow.hide();

    // Get primary display for positioning
    const primaryDisplay = screen.getPrimaryDisplay();
    const displays = screen.getAllDisplays();

    // Calculate bounds covering all displays
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    displays.forEach((display) => {
      minX = Math.min(minX, display.bounds.x);
      minY = Math.min(minY, display.bounds.y);
      maxX = Math.max(maxX, display.bounds.x + display.bounds.width);
      maxY = Math.max(maxY, display.bounds.y + display.bounds.height);
    });

    const overlayWidth = maxX - minX;
    const overlayHeight = maxY - minY;

    // Create capture bar window
    captureBarWindow = new BrowserWindow({
      width: 300,
      height: 80,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      webPreferences: {
        preload: path.join(__dirname, 'capture-bar-preload.js'),
        nodeIntegration: false,
        contextIsolation: true
      },
      x:
        primaryDisplay.bounds.x +
        Math.floor((primaryDisplay.bounds.width - 300) / 2),
      y: primaryDisplay.bounds.y + 50
    });

    // macOS specific: visible on all workspaces
    if (process.platform === 'darwin') {
      captureBarWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      });
    }

    captureBarWindow.loadFile(
      path.join(__dirname, '../src/renderer/capture-bar.html')
    );
    captureBarWindow.setIgnoreMouseEvents(false);

    // Create overlay window covering all displays
    overlayWindow = new BrowserWindow({
      width: overlayWidth,
      height: overlayHeight,
      x: minX,
      y: minY,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      webPreferences: {
        preload: path.join(__dirname, 'overlay-preload.js'),
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // macOS specific: visible on all workspaces
    if (process.platform === 'darwin') {
      overlayWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      });
    }

    overlayWindow.loadFile(
      path.join(__dirname, '../src/renderer/overlay.html')
    );
    overlayWindow.setIgnoreMouseEvents(false);
    overlayWindow.setFullScreenable(false);

    return { success: true };
  } catch (error) {
    console.error('Error starting screen selection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

ipcMain.handle('get-overlay-position', async () => {
  if (!overlayWindow) {
    return { x: 0, y: 0 };
  }
  const bounds = overlayWindow.getBounds();
  return { x: bounds.x, y: bounds.y };
});

ipcMain.handle(
  'capture-screen-area',
  async (event, { x, y, width, height }) => {
    try {
      // Check permission again before capture
      if (process.platform === 'darwin') {
        const hasPermission = await checkScreenRecordingPermission();
        if (!hasPermission) {
          return {
            success: false,
            error: 'SCREEN_RECORDING_PERMISSION_REQUIRED',
            message:
              'Screen Recording permission is required. Please enable it in System Preferences > Security & Privacy > Privacy > Screen Recording, then restart the app.'
          };
        }
      }

      // Use the getUserMedia-based captureScreenArea function
      const buffer = await captureScreenArea(x, y, width, height);
      const base64 = buffer.toString('base64');
      const bufferArray = Array.from(buffer);

      return {
        success: true,
        buffer: bufferArray,
        dataUrl: `data:image/png;base64,${base64}`
      };
    } catch (error) {
      console.error('Error capturing screen area:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Check if it's a permission error
      if (
        errorMessage.includes('permission') ||
        errorMessage.includes('Permission')
      ) {
        return {
          success: false,
          error: 'SCREEN_RECORDING_PERMISSION_REQUIRED',
          message:
            'Screen Recording permission is required. Please enable it in System Preferences > Security & Privacy > Privacy > Screen Recording, then restart the app.'
        };
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }
);

ipcMain.handle('finish-screen-selection', async (event, result) => {
  // Cleanup windows
  if (captureBarWindow) {
    captureBarWindow.close();
    captureBarWindow = null;
  }
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }

  // Show main window and send result
  if (mainWindow) {
    mainWindow.show();
    mainWindow.webContents.send('screen-selection-result', result);
  }

  return { success: true };
});

ipcMain.handle('cancel-screen-selection', async () => {
  // Cleanup windows
  if (captureBarWindow) {
    captureBarWindow.close();
    captureBarWindow = null;
  }
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }

  // Show main window and send cancellation
  if (mainWindow) {
    mainWindow.show();
    mainWindow.webContents.send('screen-selection-result', {
      success: false,
      error: 'cancelled'
    });
  }

  return { success: true };
});
