export type SQLCommandType = 'sql' | 'command';

export type DatabaseType = string;

// SQL type with databaseType
export interface SQLCommandBase {
  id: string;
  name: string;
  content: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// SQL type with databaseType
export interface SQLCommand extends SQLCommandBase {
  databaseType: DatabaseType;
}

// Command type without databaseType
export type Command = SQLCommandBase;

// Union type for both SQL and command-stream
export type SqlOrCommand = SQLCommand | Command;

export interface SQLOrCommandData {
  sql: SQLCommand[];
  command: Command[];
}

// Define the selected SQL / command-stream state
export interface SelectedSQLCommandState {
  sql: string | null;
  command: string | null;
} 