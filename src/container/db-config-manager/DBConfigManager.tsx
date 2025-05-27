import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Main } from '@shadcn/components/layout/main';
import { Input } from '@shadcn/components/ui/input';
import { Button } from '@shadcn/components/ui/button';
import { Label } from '@shadcn/components/ui/label';
import {
  IconArrowRight,
  IconDeviceFloppy,
  IconFileExport,
  IconRefresh,
  IconSearch,
  IconServer,
  IconStar,
  IconX
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shadcn/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/components/ui/select';
import { ScrollArea } from '@shadcn/components/ui/scroll-area';
import { Check } from 'lucide-react';
import { Switch } from '@shadcn/components/ui/switch';
import { useDBConfigContext } from '@/context/DBConfigContext';
import { useConnectionContext } from '@/context/ConnectionContext';
import {
  backupConfigFile,
  backupLocalConfigFile,
  fetchConfigFile,
  fetchLocalConfigFile,
  parseConfigFile,
  updateConfigFile,
  updateLocalConfigFile
} from '@/api/db-config-ssh';
import DBConfigTable from './DBConfigTable';
import PriorityKeyBadge from './PriorityKeyBadge';

const DBConfigManager: React.FC = () => {
  const { t } = useTranslation();

  const {
    state,
    setSelectedServer,
    setConfigFile,
    setLoading,
    setError,
    commitChanges,
    resetChanges,
    setPriorityEnabled,
    addPriorityKey,
    removePriorityKey,
    updateSettings
  } = useDBConfigContext();

  const { connections, getConnection } = useConnectionContext();

  // Initialize state
  const [filePath, setFilePath] = useState('');
  const [manualServerConfig, setManualServerConfig] = useState({
    ip: '',
    port: '22',
    username: '',
    password: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [manualServerModalOpen, setManualServerModalOpen] = useState(false);
  const [newPriorityKey, setNewPriorityKey] = useState('');
  const [isUsingManualServer, setIsUsingManualServer] = useState(false);
  const [isUsingLocalMode, setIsUsingLocalMode] = useState(false);

  // Memoize the manual server config to prevent unnecessary updates
  const memoizedManualServerConfig = useMemo(() => manualServerConfig, [manualServerConfig]);

  // Update the settings when manualServerConfig changes
  useEffect(() => {
    if (isUsingManualServer) {
      updateSettings({
        manualServerConfig: memoizedManualServerConfig
      });
    }
    // eslint-disable-next-line
  }, [memoizedManualServerConfig, isUsingManualServer]);

  // Update the settings when a file path changes
  useEffect(() => {
    updateSettings({
      lastFilePath: filePath
    });
    // eslint-disable-next-line
  }, [filePath]);

  // Update the settings when items per page change
  useEffect(() => {
    updateSettings({
      itemsPerPage: itemsPerPage
    }); // Use type assertion to bypass the type check temporarily
    // eslint-disable-next-line
  }, [itemsPerPage]);

  // Handlers for server selection
  const handleServerSelect = (serverId: string | null) => {
    if (serverId === 'manual') {
      setManualServerModalOpen(true);
      // Initialize manual server config from settings if available
      if (state.settings.manualServerConfig) {
        setManualServerConfig(state.settings.manualServerConfig);
      }
      return;
    }

    if (serverId === 'local') {
      setIsUsingLocalMode(true);
      setSelectedServerId('local');
      setSelectedServer(null);

      // Update settings
      updateSettings({
        selectedServerId: 'local',
        isUsingLocalMode: true,
        isUsingManualServer: false
      });

      return;
    }

    setSelectedServerId(serverId);
    setIsUsingLocalMode(false);

    if (serverId) {
      const server = getConnection('server', serverId);
      if (server) {
        setSelectedServer(server);
        setIsUsingManualServer(false);

        // Update settings
        updateSettings({
          selectedServerId: serverId,
          isUsingLocalMode: false,
          isUsingManualServer: false
        });
      }
    } else {
      setSelectedServer(null);

      // Update settings
      updateSettings({
        selectedServerId: null,
        isUsingLocalMode: false,
        isUsingManualServer: false
      });
    }
  };

  // Initialize states from settings when component mounts
  useEffect(() => {
    if (!state.isLoading) {
      // Initialize server selection
      const savedServerId = state.settings.selectedServerId;
      if (savedServerId) {
        handleServerSelect(savedServerId);
      }

      // Initialize file path
      if (state.settings.lastFilePath) {
        setFilePath(state.settings.lastFilePath);
      }

      // Initialize items per page
      if (state.settings.itemsPerPage) {
        setItemsPerPage(state.settings.itemsPerPage);
      }
    }
    // Only run once when component mounts and settings are loaded
    // eslint-disable-next-line
  }, [state.isLoading]);

  // Handler for creating a backup
  const handleBackupConfig = async () => {
    if (!state.configFile) {
      toast.error("Error", {
        description: t('dbConfigManager.noConfigToBackup'),
      });
      return;
    }

    setLoading(true);

    try {
      let result;

      if (isUsingLocalMode) {
        result = await backupLocalConfigFile(state.configFile.path);
      } else if (state.selectedServer) {
        result = await backupConfigFile(state.configFile.path, state.selectedServer);
      } else {
        toast.error("Error", {
          description: t('dbConfigManager.selectServerError'),
        });
        setLoading(false);
        return;
      }

      if (!result.success) {
        setError(`Failed to backup file: ${result.output}`);
        toast.error("Error", {
          description: t('dbConfigManager.backupFailure', { output: result.output }),
        });
        return;
      }

      toast.success("Success", {
        description: t('dbConfigManager.backupSuccess'),
      });
    } catch (error) {
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      toast.error("Error", {
        description: t('dbConfigManager.updateError', { message: errorMessage }),
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler for fetching the config file
  const handleFetchConfig = async () => {
    if (!isUsingLocalMode && !state.selectedServer) {
      toast.error("Error", {
        description: t('dbConfigManager.selectServerError'),
      });
      return;
    }

    if (!filePath) {
      toast.error("Error", {
        description: t('dbConfigManager.enterConfigPathError'),
      });
      return;
    }

    setLoading(true);

    try {
      let result;

      if (isUsingLocalMode) {
        result = await fetchLocalConfigFile(filePath);
      } else if (state.selectedServer) {
        result = await fetchConfigFile(filePath, state.selectedServer);
      } else {
        // This should never happen due to the check above
        setLoading(false);
        return;
      }

      if (!result.success) {
        setError(`Failed to fetch config file: ${result.output}`);
        toast.error("Error", {
          description: t('dbConfigManager.fetchFailure', { output: result.output }),
        });
        return;
      }

      const parsedConfig = parseConfigFile(result.output);

      setConfigFile({
        path: filePath,
        items: parsedConfig.items,
        modifiedItems: []
      });

      toast.success("Success", {
        description: t('dbConfigManager.loadSuccess', { count: parsedConfig.items.length }),
      });
    } catch (error) {
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      toast.error("Error", {
        description: t('dbConfigManager.updateError', { message: errorMessage }),
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler for updating the config file
  const handleCommitChanges = async () => {
    if (!isUsingLocalMode && !state.selectedServer) {
      toast.error("Error", {
        description: t('dbConfigManager.selectServerError'),
      });
      return;
    }

    if (!state.configFile) {
      toast.error("Error", {
        description: t('dbConfigManager.noConfigLoaded'),
      });
      return;
    }

    if (state.configFile.modifiedItems.length === 0) {
      toast.info("Info", {
        description: t('dbConfigManager.noChangesToCommit'),
      });
      return;
    }

    setLoading(true);

    try {
      let result;

      if (isUsingLocalMode) {
        result = await updateLocalConfigFile(
          state.configFile.path,
          state.configFile.modifiedItems
        );
      } else if (state.selectedServer) {
        result = await updateConfigFile(
          state.configFile.path,
          state.configFile.modifiedItems,
          state.selectedServer
        );
      } else {
        // This should never happen due to the check above
        setLoading(false);
        return;
      }

      if (!result.success) {
        setError(`Failed to update config file: ${result.output}`);
        toast.error("Error", {
          description: t('dbConfigManager.updateFailure', { output: result.output }),
        });
        return;
      }

      // Mark all changes as committed
      commitChanges();

      toast.success("Success", {
        description: t('dbConfigManager.updateSuccess'),
      });
    } catch (error) {
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      toast.error("Error", {
        description: t('dbConfigManager.updateError', { message: errorMessage }),
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler for priority key management
  const handleAddPriorityKey = () => {
    if (newPriorityKey.trim() === '') return;

    addPriorityKey(newPriorityKey.trim());
    setNewPriorityKey('');
  };

  // Filtering and pagination logic
  const filteredItems = state.configFile?.items.filter(item =>
    item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.value.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
  // const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    const newValue = parseInt(value, 10);
    setItemsPerPage(newValue);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Handle page navigation
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Get the display name for the current server selection
  const getServerDisplayName = () => {
    if (isUsingLocalMode) {
      return t('dbConfigManager.localSystem');
    } else if (isUsingManualServer) {
      return `${manualServerConfig.username}@${manualServerConfig.ip}:${manualServerConfig.port}`;
    } else if (state.selectedServer) {
      return state.selectedServer.name;
    } else {
      return "Select Server";
    }
  };

  return (
    <Main fixed>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('dbConfigManager.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('dbConfigManager.description')}
        </p>
      </div>

      {/* Server selection and file path section */}
      <div className="my-4 grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('dbConfigManager.serverConnection')}</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`px-2 flex items-center gap-1 w-full ${selectedServerId ? 'border-green-500 bg-green-50' : ''}`}
                >
                  <IconServer size={18} className="shrink-0"/>
                  <span className="ml-2 truncate">{getServerDisplayName()}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0 bg-white border shadow-md" align="center">
                <ScrollArea className="max-h-[300px]">
                  <div className="p-2">
                    {/* Option for local system */}
                    <div
                      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 ${
                        isUsingLocalMode ? "bg-green-100" : ""
                      }`}
                      onClick={() => handleServerSelect('local')}
                    >
                      <div className="flex items-center gap-2">
                        <IconServer size={18}/>
                        <span>{t('dbConfigManager.localSystem')}</span>
                      </div>
                      {isUsingLocalMode && <Check size={18} className="text-green-600"/>}
                    </div>

                    <div className="my-1 px-3 text-xs text-gray-500 uppercase">{t('dbConfigManager.savedServers')}</div>

                    {connections.server.length > 0 ? (
                      connections.server.map((server) => (
                        <div
                          key={server.id}
                          className={`flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 ${
                            selectedServerId === server.id ? "bg-green-100" : ""
                          }`}
                          onClick={() => handleServerSelect(server.id)}
                        >
                          <div className="flex items-center gap-2">
                            <IconServer size={18}/>
                            <span>{server.name}</span>
                          </div>
                          {selectedServerId === server.id && <Check size={18} className="text-green-600"/>}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">{t('dbConfigManager.noSavedServers')}</div>
                    )}

                    <div className="mt-2 border-t pt-2">
                      <div
                        className="flex items-center rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-slate-100"
                        onClick={() => handleServerSelect('manual')}
                      >
                        <span className="text-blue-600">{t('dbConfigManager.enterServerManually')}</span>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('dbConfigManager.configFilePath')}</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="/etc/postgresql/15/main/postgresql.conf"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              className="flex-grow"
            />
            <Button onClick={handleFetchConfig} disabled={state.isLoading} className="shrink-0">
              {state.isLoading ? t('dbConfigManager.loading') : t('dbConfigManager.load')}
              {!state.isLoading && <IconArrowRight size={18} className="ml-2"/>}
            </Button>
          </div>
          <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2">
            {(isUsingLocalMode || state.selectedServer) && (
              <p className="text-xs text-muted-foreground">
                {t('dbConfigManager.using')} {getServerDisplayName()}
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Set the path to the test file in the project
                const testPath = 'electron/mock-postgresql.conf';
                setFilePath(testPath);
                // If not already in local mode, switch to it
                if (!isUsingLocalMode) {
                  handleServerSelect('local');
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {t('dbConfigManager.useTestFile')}
            </Button>
          </div>
        </div>
      </div>

      {/* Config table and controls */}
      {state.configFile ? (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <IconSearch size={18} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                <Input
                  placeholder={t('dbConfigManager.search')}
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to the first page when searching
                  }}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setPriorityModalOpen(true)}
                className="whitespace-nowrap"
              >
                <IconStar size={18} className="mr-2"/>
                {t('dbConfigManager.priorityKeys')}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              {state.configFile.modifiedItems.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={resetChanges}
                    className="whitespace-nowrap"
                    size="sm"
                  >
                    <IconX size={18} className="mr-2"/>
                    {t('dbConfigManager.reset')} ({state.configFile.modifiedItems.length})
                  </Button>
                  <Button
                    onClick={handleCommitChanges}
                    disabled={state.isLoading}
                    className="whitespace-nowrap"
                    size="sm"
                  >
                    <IconDeviceFloppy size={18} className="mr-2"/>
                    {t('dbConfigManager.commitChanges')}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={handleBackupConfig}
                disabled={state.isLoading}
                className="whitespace-nowrap"
                size="sm"
              >
                <IconFileExport size={18} className="mr-2"/>
                {t('dbConfigManager.backup')}
              </Button>
              <Button
                variant="outline"
                onClick={handleFetchConfig}
                disabled={state.isLoading}
                className="whitespace-nowrap"
                size="sm"
              >
                <IconRefresh size={18} className="mr-2"/>
                {t('dbConfigManager.refresh')}
              </Button>
            </div>
          </div>

          {/* Config table */}
          <div className="mt-4 overflow-x-auto">
            <DBConfigTable
              searchTerm={searchTerm}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
            />
          </div>

          {/* Pagination controls and items per page selector */}
          {totalPages > 0 && (
            <div className="mt-4 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span>{t('dbConfigManager.showingItems', {
                  start: startIndex + 1,
                  end: endIndex,
                  total: filteredItems.length
                })}</span>
                <div className="flex items-center ml-3">
                  <Label htmlFor="items-per-page" className="mr-2 text-xs">{t('dbConfigManager.itemsPerPage')}</Label>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="h-8 w-[70px]" id="items-per-page">
                      <SelectValue placeholder="10"/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {totalPages > 1 && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    {t('dbConfigManager.previous')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    {t('dbConfigManager.next')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <IconServer size={48} className="mx-auto mb-4 text-muted-foreground"/>
            <h3 className="text-lg font-medium">{t('dbConfigManager.noConfigLoaded')}</h3>
            <p className="text-muted-foreground">
              {t('dbConfigManager.selectServerToStart')}
            </p>
          </div>
        </div>
      )}

      {/* Priority Keys Modal */}
      <Dialog open={priorityModalOpen} onOpenChange={setPriorityModalOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[500px] max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>{t('dbConfigManager.priorityConfigKeys')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="priority-enabled">{t('dbConfigManager.enablePriorityKeys')}</Label>
              <Switch
                id="priority-enabled"
                checked={state.priorityConfig.enabled}
                onCheckedChange={setPriorityEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('dbConfigManager.addPriorityKey')}</Label>
              <div className="flex flex-col xs:flex-row gap-2">
                <Input
                  placeholder={t('dbConfigManager.enterKeyName')}
                  value={newPriorityKey}
                  onChange={(e) => setNewPriorityKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddPriorityKey();
                    }
                  }}
                  className="flex-grow"
                />
                <Button onClick={handleAddPriorityKey} className="shrink-0">{t('common.add')}</Button>
              </div>
            </div>

            <div>
              <Label>{t('dbConfigManager.currentPriorityKeys')}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {state.priorityConfig.keys.length > 0 ? (
                  state.priorityConfig.keys.map(key => (
                    <PriorityKeyBadge
                      key={key}
                      keyName={key}
                      onRemove={() => removePriorityKey(key)}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t('dbConfigManager.noPriorityKeys')}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setPriorityModalOpen(false)}>{t('dbConfigManager.done')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Server Modal */}
      <Dialog open={manualServerModalOpen} onOpenChange={setManualServerModalOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[425px] max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>{t('dbConfigManager.enterServerDetails')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="server-ip">{t('dbConfigManager.serverIp')}</Label>
                <Input
                  id="server-ip"
                  placeholder="e.g. 192.168.1.100"
                  value={manualServerConfig.ip}
                  onChange={(e) => setManualServerConfig({ ...manualServerConfig, ip: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="server-port">{t('dbConfigManager.sshPort')}</Label>
                <Input
                  id="server-port"
                  placeholder="e.g. 22"
                  value={manualServerConfig.port}
                  onChange={(e) => setManualServerConfig({ ...manualServerConfig, port: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">{t('dbConfigManager.username')}</Label>
                <Input
                  id="username"
                  placeholder="e.g. postgres"
                  value={manualServerConfig.username}
                  onChange={(e) => setManualServerConfig({ ...manualServerConfig, username: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="password">{t('dbConfigManager.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={manualServerConfig.password}
                  onChange={(e) => setManualServerConfig({ ...manualServerConfig, password: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualServerModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => {
              handleServerSelect('manual');
              setManualServerModalOpen(false);
            }}>
              {t('dbConfigManager.connect')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Main>
  );
};

export default DBConfigManager;