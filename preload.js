const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onCycleTheme: (callback) => ipcRenderer.on('cycle-theme', callback),
});