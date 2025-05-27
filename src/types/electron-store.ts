import { DBConfigSettings } from "./db-config";
import { SQLOrCommandData } from "./sql-or-command";
import { ConnectionData } from "./connection";
import { CommandStream } from "./command";

type StoreSchema = {
  dbConfigSettings: DBConfigSettings;
  sqlCommands: SQLOrCommandData;
  connections: ConnectionData;
  commandStreams: CommandStream[];
};

export interface ElectronStore {
  get: <K extends keyof StoreSchema>(key: K) => Promise<StoreSchema[K]>;
  set: <K extends keyof StoreSchema>(key: K, value: StoreSchema[K]) => Promise<boolean>;
  delete: (key: keyof StoreSchema) => Promise<boolean>;
  clear: () => Promise<boolean>;
}

/**
 * File contains constants for electron-store key names
 * This ensures we use consistent key names across the application
 */
// Context-specific storage keys
export const STORE_KEYS = {
  DB_CONFIG_SETTINGS: 'dbConfigSettings',
  SQL_COMMANDS: 'sqlCommands',
  CONNECTIONS: 'connections',
  COMMAND_STREAMS: 'commandStreams'
} as const;