import { contextBridge, ipcRenderer } from 'electron';
import { StoreSchema } from "./store";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});

// Expose store API to the renderer process
contextBridge.exposeInMainWorld('electronStore', {
  get: <K extends keyof StoreSchema>(key: K) => ipcRenderer.invoke('store:get', key),
  set: <K extends keyof StoreSchema>(key: K, value: StoreSchema[K]) => ipcRenderer.invoke('store:set', key, value),
  delete: (key: keyof StoreSchema) => ipcRenderer.invoke('store:delete', key),
  clear: () => ipcRenderer.invoke('store:clear')
});
