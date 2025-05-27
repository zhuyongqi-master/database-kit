import Store from 'electron-store';
import { ipcMain } from 'electron';
import type { DBConfigSettings } from '@/types/db-config';
import type { SQLOrCommandData } from '@/types/sql-or-command';
import type { ConnectionData } from '@/types/connection';
import type { CommandStream } from '@/types/command';
import {
  DEFAULT_COMMAND_STREAMS,
  DEFAULT_CONNECTIONS,
  DEFAULT_DB_CONFIG_SETTINGS,
  DEFAULT_SQL_COMMANDS
} from "./default-config";
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;

// Define schema type
export type StoreSchema = {
  dbConfigSettings: DBConfigSettings;
  sqlCommands: SQLOrCommandData;
  connections: ConnectionData;
  commandStreams: CommandStream[];
};

// Define schema for our store
const schema = {
  dbConfigSettings: {
    type: 'object',
    properties: {
      itemsPerPage: { type: 'number' },
      lastFilePath: { type: 'string' },
      selectedServerId: { type: ['string', 'null'] },
      isUsingLocalMode: { type: 'boolean' },
      isUsingManualServer: { type: 'boolean' },
      manualServerConfig: {
        type: 'object',
        properties: {
          ip: { type: 'string' },
          port: { type: 'string' },
          username: { type: 'string' },
          password: { type: 'string' }
        }
      },
      priorityConfig: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          keys: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    default: DEFAULT_DB_CONFIG_SETTINGS
  },
  sqlCommands: {
    type: 'object',
    properties: {
      sql: { type: 'array', items: { type: 'object' } },
      command: { type: 'array', items: { type: 'object' } }
    },
    default: DEFAULT_SQL_COMMANDS
  },
  connections: {
    type: 'object',
    properties: {
      server: { type: 'array', items: { type: 'object' } },
      database: { type: 'array', items: { type: 'object' } }
    },
    default: DEFAULT_CONNECTIONS
  },
  commandStreams: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        commandList: { type: 'array' },
        placeholderConfigs: { type: 'array' },
        checkRuleConfigs: { type: 'array' }
      }
    },
    default: DEFAULT_COMMAND_STREAMS
  }
};

// Create the electron store instance with type assertion
const store = new Store<StoreSchema>({ schema }) as Store<StoreSchema> & {
  get<K extends keyof StoreSchema>(key: K): StoreSchema[K];
  set<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): boolean;
  delete(key: keyof StoreSchema): boolean;
  clear(): boolean;
};

// Set up IPC handlers for the store
export function setupStoreHandlers() {
  // Get value from the store
  ipcMain.handle('store:get', (_: IpcMainInvokeEvent, key: keyof StoreSchema) => {
    return store.get(key);
  });

  // Set a value in the store
  ipcMain.handle('store:set', <K extends keyof StoreSchema>(_: IpcMainInvokeEvent, key: K, value: StoreSchema[K]) => {
    store.set(key, value);
    return true;
  });

  // Delete a key from the store
  ipcMain.handle('store:delete', (_: IpcMainInvokeEvent, key: keyof StoreSchema) => {
    store.delete(key);
    return true;
  });

  // Clear the entire store
  ipcMain.handle('store:clear', () => {
    store.clear();
    return true;
  });
}