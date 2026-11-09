'use strict';

const { app, BrowserWindow, Menu, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');

// The live frontend. Updating the site on Vercel updates the app — no new installer needed.
const APP_URL = 'https://steel-workflow-frontend.vercel.app';
const APP_ORIGIN = new URL(APP_URL).origin;
const OFFLINE_PAGE = path.join(__dirname, 'offline.html');

const isMac = process.platform === 'darwin';
let mainWindow = null;

// ---------- window size/position memory ----------
const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
  } catch {
    return { width: 1400, height: 900, maximized: false };
  }
}

function saveWindowState(win) {
  try {
    const state = { ...win.getNormalBounds(), maximized: win.isMaximized() };
    fs.writeFileSync(stateFile(), JSON.stringify(state));
  } catch {
    /* non-critical */
  }
}

// ---------- helpers ----------
function isAppUrl(url) {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function openExternal(url) {
  try {
    const { protocol } = new URL(url);
    if (protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:') {
      shell.openExternal(url);
    }
  } catch {
    /* ignore malformed URLs */
  }
}

function showOffline(win) {
  win.loadFile(OFFLINE_PAGE, { query: { url: APP_URL } });
}

// ---------- window ----------
function createWindow() {
  const state = loadWindowState();

  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    title: 'Steel Workflow',
    backgroundColor: '#f8fafc',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  if (state.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());
  win.on('close', () => saveWindowState(win));

  // Links that open a new tab: app pages open in a new app window, everything else in the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1200,
          height: 800,
          backgroundColor: '#f8fafc',
          webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
        },
      };
    }
    openExternal(url);
    return { action: 'deny' };
  });

  // Never let the main window navigate away from the app (except the offline page's retry).
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url) && !url.startsWith('file://')) {
      event.preventDefault();
      openExternal(url);
    }
  });

  // No internet / site down → friendly offline page with auto-retry.
  win.webContents.on('did-fail-load', (_e, errorCode, _desc, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3 /* ABORTED, e.g. redirects */) return;
    if (validatedURL && validatedURL.startsWith('file://')) return;
    showOffline(win);
  });

  win.loadURL(APP_URL);
  return win;
}

// ---------- menu ----------
function buildMenu() {
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    ...(isMac ? [] : [{ label: 'File', submenu: [{ role: 'quit', label: 'Exit' }] }]),
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        {
          label: 'Home',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => mainWindow && mainWindow.loadURL(APP_URL),
        },
        {
          label: 'Back',
          accelerator: isMac ? 'Cmd+[' : 'Alt+Left',
          click: (_m, w) => w && w.webContents.navigationHistory.canGoBack() && w.webContents.navigationHistory.goBack(),
        },
        {
          label: 'Forward',
          accelerator: isMac ? 'Cmd+]' : 'Alt+Right',
          click: (_m, w) => w && w.webContents.navigationHistory.canGoForward() && w.webContents.navigationHistory.goForward(),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- app lifecycle ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('com.steelworkflow.desktop');

    // Only grant what the web app actually needs.
    const allowed = new Set(['notifications', 'clipboard-sanitized-write', 'fullscreen']);
    session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
      callback(allowed.has(permission) && isAppUrl(wc.getURL()));
    });

    buildMenu();
    mainWindow = createWindow();
    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
        mainWindow.on('closed', () => {
          mainWindow = null;
        });
      }
    });
  });

  app.on('window-all-closed', () => {
    if (!isMac) app.quit();
  });
}
