export interface DiffPlaceholder {
  key: string;
  value: string;
}

export interface DiffCommand {
  command: string;
  placeholders: DiffPlaceholder[];
} 