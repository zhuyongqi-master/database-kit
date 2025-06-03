import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { DBConfigFile, DBConfigItem, DBConfigSettings, PriorityConfig } from '@/types/db-config';
import { ConnectionInfo } from '@/types/connection';
import { getStoreValue, setStoreValue } from "@/api/electron-store";
import { STORE_KEYS } from "@/types/electron-store";

// Define the context state
interface DBConfigState {
  configFile: DBConfigFile | null;
  priorityConfig: PriorityConfig;
  selectedServer: ConnectionInfo | null;
  isLoading: boolean;
  error: string | null;
  settings: DBConfigSettings;
}

// Define reduced actions
type DBConfigAction =
  | { type: 'SET_CONFIG_FILE'; payload: DBConfigFile }
  | { type: 'SET_SELECTED_SERVER'; payload: ConnectionInfo | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'MODIFY_CONFIG_ITEM'; payload: DBConfigItem }
  | { type: 'COMMIT_CHANGES'; payload?: undefined }
  | { type: 'RESET_CHANGES'; payload?: undefined }
  | { type: 'SET_PRIORITY_ENABLED'; payload: boolean }
  | { type: 'ADD_PRIORITY_KEY'; payload: string }
  | { type: 'REMOVE_PRIORITY_KEY'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<DBConfigSettings> }
  | { type: 'INITIALIZE_SETTINGS'; payload: DBConfigSettings };

// Define default settings to use until actual settings are loaded
const defaultInitialSettings: DBConfigSettings = {
  itemsPerPage: 10,
  selectedServerId: null,
  isUsingManualServer: false,
  manualServerConfig: {
    ip: '',
    port: '22',
    username: '',
    password: '',
  },
  priorityConfig: {
    enabled: false,
    keys: []
  },
  lastFilePath: '',
  isUsingLocalMode: false
};

// Define the initial state with default settings
const initialState: DBConfigState = {
  configFile: null,
  priorityConfig: defaultInitialSettings.priorityConfig,
  selectedServer: null,
  isLoading: true, // Start with loading true until settings are loaded
  error: null,
  settings: defaultInitialSettings
};

// Create a reducer function
function dbConfigReducer(state: DBConfigState, action: DBConfigAction): DBConfigState {
  let newState: DBConfigState;

  switch (action.type) {
    case 'INITIALIZE_SETTINGS':
      newState = {
        ...state,
        settings: action.payload,
        priorityConfig: action.payload.priorityConfig,
        isLoading: false
      };
      break;

    case 'SET_CONFIG_FILE':
      newState = {
        ...state,
        configFile: action.payload,
        error: null
      };
      break;

    case 'SET_SELECTED_SERVER':
      newState = {
        ...state,
        selectedServer: action.payload,
        settings: {
          ...state.settings,
          selectedServerId: action.payload?.id || null,
          isUsingManualServer: action.payload?.id === 'manual'
        }
      };
      break;

    case 'SET_LOADING':
      newState = {
        ...state,
        isLoading: action.payload
      };
      break;

    case 'SET_ERROR':
      newState = {
        ...state,
        error: action.payload,
        isLoading: false
      };
      break;

    case 'MODIFY_CONFIG_ITEM': {
      if (!state.configFile) return state;

      const updatedItem = action.payload;

      // Find and update the item in the items array
      const updatedItems = state.configFile.items.map(item =>
        item.lineNumber === updatedItem.lineNumber ?
          { ...updatedItem, isModified: true } :
          item
      );

      // Add or update the item in modifiedItems
      const existingModifiedItemIndex = state.configFile.modifiedItems.findIndex(
        item => item.lineNumber === updatedItem.lineNumber
      );

      let updatedModifiedItems = [...state.configFile.modifiedItems];

      if (existingModifiedItemIndex >= 0) {
        updatedModifiedItems[existingModifiedItemIndex] = { ...updatedItem, isModified: true };
      } else {
        updatedModifiedItems = [...updatedModifiedItems, { ...updatedItem, isModified: true }];
      }

      newState = {
        ...state,
        configFile: {
          ...state.configFile,
          items: updatedItems,
          modifiedItems: updatedModifiedItems
        }
      };
      break;
    }

    case 'COMMIT_CHANGES': {
      if (!state.configFile) return state;

      // After committing changes, reset the modified flags and clear modifiedItems
      const updatedItems = state.configFile.items.map(item => ({
        ...item,
        isModified: false
      }));

      newState = {
        ...state,
        configFile: {
          ...state.configFile,
          items: updatedItems,
          modifiedItems: []
        }
      };
      break;
    }

    case 'RESET_CHANGES': {
      if (!state.configFile) return state;

      // Revert all modified items back to their original state
      const originalItems = state.configFile.items.map(item => {
        const modifiedItem = state.configFile?.modifiedItems.find(
          modified => modified.lineNumber === item.lineNumber
        );

        if (modifiedItem) {
          // Revert to the original state
          return {
            ...item,
            value: modifiedItem.originalValue,
            isModified: false
          };
        }

        return item;
      });

      newState = {
        ...state,
        configFile: {
          ...state.configFile,
          items: originalItems,
          modifiedItems: []
        }
      };
      break;
    }

    case 'SET_PRIORITY_ENABLED': {
      const updatedPriorityConfig = {
        ...state.priorityConfig,
        enabled: action.payload
      };

      newState = {
        ...state,
        priorityConfig: updatedPriorityConfig,
        settings: {
          ...state.settings,
          priorityConfig: updatedPriorityConfig
        }
      };
      break;
    }

    case 'ADD_PRIORITY_KEY': {
      // Don't add duplicate keys
      if (state.priorityConfig.keys.includes(action.payload)) {
        return state;
      }

      const updatedKeys = [...state.priorityConfig.keys, action.payload];
      const updatedPriorityConfig = {
        ...state.priorityConfig,
        keys: updatedKeys
      };

      newState = {
        ...state,
        priorityConfig: updatedPriorityConfig,
        settings: {
          ...state.settings,
          priorityConfig: updatedPriorityConfig
        }
      };
      break;
    }

    case 'REMOVE_PRIORITY_KEY': {
      const updatedKeys = state.priorityConfig.keys.filter(key => key !== action.payload);
      const updatedPriorityConfig = {
        ...state.priorityConfig,
        keys: updatedKeys
      };

      newState = {
        ...state,
        priorityConfig: updatedPriorityConfig,
        settings: {
          ...state.settings,
          priorityConfig: updatedPriorityConfig
        }
      };
      break;
    }

    case 'UPDATE_SETTINGS': {
      newState = {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };
      break;
    }

    default:
      return state;
  }

  return newState;
}

