export interface CommandExecuteResult {
  output: string;
  success: boolean;
}

export interface CommandState {
  output: string | undefined;
  state: Status;
}

export type runCommand = (commandToRun: string) => CommandState;

export enum Status {
  Idle = "idle",
  Running = "running",
  Success = "success",
  Failed = "failed",
  CheckRuleFailed = "checkRuleFailed",
}

export enum PlaceholderType {
  Plain = "Plain",
  FormerOutput = "FormerOutput",
  DatabaseInfo = "DatabaseInfo",
  ServerInfo = "ServerInfo",
}

export enum CheckRuleType {
  StringEqual = "StringEqual",
  Regex = "Regex",
}

export interface CheckRule {
  name: string;
  type: CheckRuleType;
  value: string;
}

export type Placeholder = {
  type: PlaceholderType;
  value: string;
};

export interface PlaceholderConfig {
  name: string;
  /**
   * dimension 1 indicates which command-stream it associated with
   * dimension 2 indicates the placeholder value
   */
  commandStreamPlaceholderValues: Placeholder[][];
}

export interface Command {
  name: string;
  commandStr: string;
  placeholderKeys: string[];
}

export interface CheckRuleConfigs {
  name: string;
  /**
   * dimension 1 indicates which command-stream it associated with
   * dimension 2 indicates the check rule value
   */
  commandStreamCheckRule: CheckRule[][];
}

export interface CommandStream {
  name: string;
  commandList: Command[];
  placeholderConfigs: PlaceholderConfig[];
  checkRuleConfigs: Array<CheckRuleConfigs>;
}
