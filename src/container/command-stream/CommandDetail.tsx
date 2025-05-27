import { Card, CardContent } from "@/components/shadcn/components/ui/card";
import { cn } from "@/components/shadcn/lib/utils";
import { useCommandConfigContext } from "@/context/CommandStreamContext";
import { CheckRule, CheckRuleType, Placeholder, runCommand, Status } from "@/types/command";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";
import { Button } from "@shadcn/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from "@shadcn/components/ui/dialog";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  Code,
  Edit,
  Loader2,
  XCircle
} from "lucide-react";
import React, { useCallback, useEffect, useImperativeHandle, useState } from "react";
import CheckRulesTable from "./CheckRulesTable";
import PlaceholderTable from "./PlaceholderTable";
import {
  copyAndUpdateCheckRulerArray,
  copyAndUpdatePlaceholderArray,
  isPlaceholderValid,
  replacePlaceholders,
} from "./utils";
import { useConnectionContext } from "@/context/ConnectionContext";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@shadcn/components/ui/popover";
import { IconDatabase } from "@tabler/icons-react";
import { ScrollArea } from "@shadcn/components/ui/scroll-area";

interface CommandDetailRef {
  openCollapse: (isOpen: boolean) => void;
  validatePlaceholders: () => {
    hasInvalid: boolean;
    commandPlaceholderCompletion: boolean[];
  };
  validateCheckRules: (output: string) => ValidateResult;
}

interface ValidateResult {
  hasFailed: boolean;
  failedRules: CheckRule[];
}

interface CommandDetailProps {
  commandStreamIndex: number;
  commandIndex: number;
  status: Status;
  result: string | undefined;
  onRun: runCommand;
  ref?: React.Ref<CommandDetailRef>;
}

