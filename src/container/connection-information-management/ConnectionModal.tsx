import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@shadcn/components/ui/dialog';
import { Button } from '@shadcn/components/ui/button';
import { Input } from '@shadcn/components/ui/input';
import { Label } from '@shadcn/components/ui/label';
import { useConnectionContext } from '@/context/ConnectionContext';
import { ConnectionType } from '@/types/connection';
import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shadcn/components/ui/select";
import { useTranslation } from 'react-i18next';

interface ConnectionModalProps {
  connectionId?: string;
  connectionType: ConnectionType;
  isOpen: boolean;
  onClose: () => void;
}

interface ConnectionFormData {
  name: string;
  ip: string;
  port: string;
  username: string;
  password: string;
}

export function ConnectionModal({ connectionId, connectionType, isOpen, onClose }: ConnectionModalProps) {
  const { t } = useTranslation();
  const { addConnection, updateConnection, getConnection } = useConnectionContext();
  const [tempConnectionType, setTempConnectionType] = useState<ConnectionType>(connectionType || 'server');
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    ip: '',
    port: '',
    username: '',
    password: '',
  });

  useEffect(() => {
    if (connectionId) {
      const connection = getConnection(connectionType, connectionId);
      if (connection) {
        setFormData({
          name: connection.name,
          ip: connection.ip,
          port: connection.port.toString(),
          username: connection.username,
          password: connection.password,
        });
      }
    } else {
      setFormData({
        name: '',
        ip: '',
        port: '',
        username: '',
        password: '',
      });
    }
  }, [connectionId, connectionType, getConnection]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const connectionData = {
      ...formData,
      port: formData.port,
      type: connectionType,
    };

    if (connectionId) {
      // when updating, should use connectionType
      updateConnection(connectionType, connectionId, connectionData);
    } else {
      // when adding, should use tempConnectionType
      addConnection(tempConnectionType, connectionData);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{connectionId ? t('connection.editConnection') : t('connection.newConnection')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {!connectionId &&
              (<div className="grid gap-2">
                <Label>{t('connection.type')}</Label>
                <Select
                  value={tempConnectionType}
                  onValueChange={(value: ConnectionType) => {
                    setTempConnectionType(value);
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
              <Label htmlFor="name">{t('connection.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ip">{t('connection.host')}</Label>
              <Input
                id="ip"
                value={formData.ip}
                onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="port">{t('connection.port')}</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">{t('connection.username')}</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t('connection.password')}</Label>
              <Input
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">
              {connectionId ? t('common.update') : t('common.add')}
            </Button>
          </DialogFooter>
        </form>
        <DialogDescription/>
      </DialogContent>
    </Dialog>
  );
} 