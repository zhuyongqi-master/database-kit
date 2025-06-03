import { CheckRule, Command, CommandStream, Placeholder, PlaceholderType } from "@/types/command";
import { ConnectionInfo } from "@/types/connection";

export const replacePlaceholders = (
  command: Command,
  placeholders: Placeholder[],
  formerResult?: string,
  serverInformation?: ConnectionInfo,
  databaseInformation?: ConnectionInfo
) => {
  if (!placeholders) return command?.commandStr ?? '';
  let afterReplace = command.commandStr;

  command.placeholderKeys.forEach((key, index) => {
    const placeholder = placeholders[index];
    // Handle different placeholder types
    if (placeholder.type === PlaceholderType.Plain && placeholder?.value) {
      afterReplace = afterReplace.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), placeholder.value);
    } else if (placeholder.type === PlaceholderType.FormerOutput && formerResult) {
      afterReplace = afterReplace.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), formerResult);
    } else if (placeholder.type === PlaceholderType.DatabaseInfo && databaseInformation) {
      const fieldValue = databaseInformation[placeholder.value as keyof ConnectionInfo];
      // Use the field indicated by placeholder.value
      if (placeholder.value && fieldValue) {
        afterReplace = afterReplace.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), fieldValue);
      }
    } else if (placeholder.type === PlaceholderType.ServerInfo && serverInformation) {
      const fieldValue = serverInformation[placeholder.value as keyof ConnectionInfo];
      // Use the field indicated by placeholder.value
      if (placeholder.value && fieldValue) {
        afterReplace = afterReplace.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), fieldValue);
      }
    }
  });

  return afterReplace;
};

export function parsePlaceholder(command: Command): string[] {
  const placeholderRegex = /\${([^}]+)}/g;
  let match;
  const placeholders = new Set<string>();
  while ((match = placeholderRegex.exec(command.commandStr)) !== null) {
    placeholders.add(match[1]);
  }
  return Array.from(placeholders);
}

export function parsePlaceholderAndType(commandStream: CommandStream, commandIndex: number) {
  const command = commandStream.commandList[commandIndex];
  const placeholderRegex = /\${([^}]+)}/g;
  let match;
  const placeholders = new Set<string>();
  while ((match = placeholderRegex.exec(command.commandStr)) !== null) {
    placeholders.add(match[1]);
  }
  const previousPlaceholderKeys = command.placeholderKeys;
  const previousPlaceholderValues = commandStream.placeholderConfigs[0].commandStreamPlaceholderValues[commandIndex];
  command.placeholderKeys = Array.from(placeholders);
  commandStream.placeholderConfigs[0].commandStreamPlaceholderValues[commandIndex] = Array.from(placeholders).map(
    (placeholder) => {
      // Reuse existing placeholder value if it exists in the previous config
      const existingPlaceholderKeyIndex = previousPlaceholderKeys?.findIndex((key) => key === placeholder) ?? -1;
      if (existingPlaceholderKeyIndex != -1) {
        return {
          type: previousPlaceholderValues[existingPlaceholderKeyIndex].type,
          value: previousPlaceholderValues[existingPlaceholderKeyIndex].value
        };
      }

      return {
        type: PlaceholderType.Plain,
        value: ""
      };
    }
  );
}

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
    if (!currentPlaceholderConfigs) {
      commandStream.placeholderConfigs.push({
        name: "default",
        commandStreamPlaceholderValues: []
      });
    }
    if (command) {
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
    if (!command) return newConfig;
    const currentCheckRuleConfigs = commandStream.checkRuleConfigs[configIndex];
    if (!currentCheckRuleConfigs) {
      commandStream.checkRuleConfigs.push({
        name: "default",
        commandStreamCheckRule: []
      });
    }
    if (currentCheckRuleConfigs.commandStreamCheckRule) {
      currentCheckRuleConfigs.commandStreamCheckRule[commandIndex] = CheckRules;
    } else {
      currentCheckRuleConfigs.commandStreamCheckRule = [...Array(commandStream.commandList.length).fill(null)];
      currentCheckRuleConfigs.commandStreamCheckRule[commandIndex] = CheckRules;
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