function CommandDetail({ commandStreamIndex, commandIndex, status, result, onRun, ref }: CommandDetailProps) {
  const { t } = useTranslation();
  const { commandStreams, placeholderCompletion, updatePlaceholderCompletionAt, updateConfig } =
    useCommandConfigContext();
  const { getSelectedServer, getSelectedDatabase, selectedConnections } = useConnectionContext();

  const command = commandStreams[commandStreamIndex].commandList[commandIndex];
  const commandPlaceholderValue =
    commandStreams[commandStreamIndex].placeholderConfigs?.[0]?.commandStreamPlaceholderValues[commandIndex];

  // Get the selected server and database for display
  const selectedServer = getSelectedServer();
  const selectedDatabase = getSelectedDatabase();

  const [isOpen, setIsOpen] = useState(false);
  const [isCheckRulesOpen, setIsCheckRulesOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingCommand, setIsEditingCommand] = useState(false);
  const [editedName, setEditedName] = useState(command.name);
  const [editedCommand, setEditedCommand] = useState(command.commandStr);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [showConfirmRunDialog, setShowConfirmRunDialog] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"server" | "database" | undefined>(undefined);

  // New state variables for check rules
  const [isCheckRulesConfigurable, setIsCheckRulesConfigurable] = useState(true);

  // New state for check rule validation
  const [hasCheckRuleFailures, setHasCheckRuleFailures] = useState(false);
  const [failedRules, setFailedRules] = useState<CheckRule[]>([]);

  function validatePlaceholders() {
    if (!commandPlaceholderValue) {
      return { commandPlaceholderCompletion: [], hasInvalid: false };
    }

    let hasInvalid = false;
    const commandPlaceholderCompletion = commandPlaceholderValue.map((placeholderValue) =>
      isPlaceholderValid(placeholderValue.type, placeholderValue.value, commandIndex)
    );
    commandPlaceholderCompletion.forEach((valid) => {
      if (!valid) {
        hasInvalid = true;
      }
    });
    return { commandPlaceholderCompletion: commandPlaceholderCompletion, hasInvalid };
  }

  // validate when outed and rerender
  const { hasInvalid: hasInvalidPlaceholder } = validatePlaceholders();

  const validateAndUpdatePlaceholders = () => {
    const commandStreamPlaceholderCompletion = placeholderCompletion[commandStreamIndex];
    const { commandPlaceholderCompletion: commandPlaceholderCompletion, hasInvalid } = validatePlaceholders();
    commandStreamPlaceholderCompletion[commandIndex] = commandPlaceholderCompletion;
    updatePlaceholderCompletionAt(commandStreamIndex, commandStreamPlaceholderCompletion);
    return {
      hasInvalid,
      commandPlaceholderCompletion: commandPlaceholderCompletion,
    };
  };

  const toggleCheckRulesConfigurable = () => {
    setIsCheckRulesConfigurable(!isCheckRulesConfigurable);
  };

  // Add a validateCheckRules function
  const validateCheckRules = (output: string): ValidateResult => {
    const checkRules =
      commandStreams[commandStreamIndex].checkRuleConfigs?.[0]?.commandStreamCheckRule[commandIndex] || [];
    const failedRules: CheckRule[] = [];

    checkRules.forEach((rule) => {
      let passed = false;

      if (rule.type === CheckRuleType.StringEqual) {
        passed = output === rule.value;
      } else if (rule.type === CheckRuleType.Regex) {
        try {
          const regex = new RegExp(rule.value);
          passed = regex.test(output);
        } catch (error) {
          console.error(t('commandStream.invalidRegex'), error);
          passed = false;
        }
      }
      if (!passed) {
        failedRules.push(rule);
      }
    });

    const hasFailed = failedRules.length > 0;
    setHasCheckRuleFailures(hasFailed);
    setFailedRules(failedRules);

    return {
      hasFailed,
      failedRules,
    };
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    openCollapse: (open: boolean) => {
      if (!open) {
        setIsOpen(true);
      }
    },
    validatePlaceholders: validateAndUpdatePlaceholders,
    validateCheckRules,
  }));

  const currentPlaceholderConfig = commandStreams[commandStreamIndex].placeholderConfigs[0];
  const realCommand = () => {
    const placeholderValueTypes = currentPlaceholderConfig?.commandStreamPlaceholderValues[commandIndex];
    if (!placeholderValueTypes) {
      return command.commandStr;
    }
    return replacePlaceholders(command, placeholderValueTypes, undefined, selectedServer, selectedDatabase);
  };

  // Check if any placeholders require a database connection
  const requiresDatabaseConnection = useCallback(() => {
    if (!commandPlaceholderValue) return false;
    return commandPlaceholderValue.some((p) => p.type === "DatabaseInfo");
  }, [commandPlaceholderValue]);

  const validateConnectionRequirements = () => {
    let error = null;
    let errorType: "server" | "database" | undefined;

    if (!selectedConnections.server) {
      error = t('commandStream.selectServerFirst');
      errorType = "server";
    } else if (requiresDatabaseConnection() && !selectedConnections.database) {
      error = t('commandStream.selectDatabaseFirst');
      errorType = "database";
    }

    return { isValid: !error, errorType, error };
  };

  const isRunButtonDisabled = status === Status.Running;

  const handleRunConfirmation = () => {
    // Reset error state
    setRunError(null);
    setErrorType(undefined);
    // Validate placeholders
    const { hasInvalid } = validateAndUpdatePlaceholders();
    if (hasInvalid) {
      setRunError(t('commandStream.fillRequiredParams'));
      return;
    }
    // Validate connection requirements
    const { isValid, errorType, error } = validateConnectionRequirements();
    if (!isValid) {
      setRunError(error);
      setErrorType(errorType);
      return;
    }
    // Show command-stream preview dialog
    setShowConfirmRunDialog(true);
  };

  const handleRun = () => {
    // Close confirmation dialog
    setShowConfirmRunDialog(false);

    const commandState = onRun(realCommand());
    if (commandState.state === Status.Failed) return;
    validateCheckRules(commandState.output as string);
  };

  const savePlaceholders = (placeholders: Placeholder[]) => {
    const newConfig = copyAndUpdatePlaceholderArray(commandStreams, commandStreamIndex, commandIndex, 0, placeholders);
    updateConfig(newConfig);
  };

  const saveCheckRules = (checkRules: CheckRule[]) => {
    const newConfig = copyAndUpdateCheckRulerArray(commandStreams, commandStreamIndex, commandIndex, 0, checkRules);
    updateConfig(newConfig);
  };

  const getStatusIcon = () => {
    switch (status) {
      case Status.Success:
        return <CheckCircle className="text-green-500"/>;
      case Status.Running:
        return <Loader2 className="animate-spin text-blue-500"/>;
      case Status.Failed:
        return <XCircle className="text-red-500"/>;
      case Status.CheckRuleFailed:
        return <XCircle className="text-orange-500"/>;
      default:
        return <Circle className="text-gray-300"/>;
    }
  };

  const handleEditName = () => {
    setIsEditingName(true);
  };

  const handleEditCommand = () => {
    setShowCommandDialog(true);
    setIsEditingCommand(true);
  };

  const handleConfirmEdit = (type: "name" | "command") => {
    const newConfig = JSON.parse(JSON.stringify(commandStreams));
    if (type === "name") {
      newConfig[commandStreamIndex].commandList[commandIndex].name = editedName;
      setIsEditingName(false);
    } else {
      newConfig[commandStreamIndex].commandList[commandIndex].commandStr = editedCommand;
      setIsEditingCommand(false);
      setShowCommandDialog(false);
    }
    updateConfig(newConfig);
  };

  const handleCancelEdit = (type: "name" | "command") => {
    if (type === "name") {
      setEditedName(command.name);
      setIsEditingName(false);
    } else {
      setEditedCommand(command.commandStr);
      setIsEditingCommand(false);
      setShowCommandDialog(false);
    }
  };

  const updateCommandPlaceholderCompeletion = (commandPlaceholderCompeletion: boolean[][]) =>
    updatePlaceholderCompletionAt(commandStreamIndex, commandPlaceholderCompeletion);

  // Add a function to get check rule status
  const renderCheckRuleStatus = () => {
    if (!hasCheckRuleFailures || !failedRules.length) return null;

    return (
      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm font-medium text-red-600">Failed check rules:</p>
        <ul className="mt-1 text-xs text-red-500 list-disc pl-4">
          {failedRules.map((rule, idx) => (
            <li key={idx}>
              {rule.name}: Expected {rule.type === CheckRuleType.StringEqual ? "text" : "pattern"} "{rule.value}"
            </li>
          ))}
        </ul>
      </div>
    );
  };

  useEffect(() => {
    if (!runError) return;
    if (errorType === "server" && selectedServer) {
      setRunError(null);
      setErrorType(undefined);
    } else if (errorType === "database" && requiresDatabaseConnection() && selectedDatabase) {
      setRunError(null);
      setErrorType(undefined);
    }
  }, [errorType, requiresDatabaseConnection, runError, selectedDatabase, selectedServer]);

  return (
    <Card className="relative pb-1 overflow-hidden">
      {/* Command Number Badge */}
      <div
        className="absolute top-0 left-0 w-8 h-8 flex items-center justify-center bg-gray-50 border-r border-b border-gray-200 rounded-br text-xs font-medium text-gray-600">
        {commandIndex + 1}
      </div>

      {/* Card Header - Name and Command */}
      <div className="pl-9 pr-2 pt-2 pb-1 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          {isEditingName ? (
            <>
              <input
                type="text"
                value={editedName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedName(e.target.value)}
                className="text-sm flex-grow border rounded px-2 py-1 mr-2"
                autoFocus
              />
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleConfirmEdit("name")} className="h-6 w-6 p-0">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500"/>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleCancelEdit("name")} className="h-6 w-6 p-0">
                  <XCircle className="h-3.5 w-3.5 text-red-500"/>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-medium flex-grow truncate mr-2">{command.name}</div>
              <Button variant="ghost" size="sm" onClick={handleEditName} className="h-6 w-6 p-0 ml-auto">
                <Edit className="h-3.5 w-3.5 text-gray-500"/>
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center justify-between">
          <Dialog open={showCommandDialog} onOpenChange={setShowCommandDialog}>
            <DialogTrigger asChild>
              <div className="flex-grow flex items-center cursor-pointer group">
                <div className="text-xs text-gray-600 flex-grow truncate font-mono">{command.commandStr}</div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                  <Code className="h-3.5 w-3.5 text-gray-500"/>
                </Button>
              </div>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{isEditingCommand ? t('commandStream.editCommand') : t('commandStream.command')}</DialogTitle>
              </DialogHeader>
              {isEditingCommand ? (
                <>
                  <textarea
                    value={editedCommand}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedCommand(e.target.value)}
                    className="w-full font-mono text-sm min-h-[150px] border rounded p-2"
                    placeholder={t('commandStream.enterCommandPlaceholder')}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => handleCancelEdit("command")}>
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={() => handleConfirmEdit("command")}>
                      {t('common.save')}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <div className="bg-gray-50 p-3 rounded-md font-mono text-sm whitespace-pre-wrap break-all">
                    {command.commandStr}
                  </div>
                  <DialogFooter>
                    <Button onClick={() => {
                      setIsEditingCommand(true);
                      setEditedCommand(command.commandStr);
                    }}>
                      {t('common.edit')}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" onClick={handleEditCommand} className="h-6 w-6 p-0">
            <Edit className="h-3.5 w-3.5 text-gray-500"/>
          </Button>
        </div>
      </div>

      <CardContent className="p-3">
        {/* parameters fold */}
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className={cn(
            "border border-slate-200 rounded-sm overflow-hidden",
            hasInvalidPlaceholder ? "border-amber-500" : ""
          )}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex items-center justify-between w-full h-7 px-2 bg-gray-50",
                hasInvalidPlaceholder ? "text-amber-500" : "text-gray-600"
              )}
            >
              <span className="text-xs font-medium">{t('commandStream.parameters')}</span>
              <div className="flex items-center gap-1">
                {hasInvalidPlaceholder && <XCircle className="h-3 w-3 text-amber-500"/>}
                {isOpen ? <ChevronUp className="h-3 w-3"/> : <ChevronDown className="h-3 w-3"/>}
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-2 py-2">
            {hasInvalidPlaceholder && (
              <div className="bg-amber-50 p-1.5 mb-2 rounded text-xs text-amber-600">
                {t('commandStream.pleaseCompleteParams')}
              </div>
            )}
            <PlaceholderTable
              commandStream={commandStreams[commandStreamIndex]}
              commandIndex={commandIndex}
              configIndex={0}
              commandPlaceholderCompletion={placeholderCompletion[commandStreamIndex]}
              updatePlaceholderCompletion={updateCommandPlaceholderCompeletion}
              savePlaceholders={savePlaceholders}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Check Rules fold */}
        <Collapsible
          open={isCheckRulesOpen}
          onOpenChange={setIsCheckRulesOpen}
          className={cn(
            "border border-slate-200 rounded-sm mt-2 overflow-hidden",
            hasCheckRuleFailures ? "border-red-500" : ""
          )}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex items-center justify-between w-full h-7 px-2 bg-gray-50",
                hasCheckRuleFailures ? "text-red-500" : "text-gray-600"
              )}
            >
              <span className="text-xs font-medium">{t('commandStream.checkRules')}</span>
              <div className="flex items-center gap-1">
                {hasCheckRuleFailures && <XCircle className="h-3 w-3 text-red-500"/>}
                {isCheckRulesOpen ? <ChevronUp className="h-3 w-3"/> : <ChevronDown className="h-3 w-3"/>}
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-2 py-2">
            {hasCheckRuleFailures && (
              <div className="bg-red-50 p-1.5 mb-2 rounded text-xs text-red-600">
                {t('commandStream.commandOutputFailed')}
              </div>
            )}
            <CheckRulesTable
              commandStream={commandStreams[commandStreamIndex]}
              commandIndex={commandIndex}
              isCheckRulesConfigurable={isCheckRulesConfigurable}
              toggleCheckRulesConfigurable={toggleCheckRulesConfigurable}
              saveCheckRules={saveCheckRules}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {/* command-stream control bar */}
      <div className="flex justify-end items-center gap-1.5 px-3 py-1.5 border-t bg-gray-50">
        <div className="mr-auto">{getStatusIcon()}</div>

        {/* Display run error if any */}
        {runError && (
          <div className="flex-grow mr-2">
            <div className="flex items-center text-xs text-red-600">
              <AlertTriangle className="h-3 w-3 mr-1"/>
              {runError}
            </div>
          </div>
        )}

        {/* preview button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-xs px-2">
              {t('commandStream.preview')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0 bg-white border shadow-md" align="end" side="top">
            <div className="bg-secondary p-2 rounded-md">
              <h3 className="text-sm font-semibold">{realCommand()}</h3>
            </div>
          </PopoverContent>
        </Popover>
        {/*<TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                {t('commandStream.preview')}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="end" className="w-[300px] p-0">
              <div className="bg-secondary p-2 rounded-md">
                <h3 className="text-sm font-semibold">{realCommand()}</h3>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>*/}

        {/* Run confirmation dialog */}
        <Dialog open={showConfirmRunDialog} onOpenChange={setShowConfirmRunDialog}>
          <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-[500px]"
                         aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{t('commandStream.confirmExecution')}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="mb-4">
                <p className="font-medium text-sm">{t('commandStream.confirmExecutionMessage')}</p>
                <div className="mt-1 text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded border">
                  {realCommand()}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{t('commandStream.serverConnection')}:</p>
                  {selectedServer ? (
                    <div className="mt-1 text-sm bg-green-50 p-2 rounded">
                      <div className="font-medium">{selectedServer.name}</div>
                      <div className="text-xs mt-1">
                        {selectedServer.ip}:{selectedServer.port} (User: {selectedServer.username})
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-red-600">{t('commandStream.noServerSelected')}</div>
                  )}
                </div>
                {requiresDatabaseConnection() && (
                  <div>
                    <p className="text-sm font-medium">{t('commandStream.databaseConnection')}:</p>
                    {selectedDatabase ? (
                      <div className="mt-1 text-sm bg-blue-50 p-2 rounded">
                        <div className="font-medium">{selectedDatabase.name}</div>
                        <div className="text-xs mt-1">
                          {selectedDatabase.ip}:{selectedDatabase.port} (User: {selectedDatabase.username})
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-red-600">{t('commandStream.noDatabaseSelected')}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
                  <Button variant="outline" onClick={() => setShowConfirmRunDialog(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleRun}>
                    {t('commandStream.runCommand')}
                  </Button>
                </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button onClick={handleRunConfirmation} disabled={isRunButtonDisabled} size="sm"
                className="h-6 text-xs px-2 py-0">
          {t('commandStream.run')}
        </Button>

        {/* Output dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-6 text-xs px-2 py-0 ${hasCheckRuleFailures ? "border-red-500 text-red-500" : ""}`}
            >
              {t('commandStream.output')} {hasCheckRuleFailures && <XCircle className="ml-1 h-2.5 w-2.5 text-red-500"/>}
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('commandStream.commandExecutionResult')}</DialogTitle>
            </DialogHeader>
            {renderCheckRuleStatus()}
            <div className="font-mono text-sm p-3 border rounded-md bg-gray-50 whitespace-pre-wrap">
              {result || t('commandStream.noOutput')}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}

export { CommandDetail, type CommandDetailRef };
