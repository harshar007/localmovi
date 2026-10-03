import fs from 'fs';
import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import path from 'path';
import { startServer } from '../server';
import { ffmpegService } from '../server/services/ffmpegService';

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

async function createWindow() {
  const iconCandidates = [
    path.join(__dirname, '../../assets/icon.png'),
    path.join(__dirname, '../assets/icon.png'),
    path.join(process.cwd(), 'assets/icon.png'),
  ];
  const appIcon = iconCandidates.find((p) => fs.existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#090a0f',
    title: 'LocalStream - LAN Video Hub & Host Player',
    icon: appIcon,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Remove default menu for sleek app feel
  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const loadUrl = isDev && process.env.VITE_DEV_SERVER_URL
    ? process.env.VITE_DEV_SERVER_URL
    : 'http://localhost:3000';

  // Wait briefly for server to bind
  setTimeout(() => {
    mainWindow?.loadURL(loadUrl).catch(() => {
      // Retry once if server is still starting
      setTimeout(() => {
        mainWindow?.loadURL(loadUrl);
      }, 1500);
    });
  }, 500);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup IPC handlers
function setupIpcHandlers() {
  // Folder selector single
  ipcMain.handle('dialog:selectFolder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Video Folder for LocalStream',
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Folder selector multi
  ipcMain.handle('dialog:selectFolders', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Video Folders for LocalStream',
      properties: ['openDirectory', 'multiSelections'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths;
  });

  // Fullscreen toggle
  ipcMain.handle('window:toggleFullscreen', () => {
    if (!mainWindow) return false;
    const isFull = !mainWindow.isFullScreen();
    mainWindow.setFullScreen(isFull);
    return isFull;
  });

  // Window control actions
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  ipcMain.handle('app:getVersion', () => app.getVersion());
}

// App lifecycle
app.whenReady().then(async () => {
  setupIpcHandlers();

  // Start internal backend Express server
  try {
    await startServer(3000);
  } catch (err) {
    console.error('Failed to start embedded server:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  ffmpegService.stopAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  ffmpegService.stopAll();
});
