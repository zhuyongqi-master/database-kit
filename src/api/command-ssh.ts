import { CommandExecuteResult } from "@/types/command";

interface SSHConnectionInfo {
  host: string;
  port: string | number;
  username: string;
  password: string;
}

export async function executeCommand(
  commandToRun: string,
  connectionInfo?: SSHConnectionInfo
): Promise<CommandExecuteResult> {
  return window.ipcRenderer.invoke("execute-ssh-command-stream", commandToRun, connectionInfo);
}

export async function mockExecuteCommand(commandToRun: string): Promise<CommandExecuteResult> {
  return new Promise<CommandExecuteResult>((resolve) => {
    setTimeout(() => {
      resolve({
        output: "test of command:" + commandToRun,
        success: true,
      });
    }, 1000);
  });
}
