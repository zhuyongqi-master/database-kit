import { CommandExecuteResult } from "@/types/command";
import { DBConfigItem, ParsedConfig } from "@/types/db-config";
import { ConnectionInfo } from "@/types/connection";
import { executeCommand } from "./command-ssh";

interface SSHConnectionInfo {
  host: string;
  port: string | number;
  username: string;
  password: string;
}

// Convert ConnectionInfo to the format needed for SSH connection
function mapConnectionToSSH(connection: ConnectionInfo | Pick<ConnectionInfo, "ip" | "port" | "username" | "password">): SSHConnectionInfo {
  return {
    host: connection.ip,
    port: connection.port,
    username: connection.username,
    password: connection.password,
  };
}

// Execute a local command-stream without SSH
async function executeLocalCommand(command: string): Promise<CommandExecuteResult> {
  return window.ipcRenderer.invoke("execute-local-command-stream", command);
}

export async function fetchConfigFile(
  filePath: string,
  connectionInfo: ConnectionInfo | Pick<ConnectionInfo, "ip" | "port" | "username" | "password">
): Promise<CommandExecuteResult> {
  const command = `cat ${filePath}`;
  return executeCommand(command, mapConnectionToSSH(connectionInfo));
}

// Fetch a local file (for testing)
export async function fetchLocalConfigFile(
  filePath: string
): Promise<CommandExecuteResult> {
  const command = `cat ${filePath}`;
  return executeLocalCommand(command);
}

export function parseConfigFile(content: string): ParsedConfig {
  const lines = content.split('\n');
  const items: DBConfigItem[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Skip empty lines and comment-only lines
    if (line.trim() === '' || line.trim().startsWith('#')) {
      return;
    }

    // Extract key-value by splitting on the first '=' sign
    const equalSignIndex = line.indexOf('=');
    if (equalSignIndex > 0) {
      // Extract key and value, handling potential comments
      let fullLine = line;
      // let commentPart = '';

      // Split if there's a comment in the line
      const commentIndex = line.indexOf('#');
      if (commentIndex > equalSignIndex) {
        fullLine = line.substring(0, commentIndex).trim();
        // commentPart = line.substring(commentIndex);
      }

      const key = fullLine.substring(0, equalSignIndex).trim();
      const value = fullLine.substring(equalSignIndex + 1).trim();

      if (key) {
        items.push({
          key,
          value,
          originalValue: value,
          lineNumber,
          originalContent: line,
          isModified: false
        });
      }
    }
  });

  return {
    items,
    originalContent: content
  };
}

// Function to create a backup of the config file
export async function backupConfigFile(
  filePath: string,
  connectionInfo: ConnectionInfo
): Promise<CommandExecuteResult> {
  const timestamp = new Date().getTime();
  const backupCmd = `cp ${filePath} ${filePath}.backup.${timestamp}`;
  return executeCommand(backupCmd, mapConnectionToSSH(connectionInfo));
}

// Function to create a backup of a local config file
export async function backupLocalConfigFile(
  filePath: string
): Promise<CommandExecuteResult> {
  const timestamp = new Date().getTime();
  const backupCmd = `cp ${filePath} ${filePath}.backup.${timestamp}`;
  return executeLocalCommand(backupCmd);
}

export async function updateConfigFile(
  filePath: string,
  modifiedItems: DBConfigItem[],
  connectionInfo: ConnectionInfo
): Promise<CommandExecuteResult> {
  const sshConnection = mapConnectionToSSH(connectionInfo);

  // Process each modification one by one
  for (const item of modifiedItems) {
    // 1. Check if the line is still as expected using sed
    const checkCmd = `sed -n '${item.lineNumber}p' ${filePath}`;
    const checkResult = await executeCommand(checkCmd, sshConnection);

    if (!checkResult.success) {
      return checkResult;
    }

    if (checkResult.output.trim() !== item.originalContent.trim()) {
      return {
        success: false,
        output: `Line ${item.lineNumber} has changed since it was loaded. Current content: ${checkResult.output}`
      };
    }

    // 2. Replace the line directly using sed
    // Escape single quotes in the replacement string
    const escapedValue = `${item.key} = ${item.value}`.replace(/'/g, "'\\''");
    const updateCmd = `sed -i '${item.lineNumber}s/.*/${escapedValue}/' ${filePath}`;

    const updateResult = await executeCommand(updateCmd, sshConnection);
    if (!updateResult.success) {
      return {
        success: false,
        output: `Failed to update line ${item.lineNumber}: ${updateResult.output}`
      };
    }
  }

  return {
    success: true,
    output: `Successfully updated ${modifiedItems.length} configuration entries.`
  };
}

export async function updateLocalConfigFile(
  filePath: string,
  modifiedItems: DBConfigItem[]
): Promise<CommandExecuteResult> {
  // Get platform information from Electron instead of navigator.platform
  const platform = await window.ipcRenderer.invoke("get-platform");
  const isWindows = platform === 'win32';

  // Process each modification one by one
  for (const item of modifiedItems) {
    let checkCmd, updateCmd;

    if (isWindows) {
      // Windows: Use PowerShell for line checks and replacements
      // Get specific line (0-indexed in PowerShell)
      checkCmd = `powershell -Command "(Get-Content '${filePath}')[${item.lineNumber - 1}]"`;

      // Prepare the replacement value with proper escaping for PowerShell
      const lineIndex = item.lineNumber - 1;
      const escapedValue = `${item.key} = ${item.value}`.replace(/"/g, '\\"');

      // Use PowerShell to replace the line
      updateCmd = `powershell -Command "$content = Get-Content '${filePath}'; $content[${lineIndex}] = '${escapedValue}'; $content | Set-Content '${filePath}'"`;
    } else {
      // Unix/Linux/macOS: Use sed
      // Get specific line
      checkCmd = `sed -n '${item.lineNumber}p' ${filePath}`;

      // Escape single quotes in the replacement string
      const escapedValue = `${item.key} = ${item.value}`.replace(/'/g, "'\\''");

      // Replace the line
      // On macOS, sed requires an empty string after -i
      const sedInPlace = platform === 'darwin' ? "-i ''" : "-i";
      updateCmd = `sed ${sedInPlace} '${item.lineNumber}s/.*/${escapedValue}/' ${filePath}`;
    }

    // 1. Check if the line is still as expected
    const checkResult = await executeLocalCommand(checkCmd);
    if (!checkResult.success) {
      return checkResult;
    }

    if (checkResult.output.trim() !== item.originalContent.trim()) {
      return {
        success: false,
        output: `Line ${item.lineNumber} has changed since it was loaded. Current content: ${checkResult.output}`
      };
    }

    // 2. Replace the line directly
    const updateResult = await executeLocalCommand(updateCmd);
    if (!updateResult.success) {
      return {
        success: false,
        output: `Failed to update line ${item.lineNumber}: ${updateResult.output}`
      };
    }
  }

  return {
    success: true,
    output: `Successfully updated ${modifiedItems.length} configuration entries.`
  };
}