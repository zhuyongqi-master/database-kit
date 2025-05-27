export interface DBConfigItem {
  key: string;
  value: string;
  lineNumber: number;
  originalContent: string;
  isModified: boolean;
}

export interface DBConfigFile {
  path: string;
  items: DBConfigItem[];
  modifiedItems: DBConfigItem[];
}

export interface PriorityConfig {
  enabled: boolean;
  keys: string[];
}

export interface ParsedConfig {
  items: DBConfigItem[];
  originalContent: string;
}

// Settings that will be persisted
export interface DBConfigSettings {
  itemsPerPage: number;
  lastFilePath: string;
  selectedServerId: string | null;
  isUsingLocalMode: boolean;
  isUsingManualServer: boolean;
  manualServerConfig: {
    ip: string;
    port: string;
    username: string;
    password: string; // Note: In a real application, consider encrypting this
  };
  priorityConfig: PriorityConfig;
}