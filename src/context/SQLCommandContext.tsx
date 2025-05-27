import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { v4 as uuid } from 'uuid';
import {
  Command,
  SelectedSQLCommandState,
  SQLCommand,
  SQLCommandType,
  SqlOrCommand,
  SQLOrCommandData
} from '@/types/sql-or-command';
import { getStoreValue, setStoreValue } from "@/api/electron-store";
import { STORE_KEYS } from "@/types/electron-store";

// Define actions for the reducer
type SelectedSQLCommandAction =
  | { type: 'SELECT_SQL'; id: string }
  | { type: 'SELECT_COMMAND'; id: string }
  | { type: 'CLEAR_SQL' }
  | { type: 'CLEAR_COMMAND' };

// Reducer function for selected SQL/commands
function selectedSQLCommandReducer(
  state: SelectedSQLCommandState,
  action: SelectedSQLCommandAction
): SelectedSQLCommandState {
  switch (action.type) {
    case 'SELECT_SQL':
      return { ...state, sql: action.id };
    case 'SELECT_COMMAND':
      return { ...state, command: action.id };
    case 'CLEAR_SQL':
      return { ...state, sql: null };
    case 'CLEAR_COMMAND':
      return { ...state, command: null };
    default:
      return state;
  }
}

interface SQLCommandContextType {
  sqlCommands: SQLOrCommandData;
  selectedType: SQLCommandType;
  setSelectedType: (type: SQLCommandType) => void;
  addSQLCommand: (type: SQLCommandType, command: Partial<SqlOrCommand>) => void;
  updateSQLCommand: (type: SQLCommandType, id: string, command: Partial<SqlOrCommand>) => void;
  deleteSQLCommand: (type: SQLCommandType, id: string) => void;
  getSQLCommand: (id: string) => SqlOrCommand | undefined;

  // Selected SQL/command-stream state and actions
  selectedSQLCommands: SelectedSQLCommandState;
  selectSQL: (id: string) => void;
  selectCommand: (id: string) => void;
  clearSQLSelection: () => void;
  clearCommandSelection: () => void;
  getSelectedSQL: () => SQLCommand | undefined;
  getSelectedCommand: () => Command | undefined;

  // Export/Import functionality
  exportSingleSQLCommand: (type: SQLCommandType, id: string) => string;
  exportAllSQLCommands: (type: SQLCommandType) => string;
  importSingleSQLCommand: (type: SQLCommandType, data: Partial<SqlOrCommand>) => void;
  importAllSQLCommands: (type: SQLCommandType, data: Partial<SqlOrCommand>[]) => void;
}

const SQLCommandContext = createContext<SQLCommandContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useSQLCommandContext = () => {
  const context = useContext(SQLCommandContext);
  if (!context) {
    throw new Error('useSQLCommandContext must be used within a SQLCommandProvider');
  }
  return context;
};

