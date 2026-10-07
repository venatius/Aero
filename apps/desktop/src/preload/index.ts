import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  sendGesture: (event: any) => ipcRenderer.send('gesture-event', JSON.stringify(event)),
  onGesture: (callback: (event: any) => void) => ipcRenderer.on('gesture-event', (_event, value) => callback(JSON.parse(value))),
  onModeChanged: (callback: (mode: string) => void) => ipcRenderer.on('mode-changed', (_event, value) => callback(value))
});
