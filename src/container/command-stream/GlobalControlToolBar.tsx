import { useCommandConfigContext } from "@/context/CommandStreamContext";
import { Command, CommandStream } from "@/types/command";
import { Button } from "@shadcn/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shadcn/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shadcn/components/ui/dropdown-menu";
import { Label } from "@shadcn/components/ui/label";
import { ScrollArea } from "@shadcn/components/ui/scroll-area";
import { Switch } from "@shadcn/components/ui/switch";
import { Check, ListTodo, Loader2, MoveVertical, Plus, Settings2, Trash2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useToggle } from "react-use";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/shadcn/components/ui/popover";
import { useConnectionContext } from "@/context/ConnectionContext";
import { IconDatabase, IconServer } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { parsePlaceholder } from "@/container/command-stream/utils";

interface GlobalControlToolBarProps {
  isRunning: boolean;
  onRun: () => void;
  requireConfirmation: boolean;
  setRequireConfirmation: (value: boolean) => void;
  commandStreamIndex: number;
  commandStream: CommandStream;
  onServerChange?: (serverId: string) => void;
  onDatabaseChange?: (databaseId: string) => void;
}

interface CommandEntry {
  index: number;
  name: string;
  command: string;
}

// Settings Menu Component
const SettingsMenu = ({
                        requireConfirmation,
                        onRequireConfirmationChange,
                      }: {
  requireConfirmation: boolean;
  onRequireConfirmationChange: (value: boolean) => void;
}) => {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4"/>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuItem className="flex items-center justify-between" onSelect={(e) => e.preventDefault()}>
          <Switch id="mention-switch" checked={requireConfirmation} onCheckedChange={onRequireConfirmationChange}/>
          <Label htmlFor="mention-switch">{t('commandStream.mentionBeforeNext')}</Label>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Command Entry Component
const CommandEntryItem = ({
                            entry,
                            index,
                            onDelete,
                            onAddAfter,
                            onDragStart,
                            onDragOver,
                            onDrop,
                            disableDelete,
                          }: {
  entry: CommandEntry;
  index: number;
  onDelete: (index: number) => void;
  onAddAfter: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  disableDelete: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div
      className="p-2 border rounded-md bg-gray-50 flex items-center"
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
    >
      <div className="flex-1 w-full">
        <div className="font-medium text-sm">{entry.name}</div>
        <div className="w-[380px] text-xs text-gray-500 font-mono truncate">{entry.command}</div>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="p-1 h-7 w-7"
          onClick={() => onAddAfter(index)}
          title={t('commandStream.addCommandAfter')}
        >
          <Plus className="h-4 w-4"/>
        </Button>
        <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-gray-400"
                title={t('commandStream.dragToReorder')}>
          <MoveVertical className="h-4 w-4"/>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="p-1 h-7 w-7 text-red-500"
          onClick={() => onDelete(entry.index)}
          title={t('commandStream.deleteCommand')}
          disabled={disableDelete}
        >
          <Trash2 className="h-4 w-4"/>
        </Button>
      </div>
    </div>
  );
};

// Add Command Form Component
const AddCommandForm = ({
                          onAddCommand,
                          onCancel,
                        }: {
  onAddCommand: (newCommandName: string, newCommandStr: string) => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [commandName, setCommandName] = useState("");
  const [commandStr, setCommandStr] = useState("");

  return (
    <div className="border border-dashed p-2 rounded-md mt-1 mb-2 bg-gray-50">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            className="flex-1 border rounded-md px-2 py-1 text-xs"
            placeholder={t('commandStream.commandName')}
            value={commandName}
            onChange={(e) => setCommandName(e.target.value)}
          />
          <input
            className="flex-1 border rounded-md px-2 py-1 text-xs font-mono"
            placeholder={t('commandStream.commandString')}
            value={commandStr}
            onChange={(e) => setCommandStr(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={onCancel}>
            <X className="h-3.5 w-3.5"/>
          </Button>
          <Button
            size="sm"
            className="h-6 w-6 p-0"
            disabled={!commandName.trim() || !commandStr.trim()}
            onClick={() => onAddCommand(commandName, commandStr)}
          >
            <Check className="h-3.5 w-3.5"/>
          </Button>
        </div>
      </div>
    </div>
  );
};

// Command Manager Dialog Component
const CommandManagerDialog = ({
                                open,
                                onOpenChange,
                                commandEntries,
                                onAddCommand,
                                onDeleteCommand,
                                reorderCommands,
                                commandStreamIndex,
                              }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commandEntries: CommandEntry[];
  onAddCommand: (newCommandName: string, newCommandStr: string, index: number) => void;
  onDeleteCommand: (index: number) => void;
  reorderCommands: (streamIndex: number, oldIndex: number, newIndex: number) => void;
  commandStreamIndex: number;
}) => {
  const { t } = useTranslation();
  // Create a local state for temporary command-stream entries
  const [tempCommandEntries, setTempCommandEntries] = useState<CommandEntry[]>([]);
  const [tempSelectedIndex, setTempSelectedIndex] = useState<number | null>(null);
  const [tempDraggedIndex, setTempDraggedIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize temporary state when dialog opens
  useEffect(() => {
    if (open) {
      setTempCommandEntries([...commandEntries]);
      setTempSelectedIndex(null);
      setHasChanges(false);
    }
  }, [open, commandEntries]);

  // Handle temporary selection for adding a command-stream
  const handleTempSelect = (index: number) => {
    setTempSelectedIndex(index);
  };

  // Handle temporary deletion
  const handleTempDelete = (index: number) => {
    const newEntries = [...tempCommandEntries];
    newEntries.splice(index, 1);
    setTempCommandEntries(newEntries);
    setHasChanges(true);
  };

  // Handle temporary drag
  const handleTempDragStart = (index: number) => {
    setTempDraggedIndex(index);
  };

  const handleTempDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (tempDraggedIndex === null || tempDraggedIndex === index) return;
  };

  const handleTempDrop = (index: number) => {
    if (tempDraggedIndex === null || tempDraggedIndex === index) return;

    const newEntries = [...tempCommandEntries];
    const [movedItem] = newEntries.splice(tempDraggedIndex, 1);
    newEntries.splice(index, 0, movedItem);

    setTempCommandEntries(newEntries);
    setTempDraggedIndex(null);
    setHasChanges(true);
  };

  // Apply changes when confirmed
  const handleConfirm = () => {
    if (hasChanges) {
      // Track deleted commands
      const deletedIndices = commandEntries
        .filter((entry) => !tempCommandEntries.some((temp) => temp.index === entry.index))
        .map((entry) => entry.index)
        .sort((a, b) => b - a); // Sort in descending order to delete from the end first
      // Delete commands first (to avoid index shifting issues)
      deletedIndices.forEach((index) => {
        onDeleteCommand(index);
      });

      // Then handle reordering
      // We need to map the original indices to their new positions
      const originalIndices = commandEntries
        .filter((entry) => tempCommandEntries.some((temp) => temp.index === entry.index))
        .map((entry) => entry.index);
      // Create a map of original indices to new positions
      const reorderMap = new Map<number, number>();
      const alreadyMappedIndices = new Array<number>();
      tempCommandEntries.forEach((entry, newIndex) => {
        const originalIndex = originalIndices.indexOf(entry.index);
        if (originalIndex !== newIndex && !alreadyMappedIndices.includes(originalIndex)) {
          alreadyMappedIndices.push(originalIndex);
          alreadyMappedIndices.push(newIndex);
          reorderMap.set(originalIndex, newIndex);
        }
      });
      // Apply reordering by moving one command-stream at a time
      if (reorderMap.size > 0) {
        // Convert map to array of [from, to] pairs and sort
        const moves = Array.from(reorderMap.entries());
        // Apply each move
        moves.forEach(([from, to]) => {
          reorderCommands(commandStreamIndex, from, to);
        });
      }
    }

    onOpenChange(false);
  };

  // Handle cancellation - just close without applying changes
  const handleCancel = () => {
    onOpenChange(false);
  };

  // Handle local add command-stream
  const handleLocalAddCommand = (newCommandName: string, newCommandStr: string, index: number) => {
    onAddCommand(newCommandName, newCommandStr, index);
    setHasChanges(true);
    setTempSelectedIndex(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open && hasChanges) {
          // Show confirmation if there are unsaved changes
          if (confirm(t('commandStream.discardChangesConfirm'))) {
            onOpenChange(false);
          }
        } else {
          onOpenChange(open);
        }
      }}
    >
      <DialogContent className="max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('commandStream.manageCommands')}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-2 mb-4">
            {tempCommandEntries.length === 0 ? (
              <div className="p-4 border rounded-md bg-gray-50 flex flex-col items-center justify-center">
                <p className="text-sm text-gray-500 mb-2">{t('commandStream.noCommandsInStream')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTempSelectedIndex(0)}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4"/> {t('commandStream.addFirstCommand')}
                </Button>
                {tempSelectedIndex === 0 && (
                  <AddCommandForm
                    onAddCommand={(newCommandName: string, newCommandStr: string) =>
                      handleLocalAddCommand(newCommandName, newCommandStr, 0)
                    }
                    onCancel={() => setTempSelectedIndex(null)}
                  />
                )}
              </div>
            ) : (
              tempCommandEntries.map((entry, index) => (
                <div key={index}>
                  <CommandEntryItem
                    entry={entry}
                    index={index}
                    onDelete={handleTempDelete}
                    onAddAfter={handleTempSelect}
                    onDragStart={handleTempDragStart}
                    onDragOver={handleTempDragOver}
                    onDrop={handleTempDrop}
                    disableDelete={false}
                  />
                  {tempSelectedIndex === index && (
                    <AddCommandForm
                      onAddCommand={(newCommandName: string, newCommandStr: string) =>
                        handleLocalAddCommand(newCommandName, newCommandStr, tempSelectedIndex)
                      }
                      onCancel={() => setTempSelectedIndex(null)}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!hasChanges}>
            {hasChanges ? t('commandStream.saveChanges') : t('commandStream.done')}
          </Button>
        </DialogFooter>
        <DialogDescription/>
      </DialogContent>
    </Dialog>
  );
};

// Toolbar Component
const ToolbarButtons = ({
                          requireConfirmation,
                          onRequireConfirmationChange,
                          onOpenCommandManager,
                          onRun,
                          isRunning,
                          onServerChange,
                          onDatabaseChange,
                        }: {
  requireConfirmation: boolean;
  onRequireConfirmationChange: (value: boolean) => void;
  onOpenCommandManager: () => void;
  onRun: () => void;
  isRunning: boolean;
  onToggleProgress: () => void;
  progressButtonRef: React.RefObject<HTMLButtonElement | null>;
  showProgress: boolean;
  onServerChange?: (serverId: string) => void;
  onDatabaseChange?: (databaseId: string) => void;
  commandStream: CommandStream;
}) => {
  const { t } = useTranslation();
  const { connections, selectedConnections, getSelectedServer, getSelectedDatabase } = useConnectionContext();

  // Get the currently selected connections
  const selectedServer = getSelectedServer();
  const selectedDatabase = getSelectedDatabase();

  // Filter connections by type
  const serverConnections = connections.server || [];
  const databaseConnections = connections.database || [];

  return (
    <div className="flex items-center">
      <div className="mr-2 flex items-center space-x-1">
        {/* Server selection */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`px-2 flex items-center gap-1 ${selectedServer ? 'border-green-500 bg-green-50' : ''}`}
            >
              <IconServer className="h-4 w-4"/>
              <span title={selectedServer?.name} className="max-w-[100px] truncate text-xs">
                {selectedServer ? selectedServer.name : t('commandStream.selectServerShort')}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 bg-white border shadow-md" align="start">
            <ScrollArea className="max-h-[300px]">
              <div className="p-2">
                {serverConnections.length > 0 ? (
                  serverConnections.map((server) => (
                    <div
                      key={server.id}
                      className={`flex items-center justify-between rounded-md px-2 py-1 text-sm cursor-pointer hover:bg-slate-100 ${
                        selectedConnections.server === server.id ? "bg-green-100" : ""
                      }`}
                      onClick={() => onServerChange?.(server.id)}
                    >
                      <div className="flex items-center gap-2">
                        <IconServer className="h-4 w-4"/>
                        <span>{server.name}</span>
                      </div>
                      {selectedConnections.server === server.id && <Check className="h-4 w-4 text-green-600"/>}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 p-2">No servers available</div>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Database selection */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`px-2 flex items-center gap-1 ${selectedDatabase ? 'border-blue-500 bg-blue-50' : ''}`}
            >
              <IconDatabase className="h-4 w-4"/>
              <span title={selectedDatabase?.name} className="max-w-[100px] truncate text-xs">
                {selectedDatabase ? selectedDatabase.name : t('commandStream.selectDatabaseShort')}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 bg-white border shadow-md" align="start">
            <ScrollArea className="max-h-[300px]">
              <div className="p-2">
                {databaseConnections.length > 0 ? (
                  databaseConnections.map((database) => (
                    <div
                      key={database.id}
                      className={`flex items-center justify-between rounded-md px-2 py-1 text-sm cursor-pointer hover:bg-slate-100 ${
                        selectedConnections.database === database.id ? "bg-blue-100" : ""
                      }`}
                      onClick={() => onDatabaseChange?.(database.id)}
                    >
                      <div className="flex items-center gap-2">
                        <IconDatabase className="h-4 w-4"/>
                        <span>{database.name}</span>
                      </div>
                      {selectedConnections.database === database.id && <Check className="h-4 w-4 text-blue-600"/>}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 p-2">No databases available</div>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1"></div>

      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenCommandManager}
          className="p-1 h-8 w-8 flex items-center justify-center"
          title="Manage Commands"
        >
          <ListTodo className="h-4 w-4"/>
        </Button>
        <SettingsMenu
          requireConfirmation={requireConfirmation}
          onRequireConfirmationChange={onRequireConfirmationChange}
        />
        <Button
          onClick={onRun}
          size="sm"
          className="flex gap-1 whitespace-nowrap text-xs"
        >
          {isRunning ? <Loader2 className="h-3 w-3 animate-spin"/> : "Run"}
        </Button>
      </div>
    </div>
  );
};

// Main Component
function GlobalControlToolBar({
                                isRunning,
                                onRun,
                                requireConfirmation: mentionUser,
                                setRequireConfirmation: onMentionUserChange,
                                commandStreamIndex,
                                commandStream,
                                onServerChange,
                                onDatabaseChange,
                              }: GlobalControlToolBarProps) {
  const [showProgress, toggleProgress] = useToggle(false);
  const progressButtonRef = useRef<HTMLButtonElement | null>(null);
  const { commandStreams, addCommand, deleteCommand, reorderCommands } = useCommandConfigContext();

  // Command management state
  const [showCommandManager, setShowCommandManager] = useState(false);
  const [commandEntries, setCommandEntries] = useState<CommandEntry[]>([]);

  useEffect(() => {
    // Get command-stream entries from the current command-stream stream
    if (commandStreamIndex >= 0 && commandStreams.length > commandStreamIndex) {
      const entries = commandStreams[commandStreamIndex].commandList.map((cmd, index) => ({
        index,
        name: cmd.name,
        command: cmd.commandStr,
      }));
      setCommandEntries(entries);
    }
  }, [commandStreamIndex, commandStreams, showCommandManager]);

  const handleAddCommand = (newCommandName: string, newCommandStr: string, index: number) => {
    if (!newCommandName.trim() || !newCommandStr.trim() || index === null) return;
    const newCommand: Command = {
      name: newCommandName.trim(),
      commandStr: newCommandStr.trim(),
      placeholderKeys: [],
    };
    newCommand.placeholderKeys = parsePlaceholder(newCommand);
    addCommand(commandStreamIndex, index, newCommand);
  };

  const handleDeleteCommand = (index: number) => {
    deleteCommand(commandStreamIndex, index);
  };

  return (
    <div className="relative">
      <div className="sticky top-0 z-10">
        <ToolbarButtons
          requireConfirmation={mentionUser}
          onRequireConfirmationChange={onMentionUserChange}
          onOpenCommandManager={() => setShowCommandManager(true)}
          onRun={onRun}
          isRunning={isRunning}
          onToggleProgress={toggleProgress}
          progressButtonRef={progressButtonRef}
          showProgress={showProgress}
          onServerChange={onServerChange}
          onDatabaseChange={onDatabaseChange}
          commandStream={commandStream}
        />
      </div>

      {/* Command Manager */}
      <CommandManagerDialog
        open={showCommandManager}
        onOpenChange={setShowCommandManager}
        commandEntries={commandEntries}
        onAddCommand={handleAddCommand}
        onDeleteCommand={handleDeleteCommand}
        reorderCommands={reorderCommands}
        commandStreamIndex={commandStreamIndex}
      />
    </div>
  );
}

export default GlobalControlToolBar;
