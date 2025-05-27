import { executeCommand, mockExecuteCommand } from "@/api/command-ssh";
import { Button } from "@/components/shadcn/components/ui/button";
import { DialogFooter, DialogHeader } from "@/components/shadcn/components/ui/dialog";
import { ScrollArea } from "@/components/shadcn/components/ui/scroll-area";
import { useCommandConfigContext } from "@/context/CommandStreamContext";
import { CommandExecuteResult, CommandState, CommandStream, runCommand, Status } from "@/types/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@shadcn/components/ui/dialog";
import { useRef, useState } from "react";
import { CommandDetail, CommandDetailRef } from "./CommandDetail";
import { useTranslation } from "react-i18next";

import GlobalControlToolBar from "./GlobalControlToolBar";
import { replacePlaceholders } from "./utils";
import { useConnectionContext } from "@/context/ConnectionContext";
import { isEmptyOrInvalidArray } from "@/lib/utils";
import { ConnectionInfo } from "@/types/connection";

interface CommandStreamControlPanelProps {
  commandStreamIndex: number;
}

export default function CommandStreamControlPanel({ commandStreamIndex }: CommandStreamControlPanelProps) {
  const { t } = useTranslation();
  const { commandStreams, commandStatesArray, updateCommandStatesAt } = useCommandConfigContext();
  const {
    selectedConnections,
    getSelectedServer,
    getSelectedDatabase,
    selectServer,
    selectDatabase
  } = useConnectionContext();

  const commandStream = commandStreams[commandStreamIndex];
  const commandStates = commandStatesArray[commandStreamIndex];
  // Get the selected server and database for display
  const selectedServer = getSelectedServer();
  const selectedDatabase = getSelectedDatabase();

  const updateCommandStates = (index: number, commandStates: CommandState[], newCommandState: CommandState) => {
    const newCommandStates = [...commandStates];
    newCommandStates[index] = newCommandState;
    updateCommandStatesAt(commandStreamIndex, newCommandStates);
  };

  // global-related states
  const [isGlobalRunning, setIsGlobalRunning] = useState(false);
  const [requireConfirmation, setRequireConfirmation] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const commandDetailRefs = useRef<Array<CommandDetailRef | null>>(
    Array.from({ length: commandStream?.commandList.length }, () => null)
  );
  const [currentExecuteIndex, setCurrentExecuteIndex] = useState(0);

  const getReplacedCommandString = (commandStreams: CommandStream[],
                                    commandStates: CommandState[], index: number, selectedServer?: ConnectionInfo,
                                    selectedDatabase?: ConnectionInfo) => {
    if (!commandStream || !commandStates) return;
    return replacePlaceholders(commandStream.commandList[index],
      commandStreams[commandStreamIndex]?.placeholderConfigs[0]?.commandStreamPlaceholderValues[index],
      (index > 0 ? commandStates[index - 1].output : undefined), selectedServer, selectedDatabase
    );
  };

  const getPreviewCommandResult = (commandStates: CommandState[], index: number) => {
    if (index === 0) return;
    return commandStates[index - 1]?.output;
  };

  // execute command-stream
  const handleRun = (index: number): runCommand => {
    return (commandToRun: string) => {
      // Check connection requirements before executing
      if (!validateConnectionRequirements(index)) {
        return { output: t('commandStream.connectionValidationFailed'), state: Status.Failed };
      }

      const currentCommandState = commandStates[index];
      currentCommandState.state = Status.Running;
      updateCommandStates(index, commandStates, currentCommandState);

      // Get server connection info if available
      const serverConnection = getSelectedServer();
      const connectionInfo = serverConnection ? {
        host: serverConnection.ip,
        port: serverConnection.port,
        username: serverConnection.username,
        password: serverConnection.password
      } : undefined;

      executeCommand(commandToRun, connectionInfo)
        .then((result: CommandExecuteResult) => {
          currentCommandState.output = result.output;
          if (result.success) {
            currentCommandState.state = Status.Success;
          } else {
            currentCommandState.state = Status.Failed;
          }
        })
        .catch((error) => {
          currentCommandState.output = error instanceof Error ? error.message : t('commandStream.unexpectedError');
          currentCommandState.state = Status.Failed;
        })
        .finally(() => {
          updateCommandStates(index, commandStates, currentCommandState);
        });
      return currentCommandState;
    };
  };

  // Validate connection requirements for a specific command-stream
  const validateConnectionRequirements = (commandIdx: number): boolean => {
    const placeholders = commandStream.placeholderConfigs[0]?.commandStreamPlaceholderValues[commandIdx] || [];
    const needsDatabase = placeholders.some(p => p.type === "DatabaseInfo");
    if (!selectedConnections.server) {
      setError(t('commandStream.selectServer'));
      return false;
    }
    if (needsDatabase && !selectedConnections.database) {
      setError(t('commandStream.selectDatabase'));
      return false;
    }
    return true;
  };

  const runAllCommands = async (startIndex: number = 0) => {
    // Reset error state
    setError(null);

    const needsDatabase = commandStream.commandList.some(cmd => {
      const cmdIndex = commandStream.commandList.indexOf(cmd);
      const placeholders = commandStream.placeholderConfigs[0].commandStreamPlaceholderValues[cmdIndex] || [];
      return placeholders.some(p => p.type === "DatabaseInfo");
    });

    // Check if required connections are selected
    if (!selectedConnections.server) {
      setError(t('commandStream.selectServer'));
      return;
    }

    if (needsDatabase && !selectedConnections.database) {
      setError(t('commandStream.selectDatabase'));
      return;
    }

    // Validate the completeness of those placeholders
    let completenessValid = true;
    for (let i = startIndex; i < commandStream.commandList.length; i++) {
      const { hasInvalid } = commandDetailRefs.current[i]!.validatePlaceholders();
      if (hasInvalid) completenessValid = false;
    }
    if (!completenessValid) {
      setError(t('commandStream.fillParameters'));
      return;
    }

    // run each command-stream and check its result
    if (!commandStream?.commandList.length) return;
    setIsGlobalRunning(true);

    let currentCommandStates = commandStates;
    for (let i = startIndex; i < commandStream.commandList.length; i++) {
      // Update the current command-stream index
      setCurrentExecuteIndex(i);
      // Check if we should ask for confirmation before running the next command-stream
      if (requireConfirmation && i < commandStream.commandList.length) {
        const confirmed = await new Promise<boolean>((resolve) => {
          resolveRef.current = resolve;
          setShowConfirmDialog(true);
        });
        if (!confirmed) {
          break;
        } else if (i === startIndex) {
          // before start running all command, reset commandStatus of this command stream to Idle
          currentCommandStates = Array.from({ length: commandStream?.commandList.length }, () => ({
            state: Status.Idle,
            output: ""
          }));
        }
      }

      // run command-stream
      const currentPlaceholderConfig = commandStreams[commandStreamIndex].placeholderConfigs[0];
      const command = commandStream.commandList[i];
      const currentCommandState = currentCommandStates[i];
      const realCommand = replacePlaceholders(
        command,
        currentPlaceholderConfig.commandStreamPlaceholderValues[i],
        getPreviewCommandResult(commandStates, i),
        selectedServer,
        selectedDatabase
      );
      try {
        // Get server connection info if available for the real execution
        /*const serverConnection = getSelectedServer();
        const connectionInfo = serverConnection ? {
          host: serverConnection.ip,
          port: serverConnection.port,
          username: serverConnection.username,
          password: serverConnection.password
        } : undefined;

        // Use the actual executeCommand with connection info
        const result = await executeCommand(realCommand, connectionInfo);*/

        // For testing, still using mockExecuteCommand
        const result = await mockExecuteCommand(realCommand);

        currentCommandState.output = result.output;
        if (result.success) {
          currentCommandState.state = Status.Success;

          // Validate against check rules
          const commandDetailRef = commandDetailRefs.current[i];
          if (commandDetailRef) {
            const { hasFailed } = commandDetailRef.validateCheckRules(result.output);

            // If check rules fail, update the state accordingly
            if (hasFailed) {
              currentCommandState.state = Status.CheckRuleFailed;
              // Update UI
              updateCommandStates(i, currentCommandStates, currentCommandState);

              // Stop execution if check rules fail
              setIsGlobalRunning(false);
              setError(`Command "${command.name}" did not pass validation rules.`);
              break;
            }
          }
        } else {
          currentCommandState.state = Status.Failed;
          setIsGlobalRunning(false);
          setError(`Command "${command.name}" failed to execute.`);
          break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        currentCommandState.output = errorMessage;
        currentCommandState.state = Status.Failed;
        setIsGlobalRunning(false);
        setError(errorMessage || "An unexpected error occurred.");
        break;
      } finally {
        updateCommandStates(i, currentCommandStates, currentCommandState);
      }
    }
    setIsGlobalRunning(false);
    setShowConfirmDialog(false);
  };

  const handleConfirm = (confirmed: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(confirmed);
      resolveRef.current = null;
    }
    setShowConfirmDialog(false);
  };

  // Add handlers for server and database changes
  const handleServerChange = (serverId: string) => {
    selectServer(serverId);
    setError(null);
  };
  const handleDatabaseChange = (databaseId: string) => {
    selectDatabase(databaseId);
    setError(null);
  };

  return (
    <>
      {/* show all the commands */}
      <div className="flex flex-col relative">
        {/* toolbar of the running command-stream stream-moved to the top and made sticky */}
        <div className="sticky top-0 z-10 p-2 bg-white shadow-sm">
          <GlobalControlToolBar
            isRunning={isGlobalRunning}
            onRun={runAllCommands.bind(null, 0)}
            requireConfirmation={requireConfirmation}
            setRequireConfirmation={setRequireConfirmation}
            commandStreamIndex={commandStreamIndex}
            commandStream={commandStream}
            onServerChange={handleServerChange}
            onDatabaseChange={handleDatabaseChange}
          />

          {/* Error message display */}
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>
        <ScrollArea>
          <div className="space-y-4 p-4">
            {commandStream?.commandList.map((_, index) => (
              <CommandDetail
                key={index}
                commandStreamIndex={commandStreamIndex}
                commandIndex={index}
                status={commandStates[index].state}
                result={commandStates[index].output}
                onRun={handleRun(index)}
                ref={(el) => {
                  commandDetailRefs.current[index] = el;
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* confirmation dialog */}
      {!isEmptyOrInvalidArray(commandStream?.commandList) && (
        <Dialog open={showConfirmDialog} onOpenChange={(open) => {
          if (!open) handleConfirm(false);
          setShowConfirmDialog(open);
        }}>
          <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()}
                         aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{t('commandStream.confirmContinue')}</DialogTitle>
              <DialogDescription asChild>
                <div>
                  <div>
                    {t('commandStream.confirmMessage')}
                  </div>
                  <div>
                    {getReplacedCommandString(commandStreams,
                      commandStates, currentExecuteIndex, selectedServer,
                      selectedDatabase)}
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>

            {/* Connection information section */}
            <div className="mt-4 space-y-3">
              {/* Previous command-stream result section */}
              {currentExecuteIndex > 0 && (
                <div className="mt-2 border rounded-md">
                  <div className="bg-gray-100 px-3 py-1.5 text-sm font-medium border-b">
                    {t('commandStream.previousCommandResult')}
                  </div>
                  <div
                    className="p-3 bg-white text-sm max-h-[200px] overflow-auto font-mono text-gray-700 whitespace-pre-wrap">
                    {getPreviewCommandResult(commandStates, currentExecuteIndex)}
                  </div>
                </div>
              )}

              {selectedServer && (
                <div className="p-2 bg-green-50 rounded-md">
                  <p className="text-sm font-medium">Server: {selectedServer.name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedServer.ip}:{selectedServer.port} (User: {selectedServer.username})
                  </p>
                </div>
              )}

              {selectedDatabase && (
                <div className="p-2 bg-blue-50 rounded-md">
                  <p className="text-sm font-medium">Database: {selectedDatabase.name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedDatabase.ip}:{selectedDatabase.port} (User: {selectedDatabase.username})
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="">
              <Button variant="outline" onClick={() => handleConfirm(false)}>{t('commandStream.no')}</Button>
              <Button onClick={() => handleConfirm(true)}>{t('commandStream.yes')}</Button>
            </DialogFooter>
            <DialogDescription/>
          </DialogContent>
        </Dialog>)}
    </>
  );
}
