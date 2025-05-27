import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shadcn/components/ui/dialog';
import { Button } from '@shadcn/components/ui/button';
import { Input } from '@shadcn/components/ui/input';
import { Label } from '@shadcn/components/ui/label';
import { Textarea } from '@shadcn/components/ui/textarea';
import { useSQLCommandContext } from '@/context/SQLCommandContext';
import { Command, DatabaseType, SQLCommand, SQLCommandType } from '@/types/sql-or-command';
import { Description } from "@radix-ui/react-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shadcn/components/ui/select";

interface SQLCommandModalProps {
  sqlCommandId?: string;
  sqlOrCommandType?: SQLCommandType;
  isOpen: boolean;
  onClose: () => void;
}

interface SQLCommandFormData {
  name: string;
  databaseType: DatabaseType;
  content: string;
  description: string;
}

export function SQLCommandModal({ sqlCommandId, sqlOrCommandType, isOpen, onClose }: SQLCommandModalProps) {
  const { t } = useTranslation();
  const { updateSQLCommand, getSQLCommand } = useSQLCommandContext();
  const [tempSqlOrCommandType, setTempSqlOrCommandType] = useState<SQLCommandType>(sqlOrCommandType || 'sql');
  const [formData, setFormData] = useState<SQLCommandFormData>({
    name: '',
    databaseType: 'PostgreSQL',
    content: '',
    description: '',
  });

  const isEditing = !!sqlCommandId;

  // Load SQL command-stream data if editing
  useEffect(() => {
    if (sqlCommandId) {
      const command = getSQLCommand(sqlCommandId);
      if (command) {
        // Check if it's an SQL command-stream (has databaseType)
        if ('databaseType' in command) {
          const sqlCommand = command as SQLCommand;
          setFormData({
            name: sqlCommand.name,
            databaseType: sqlCommand.databaseType,
            content: sqlCommand.content,
            description: sqlCommand.description || '',
          });
          setTempSqlOrCommandType('sql');
        } else {
          // It's a regular command-stream
          const regularCommand = command as Command;
          setFormData({
            name: regularCommand.name,
            databaseType: 'PostgreSQL', // This won't be used for commands
            content: regularCommand.content,
            description: regularCommand.description || '',
          });
          setTempSqlOrCommandType('command');
        }
      }
    } else {
      // Reset form when adding a new SQL command-stream
      setFormData({
        name: '',
        databaseType: 'PostgreSQL',
        content: '',
        description: '',
      });
      setTempSqlOrCommandType(sqlOrCommandType || 'sql');
    }
  }, [sqlCommandId, getSQLCommand, isOpen, sqlOrCommandType]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (tempSqlOrCommandType === 'sql') {
      // Handle SQL command-stream with database type
      const sqlCommandData: Partial<SQLCommand> = {
        name: formData.name,
        databaseType: formData.databaseType,
        content: formData.content,
        description: formData.description,
      };

      if (sqlCommandId) {
        updateSQLCommand('sql', sqlCommandId, sqlCommandData);
      }
    } else {
      // Handle regular command-stream (no database type)
      const commandData: Partial<Command> = {
        name: formData.name,
        content: formData.content,
        description: formData.description,
      };

      if (sqlCommandId) {
        updateSQLCommand('command', sqlCommandId, commandData);
      }
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('sqlManagement.editSqlCommand') : t('sqlManagement.addNewSqlCommand')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {!isEditing && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{t('sqlManagement.type')}</Label>
                <Select
                  value={tempSqlOrCommandType}
                  onValueChange={(value: SQLCommandType) => setTempSqlOrCommandType(value)}
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
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t('sqlManagement.name')}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
                className="col-span-3"
              />
            </div>
            {tempSqlOrCommandType === 'sql' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="databaseType" className="text-right">
                  {t('sqlManagement.databaseType')}
                </Label>
                <Input
                  id="databaseType"
                  value={formData.databaseType}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('databaseType', e.target.value)}
                  className="col-span-3"
                  placeholder={t('sqlManagement.databaseTypePlaceholder')}
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="content" className="text-right pt-2">
                {t('sqlManagement.content')}
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('content', e.target.value)}
                className="col-span-3 font-mono h-32"
                placeholder={tempSqlOrCommandType === 'sql' ? t('sqlManagement.enterSqlQuery') : t('sqlManagement.enterCommand')}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                {t('sqlManagement.sqlOrCommandDescription')}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
                className="col-span-3 h-20"
                placeholder={t('sqlManagement.enterDescription')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t('sqlManagement.cancel')}
            </Button>
            <Button type="submit">
              {isEditing ? t('sqlManagement.saveChanges') : t('sqlManagement.add')}
            </Button>
          </DialogFooter>
          <Description/>
        </form>
      </DialogContent>
    </Dialog>
  );
}