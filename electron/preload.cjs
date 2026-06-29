// Bridge a tiny, safe API into the overlay renderer.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('miroOverlay', {
  isOverlay: true,
  getSourceId: () => ipcRenderer.invoke('miro:source-id'),
  setInteractive: (v) => ipcRenderer.send('miro:interactive', !!v),
  onRecap: (cb) => ipcRenderer.on('miro:recap', () => cb()),
  onLook: (cb) => ipcRenderer.on('miro:look', () => cb()),
});
