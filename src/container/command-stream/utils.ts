import { CheckRule, Command, CommandStream, Placeholder, PlaceholderType } from "@/types/command";
import { ConnectionInfo } from "@/types/connection";

export const replacePlaceholders = (
  command: Command,
  placeholders: Placeholder[],
  formerResult?: string,
  serverInformation?: ConnectionInfo,
  databaseInformation?: ConnectionInfo
) => {
  if (!placeholders) return command.commandStr;
  let afterReplace = command.commandStr;

  command.placeholderKeys.forEach((key, index) => {
    const placeholder = placeholders[index];
    // Handle different placeholder types
    if (placeholder.type === PlaceholderType.Plain && placeholder?.value) {
      afterReplace = afterReplace.replace(`\${${key}}`, placeholder.value);
    } else if (placeholder.type === PlaceholderType.FormerOutput && formerResult) {
      afterReplace = afterReplace.replace(`\${${key}}`, formerResult);
    } else if (placeholder.type === PlaceholderType.DatabaseInfo && databaseInformation) {
      const fieldValue = databaseInformation[placeholder.value as keyof ConnectionInfo];
      // Use the field indicated by placeholder.value
      if (placeholder.value && fieldValue) {
        afterReplace = afterReplace.replace(`\${${key}}`, fieldValue);
      }
    } else if (placeholder.type === PlaceholderType.ServerInfo && serverInformation) {
      const fieldValue = serverInformation[placeholder.value as keyof ConnectionInfo];
      // Use the field indicated by placeholder.value
      if (placeholder.value && fieldValue) {
        afterReplace = afterReplace.replace(`\${${key}}`, fieldValue);
      }
    }
  });

  return afterReplace;
};

export function copyAndUpdateCommandStream(
  originalConfig: CommandStream[],
  updatedStream: CommandStream
): CommandStream[] {
  const newConfig = [...originalConfig];
  const index = newConfig.findIndex((stream) => stream.name === updatedStream.name);
  if (index !== -1) {
    newConfig[index] = updatedStream;
  } else {
    newConfig.push(updatedStream);
  }
  return newConfig;
}

export function copyAndUpdateCommand(
  originalConfig: CommandStream[],
  commandStreamName: string,
  command: Command
): CommandStream[] {
  const newConfig = [...originalConfig];
  const index = newConfig.findIndex((stream) => stream.name === commandStreamName);
  if (index !== -1) {
    const commandIndex = newConfig[index].commandList.findIndex((cmd) => cmd.name === command.name);
    if (commandIndex !== -1) {
      newConfig[index].commandList[commandIndex] = command;
    } else {
      newConfig[index].commandList.push(command);
    }
  }
  return newConfig;
}

export function copyAndUpdatePlaceholderValues(
  originalConfig: CommandStream[],
  commandStreamIndex: number,
  commandIndex: number,
  configIndex: number,
  placeholderIndex: number,
  placeholderType: PlaceholderType | null,
  placeholderValue: string | null
): CommandStream[] {
  const newConfig = [...originalConfig];
  const commandStream = newConfig[commandStreamIndex];
  if (commandStream) {
    const command = commandStream.commandList[commandIndex];
    const currentPlaceholderConfigs = commandStream.placeholderConfigs[configIndex];
    if (command && currentPlaceholderConfigs) {
      if (placeholderType) {
        currentPlaceholderConfigs.commandStreamPlaceholderValues[commandIndex][placeholderIndex].type = placeholderType;
      }
      if (placeholderValue) {
        currentPlaceholderConfigs.commandStreamPlaceholderValues[commandIndex][placeholderIndex].value =
          placeholderValue;
      }
    }
  }
  return newConfig;
}

export function copyAndUpdatePlaceholderArray(
  originalConfig: CommandStream[],
  commandStreamIndex: number,
  commandIndex: number,
  configIndex: number,
  placeholders: Placeholder[]
): CommandStream[] {
  const newConfig = [...originalConfig];
  const commandStream = newConfig[commandStreamIndex];
  if (commandStream) {
    const command = commandStream.commandList[commandIndex];
    const currentPlaceholderConfigs = commandStream.placeholderConfigs[configIndex];
    if (command && currentPlaceholderConfigs) {
      currentPlaceholderConfigs.commandStreamPlaceholderValues[commandIndex] = placeholders;
    }
  }
  return newConfig;
}

export function copyAndUpdateCheckRulerArray(
  originalConfig: CommandStream[],
  commandStreamIndex: number,
  commandIndex: number,
  configIndex: number,
  CheckRules: CheckRule[]
): CommandStream[] {
  const newConfig = [...originalConfig];
  const commandStream = newConfig[commandStreamIndex];
  if (commandStream) {
    const command = commandStream.commandList[commandIndex];
    const currentPlaceholderConfigs = commandStream.checkRuleConfigs[configIndex];
    if (command && currentPlaceholderConfigs) {
      if (
        currentPlaceholderConfigs.commandStreamCheckRule &&
        currentPlaceholderConfigs.commandStreamCheckRule.length !== commandStream.commandList.length
      ) {
        currentPlaceholderConfigs.commandStreamCheckRule[commandIndex] = CheckRules;
      } else {
        currentPlaceholderConfigs.commandStreamCheckRule = [...Array(commandStream.commandList.length).fill(null)];
        currentPlaceholderConfigs.commandStreamCheckRule[commandIndex] = CheckRules;
      }
    }
  }
  return newConfig;
}

export const isPlaceholderValid = (
  type: PlaceholderType,
  value: string,
  commandIndex: number
) => {
  if (type === PlaceholderType.Plain) {
    return value !== "";
  }
  if (type === PlaceholderType.FormerOutput) {
    const numValue = +value;
    return !isNaN(numValue) && numValue < commandIndex;
  }
  if (type === PlaceholderType.DatabaseInfo || type === PlaceholderType.ServerInfo) {
    // Just check if a field is selected
    return value !== "";
  }
  return false;
};
