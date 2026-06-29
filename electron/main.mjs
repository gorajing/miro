// Miro desktop overlay — a transparent, always-on-top, click-through window so the
// pet lives above all your screens. Clicks pass through the empty space; the renderer
// flips interactivity on only when the cursor is over Miro himself.
import { app, BrowserWindow, session, desktopCapturer, ipcMain, screen, globalShortcut } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OVERLAY_URL = process.env.MIRO_OVERLAY_URL || 'http://127.0.0.1:5174/overlay.html';

let win = null;

function createWindow() {
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({
    x, y, width, height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true }); // click-through everywhere; forward move events
  win.setContentProtection(true); // try to exclude Miro from screen capture so she can't see herself
  win.loadURL(OVERLAY_URL);                           // (the renderer also masks her region — that's the real guarantee)
}

app.whenReady().then(() => {
  // Auto-grant screen capture (no picker) for getDisplayMedia, if used.
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      callback(sources.length ? { video: sources[0] } : {});
    }).catch(() => callback({}));
  });

  // Renderer asks for the primary screen's source id (for gesture-free getUserMedia capture).
  ipcMain.handle('miro:source-id', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    return sources[0]?.id ?? '';
  });

  // Renderer toggles whether Miro's body is clickable vs click-through.
  ipcMain.on('miro:interactive', (_event, interactive) => {
    if (win) win.setIgnoreMouseEvents(!interactive, { forward: true });
  });

  createWindow();

  // Ask Miro for a recap of the session (she tells you your day). Cmd/Ctrl+Shift+M (M for Miro).
  globalShortcut.register('CommandOrControl+Shift+M', () => { win?.webContents.send('miro:recap'); });
  // Force an immediate look (demo cue / when the change-detector is quiet). Cmd/Ctrl+Shift+L.
  globalShortcut.register('CommandOrControl+Shift+L', () => { win?.webContents.send('miro:look'); });

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
