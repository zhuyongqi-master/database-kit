/// <reference types="vite/client" />

import { ElectronStore } from "./electron-store";

declare global {
  interface Window {
    // expose in the `electron/preload/index.ts`
    ipcRenderer: import('electron').IpcRenderer;
    electronStore: ElectronStore;
  }
}