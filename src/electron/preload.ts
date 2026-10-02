import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  isElectron: boolean;
  selectFolder: () => Promise<string | null>;
  selectFolders: () => Promise<string[] | null>;
  toggleFullscreen: () => Promise<boolean>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  getAppVersion: () => Promise<string>;
}

const electronAPI: ElectronAPI = {
  isElectron: true,
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  selectFolders: () => ipcRenderer.invoke('dialog:selectFolders'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