// Create context types
interface DBConfigContextType {
  state: DBConfigState;
  setConfigFile: (configFile: DBConfigFile) => void;
  setSelectedServer: (server: ConnectionInfo | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  modifyConfigItem: (item: DBConfigItem) => void;
  commitChanges: () => void;
  resetChanges: () => void;
  setPriorityEnabled: (enabled: boolean) => void;
  addPriorityKey: (key: string) => void;
  removePriorityKey: (key: string) => void;
  getSortedItems: () => DBConfigItem[];
  updateSettings: (settings: Partial<DBConfigSettings>) => void;
}

// Create the context
const DBConfigContext = createContext<DBConfigContextType | null>(null);

// Create the context provider component
export const DBConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dbConfigReducer, initialState);

  // Load settings from electron-store on the component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getStoreValue(STORE_KEYS.DB_CONFIG_SETTINGS);
        dispatch({ type: 'INITIALIZE_SETTINGS', payload: settings });
      } catch (error) {
        console.error('Failed to load settings:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load settings' });
      }
    };

    loadSettings().then();
  }, []);

  // Save settings to electron-store whenever they change
  useEffect(() => {
    if (state.isLoading) return;
    const saveSetting = async () => {
      try {
        await setStoreValue(STORE_KEYS.DB_CONFIG_SETTINGS, state.settings);
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    };
    saveSetting().then();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings]);

  // Action creators
  const setConfigFile = (configFile: DBConfigFile) => {
    dispatch({ type: 'SET_CONFIG_FILE', payload: configFile });

    // Update settings with the file path
    updateSettings({ lastFilePath: configFile.path });
  };

  const setSelectedServer = (server: ConnectionInfo | null) => {
    dispatch({ type: 'SET_SELECTED_SERVER', payload: server });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const modifyConfigItem = (item: DBConfigItem) => {
    dispatch({ type: 'MODIFY_CONFIG_ITEM', payload: item });
  };

  const commitChanges = () => {
    dispatch({ type: 'COMMIT_CHANGES' });
  };

  const resetChanges = () => {
    dispatch({ type: 'RESET_CHANGES' });
  };

  const setPriorityEnabled = (enabled: boolean) => {
    dispatch({ type: 'SET_PRIORITY_ENABLED', payload: enabled });
  };

  const addPriorityKey = (key: string) => {
    dispatch({ type: 'ADD_PRIORITY_KEY', payload: key });
  };

  const removePriorityKey = (key: string) => {
    dispatch({ type: 'REMOVE_PRIORITY_KEY', payload: key });
  };

  const updateSettings = (settings: Partial<DBConfigSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  // Utility function to get sorted items 
  // Priority: 1. Modified items, 2. Priority keys (if enabled), 3. Regular items
  const getSortedItems = (): DBConfigItem[] => {
    if (!state.configFile?.items) return [];

    // Create a copy of the items array
    const items = [...state.configFile.items];

    // Helper function to get sorting weight
    const getSortWeight = (item: DBConfigItem): number => {
      if (item.isModified) return 0; // Modified items first
      if (state.priorityConfig.enabled && state.priorityConfig.keys.includes(item.key)) return 1; // Priority items second
      return 2; // Regular items last
    };

    // Sort by the sort weight first, then alphabetically by key
    return items.sort((a, b) => {
      const aWeight = getSortWeight(a);
      const bWeight = getSortWeight(b);

      if (aWeight !== bWeight) {
        return aWeight - bWeight;
      }

      // If same weight, sort alphabetically by key
      return a.key.localeCompare(b.key);
    });
  };

  const contextValue: DBConfigContextType = {
    state,
    setConfigFile,
    setSelectedServer,
    setLoading,
    setError,
    modifyConfigItem,
    commitChanges,
    resetChanges,
    setPriorityEnabled,
    addPriorityKey,
    removePriorityKey,
    getSortedItems,
    updateSettings
  };

  return (
    <DBConfigContext.Provider value={contextValue}>
      {children}
    </DBConfigContext.Provider>
  );
};

// Hook to use the context
// eslint-disable-next-line react-refresh/only-export-components
export const useDBConfigContext = () => {
  const context = useContext(DBConfigContext);
  if (!context) {
    throw new Error('useDBConfigContext must be used within a DBConfigProvider');
  }
  return context;
}; 