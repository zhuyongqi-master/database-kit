import { Command, CommandState, CommandStream, Placeholder, PlaceholderType, Status } from "@/types/command";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useList } from "react-use";
import { getStoreValue, setStoreValue } from "@/api/electron-store";
import { STORE_KEYS } from "@/types/electron-store";

interface CommandConfigContextProp {
  commandStreams: CommandStream[];
  commandStatesArray: CommandState[][];
  placeholderCompletion: boolean[][][];
  updateCommandStatesAt: (index: number, item: CommandState[]) => void;
  updatePlaceholderCompletionAt: (index: number, item: boolean[][]) => void;
  updateConfig: (commandStreams: CommandStream[]) => void;
  addCommand: (streamIndex: number, afterCommandIndex: number, newCommand: Command) => void;
  deleteCommand: (streamIndex: number, commandIndex: number) => void;
  reorderCommands: (streamIndex: number, oldIndex: number, newIndex: number) => void;
  deleteCommandStream: (streamIndex: number) => void;
}

const CommandConfigContext = createContext<CommandConfigContextProp | undefined>(undefined);

export function CommandStreamProvider({ children }: { children: ReactNode }) {
  const [commandStreams, setCommandStreams] = useState<CommandStream[]>([]);
  const [commandStates, { set: setCommandStates, updateAt: updateCommandStatesAt }] = useList<CommandState[]>([]);
  const [placeholderCompletion, { set: setPlaceholderCompletion, updateAt: updatePlaceholderCompletionAt }] =
    useList<boolean[][]>([]);
  const [, setIsLoading] = useState(true);

  const updateConfig = async (newCommandStreams: CommandStream[]) => {
    // Extract current state data before updating streams
    const oldStreamCount = commandStreams.length;
    const newStreamCount = newCommandStreams.length;

    // Update commandStates to align with commandStreams
    if (newStreamCount > oldStreamCount) {
      // Handle new streams by adding new empty state arrays
      const newCommandStates = [...commandStates];
      for (let i = oldStreamCount; i < newStreamCount; i++) {
        const newStream = newCommandStreams[i];
        newCommandStates.push(
          Array.from(
            { length: newStream.commandList.length },
            (): CommandState => ({
              output: undefined,
              state: Status.Idle,
            })
          )
        );
      }
      setCommandStates(newCommandStates);

      // Update placeholderCompletion for new streams
      const newPlaceholderCompletion = [...placeholderCompletion];
      for (let i = oldStreamCount; i < newStreamCount; i++) {
        const newStream = newCommandStreams[i];
        newPlaceholderCompletion.push(
          newStream.commandList.map((command) => command.placeholderKeys.map(() => true))
        );
      }
      setPlaceholderCompletion(newPlaceholderCompletion);
    } else if (newStreamCount < oldStreamCount) {
      // Handle stream deletion - this case will be managed in handleDeleteCommandStream
      // We don't need to handle it here since the specific delete handler will update
      // commandStates and placeholderCompletion directly
    }

    // Store the updated command-stream streams
    await setStoreValue(STORE_KEYS.COMMAND_STREAMS, newCommandStreams);
    setCommandStreams(newCommandStreams);
  };

  // Load command-stream streams from electron-store on the component mount
  useEffect(() => {
    const loadCommandStreams = async () => {
      try {
        const commandStreams = await getStoreValue(STORE_KEYS.COMMAND_STREAMS);
        setCommandStates(
          commandStreams.map((stream) =>
            Array.from(
              { length: stream.commandList.length },
              (): CommandState => ({
                output: undefined,
                state: Status.Idle,
              })
            )
          )
        );
        setPlaceholderCompletion(
          commandStreams
            .map((stream) => stream.commandList)
            .map((commandList) => commandList.map((command) => command.placeholderKeys.map(() => true)))
        );
        setCommandStreams(commandStreams);
      } catch (error) {
        console.error('Failed to load command-stream streams:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCommandStreams().then();
  }, [setCommandStates, setPlaceholderCompletion]);

  const addCommand = async (streamIndex: number, afterCommandIndex: number, newCommand: Command) => {
    const newCommandStreams = [...commandStreams];

    // Create an empty placeholder values array for the new command-stream
    const emptyPlaceholderValues: Placeholder[] = newCommand.placeholderKeys.map((): Placeholder => ({
      type: PlaceholderType.Plain,
      value: ""
    }));

    // Insert the new command-stream in the command-stream list
    newCommandStreams[streamIndex].commandList.splice(afterCommandIndex + 1, 0, newCommand);

    // Update placeholder configs
    newCommandStreams[streamIndex].placeholderConfigs.forEach(config => {
      config.commandStreamPlaceholderValues.splice(afterCommandIndex + 1, 0, emptyPlaceholderValues);
    });

    // Update check rule configs
    newCommandStreams[streamIndex].checkRuleConfigs.forEach(config => {
      config.commandStreamCheckRule.splice(afterCommandIndex + 1, 0, []);
    });

    // Update command-stream states
    const newCommandStates = [...commandStates];
    newCommandStates[streamIndex].splice(afterCommandIndex + 1, 0, {
      output: undefined,
      state: Status.Idle
    });
    setCommandStates(newCommandStates);

    // Update placeholder completion
    const newPlaceholderCompletion = [...placeholderCompletion];
    newPlaceholderCompletion[streamIndex].splice(afterCommandIndex + 1, 0, newCommand.placeholderKeys.map(() => true));
    setPlaceholderCompletion(newPlaceholderCompletion);

    // should it be here, otherwise cannot find its commandstate while re-render
    await updateConfig(newCommandStreams);
  };

  const deleteCommand = async (streamIndex: number, commandIndex: number) => {
    const newCommandStreams = [...commandStreams];

    // Remove the command-stream from the command-stream list
    newCommandStreams[streamIndex].commandList.splice(commandIndex, 1);

    // Remove corresponding placeholder values
    newCommandStreams[streamIndex].placeholderConfigs.forEach(config => {
      config.commandStreamPlaceholderValues.splice(commandIndex, 1);
    });

    // Remove corresponding check rules
    newCommandStreams[streamIndex].checkRuleConfigs.forEach(config => {
      config.commandStreamCheckRule.splice(commandIndex, 1);
    });

    // Update command-stream states
    const newCommandStates = [...commandStates];
    newCommandStates[streamIndex].splice(commandIndex, 1);
    setCommandStates(newCommandStates);

    // Update placeholder completion
    const newPlaceholderCompletion = [...placeholderCompletion];
    newPlaceholderCompletion[streamIndex].splice(commandIndex, 1);
    setPlaceholderCompletion(newPlaceholderCompletion);

    await updateConfig(newCommandStreams);
  };

  // Function to handle deleting a command-stream stream
  const deleteCommandStream = async (streamIndex: number) => {
    // Create a new array without the stream to delete
    const newCommandStreams = commandStreams.filter((_, index) => index !== streamIndex);

    // Update command-stream states
    const newCommandStates = [...commandStates];
    newCommandStates.splice(streamIndex, 1);
    setCommandStates(newCommandStates);

    // Update placeholder completion
    const newPlaceholderCompletion = [...placeholderCompletion];
    newPlaceholderCompletion.splice(streamIndex, 1);
    setPlaceholderCompletion(newPlaceholderCompletion);

    // Update the config with the new streams
    await updateConfig(newCommandStreams);
  };

  const reorderCommands = async (streamIndex: number, oldIndex: number, newIndex: number) => {
    const newCommandStreams = [...commandStreams];

    // Reorder the command-stream in the command-stream list
    const [movedCommand] = newCommandStreams[streamIndex].commandList.splice(oldIndex, 1);
    newCommandStreams[streamIndex].commandList.splice(newIndex, 0, movedCommand);

    // Reorder placeholder values
    newCommandStreams[streamIndex].placeholderConfigs.forEach(config => {
      const [movedPlaceholders] = config.commandStreamPlaceholderValues.splice(oldIndex, 1);
      config.commandStreamPlaceholderValues.splice(newIndex, 0, movedPlaceholders);
    });

    // Reorder check rules
    newCommandStreams[streamIndex].checkRuleConfigs.forEach(config => {
      const [movedRules] = config.commandStreamCheckRule.splice(oldIndex, 1);
      config.commandStreamCheckRule.splice(newIndex, 0, movedRules);
    });

    await updateConfig(newCommandStreams);

    // Update command-stream states
    const newCommandStates = [...commandStates];
    const [movedState] = newCommandStates[streamIndex].splice(oldIndex, 1);
    newCommandStates[streamIndex].splice(newIndex, 0, movedState);
    setCommandStates(newCommandStates);

    // Update placeholder completion
    const newPlaceholderCompletion = [...placeholderCompletion];
    const [movedCompletion] = newPlaceholderCompletion[streamIndex].splice(oldIndex, 1);
    newPlaceholderCompletion[streamIndex].splice(newIndex, 0, movedCompletion);
    setPlaceholderCompletion(newPlaceholderCompletion);
  };

  return (
    <CommandConfigContext.Provider
      value={{
        commandStreams,
        commandStatesArray: commandStates,
        placeholderCompletion: placeholderCompletion,
        updateCommandStatesAt,
        updatePlaceholderCompletionAt: updatePlaceholderCompletionAt,
        updateConfig,
        addCommand,
        deleteCommand,
        reorderCommands,
        deleteCommandStream
      }}
    >
      {children}
    </CommandConfigContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCommandConfigContext() {
  const context = useContext(CommandConfigContext);
  if (context === undefined) {
    throw new Error("useCommandStream must be used within a CommandStreamProvider");
  }
  return context;
}
