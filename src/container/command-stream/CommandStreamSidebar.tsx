import { Button } from "@/components/shadcn/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/shadcn/components/ui/scroll-area";
import { Separator } from "@/components/shadcn/components/ui/separator";
import { cn } from "@/components/shadcn/lib/utils";
import { useCommandConfigContext } from "@/context/CommandStreamContext";
import { CommandStream } from "@/types/command";
import { Description } from "@radix-ui/react-dialog";
import { Copy, FileTerminal, MoreVertical, Plus } from "lucide-react";
import React, { Fragment, useState } from "react";
import { useToast } from "@/components/shadcn/components/ui/use-toast";
import { useTranslation } from "react-i18next";

export interface CommandStreamSidebarProps {
  onSelectCommand: (index: number) => void;
  selectedIndex: number;
}

const CommandStreamSidebar: React.FC<CommandStreamSidebarProps> = ({ onSelectCommand, selectedIndex }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { commandStreams, updateConfig, deleteCommandStream } = useCommandConfigContext();
  const [jsonInput, setJsonInput] = useState("");
  const [exportJson, setExportJson] = useState("");
  const [newStreamName, setNewStreamName] = useState("");
  const [openNameDialog, setOpenNameDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [openExportDialog, setOpenExportDialog] = useState(false);

  const handleAddEmptyCommandStream = () => {
    setNewStreamName("");
    setOpenNameDialog(true);
  };

  const handleCreateCommandStream = () => {
    if (!newStreamName.trim()) {
      toast({
        title: t('common.error'),
        description: t('commandStream.enterName'),
        variant: "destructive"
      });
      return;
    }

    const emptyCommandStream: CommandStream = {
      name: newStreamName.trim(),
      commandList: [],
      placeholderConfigs: [],
      checkRuleConfigs: [],
    };

    // Update command-stream streams - state updates will be handled in updateConfig
    updateConfig([...commandStreams, emptyCommandStream]);

    setOpenNameDialog(false);
    // Auto-select the newly added stream
    onSelectCommand(commandStreams.length);
  };

  const handleImportFromJson = () => {
    try {
      const commandStream = JSON.parse(jsonInput);

      // Update command-stream streams - state updates will be handled in updateConfig
      updateConfig([...commandStreams, commandStream]);

      setJsonInput("");
      setOpenImportDialog(false);
      toast({
        title: t('common.success'),
        description: t('commandStream.importSuccess')
      });
      // Auto-select the newly added stream
      onSelectCommand(commandStreams.length);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('commandStream.invalidJson') + error,
        variant: "destructive"
      });
    }
  };

  const handleDeleteCommandStream = (index: number) => {
    // Create new command-stream streams array without the deleted stream
    const newCommandStreams = [...commandStreams];
    newCommandStreams.splice(index, 1);

    // Use the specialized deleteCommandStream function to update state arrays
    deleteCommandStream(index);

    // If deleted the selected one, select the first one
    if (selectedIndex === index && newCommandStreams.length > 0) {
      onSelectCommand(0);
    }
  };

  const handleExportCommandStream = (index: number) => {
    const commandStreamJson = JSON.stringify(commandStreams[index], null, 2);
    setExportJson(commandStreamJson);
    setOpenExportDialog(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportJson).then(() => {
    });
    toast({
      title: t('common.success'),
      description: t('commandStream.copySuccess')
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <div className="flex justify-end mb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus size={16}/>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleAddEmptyCommandStream}>{t('commandStream.addEmpty')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOpenImportDialog(true)}>{t('commandStream.importJson')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Dialog open={openNameDialog} onOpenChange={setOpenNameDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('commandStream.newCommandStream')}</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <label htmlFor="streamName" className="text-sm font-medium block mb-2">
                {t('commandStream.streamName')}
              </label>
              <input
                id="streamName"
                type="text"
                value={newStreamName}
                onChange={(e) => setNewStreamName(e.target.value)}
                className="w-full border p-2 rounded"
                placeholder={t('commandStream.enterName')}
                autoFocus
              />
            </div>
            <DialogFooter className="mt-4">
              <Button onClick={handleCreateCommandStream}>{t('common.create')}</Button>
            </DialogFooter>
            <Description/>
          </DialogContent>
        </Dialog>

        <Dialog open={openImportDialog} onOpenChange={setOpenImportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('commandStream.importCommandStream')}</DialogTitle>
            </DialogHeader>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={t('commandStream.pasteJson')}
              className="min-h-[200px] w-full border p-2 rounded"
            />
            <DialogFooter className="mt-4">
              <Button onClick={handleImportFromJson}>{t('commandStream.import')}</Button>
            </DialogFooter>
            <Description/>
          </DialogContent>
        </Dialog>

        <Dialog open={openExportDialog} onOpenChange={setOpenExportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('commandStream.exportCommandStream')}</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <textarea value={exportJson} readOnly className="min-h-[200px] w-full border p-2 rounded pr-10"/>
              <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={copyToClipboard}>
                <Copy size={16}/>
              </Button>
            </div>
            <Description/>
          </DialogContent>
        </Dialog>

        <div className="space-y-1">
          {commandStreams.map((commandStream, index) => (
            <Fragment key={index}>
              <div
                className={cn(
                  "flex items-center justify-between rounded-md hover:bg-gray-200 py-2 px-2",
                  selectedIndex === index && "bg-gray-200"
                )}
              >
                <button
                  type="button"
                  className="flex-grow flex items-center gap-2 text-left text-sm overflow-hidden"
                  onClick={() => onSelectCommand(index)}
                >
                  <FileTerminal size={18} className="text-gray-600 flex-shrink-0"/>
                  <span className="font-medium truncate">{commandStream.name}</span>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-70 hover:opacity-100">
                      <MoreVertical size={16}/>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDeleteCommandStream(index)} className="text-red-500">
                      {t('common.delete')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportCommandStream(index)}>
                      {t('commandStream.exportAsJson')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Separator className="my-1 bg-gray-200"/>
            </Fragment>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

export default CommandStreamSidebar;
