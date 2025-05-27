import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { ConnectionData, ConnectionInfo, ConnectionType } from '@/types/connection';
import { getStoreValue, setStoreValue } from '@/api/electron-store';

import { STORE_KEYS } from "@/types/electron-store";

// Define selected connections state
interface SelectedConnectionsState {
  server: string | null;
  database: string | null;
}

// Define actions for the reducer
type SelectedConnectionsAction =
  | { type: 'SELECT_SERVER'; id: string }
  | { type: 'SELECT_DATABASE'; id: string }
  | { type: 'CLEAR_SERVER' }
  | { type: 'CLEAR_DATABASE' };

// Reducer function for selected connections
function selectedConnectionsReducer(
  state: SelectedConnectionsState,
  action: SelectedConnectionsAction
): SelectedConnectionsState {
  switch (action.type) {
    case 'SELECT_SERVER':
      return { ...state, server: action.id };
    case 'SELECT_DATABASE':
      return { ...state, database: action.id };
    case 'CLEAR_SERVER':
      return { ...state, server: null };
    case 'CLEAR_DATABASE':
      return { ...state, database: null };
    default:
      return state;
  }
}

interface ConnectionContextType {
  // Connection management
  connections: ConnectionData;
  selectedType: ConnectionType;
  setSelectedType: (type: ConnectionType) => void;
  addConnection: (type: ConnectionType, connection: Omit<ConnectionInfo, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateConnection: (type: ConnectionType, id: string, connection: Partial<Omit<ConnectionInfo, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteConnection: (type: ConnectionType, id: string) => void;
  getConnection: (type: ConnectionType, id: string) => ConnectionInfo | undefined;

  // Export/Import functionality
  exportSingleConnection: (type: ConnectionType, id: string) => string;
  exportAllConnections: (type: ConnectionType) => string;
  importSingleConnection: (type: ConnectionType, data: Omit<ConnectionInfo, 'id' | 'createdAt' | 'updatedAt'>) => void;
  importAllConnections: (type: ConnectionType, data: Omit<ConnectionInfo, 'id' | 'createdAt' | 'updatedAt'>[]) => void;

  // Selected connections state and actions
  selectedConnections: SelectedConnectionsState;
  selectServer: (id: string) => void;
  selectDatabase: (id: string) => void;
  clearServerSelection: () => void;
  clearDatabaseSelection: () => void;
  getSelectedServer: () => ConnectionInfo | undefined;
  getSelectedDatabase: () => ConnectionInfo | undefined;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useConnectionContext = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnectionContext must be used within a ConnectionProvider');
  }
  return context;
};

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connections, setConnections] = useState<ConnectionData>({ server: [], database: [] });
  const [selectedType, setSelectedType] = useState<ConnectionType>('server');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize selected connections state with reducer
  const [selectedConnections, dispatchSelectedConnections] = useReducer(
    selectedConnectionsReducer,
    { server: null, database: null }
  );

  // Load connections from electron-store on mount
  useEffect(() => {
    const loadConnections = async () => {
      try {
        // First, check if connections exist in store
        const storedConnections = await getStoreValue(STORE_KEYS.CONNECTIONS);
        setConnections(storedConnections);
      } catch (error) {
        console.error('Failed to load connections:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadConnections().then();
  }, []);

  // Save connections to electron-store when updated
  useEffect(() => {
    if (!isLoading) {
      setStoreValue(STORE_KEYS.CONNECTIONS, connections).catch(error => {
        console.error('Failed to save connections:', error);
      });
    }
  }, [connections, isLoading]);

  // Action creators for selected connections
  const selectServer = (id: string) => {
    dispatchSelectedConnections({ type: 'SELECT_SERVER', id });
  };

  const selectDatabase = (id: string) => {
    dispatchSelectedConnections({ type: 'SELECT_DATABASE', id });
  };

  const clearServerSelection = () => {
    dispatchSelectedConnections({ type: 'CLEAR_SERVER' });
  };

  const clearDatabaseSelection = () => {
    dispatchSelectedConnections({ type: 'CLEAR_DATABASE' });
  };

  const getSelectedServer = (): ConnectionInfo | undefined => {
    if (!selectedConnections.server) return undefined;
    return connections.server.find(server => server.id === selectedConnections.server);
  };

  const getSelectedDatabase = (): ConnectionInfo | undefined => {
    if (!selectedConnections.database) return undefined;
    return connections.database.find(db => db.id === selectedConnections.database);
  };

  const addConnection = (type: ConnectionType, connectionData: Omit<ConnectionInfo, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newConnection: ConnectionInfo = {
      ...connectionData,
      id: uuid(),
      type,
      createdAt: now,
      updatedAt: now
    };

    setConnections(prev => {
      if (prev[type]) {
        return ({
          ...prev,
          [type]: [...prev[type], newConnection]
        });
      } else {
        return ({
          ...prev,
          [type]: [newConnection]
        });
      }
    });
  };

  const updateConnection = (
    type: ConnectionType,
    id: string,
    connectionData: Partial<Omit<ConnectionInfo, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    // Check if type is changing
    const newType = connectionData.type || type;

    // If type is changing
    if (newType !== type) {
      // Get the connection to update
      const connectionToUpdate = connections[type].find(conn => conn.id === id);

      if (!connectionToUpdate) return;

      // Create updated connection with new type
      const updatedConnection: ConnectionInfo = {
        ...connectionToUpdate,
        ...connectionData,
        type: newType,
        updatedAt: new Date().toISOString()
      };

      // Remove from old type array and add to new type
      setConnections(prev => ({
        ...prev,
        [type]: prev[type].filter(conn => conn.id !== id),
        [newType]: [...prev[newType], updatedConnection]
      }));

      // Update selection if this connection was selected
      if (selectedConnections.server === id && type === 'server') {
        clearServerSelection();
        if (newType === 'database') {
          selectDatabase(id);
        }
      } else if (selectedConnections.database === id && type === 'database') {
        clearDatabaseSelection();
        if (newType === 'server') {
          selectServer(id);
        }
      }
    } else {
      // Just update the connection in place
      setConnections(prev => ({
        ...prev,
        [type]: prev[type].map(conn =>
          conn.id === id
            ? { ...conn, ...connectionData, updatedAt: new Date().toISOString() }
            : conn
        )
      }));
    }
  };

  const deleteConnection = (type: ConnectionType, id: string) => {
    // Clear selection if this connection was selected
    if (type === 'server' && selectedConnections.server === id) {
      clearServerSelection();
    } else if (type === 'database' && selectedConnections.database === id) {
      clearDatabaseSelection();
    }

    setConnections(prev => ({
      ...prev,
      [type]: prev[type].filter(conn => conn.id !== id)
    }));
  };

  const getConnection = (type: ConnectionType, id: string): ConnectionInfo | undefined => {
    return connections[type].find(conn => conn.id === id);
  };

  // Export/Import functionality
  const exportSingleConnection = (type: ConnectionType, id: string): string => {
    const connection = connections[type].find(conn => conn.id === id);
    if (!connection) return '';

    // Create a copy without id and timestamps
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, createdAt: __, updatedAt: ___, ...exportData } = connection;
    return JSON.stringify(exportData, null, 2);
  };

  const exportAllConnections = (type: ConnectionType): string => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const connectionsData = connections[type].map(({ id, createdAt, updatedAt, ...rest }) => rest);
    return JSON.stringify(connectionsData, null, 2);
  };

  const importSingleConnection = (type: ConnectionType, data: Omit<ConnectionInfo, 'id' | 'createdAt' | 'updatedAt'>) => {
    addConnection(type, data);
  };

  const importAllConnections = (type: ConnectionType, data: Omit<ConnectionInfo, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const now = new Date().toISOString();
    const newConnections: ConnectionInfo[] = data.map(item => ({
      ...item,
      id: uuid(),
      createdAt: now,
      updatedAt: now
    }));

    setConnections(prev => ({
      ...prev,
      [type]: [...prev[type], ...newConnections]
    }));
  };

  return (
    <ConnectionContext.Provider
      value={{
        connections,
        selectedType,
        setSelectedType,
        addConnection,
        updateConnection,
        deleteConnection,
        getConnection,
        exportSingleConnection,
        exportAllConnections,
        importSingleConnection,
        importAllConnections,
        selectedConnections,
        selectServer,
        selectDatabase,
        clearServerSelection,
        clearDatabaseSelection,
        getSelectedServer,
        getSelectedDatabase
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};