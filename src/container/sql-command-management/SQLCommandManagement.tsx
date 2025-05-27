import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@shadcn/components/ui/button';
import { Input } from '@shadcn/components/ui/input';
import { Separator } from '@shadcn/components/ui/separator';
import { Main } from '@shadcn/components/layout/main';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shadcn/components/ui/dialog';
import {
  IconCopy,
  IconDatabase,
  IconDownload,
  IconPlus,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
  IconTerminal,
  IconUpload,
  IconX
} from "@tabler/icons-react";
import { useSQLCommandContext } from '@/context/SQLCommandContext';
import { SQLCommandModal } from './SQLCommandModal';
import { Description } from '@radix-ui/react-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shadcn/components/ui/dropdown-menu";
import { Textarea } from '@shadcn/components/ui/textarea';
import { Label } from '@shadcn/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shadcn/components/ui/select";
import { SQLCommandType } from "@/types/sql-or-command";
import { toast } from "sonner";

export default function SQLCommandManagement() {
  const { t } = useTranslation();
  const {
    sqlCommands,
    selectedType,
    setSelectedType,
    deleteSQLCommand,
    exportSingleSQLCommand,
    exportAllSQLCommands,
    importSingleSQLCommand,
    importAllSQLCommands
  } = useSQLCommandContext();

  const [sort, setSort] = useState('ascending');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSQLCommandId, setSelectedSQLCommandId] = useState<string | undefined>(undefined);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sqlCommandToDelete, setSQLCommandToDelete] = useState<string | undefined>(undefined);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [importType, setImportType] = useState<'single' | 'all'>('single');
  const [exportType, setExportType] = useState<'single' | 'all'>('single');
  const [selectedDatabaseType, setSelectedDatabaseType] = useState<string>('all');
  const [exportImportType, setExportImportType] = useState<SQLCommandType>(selectedType || 'sql');

  // Get the SQL commands for the selected type
  const sqlCommandsOfType = sqlCommands[selectedType] || [];

  // Filter and sort the SQL commands
  // Filter and sort the SQL commands
  const filteredSQLCommands = sqlCommandsOfType
    .filter(cmd => {
      if (selectedDatabaseType === 'all') return true;
      // Only check databaseType for SQL commands
      if (selectedType === 'sql') {
        return 'databaseType' in cmd && cmd.databaseType === selectedDatabaseType;
      }
      return true;
    })
    .sort((a, b) =>
      sort === 'ascending'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    )
    .filter((cmd) => cmd.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpenModal = (id?: string) => {
    setSelectedSQLCommandId(id);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedSQLCommandId(undefined);
    setModalOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening the edit modal
    setSQLCommandToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (sqlCommandToDelete) {
      deleteSQLCommand(selectedType, sqlCommandToDelete);
      setSQLCommandToDelete(undefined);
    }
    setDeleteConfirmOpen(false);
  };

  const handleExportSingle = (id: string) => {
    setExportType("single");
    const data = exportSingleSQLCommand(selectedType, id);
    setExportData(data);
    setExportModalOpen(true);
  };

  const handleExportAll = () => {
    setExportType("all");
    setExportImportType(selectedType);
    const data = exportAllSQLCommands(selectedType);
    setExportData(data);
    setExportModalOpen(true);
  };

  const handleExportAllSubmit = (sqlCommandType: SQLCommandType) => {
    const data = exportAllSQLCommands(sqlCommandType);
    setExportData(data);
  };

  const handleImport = (type: 'single' | 'all') => {
    setImportType(type);
    setExportImportType(exportImportType);
    setImportModalOpen(true);
  };

  const handleImportSubmit = () => {
    try {
      const data = JSON.parse(importData);
      if (importType === 'single') {
        importSingleSQLCommand(exportImportType, data);
        toast(t('common.success'), {
          description: t('sqlManagement.importSingleSuccess'),
        });
      } else {
        importAllSQLCommands(exportImportType, data);
        toast(t('common.success'), {
          description: t('sqlManagement.importAllSuccess'),
        });
      }
      setImportModalOpen(false);
      setImportData('');
    } catch (error) {
      console.error('Failed to parse import data:', error);
      toast.error(t('common.error'), {
        description: t('sqlManagement.importError'),
      });
    }
  };

  const handleCopyToClipboard = (content: string, type: 'command' | 'export') => {
    navigator.clipboard.writeText(content).then(() => {
    });
    toast(t('common.success'), {
      description: type === 'command' ? t('sqlManagement.commandCopied') : t('sqlManagement.jsonCopied'),
    });
    setExportModalOpen(false);
  };

  return (
    <>
      {/* ===== Content ===== */}
      <Main fixed>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('sqlManagement.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('sqlManagement.description')}
          </p>
        </div>
        <div className="my-4 flex items-end justify-between sm:my-0 sm:items-center">
          <div className="flex flex-col gap-4 sm:my-4 sm:flex-row">
            <Input
              placeholder={t('sqlManagement.search')}
              className="h-9 w-40 lg:w-[150px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex gap-2">

              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={selectedType === 'sql' ? 'default' : 'outline'}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <IconDatabase size={18}/>
                      {selectedType === 'sql' && selectedDatabaseType !== 'all' ?
                        `${selectedDatabaseType}` :
                        t('sqlManagement.allTypes')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => {
                      setSelectedType('sql');
                      setSelectedDatabaseType('all');
                    }}>
                      <div className="flex items-center gap-2">
                        <span>{t('sqlManagement.allTypes')}</span>
                      </div>
                    </DropdownMenuItem>
                    {Array.from(new Set(sqlCommands.sql.map(cmd => cmd.databaseType))).map(type => (
                      <DropdownMenuItem key={type} onClick={() => {
                        setSelectedType('sql');
                        setSelectedDatabaseType(type);
                      }}>
                        <div className="flex items-center gap-2">
                          <span>{type}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button
                variant={selectedType === 'command' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('command')}
                className="flex items-center gap-1"
              >
                <IconTerminal size={18}/>
                {t('sqlManagement.commands')}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSort(sort === 'ascending' ? 'descending' : 'ascending')}
            >
              {sort === 'ascending' ? (
                <IconSortAscendingLetters size={18}/>
              ) : (
                <IconSortDescendingLetters size={18}/>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <IconDownload size={18}/>
                  {t('sqlManagement.importExport')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExportAll()}>
                  <IconDownload size={16} className="mr-2"/>
                  {t('sqlManagement.exportAll')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleImport('all')}>
                  <IconUpload size={16} className="mr-2"/>
                  {t('sqlManagement.importAll')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleImport('single')}>
                  <IconUpload size={16} className="mr-2"/>
                  {t('sqlManagement.importSingle')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
              <IconPlus size={18}/>
              {selectedType === 'sql' ? t('sqlManagement.addSql') : t('sqlManagement.addCommand')}
            </Button>
          </div>
        </div>
        <Separator className="shadow-sm"/>
        <ul className="no-scrollbar grid gap-4 overflow-auto pt-4 pb-16" style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
        }}>
          {filteredSQLCommands.length > 0 ? (
            filteredSQLCommands.map((sqlCommand) => (
              <li
                key={sqlCommand.id}
                className="rounded-lg border p-4 hover:shadow-md cursor-pointer transition-all duration-200 relative group"
                onClick={() => handleOpenModal(sqlCommand.id)}
              >
                <div className="absolute left-0 top-0 z-10 flex gap-1 p-1">
                  <div
                    className="rounded-md bg-black p-1 hover:bg-gray-800 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100"
                    onClick={(e) => handleDeleteClick(e, sqlCommand.id)}
                  >
                    <IconX size={14} className="text-white"/>
                  </div>
                  <div
                    className="rounded-md bg-black p-1 hover:bg-gray-800 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyToClipboard(sqlCommand.content, 'command');
                    }}
                  >
                    <IconCopy size={14} className="text-white"/>
                  </div>
                  <div
                    className="rounded-md bg-black p-1 hover:bg-gray-800 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportSingle(sqlCommand.id);
                    }}
                  >
                    <IconDownload size={14} className="text-white"/>
                  </div>
                </div>
                <div className="mb-2 flex items-start justify-between">
                  <div className="bg-muted flex size-10 items-center justify-center rounded-lg p-2">
                    {selectedType === 'sql' && 'databaseType' in sqlCommand ? (
                      <IconDatabase size={18}/>
                    ) : (
                      <IconTerminal className="h-4 w-4"/>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(sqlCommand.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="overflow-hidden">
                  <h2 className="mb-1 font-semibold">{sqlCommand.name}</h2>
                  <div className="mt-2 rounded bg-gray-50 p-2 font-mono text-xs overflow-hidden">
                    <div className="truncate">{sqlCommand.content}</div>
                  </div>
                  {sqlCommand.description && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">{sqlCommand.description}</p>
                  )}
                </div>
              </li>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              {selectedType === 'sql' ? t('sqlManagement.noSqlFound') : t('sqlManagement.noCommandFound')}
            </div>
          )}
        </ul>
      </Main>

      <SQLCommandModal
        sqlCommandId={selectedSQLCommandId}
        sqlOrCommandType={selectedType}
        isOpen={modalOpen}
        onClose={handleCloseModal}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('sqlManagement.confirmDeletion')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>{t('sqlManagement.deleteConfirmMessage', { 0: selectedType })}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {t('sqlManagement.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
          <Description/>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('sqlManagement.exportData')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid gap-4">
              {exportType === "all" &&
                (<div className="grid gap-2">
                  <Label>{t('sqlManagement.type')}</Label>
                  <Select
                    value={exportImportType}
                    onValueChange={(value: SQLCommandType) => {
                      setExportImportType(value);
                      if (exportData) {
                        handleExportAllSubmit(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('sqlManagement.selectType')}/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sql">{t('sqlManagement.sql')}</SelectItem>
                      <SelectItem value="command">{t('sqlManagement.command-stream')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>)}
              <div className="grid gap-2">
                <Label>{t('sqlManagement.jsonData')}</Label>
                <Textarea
                  value={exportData}
                  readOnly
                  className="font-mono h-[200px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              {t('sqlManagement.close')}
            </Button>
            <Button onClick={() => handleCopyToClipboard(exportData, 'export')}>
              {t('sqlManagement.copyToClipboard')}
            </Button>
          </DialogFooter>
          <Description/>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {importType === 'single' 
                ? t('sqlManagement.importSingleItem', { 0: exportImportType === 'sql' ? t('sqlManagement.sql') : t('sqlManagement.command-stream') })
                : t('sqlManagement.importAllItems', { 0: exportImportType === 'sql' ? t('sqlManagement.sql') : t('sqlManagement.command-stream') })
              }
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>{t('sqlManagement.type')}</Label>
                <Select
                  value={exportImportType}
                  onValueChange={(value: SQLCommandType) => setExportImportType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('sqlManagement.selectType')}/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sql">{t('sqlManagement.sql')}</SelectItem>
                    <SelectItem value="command">{t('sqlManagement.command-stream')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('sqlManagement.jsonData')}</Label>
                <Textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="font-mono h-[200px]"
                  placeholder={t('sqlManagement.pasteJsonData')}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModalOpen(false)}>
              {t('sqlManagement.cancel')}
            </Button>
            <Button onClick={handleImportSubmit}>
              {t('sqlManagement.import')}
            </Button>
          </DialogFooter>
          <Description/>
        </DialogContent>
      </Dialog>
    </>
  );
}