import { app, BrowserWindow, globalShortcut, Menu, screen } from 'electron';
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WIN_HEIGHT = 100;
const MAX_HEIGHT = 600; // resizable ceiling (user can grow the bar)

let win;

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  win = new BrowserWindow({
    width: screenWidth,   // span the full screen width initially
    height: WIN_HEIGHT,
    x: 0,
    y: screenHeight - WIN_HEIGHT - 10,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    minHeight: WIN_HEIGHT,
    maxHeight: MAX_HEIGHT, // raised ceiling so the bar stays freely resizable
    resizable: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // win.on('maximize', () => {
  //   win.unmaximize();
  //   win.setBounds({ x: win.getPosition()[0], y: screen.getPrimaryDisplay().workAreaSize.height - WIN_HEIGHT - 10, width: WIN_WIDTH, height: WIN_HEIGHT });
  // });

  win.loadFile('index.html');

  let isLocked = false;
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    isLocked = !isLocked;
    win.setIgnoreMouseEvents(isLocked, {forward: true});
  });
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    win.webContents.send('cycle-theme');
  });
  // The picker's ✕ button used to quit; keep a quit shortcut now it's gone.
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    app.quit();
  });
}

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  });
});