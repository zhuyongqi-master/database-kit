export type ConnectionType = 'server' | 'database';

export interface ConnectionInfo {
  id: string;
  name: string;
  type: ConnectionType;
  ip: string;
  port: string;
  username: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionData {
  server: ConnectionInfo[];
  database: ConnectionInfo[];
}

export enum ConnectionInfoField {
  Ip = "ip",
  Port = "port",
  Username = "username",
  Password = "password",
}