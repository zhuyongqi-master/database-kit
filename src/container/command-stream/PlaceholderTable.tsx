import { Input } from "@/components/shadcn/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/components/ui/select";
import DataTable, { Column, Row } from "@/components/ui/DataTable";
import { CommandStream, Placeholder, PlaceholderType } from "@/types/command";
import { useList } from "react-use";
import { isPlaceholderValid } from "./utils";
import { ConnectionInfoField } from "@/types/connection";
import { useTranslation } from "react-i18next";

interface PlaceholderTableProps {
  commandStream: CommandStream;
  commandIndex: number;
  configIndex: number;
  commandPlaceholderCompletion: boolean[][];
  updatePlaceholderCompletion: (item: boolean[][]) => void;
  savePlaceholders: (placeholders: Placeholder[]) => void;
}

function PlaceholderTable({
                            commandStream,
                            commandIndex,
                            configIndex,
                            commandPlaceholderCompletion,
                            updatePlaceholderCompletion,
                            savePlaceholders,
                          }: PlaceholderTableProps) {
  const { t } = useTranslation();
  const command = commandStream.commandList[commandIndex];
  const currentPlaceholderConfig = commandStream.placeholderConfigs[configIndex];
  const rows = command.placeholderKeys.map((placeholder, index): Row => {
    const match = placeholder.match(/\$\{([^}]+)}/);
    return {
      key: match ? match[1] : placeholder,
      value: currentPlaceholderConfig?.commandStreamPlaceholderValues[commandIndex]?.[index]?.value ?? "",
    };
  });
  const [placeholders, { updateAt: updatePlaceholderAt }] = useList<Placeholder>(
    commandStream.placeholderConfigs[configIndex]?.commandStreamPlaceholderValues[commandIndex] ?? [],
  );

  const handConfigFinished = () => savePlaceholders(placeholders);

  const columns: Column[] = [
    {
      header: t('commandStream.name'),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      cell: (row, _) => <span className="text-xs">{row.key}</span>,
    },
    {
      header: t('commandStream.value'),
      cell: (_, rowIndex, isConfigurable) => {
        const placeholder = placeholders[rowIndex];
        const placeholderType = placeholder?.type ?? PlaceholderType.Plain;
        const placeholderValue = placeholder?.value ?? "";
        const valid = commandPlaceholderCompletion[commandIndex][rowIndex];

        const onPlaceholderTypeChange = (type: PlaceholderType): void => {
          updatePlaceholderAt(rowIndex, {
            ...placeholders[rowIndex],
            type,
            // Reset value when changing type
            value: type === PlaceholderType.ServerInfo || type === PlaceholderType.DatabaseInfo ? "" : placeholderValue,
          });
        };

        // update validation status
        const updateValidation = (isValid: boolean) => {
          if (valid !== isValid) {
            commandPlaceholderCompletion[commandIndex][rowIndex] = isValid;
            updatePlaceholderCompletion(commandPlaceholderCompletion);
          }
        };

        // on every value change, validate the value and then update the commandPlaceholderCompeletion
        const onPlaceholderValueChange = (value: string): void => {
          const isValid = isPlaceholderValid(placeholderType, value, commandIndex);
          updateValidation(isValid);

          updatePlaceholderAt(rowIndex, {
            ...placeholders[rowIndex],
            value,
          });
        };

        return (
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <Select disabled={!isConfigurable} value={placeholderType} onValueChange={onPlaceholderTypeChange}>
                <SelectTrigger className="w-[110px] h-7 text-xs">
                  <SelectValue placeholder={t('commandStream.selectType')}/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PlaceholderType.Plain}>{t('commandStream.plain')}</SelectItem>
                  <SelectItem value={PlaceholderType.FormerOutput}>{t('commandStream.formerOutput')}</SelectItem>
                  <SelectItem value={PlaceholderType.ServerInfo}>{t('commandStream.serverInfo')}</SelectItem>
                  <SelectItem value={PlaceholderType.DatabaseInfo}>{t('commandStream.databaseInfo')}</SelectItem>
                </SelectContent>
              </Select>

              {placeholderType === PlaceholderType.Plain ? (
                <Input
                  value={placeholderValue}
                  onChange={(e) => onPlaceholderValueChange(e.target.value)}
                  placeholder={t('commandStream.enterValue')}
                  disabled={!isConfigurable}
                  className="h-7 text-xs"
                />
              ) : placeholderType === PlaceholderType.FormerOutput ? (
                isConfigurable ? (
                  <Select value={placeholderValue} onValueChange={onPlaceholderValueChange}>
                    <SelectTrigger className="flex-grow h-7 text-xs">
                      <SelectValue placeholder={t('commandStream.selectValue')}/>
                    </SelectTrigger>
                    <SelectContent>
                      {Array(commandIndex)
                        .fill(null)
                        .map((_, i) => {
                          return (
                            <SelectItem key={commandStream.commandList[i].name} value={i.toString()}>
                              {commandStream.commandList[i].name}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="py-1 px-2 border rounded bg-muted text-xs h-7 flex items-center">
                    {commandStream.commandList[+placeholderValue].name}
                  </div>
                )
              ) : placeholderType === PlaceholderType.ServerInfo || placeholderType === PlaceholderType.DatabaseInfo ? (
                <div className="flex flex-col gap-1 flex-grow">
                  <div className="flex gap-1">
                    {/* Field selection - Allow selection even if connection not selected yet */}
                    <Select
                      value={placeholderValue}
                      onValueChange={onPlaceholderValueChange}
                      disabled={!isConfigurable}
                    >
                      <SelectTrigger className="w-[80px] h-7 text-xs">
                        <SelectValue placeholder={t('commandStream.field')}/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ConnectionInfoField.Ip}>{t('commandStream.ip')}</SelectItem>
                        <SelectItem value={ConnectionInfoField.Port}>{t('commandStream.port')}</SelectItem>
                        <SelectItem value={ConnectionInfoField.Username}>{t('commandStream.username')}</SelectItem>
                        <SelectItem value={ConnectionInfoField.Password}>{t('commandStream.password')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
            </div>

            {!valid && (
              <div className="text-[10px] text-red-500">
                {placeholderType === PlaceholderType.Plain
                  ? t('commandStream.enterValueError')
                  : placeholderType === PlaceholderType.FormerOutput
                    ? t('commandStream.selectCommandError')
                    : t('commandStream.selectFieldError')}
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return <DataTable title={t('commandStream.parameters')} columns={columns} rows={rows}
                    onConfigFinished={handConfigFinished}/>;
}

export default PlaceholderTable;
