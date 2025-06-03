import React, { useState } from 'react';
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
  IconServer,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
  IconUpload,
  IconX
} from "@tabler/icons-react";
import { useConnectionContext } from '@/context/ConnectionContext';
import { ConnectionModal } from './ConnectionModal';
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
import { ConnectionType } from '@/types/connection';
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

export default function ConnectionManagement() {
  const { t } = useTranslation();
  const {
    connections,
    deleteConnection,
    exportSingleConnection,
    exportAllConnections,
    importSingleConnection,
    importAllConnections
  } = useConnectionContext();

  const [sort, setSort] = useState('ascending');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | undefined>(undefined);
  const [selectedConnectionType, setSelectedConnectionType] = useState<ConnectionType>('server');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<{
    id: string;
    type: ConnectionType
  } | undefined>(undefined);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [importType, setImportType] = useState<'single' | 'all'>('single');
  const [exportType, setExportType] = useState<'single' | 'all'>('single');
  const [exportImportType, setExportImportType] = useState<ConnectionType>('server');

  // Filter and sort the connections
  const filteredConnections = connections?.[selectedConnectionType]
    ?.sort((a, b) =>
      sort === 'ascending'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    )
    .filter((conn) => conn.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpenModal = (type: ConnectionType, id?: string) => {
    setSelectedConnectionType(type);
    setSelectedConnectionId(id);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedConnectionId(undefined);
    setModalOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, type: ConnectionType, id: string) => {
    e.stopPropagation(); // Prevent opening the edit modal
    setConnectionToDelete({ id, type });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (connectionToDelete) {
      deleteConnection(connectionToDelete.type, connectionToDelete.id);
      setConnectionToDelete(undefined);
    }
    setDeleteConfirmOpen(false);
  };

  const handleExportSingle = (type: ConnectionType, id: string) => {
    setExportType("single");
    const data = exportSingleConnection(type, id);
    setExportData(data);
    setExportModalOpen(true);
  };

  const handleExportAll = () => {
    setExportType("all");
    const data = exportAllConnections(exportImportType);
    setExportData(data);
    setExportModalOpen(true);
  };

  const handleImport = (type: 'single' | 'all') => {
    setImportType(type);
    setImportModalOpen(true);
  };

  const handleImportSubmit = () => {
    try {
      const data = JSON.parse(importData);
      if (importType === 'single') {
        importSingleConnection(exportImportType, data);
        toast(t('common.success'), {
          description: t('connection.importSingleSuccess'),
        });
      } else {
        importAllConnections(exportImportType, data);
        toast(t('common.success'), {
          description: t('connection.importAllSuccess'),
        });
      }
      setImportModalOpen(false);
      setImportData('');
    } catch (error) {
      console.error('Failed to parse import data:', error);
      toast.error(t('common.error'), {
        description: t('connection.importError'),
      });
    }
  };

  const handleCopyToClipboard = (content: string, type: 'connection' | 'export') => {
    navigator.clipboard.writeText(content).then(() => {
    });
    toast(t('common.success'), {
      description: type === 'connection' ? t('connection.connectionCopied') : t('connection.jsonCopied')
    });
    setExportModalOpen(false);
  };

  return (
    <>
      {/* ===== Content ===== */}
      <Main fixed>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('connection.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('connection.description')}
          </p>
        </div>
        <div className="my-4 flex items-end justify-between sm:my-0 sm:items-center">
          <div className="flex flex-col gap-4 sm:my-4 sm:flex-row">
            <Input
              placeholder={t('common.search')}
              className="h-9 w-40 lg:w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant={selectedConnectionType === 'server' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedConnectionType('server')}
                className="flex items-center gap-2"
              >
                <IconServer size={18}/>
                {t('connection.server')}
              </Button>
              <Button
                variant={selectedConnectionType === 'database' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedConnectionType('database')}
                className="flex items-center gap-2"
              >
                <IconDatabase size={18}/>
                {t('connection.database')}
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
                  {t('connection.importExport')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExportAll()}>
                  <IconDownload size={16} className="mr-2"/>
                  {t('connection.exportAll')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleImport('all')}>
                  <IconUpload size={16} className="mr-2"/>
                  {t('connection.importAll')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleImport('single')}>
                  <IconUpload size={16} className="mr-2"/>
                  {t('connection.importSingle')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => handleOpenModal(selectedConnectionType)} className="flex items-center gap-2">
              <IconPlus size={18}/>
              {t('connection.addConnection')}
            </Button>
          </div>
        </div>
        <Separator className="shadow-sm"/>
        <ul className="no-scrollbar grid gap-4 overflow-auto pt-4 pb-16" style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        }}>
          {filteredConnections?.length > 0 ? (
              filteredConnections.map((connection) => (
                <li
                  key={connection.id}
                  className="rounded-lg border p-4 hover:shadow-md cursor-pointer transition-all duration-200 relative group"
                  onClick={() => handleOpenModal(selectedConnectionType, connection.id)}
                >
                  <div className="absolute left-0 top-0 z-10 flex gap-1 p-1">
                    <div
                      className="rounded-md bg-black p-1 hover:bg-gray-800 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100"
                      onClick={(e) => handleDeleteClick(e, selectedConnectionType, connection.id)}
                    >
                      <IconX size={14} className="text-white"/>
                    </div>
                    <div
                      className="rounded-md bg-black p-1 hover:bg-gray-800 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        const connectionString = `${connection.username}\n${connection.password}\n${connection.ip}\n${connection.port}`;
                        handleCopyToClipboard(connectionString, 'connection');
                      }}
                    >
                      <IconCopy size={14} className="text-white"/>
                    </div>
                    <div
                      className="rounded-md bg-black p-1 hover:bg-gray-800 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportSingle(selectedConnectionType, connection.id);
                      }}
                    >
                      <IconDownload size={14} className="text-white"/>
                    </div>
                  </div>
                  <div className="mb-2 flex items-start justify-between">
                    <div
                      className="bg-muted flex size-10 items-center justify-center rounded-lg p-2"
                    >
                      {connection.type === 'server' ? (
                        <IconServer size={20}/>
                      ) : (
                        <IconDatabase size={20}/>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(connection.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <div className="overflow-hidden">
                      <h2 className="mb-1 font-semibold">{connection.name}</h2>
                      <p className="text-sm text-gray-500">{t('connection.ip')}: {connection.ip}</p>
                      <p className="text-sm text-gray-500">{t('connection.port')}: {connection.port}</p>
                      <p className="text-sm text-gray-500">{t('connection.username')}: {connection.username}</p>
                      <p className="text-sm text-gray-500">{t('connection.password')}: {connection.password}</p>
                    </div>
                  </div>
                </li>
              ))
            ) :
            <div className="col-span-full text-center py-8 text-gray-500">
              {t('connection.noConnectionsFound')}
            </div>
          }
        </ul>
      </Main>

      <ConnectionModal
        connectionId={selectedConnectionId}
        connectionType={selectedConnectionType}
        isOpen={modalOpen}
        onClose={handleCloseModal}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('connection.confirmDeletion')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>{t('connection.deleteConfirmMessage')}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {t('common.cancel')}
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
            <DialogTitle>{t('connection.exportData')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid gap-4">
              {exportType === "all" &&
                (<div className="grid gap-2">
                  <Label>{t('connection.type')}</Label>
                  <Select
                    value={exportImportType}
                    onValueChange={(value: ConnectionType) => {
                      setExportImportType(value);
                      const data = exportAllConnections(value);
                      setExportData(data);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('connection.selectType')}/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="server">{t('connection.server')}</SelectItem>
                      <SelectItem value="database">{t('connection.database')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>)}
              <div className="grid gap-2">
                <Label>{t('connection.jsonData')}</Label>
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
              {t('common.close')}
            </Button>
            <Button onClick={() => handleCopyToClipboard(exportData, 'export')}>
              {t('connection.copyToClipboard')}
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
              {importType === 'single' ? t('connection.importSingleConnection') : t('connection.importAllConnections')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>{t('connection.type')}</Label>
                <Select
                  value={exportImportType}
                  onValueChange={(value: ConnectionType) => setExportImportType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('connection.selectType')}/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="server">{t('connection.server')}</SelectItem>
                    <SelectItem value="database">{t('connection.database')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('connection.jsonData')}</Label>
                <Textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="font-mono h-[200px]"
                  placeholder={t('connection.pasteJsonData')}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleImportSubmit}>
              {t('common.import')}
            </Button>
          </DialogFooter>
          <Description/>
        </DialogContent>
      </Dialog>
    </>
  );
}