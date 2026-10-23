import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  isElectron: boolean;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
  saveWhiteboard: (
    defaultTitle: string,
    fileContent: string
  ) => Promise<{ success: boolean; canceled?: boolean; filePath?: string }>;
  openWhiteboard: () => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    content?: string;
  }>;
  openImage: () => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    fileName?: string;
    dataUrl?: string;
  }>;
  openDocument: () => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    fileName?: string;
    arrayBuffer?: ArrayBuffer;
  }>;
}

const electronAPI: ElectronAPI = {
  isElectron: true,
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_: any, isMax: boolean) => callback(isMax);
    ipcRenderer.on('window:maximize-change', handler);
    return () => {
      ipcRenderer.removeListener('window:maximize-change', handler);
    };
  },
  saveWhiteboard: (defaultTitle: string, fileContent: string) =>
    ipcRenderer.invoke('file:save-whiteboard', { defaultTitle, fileContent }),
  openWhiteboard: () => ipcRenderer.invoke('file:open-whiteboard'),
  openImage: () => ipcRenderer.invoke('file:open-image'),
  openDocument: () => ipcRenderer.invoke('file:open-document'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
