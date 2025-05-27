import { ipcMain } from "electron";
import { Client } from "ssh2";
import { exec } from "child_process";

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
      const conn = new Client();

      const commandExecuteResult: CommandExecuteResult = {
        output: "",
        success: true,
      };

      // Default connection information (used for testing if no connectionInfo is provided)
      const defaultConnection: SSHConnectionInfo = {
        host: "127.0.0.1",
        port: 2222,
        username: "root",
        password: "password",
      };

      // Use provided connection info or fall back to default
      const sshConfig = connectionInfo || defaultConnection;

      conn
        .on("error", (err) => {
          console.error("SSH连接失败", err);
          commandExecuteResult.output = "SSH连接失败:" + err.message;
          commandExecuteResult.success = false;
          resolve(commandExecuteResult);
        })
        .on("end", () => {
          console.log("SSH连接已断开");
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
                console.log("STDOUT: " + chunk.toString());
                commandExecuteResult.output += chunk.toString();
              })
              .stderr.on("data", (chunk: Buffer) => {
              commandExecuteResult.success = false;
              console.log("STDERR: " + chunk.toString());
              commandExecuteResult.output += chunk.toString();
            });
          });
        })
        .connect({
          host: sshConfig.host,
          port: typeof sshConfig.port === 'string' ? parseInt(sshConfig.port, 10) : sshConfig.port,
          username: sshConfig.username,
          password: sshConfig.password,
        });
    });
  });
}