export const SQLCommandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sqlCommands, setSQLCommands] = useState<SQLOrCommandData>({ sql: [], command: [] });
  const [selectedType, setSelectedType] = useState<SQLCommandType>('sql');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize the selected SQL / commands state with reducer
  const [selectedSQLCommands, dispatchSelectedSQLCommands] = useReducer(
    selectedSQLCommandReducer,
    { sql: null, command: null }
  );

  // Load SQL commands from localStorage on mount
  useEffect(() => {
    const loadSqlAndCommand = async () => {
      try {
        const sqlAndCommands = await getStoreValue(STORE_KEYS.SQL_COMMANDS);
        setSQLCommands(sqlAndCommands);
      } catch (error) {
        console.error('Failed to load sql and commands:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSqlAndCommand().then();
  }, []);

  // Save SQL commands to localStorage when updated
  useEffect(() => {
    if (isLoading) return;
    const saveSqlAndCommand = async () => {
      try {
        await setStoreValue(STORE_KEYS.SQL_COMMANDS, sqlCommands);
      } catch (error) {
        console.error('Failed to save sql and commands:', error);
      }
    };
    saveSqlAndCommand().then();
    // eslint-disable-next-line
  }, [sqlCommands]);

  // Action creators for selected SQL/commands
  const selectSQL = (id: string) => {
    dispatchSelectedSQLCommands({ type: 'SELECT_SQL', id });
  };

  const selectCommand = (id: string) => {
    dispatchSelectedSQLCommands({ type: 'SELECT_COMMAND', id });
  };

  const clearSQLSelection = () => {
    dispatchSelectedSQLCommands({ type: 'CLEAR_SQL' });
  };

  const clearCommandSelection = () => {
    dispatchSelectedSQLCommands({ type: 'CLEAR_COMMAND' });
  };

  const getSelectedSQL = (): SQLCommand | undefined => {
    if (!selectedSQLCommands.sql) return undefined;
    return sqlCommands.sql.find(sql => sql.id === selectedSQLCommands.sql);
  };

  const getSelectedCommand = (): Command | undefined => {
    if (!selectedSQLCommands.command) return undefined;
    return sqlCommands.command.find(cmd => cmd.id === selectedSQLCommands.command);
  };

  const addSQLCommand = (
    type: SQLCommandType,
    commandData: Partial<SqlOrCommand>
  ) => {
    const now = new Date().toISOString();

    if (type === 'sql') {
      const sqlCommandData = commandData as Partial<SQLCommand>;
      const newCommand: SQLCommand = {
        id: uuid(),
        name: sqlCommandData.name || '',
        databaseType: sqlCommandData.databaseType || 'PostgreSQL',
        content: sqlCommandData.content || '',
        description: sqlCommandData.description || '',
        createdAt: now,
        updatedAt: now
      };

      setSQLCommands(prev => ({
        ...prev,
        sql: [...prev.sql, newCommand]
      }));
    } else {
      const commandDataWithoutDb = commandData as Partial<Command>;
      const newCommand: Command = {
        id: uuid(),
        name: commandDataWithoutDb.name || '',
        content: commandDataWithoutDb.content || '',
        description: commandDataWithoutDb.description || '',
        createdAt: now,
        updatedAt: now
      };

      setSQLCommands(prev => ({
        ...prev,
        command: [...prev.command, newCommand]
      }));
    }
  };

  const updateSQLCommand = (
    type: SQLCommandType,
    id: string,
    commandData: Partial<SqlOrCommand>
  ) => {
    setSQLCommands(prev => ({
      ...prev,
      [type]: prev[type].map(cmd =>
        cmd.id === id
          ? { ...cmd, ...commandData, updatedAt: new Date().toISOString() }
          : cmd
      )
    }));
  };

  const deleteSQLCommand = (type: SQLCommandType, id: string) => {
    // Clear selection if this SQL command-stream was selected
    if (type === 'sql' && selectedSQLCommands.sql === id) {
      clearSQLSelection();
    } else if (type === 'command' && selectedSQLCommands.command === id) {
      clearCommandSelection();
    }

    setSQLCommands(prev => ({
      ...prev,
      [type]: prev[type].filter(cmd => cmd.id !== id)
    }));
  };

  const getSQLCommand = (id: string): SqlOrCommand | undefined => {
    // Search in both SQL and command-stream types
    for (const type of ['sql', 'command'] as const) {
      const cmd = sqlCommands[type].find(c => c.id === id);
      if (cmd) return cmd;
    }
    return undefined;
  };

  // Export/Import functionality
  const exportSingleSQLCommand = (type: SQLCommandType, id: string): string => {
    const command = sqlCommands[type].find(cmd => cmd.id === id);
    if (!command) return '';

    // Create a copy without id and timestamps
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, createdAt: __, updatedAt: ___, ...exportData } = command;
    return JSON.stringify(exportData, null, 2);
  };

  const exportAllSQLCommands = (type: SQLCommandType): string => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const commandsData = sqlCommands[type].map(({ id, createdAt, updatedAt, ...rest }) => rest);
    return JSON.stringify(commandsData, null, 2);
  };

  const importSingleSQLCommand = (
    type: SQLCommandType,
    data: Partial<SqlOrCommand>
  ) => {
    addSQLCommand(type, data);
  };

  const importAllSQLCommands = (
    type: SQLCommandType,
    data: Partial<SqlOrCommand>[]
  ) => {
    // const now = new Date().toISOString();

    data.forEach(item => {
      addSQLCommand(type, item);
    });
  };

  return (
    <SQLCommandContext.Provider
      value={{
        sqlCommands,
        selectedType,
        setSelectedType,
        addSQLCommand,
        updateSQLCommand,
        deleteSQLCommand,
        getSQLCommand,
        selectedSQLCommands,
        selectSQL,
        selectCommand,
        clearSQLSelection,
        clearCommandSelection,
        getSelectedSQL,
        getSelectedCommand,
        exportSingleSQLCommand,
        exportAllSQLCommands,
        importSingleSQLCommand,
        importAllSQLCommands
      }}
    >
      {children}
    </SQLCommandContext.Provider>
  );
}; 