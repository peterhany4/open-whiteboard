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

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
  }
}
