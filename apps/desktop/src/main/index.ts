import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, screen } from 'electron';
import { join } from 'path';
import { getPlatformAdapter } from './platform';

let overlayWindow: BrowserWindow | null = null;
let cameraWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const adapter = getPlatformAdapter();

let currentMode: 'Slides' | 'Music' | 'Photos' = 'Slides';

function createOverlayWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  const appIconPath = join(__dirname, '../../resources', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  
  overlayWindow = new BrowserWindow({
    width: 300,
    height: 100,
    x: width / 2 - 150,
    y: 20,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    icon: appIconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (app.dock) {
    app.dock.hide();
  } else {
    overlayWindow.setSkipTaskbar(true);
  }

  // Load the overlay page. We will use a hash to differentiate in the renderer.
  if (process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#overlay');
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'overlay' });
  }
}

function createCameraWindow() {
  const appIconPath = join(__dirname, '../../resources', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  cameraWindow = new BrowserWindow({
    width: 400,
    height: 300,
    show: false, // hidden
    icon: appIconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    cameraWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#camera');
  } else {
    cameraWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'camera' });
  }
}

app.whenReady().then(() => {
  createOverlayWindow();
  createCameraWindow();

  const trayIconName = process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png';
  const trayIconPath = join(__dirname, '../../resources', trayIconName);
  tray = new Tray(trayIconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Toggle Overlay', click: () => {
        if (overlayWindow?.isVisible()) overlayWindow.hide();
        else overlayWindow?.show();
    }},
    { label: 'Mode: Slides', type: 'radio', checked: true, click: () => { currentMode = 'Slides'; overlayWindow?.webContents.send('mode-changed', currentMode); } },
    { label: 'Mode: Music', type: 'radio', click: () => { currentMode = 'Music'; overlayWindow?.webContents.send('mode-changed', currentMode); } },
    { label: 'Mode: Photos', type: 'radio', click: () => { currentMode = 'Photos'; overlayWindow?.webContents.send('mode-changed', currentMode); } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('Aero');
  tray.setContextMenu(contextMenu);

  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (overlayWindow?.isVisible()) overlayWindow.hide();
    else overlayWindow?.show();
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
      createCameraWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Forward gestures from camera window to overlay and act on them
ipcMain.on('gesture-event', (e, eventStr) => {
  const event = JSON.parse(eventStr);
  
  // Send to overlay for UI updates
  if (overlayWindow) {
    overlayWindow.webContents.send('gesture-event', eventStr);
  }

  // Handle OS actions
  if (event.type === 'FIST') {
    // Cycle mode
    const modes: ('Slides' | 'Music' | 'Photos')[] = ['Slides', 'Music', 'Photos'];
    const idx = modes.indexOf(currentMode);
    currentMode = modes[(idx + 1) % modes.length];
    
    // Update tray menu theoretically, or just send to UI
    overlayWindow?.webContents.send('mode-changed', currentMode);
  }
  
  if (currentMode === 'Slides') {
    if (event.type === 'SWIPE_LEFT') adapter.sendKey('right'); // next slide
    if (event.type === 'SWIPE_RIGHT') adapter.sendKey('left'); // prev slide
  } else if (currentMode === 'Music') {
    if (event.type === 'SWIPE_LEFT') adapter.mediaNext();
    if (event.type === 'SWIPE_RIGHT') adapter.mediaPrev();
    if (event.type === 'PALM_HOLD') adapter.mediaPlayPause();
    if (event.type === 'PINCH_DRAG') adapter.setVolume(event.value);
  } else if (currentMode === 'Photos') {
    if (event.type === 'SWIPE_LEFT') adapter.sendKey('right');
    if (event.type === 'SWIPE_RIGHT') adapter.sendKey('left');
    // Zoom would ideally be Cmd/Ctrl +/-, but let's stick to spec
  }
});
