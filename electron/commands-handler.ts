import { ipcMain } from "electron";
import { exec } from "child_process";
import { Client as ClientType, ClientChannel } from "ssh2";
import { Client } from "./ssh2-wrapper.cjs";

interface CommandExecuteResult {
  output: string;
  success: boolean;
}

interface SSHConnectionInfo {
  host: string;
  port: string | number;
  username: string;
  password: string;
}

// Connection pool for reusing SSH connections
const connectionPool = new Map<string, { conn: ClientType; shell?: ClientChannel; timeout: NodeJS.Timeout }>();
const CONNECTION_TIMEOUT = 300000; // 30 seconds

function getConnectionKey(connectionInfo: SSHConnectionInfo): string {
  return `${connectionInfo.host}:${connectionInfo.port}:${connectionInfo.username}`;
}

function cleanupConnection(key: string) {
  const poolEntry = connectionPool.get(key);
  if (poolEntry) {
    clearTimeout(poolEntry.timeout);

    // Close shell if it exists
    if (poolEntry.shell) {
      poolEntry.shell.end();
    }

    poolEntry.conn.end();
    connectionPool.delete(key);
    // console.log(`SSH连接已清理: ${key}`);
  }
}

export function setupIpcHandlers() {

  ipcMain.handle("get-platform", async () => {
    return process.platform;
  });

  ipcMain.handle("execute-local-command-stream", async (_, command) => {
    return new Promise<CommandExecuteResult>((resolve) => {
      const commandExecuteResult: CommandExecuteResult = {
        output: "",
        success: true,
      };

      exec(command, (error, stdout, stderr) => {
        if (error) {
          commandExecuteResult.success = false;
          commandExecuteResult.output = error.message;
          return resolve(commandExecuteResult);
        }

        if (stderr) {
          commandExecuteResult.success = false;
          commandExecuteResult.output = stderr;
          return resolve(commandExecuteResult);
        }

        commandExecuteResult.output = stdout;
        resolve(commandExecuteResult);
      });
    });
  });

  ipcMain.handle("execute-ssh-command-stream", async (_, command, connectionInfo?: SSHConnectionInfo) => {
    return new Promise((resolve, reject) => {
      const conn = new Client() as ClientType;
      const commandExecuteResult: CommandExecuteResult = {
        output: "",
        success: true,
      };

      conn
        .on("error", (err) => {
          // console.error("SSH连接失败", err);
          commandExecuteResult.output = "SSH连接失败:" + err.message;
          commandExecuteResult.success = false;
          resolve(commandExecuteResult);
        })
        .on("end", () => {
          // console.log("SSH连接已断开");
        })
        .on("ready", () => {
          conn.exec(command, (err, stream) => {
            if (err) reject(err);
            stream
              .on("close", () => {
                conn.end();
                resolve(commandExecuteResult);
              })
              .on("data", (chunk: Buffer) => {
                // console.log("STDOUT: " + chunk.toString());
                commandExecuteResult.output += chunk.toString();
              })
              .stderr.on("data", (chunk: Buffer) => {
              commandExecuteResult.success = false;
              // console.log("STDERR: " + chunk.toString());
              commandExecuteResult.output += chunk.toString();
            });
          });
        })
        .connect({
          host: connectionInfo.host,
          port: typeof connectionInfo.port === 'string' ? parseInt(connectionInfo.port, 10) : connectionInfo.port,
          username: connectionInfo.username,
          password: connectionInfo.password,
        });
    });
  });

  ipcMain.handle("execute-ssh-command-batch", async (_, command, connectionInfo?: SSHConnectionInfo, close: boolean = true, uuid?: string) => {
    return new Promise((resolve, reject) => {
      const connectionKey = uuid || getConnectionKey(connectionInfo);
      const commandExecuteResult: CommandExecuteResult = {
        output: "",
        success: true,
      };
      // Check if we have an existing connection
      const existingConnection = connectionPool.get(connectionKey);
      if (existingConnection) {
        // Clear the existing timeout
        clearTimeout(existingConnection.timeout);
        // Execute command on existing connection
        executeCommandOnConnection(existingConnection.conn, command, commandExecuteResult, connectionKey, close, resolve, reject);
      } else {
        // Create a new connection
        const conn = new Client() as ClientType;
        // console.log(`SSH连接已建立: ${connectionKey}`);
        conn
          .on("error", (err) => {
            // console.error("SSH连接失败", err);
            commandExecuteResult.output = "SSH连接失败:" + err.message;
            commandExecuteResult.success = false;
            cleanupConnection(connectionKey);
            resolve(commandExecuteResult);
          })
          .on("end", () => {
            // console.log("SSH连接已断开");
            connectionPool.delete(connectionKey);
          })
          .on("ready", () => {
            executeCommandOnConnection(conn, command, commandExecuteResult, connectionKey, close, resolve, reject);
          })
          .connect({
            host: connectionInfo.host,
            port: typeof connectionInfo.port === 'string' ? parseInt(connectionInfo.port, 10) : connectionInfo.port,
            username: connectionInfo.username,
            password: connectionInfo.password,
          });
      }
    });
  });

  function executeCommandOnConnection(
    conn: ClientType,
    command: string,
    commandExecuteResult: CommandExecuteResult,
    connectionKey: string,
    close: boolean,
    resolve: (value: CommandExecuteResult) => void,
    reject: (reason?: Error) => void
  ) {
    // Check if this connection already has a persistent shell
    const existingConnection = connectionPool.get(connectionKey);
    if (existingConnection && existingConnection.shell) {
      // Use existing shell for persistent state
      executeOnShell(existingConnection.shell, command, commandExecuteResult, connectionKey, close, resolve);
    } else {
      // Create a new shell for persistent state
      conn.shell((err, stream) => {
        if (err) {
          cleanupConnection(connectionKey);
          reject(err);
          return;
        }

        // Store the shell in the connection pool
        const timeout = setTimeout(() => {
          cleanupConnection(connectionKey);
        }, CONNECTION_TIMEOUT);

        connectionPool.set(connectionKey, { conn, shell: stream, timeout });

        executeOnShell(stream, command, commandExecuteResult, connectionKey, close, resolve);
      });
    }
  }

  function executeOnShell(
    shell: ClientChannel,
    command: string,
    commandExecuteResult: CommandExecuteResult,
    connectionKey: string,
    close: boolean,
    resolve: (value: CommandExecuteResult) => void,
  ) {
    let outputBuffer = '';
    let commandFinished = false;

    // Create a unique start and end marker
    const startMarker = `__cmd_start__`;
    const endMarker = `__cmd_end__`;
    const fullCommand = `echo "${startMarker}"; ${command}; echo "${endMarker}"`;
    // const outputBetweenMarkersWithoutAnyInvalidChars = `"; ${command}; echo "`.replace(/\s+/g, '').replace(/[^\x20-\x7E]/g, '');
    // const outputBetweenMarkersWithoutAnyInvalidChars = `"; ${command}; echo "`;

    const dataHandler = (data: Buffer) => {
      const output = data.toString();
      outputBuffer += output;


      // Check if command finished
      const hasError = output.includes('error') || output.includes('-bash');
      const hasEndMarker = output.includes(endMarker);
      if ((hasEndMarker || hasError) && !commandFinished) {
        // Find the start and end markers
        const startIndex = outputBuffer.lastIndexOf(startMarker);
        const endIndex = outputBuffer.lastIndexOf(endMarker);
        if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) return;
        if (hasEndMarker && checkEchoExisted(outputBuffer, endIndex - 11, endIndex)) {
          return;
        }

        commandFinished = true;

        if (hasError) {
          commandExecuteResult.output = outputBuffer.substring(endIndex + endMarker.length);
        }

        if (hasEndMarker) {
          if (startIndex !== -1 && endIndex !== -1) {
            commandExecuteResult.output = outputBuffer.substring(startIndex + startMarker.length, endIndex);
          } else {
            // Fallback: just remove the end marker
            commandExecuteResult.output = outputBuffer;
          }
        }

        // Remove the data handler
        shell.removeListener('data', dataHandler);

        if (close) {
          // Close connection immediately
          cleanupConnection(connectionKey);
        } else {
          // Keep connection alive with timeout
          const existingConnection = connectionPool.get(connectionKey);
          if (existingConnection) {
            clearTimeout(existingConnection.timeout);
            const timeout = setTimeout(() => {
              cleanupConnection(connectionKey);
            }, CONNECTION_TIMEOUT);

            connectionPool.set(connectionKey, { ...existingConnection, timeout });
          }
        }

        resolve(commandExecuteResult);
      }
    };

    shell.on('data', dataHandler);

    shell.on('close', () => {
      if (!commandFinished) {
        cleanupConnection(connectionKey);
        resolve(commandExecuteResult);
      }
    });

    shell.write(fullCommand + '\n');
  }

  function checkEchoExisted(checkString: string, startIndex: number, endIndex: number): boolean {
    if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) return false;
    if (endIndex < `echo "`.length + 1) return false;

    const targetArr = ['e', 'c', 'h', 'o'];
    let searchIndex = targetArr.length - 1;
    let lastLetter = '';
    let hasReplicatedLetter = false;
    // maybe there is a replicated letter
    let i = 0;
    for (i = endIndex - 1; i >= startIndex; i--) {
      if (checkString[i] === '"' || checkString[i] === '\n' || checkString[i] === '\r' || checkString[i] === ' ') continue;
      if (checkString[i] !== targetArr[searchIndex] && checkString[i] !== lastLetter) {
        return false;
      }

      if (checkString[i] === lastLetter) {
        if (!hasReplicatedLetter) {
          hasReplicatedLetter = true;
          continue;
        } else {
          console.log('final')
          return false;
        }
      }

      if (searchIndex === 0) return true;
      lastLetter = targetArr[searchIndex];
      searchIndex--;
    }
    return false;
  }
}
