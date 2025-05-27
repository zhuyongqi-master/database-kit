import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shadcn/components/ui/table';
import { Button } from '@shadcn/components/ui/button';
import { Input } from '@shadcn/components/ui/input';
import { IconCheck, IconEdit, IconStar, IconX } from '@tabler/icons-react';
import { useDBConfigContext } from '@/context/DBConfigContext';
import { DBConfigItem } from '@/types/db-config';

interface DBConfigTableProps {
  searchTerm: string;
  currentPage: number;
  itemsPerPage?: number;
}

const DBConfigTable: React.FC<DBConfigTableProps> = ({
  searchTerm,
  currentPage,
  itemsPerPage = 10
}) => {
  const { state, modifyConfigItem, getSortedItems } = useDBConfigContext();
  const { t } = useTranslation();
  const [editingItem, setEditingItem] = useState<DBConfigItem | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Get the filtered and sorted items
  const items = getSortedItems().filter(item => 
    searchTerm === '' || 
    item.key.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.value.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, items.length);
  const currentItems = items.slice(startIndex, endIndex);
  
  // Check if an item is a priority item
  const isPriorityItem = (key: string): boolean => {
    return state.priorityConfig.enabled && state.priorityConfig.keys.includes(key);
  };
  
  // Handle editing
  const handleStartEdit = (item: DBConfigItem) => {
    setEditingItem(item);
    setEditValue(item.value);
  };
  
  const handleSaveEdit = () => {
    if (editingItem) {
      modifyConfigItem({
        ...editingItem,
        value: editValue,
        isModified: true
      });
      setEditingItem(null);
      setEditValue('');
    }
  };
  
  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
  };
  
  return (
    <div className="w-full">
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px] min-w-[150px]">{t('dbConfigManager.tableHeaderKey')}</TableHead>
                <TableHead>{t('dbConfigManager.tableHeaderValue')}</TableHead>
                <TableHead className="w-[100px] min-w-[80px] text-center">{t('dbConfigManager.tableHeaderActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.length > 0 ? (
                currentItems.map((item) => (
                  <TableRow 
                    key={`${item.key}-${item.lineNumber}`}
                    className={`
                      ${item.isModified ? 'bg-yellow-50' : ''} 
                      ${isPriorityItem(item.key) ? 'bg-blue-50' : ''}
                    `}
                  >
                    <TableCell className="font-medium break-all">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="mr-1 truncate max-w-[150px] sm:max-w-full" title={item.key}>{item.key}</span>
                        <div className="flex flex-wrap gap-1">
                          {item.isModified && (
                            <span className="rounded-full bg-yellow-200 px-2 py-0.5 text-xs whitespace-nowrap">
                              {t('dbConfigManager.statusModified')}
                            </span>
                          )}
                          {isPriorityItem(item.key) && (
                            <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs items-center inline-flex whitespace-nowrap">
                              <IconStar size={12} className="mr-1" />
                              {t('dbConfigManager.statusPriority')}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingItem?.lineNumber === item.lineNumber ? (
                        <Input 
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit();
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          autoFocus
                          className="min-w-[100px]"
                        />
                      ) : (
                        <span className="font-mono text-sm break-all">{item.value}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {editingItem?.lineNumber === item.lineNumber ? (
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={handleCancelEdit}
                            className="p-1 h-8 w-8"
                          >
                            <IconX size={16} />
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={handleSaveEdit}
                            className="p-1 h-8 w-8"
                          >
                            <IconCheck size={16} />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleStartEdit(item)}
                          className="py-1 h-8"
                        >
                          <IconEdit size={16} className="mr-1 sm:mr-1" />
                          <span className="hidden sm:inline">{t('common.edit')}</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    {searchTerm ? t('dbConfigManager.noResultsFound') : t('dbConfigManager.noConfigItems')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default DBConfigTable;