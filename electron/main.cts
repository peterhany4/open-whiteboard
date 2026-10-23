import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

function log(msg: string) {
  try {
    const logPath = path.join(app.getPath('userData'), 'launch.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

log('--- Electron Main Process Evaluated ---');

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

const DEFAULT_STATE: WindowState = {
  width: 1280,
  height: 820,
};

let mainWindow: BrowserWindow | null = null;

function getStateFilePath(): string {
  try {
    return path.join(app.getPath('userData'), 'window-state.json');
  } catch {
    return '';
  }
}

function loadWindowState(): WindowState {
  try {
    const statePath = getStateFilePath();
    if (statePath && fs.existsSync(statePath)) {
      const data = fs.readFileSync(statePath, 'utf-8');
      return { ...DEFAULT_STATE, ...JSON.parse(data) };
    }
  } catch (err) {
    console.warn('[Electron Main] Could not load window state, using default:', err);
  }
  return DEFAULT_STATE;
}

function saveWindowState(win: BrowserWindow) {
  try {
    const statePath = getStateFilePath();
    if (!statePath) return;
    const isMaximized = win.isMaximized();
    if (!isMaximized) {
      const bounds = win.getBounds();
      const state: WindowState = {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: false,
      };
      fs.writeFileSync(statePath, JSON.stringify(state), 'utf-8');
    } else {
      const existing = loadWindowState();
      fs.writeFileSync(
        statePath,
        JSON.stringify({ ...existing, isMaximized: true }),
        'utf-8'
      );
    }
  } catch (err) {
    console.warn('[Electron Main] Could not save window state:', err);
  }
}

function createWindow() {
  log('createWindow called');
  const state = loadWindowState();
  const buildIcon = path.join(__dirname, '../build/icon.ico');
  const distIcon = path.join(__dirname, '../dist/favicon.ico');
  const iconPath = fs.existsSync(buildIcon)
    ? buildIcon
    : fs.existsSync(distIcon)
    ? distIcon
    : undefined;

  log(`Icon resolved: ${iconPath}`);
  mainWindow = new BrowserWindow({
    title: 'Microsoft Whiteboard',
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    backgroundColor: '#1E1E1E',
    autoHideMenuBar: true,
    show: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  });

  log(`BrowserWindow created. HWND: ${mainWindow.getNativeWindowHandle().readInt32LE(0)}`);

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.once('ready-to-show', () => {
    log('ready-to-show fired');
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('did-finish-load fired');
    mainWindow?.show();
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log(`did-fail-load: code=${code} desc=${desc} url=${url}`);
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    log(`render-process-gone: ${JSON.stringify(details)}`);
  });

  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    log(`[Renderer Console lvl=${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximize-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximize-change', false);
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window:maximize-change', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window:maximize-change', false);
  });

  mainWindow.on('close', () => {
    log('mainWindow close event');
    if (mainWindow) {
      saveWindowState(mainWindow);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    log(`Loading dev URL: ${devUrl}`);
    mainWindow.loadURL(devUrl);
  } else {
    const localIndex = path.join(__dirname, '../dist/index.html');
    const fallbackIndex = path.join(app.getAppPath(), 'dist/index.html');
    const targetFile = fs.existsSync(localIndex) ? localIndex : fallbackIndex;
    log(`Loading target file: ${targetFile} (exists: ${fs.existsSync(targetFile)})`);
    mainWindow.loadFile(targetFile).catch((err) => {
      log(`mainWindow.loadFile error: ${err.message}`);
    });
  }
}

const gotTheLock = app.requestSingleInstanceLock();
log(`Single instance lock obtained: ${gotTheLock}`);
if (!gotTheLock) {
  log('Could not get single instance lock - quitting');
  app.quit();
} else {
  app.on('second-instance', () => {
    log('second-instance event received');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    log('app.whenReady resolved');
    ipcMain.handle('window:minimize', () => {
      mainWindow?.minimize();
    });

    ipcMain.handle('window:maximize', () => {
      if (!mainWindow) return;
      if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
      } else if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    });

    ipcMain.handle('window:close', () => {
      mainWindow?.close();
    });

    ipcMain.handle('window:isMaximized', () => {
      return mainWindow?.isMaximized() ?? false;
    });

    ipcMain.handle(
      'file:save-whiteboard',
      async (_, { defaultTitle, fileContent }: { defaultTitle: string; fileContent: string }) => {
        if (!mainWindow) return { success: false };
        const safeTitle = (defaultTitle || 'Whiteboard').replace(/[\\/:*?"<>|]/g, '_');
        const result = await dialog.showSaveDialog(mainWindow, {
          title: 'Save Whiteboard File',
          defaultPath: `${safeTitle}.whiteboard`,
          filters: [
            { name: 'Microsoft Whiteboard Bundle (*.whiteboard)', extensions: ['whiteboard'] },
            { name: 'JSON Document (*.json)', extensions: ['json'] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return { success: false, canceled: true };
        }

        fs.writeFileSync(result.filePath, fileContent, 'utf-8');
        return { success: true, filePath: result.filePath };
      }
    );

    ipcMain.handle('file:open-whiteboard', async () => {
      if (!mainWindow) return { success: false };
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Open Whiteboard File',
        filters: [
          {
            name: 'Microsoft Whiteboard Files (*.whiteboard, *.json)',
            extensions: ['whiteboard', 'json'],
          },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, filePath, content };
    });

    ipcMain.handle('file:open-image', async () => {
      if (!mainWindow) return { success: false };
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Insert Local Image',
        filters: [
          {
            name: 'Image Files (*.png, *.jpg, *.jpeg, *.webp, *.svg)',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'],
          },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
      const fileName = path.basename(filePath);

      return { success: true, filePath, fileName, dataUrl };
    });

    ipcMain.handle('file:open-document', async () => {
      if (!mainWindow) return { success: false };
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Insert Local PDF Document',
        filters: [
          {
            name: 'PDF Documents (*.pdf)',
            extensions: ['pdf'],
          },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const buffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);

      return {
        success: true,
        filePath,
        fileName,
        arrayBuffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      };
    });

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
}
