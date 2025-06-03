import { Button } from "@/components/shadcn/components/ui/button";
import { Input } from "@/components/shadcn/components/ui/input";
import { Textarea } from "@/components/shadcn/components/ui/textarea";
import { DiffPlaceholder } from '@/types/diff';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDiffViewer, { DiffMethod, ReactDiffViewerStylesOverride } from 'react-diff-viewer';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/components/ui/card";
import { EyeIcon, Loader2, Maximize2, PlayIcon, TerminalIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/shadcn/components/ui/popover";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/shadcn/components/ui/dialog";

// Styles for ReactDiffViewer based on documentation
const diffStyles: ReactDiffViewerStylesOverride = {
  variables: {
    light: {
      diffViewerBackground: '#f8f9fa',
      diffViewerColor: '#212529',
      addedBackground: '#e6ffec',
      addedColor: '#24292e',
      removedBackground: '#ffebe9',
      removedColor: '#24292e',
      wordAddedBackground: '#acf2bd',
      wordRemovedBackground: '#fdb8c0',
      addedGutterBackground: '#cdffd8',
      removedGutterBackground: '#ffdce0',
      gutterBackground: '#f7f7f7',      // Default from lib
      gutterBackgroundDark: '#f3f1f1', // Default from lib (not used here)
      highlightBackground: '#fffbdd',
      highlightGutterBackground: '#fff5b1',
      emptyLineBackground: '#fafbfc',   // Default from lib
      gutterColor: '#999',             // Custom for softer line numbers
      addedGutterColor: '#999',        // Custom
      removedGutterColor: '#999',      // Custom
      diffViewerTitleBackground: '#efefef', // Custom title background
      diffViewerTitleColor: '#333',        // Custom title text
      diffViewerTitleBorderColor: '#ddd',  // Custom title border
    },
  },
  titleBlock: { // Styles for the "Input" / "Output" titles
    fontSize: '0.8rem',
    fontWeight: 600,
    padding: '6px 10px',
    margin: '0px',
    borderBottom: '1px solid #ddd',
  },
  contentText: { // Styles for the text content within each diff line
    fontSize: '0.75rem',
    lineHeight: '1.35',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  line: { // Styles for the table row (tr) for each line
    // Default padding/margin is usually fine. Avoid setting width here.
  },
  gutter: { // Styles for the gutter (td for line numbers)
    padding: '0 6px',
    minWidth: '40px',
    whiteSpace: 'nowrap' as const, // Prevent line numbers from wrapping
  },
  emptyGutter: { // Ensure empty gutters don't collapse if they have padding
    padding: '0 6px',
  },
  // Ensure the main content area (td) also allows for proper text flow
  content: {
    // Avoid setting width here; let the library's flexbox handle it.
    // whiteSpace and overflowWrap are better handled in contentText for the span inside.
  },
  splitView: {
    // The library itself should apply display: flex to this container.
    // We mainly want to ensure its children (the two panes) can be equal.
  }
};

// PlaceholderItem: Key and value in a row
const PlaceholderItem = ({
                           placeholder,
                           onChange
                         }: {
  placeholder: DiffPlaceholder;
  onChange: (value: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
      <span
        className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 whitespace-nowrap">
        {'${' + placeholder.key + '}'}
      </span>
      <Input
        value={placeholder.value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('commandDiff.valueFor', { "0": placeholder.key })}
        className="text-xs h-7 flex-1 border-gray-200"
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 flex-shrink-0 border-gray-200"
          >
            <Maximize2 className="h-3 w-3"/>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-96 bg-white shadow-lg rounded-md border border-gray-200 p-0">
          <div className="space-y-2 p-3">
            <h4 className="font-medium text-sm text-gray-800">{t('commandDiff.edit', { 0: placeholder.key })}</h4>
            <Textarea
              value={placeholder.value}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-[150px] border-gray-200 text-xs"
              autoFocus
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// PlaceholderGrid: Dynamic multi-column layout
const PlaceholderGrid = ({
                           placeholders,
                           onPlaceholderChange
                         }: {
  placeholders: DiffPlaceholder[],
  onPlaceholderChange: (key: string, value: string) => void
}) => {
  const { t } = useTranslation();

  if (placeholders.length === 0) {
    return (
      <div className="text-xs text-gray-500 italic p-2">
        {t('commandDiff.noPlaceholders')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {placeholders.map((placeholder) => (
        <PlaceholderItem
          key={placeholder.key}
          placeholder={placeholder}
          onChange={(value) => onPlaceholderChange(placeholder.key, value)}
        />
      ))}
    </div>
  );
};

const STORAGE_KEY = 'commandDiffTool_state_v1';

const CommandDiff: React.FC = () => {
  const [command, setCommand] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [placeholders, setPlaceholders] = useState<DiffPlaceholder[]>([{ key: 'input', value: '' }]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewCommandString, setPreviewCommandString] = useState<string>('');
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState<boolean>(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const data = JSON.parse(savedState);
        setCommand(data.command || '');
        setInput(data.input || '');
        let loadedPlaceholders = Array.isArray(data.placeholders) ? data.placeholders : [];
        const inputPlaceholderExists = loadedPlaceholders.some((p: DiffPlaceholder) => p.key === 'input');
        if (inputPlaceholderExists) {
          loadedPlaceholders = loadedPlaceholders.map((p: DiffPlaceholder) =>
            p.key === 'input' ? { ...p, value: data.input || '' } : p
          );
        } else {
          loadedPlaceholders.push({ key: 'input', value: data.input || '' });
        }
        const uniquePlaceholders = loadedPlaceholders.reduce((acc: DiffPlaceholder[], current: DiffPlaceholder) => {
          const x = acc.find((item: DiffPlaceholder) => item.key === current.key);
          if (!x) {
            return acc.concat([current]);
          } else {
            return acc;
          }
        }, [] as DiffPlaceholder[]);
        setPlaceholders(uniquePlaceholders);

      } catch (e) {
        console.error("Failed to parse saved state:", e);
        setPlaceholders([{ key: 'input', value: '' }]);
      }
    } else {
      setPlaceholders([{ key: 'input', value: '' }]);
    }
    setHasLoadedFromStorage(true); // Signal that loading is complete
  }, []);

  // Save state to localStorage when command-stream, input, or placeholders change
  useEffect(() => {
    if (!hasLoadedFromStorage) return; // Only save after initial load

    const stateToSave = {
      command,
      input,
      placeholders,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [command, input, placeholders, hasLoadedFromStorage]);

  // Parse command-stream to find placeholders and update the placeholder state
  useEffect(() => {
    const regex = /\$\{([^}]+)}/g;
    const foundKeys = new Set<string>();
    let match;
    foundKeys.add('input');

    while ((match = regex.exec(command)) !== null) {
      foundKeys.add(match[1]);
    }

    setPlaceholders(prevPlaceholders => {
      const newPlaceholdersMap = new Map<string, DiffPlaceholder>();
      foundKeys.forEach(key => {
        const existing = prevPlaceholders.find(p => p.key === key);
        newPlaceholdersMap.set(key, {
          key,
          value: existing?.value || (key === 'input' ? input : ''),
        });
      });
      const currentInputPlaceholder = newPlaceholdersMap.get('input');
      if (currentInputPlaceholder) {
        currentInputPlaceholder.value = input;
      }
      return Array.from(newPlaceholdersMap.values());
    });
  }, [command, input]);

  const handlePlaceholderChange = (key: string, value: string) => {
    if (key === 'input') {
      setInput(value);
    } else {
      setPlaceholders(prev =>
        prev.map(p => (p.key === key ? { ...p, value } : p))
      );
    }
  };

  const generateProcessedCommand = () => {
    let processed = command;
    placeholders.forEach(p => {
      const val = String(p.value);
      processed = processed.replace(
        new RegExp(`\\$\\{${p.key}\\}`, 'g'),
        val
      );
    });
    return processed;
  };

  const handlePreview = () => {
    setPreviewCommandString(generateProcessedCommand());
    setShowPreview(true);
  };

  const executeCommand = async () => {
    try {
      setIsExecuting(true);
      setError(null);
      const processedCommand = generateProcessedCommand();
      const result = await window.ipcRenderer.invoke('execute-local-command-stream', processedCommand);

      if (!result.success) {
        setError(result.output);
        setOutput('');
      } else {
        setOutput(result.output);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  const { t } = useTranslation();

  const exampleCommands = [
    'java -jar "${input}"',
    // 'grep "${pattern}" "${input}"',
  ];
  const getPlaceholderExample = () => exampleCommands[Math.floor(Math.random() * exampleCommands.length)];

  return (
    <div className="p-4 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <TerminalIcon className="h-5 w-5 text-gray-700"/>
          <h1 className="text-lg font-bold text-gray-800">{t('commandDiff.title')}</h1>
        </div>

        <div className="grid gap-4">
          {/* Command Section */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="py-2 px-3 border-b">
              <CardTitle className="text-sm">{t('commandDiff.command')}</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder={getPlaceholderExample()}
                  className="h-8 text-sm flex-1"
                  disabled={isExecuting}
                />
                <Button
                  onClick={handlePreview}
                  disabled={!command.trim()}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs flex-shrink-0"
                >
                  <EyeIcon className="h-3.5 w-3.5 mr-1"/>
                  {t('commandDiff.preview')}
                </Button>
                <Button
                  onClick={executeCommand}
                  disabled={isExecuting || !command.trim()}
                  variant={isExecuting ? "outline" : "default"}
                  size="sm"
                  className="h-8 text-xs flex-shrink-0"
                >
                  {isExecuting ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin"/>
                  ) : (
                    <PlayIcon className="h-3.5 w-3.5 mr-1"/>
                  )}
                  {isExecuting ? t('commandDiff.executing') : t('commandDiff.execute')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Placeholders Section */}
          {placeholders.length > 0 && (
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="py-2 px-3 border-b">
                <CardTitle className="text-sm">{t('commandDiff.placeholders')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <PlaceholderGrid
                  placeholders={placeholders}
                  onPlaceholderChange={handlePlaceholderChange}
                />
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded-md">
              <p className="font-medium mb-1 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                        clipRule="evenodd"/>
                </svg>
                {t('commandDiff.error')}
              </p>
              <pre
                className="whitespace-pre-wrap text-xs bg-white p-2 rounded border border-red-100 max-h-[100px] overflow-auto">{error}</pre>
            </div>
          )}

          {/* Diff View Section */}
          {
            <Card className="shadow-sm border-gray-200 overflow-hidden">
              <CardHeader className="py-2 px-3 border-b">
                <CardTitle className="text-sm">{t('commandDiff.diffView')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[70vh] overflow-auto">
                  <ReactDiffViewer
                    oldValue={input}
                    newValue={output}
                    splitView={true}
                    leftTitle={t('commandDiff.input')}
                    rightTitle={t('commandDiff.output')}
                    styles={diffStyles}
                    compareMethod={DiffMethod.CHARS}
                    useDarkTheme={false}
                    showDiffOnly={false}
                  />
                </div>
              </CardContent>
            </Card>
          }

          {/* Command Preview Dialog */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="sm:max-w-2xl bg-white shadow-lg rounded-md border border-gray-200">
              <DialogHeader>
                <DialogTitle>{t('commandDiff.commandPreview')}</DialogTitle>
                <DialogDescription>
                  {t('commandDiff.commandPreviewDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="my-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                <pre className="text-xs whitespace-pre-wrap break-all font-mono text-gray-700">
                  {previewCommandString}
                </pre>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">{t('commandDiff.close')}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </div>
  );
};

export default CommandDiff;