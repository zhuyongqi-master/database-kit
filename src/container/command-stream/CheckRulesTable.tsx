import { Button } from "@shadcn/components/ui/button";
import { ArrowDown, ArrowUp, Edit, Plus, Save, XCircle } from "lucide-react";
import { useState } from "react";
import { CheckRule, CheckRuleType, CommandStream } from "@/types/command";
import { Input } from "@/components/shadcn/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/shadcn/components/ui/select";
import { useTranslation } from "react-i18next";

interface CheckRulesTableProps {
  commandStream: CommandStream;
  commandIndex: number;
  isCheckRulesConfigurable: boolean;
  toggleCheckRulesConfigurable: () => void;
  saveCheckRules: (checkRules: CheckRule[]) => void;
}

function CheckRulesTable({
                           commandStream,
                           commandIndex,
                           isCheckRulesConfigurable,
                           toggleCheckRulesConfigurable,
                           saveCheckRules,
                         }: CheckRulesTableProps) {
  const { t } = useTranslation();
  const checkRules = commandStream.checkRuleConfigs?.[0]?.commandStreamCheckRule[commandIndex] || [];

  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleType, setNewRuleType] = useState<CheckRuleType>(CheckRuleType.StringEqual);
  const [newRuleValue, setNewRuleValue] = useState("");

  const addCheckRule = () => {
    if (!newRuleName.trim()) return;

    const newRule: CheckRule = {
      name: newRuleName,
      type: newRuleType,
      value: newRuleValue,
    };

    checkRules.push(newRule);
    saveCheckRules(checkRules);

    // Reset form fields
    setNewRuleName("");
    setNewRuleValue("");
  };

  // Update rule directly
  const updateRule = <T extends keyof CheckRule>(index: number, field: T, value: CheckRule[T]) => {
    if (!isCheckRulesConfigurable) return;
    checkRules[index][field] = value;
    saveCheckRules(checkRules);
  };

  const deleteCheckRule = (index: number) => {
    checkRules.splice(index, 1);
    saveCheckRules(checkRules);
  };

  const moveRuleUp = (index: number) => {
    if (index === 0) return; // Can't move up if already at the top
    const temp = checkRules[index];
    checkRules[index] = checkRules[index - 1];
    checkRules[index - 1] = temp;
    saveCheckRules(checkRules);
  };

  const moveRuleDown = (index: number) => {
    if (index === checkRules.length - 1) return; // Can't move down if already at the bottom
    const temp = checkRules[index];
    checkRules[index] = checkRules[index + 1];
    checkRules[index + 1] = temp;
    saveCheckRules(checkRules);
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-medium">{t('commandStream.currentRules')}</h3>
        <Button
          variant={isCheckRulesConfigurable ? "default" : "outline"}
          size="sm"
          onClick={toggleCheckRulesConfigurable}
          className="h-6 px-2 text-xs"
        >
          {isCheckRulesConfigurable ? (
            <><Save className="h-3 w-3 mr-1"/> {t('commandStream.save')}</>
          ) : (
            <><Edit className="h-3 w-3 mr-1"/> {t('commandStream.edit')}</>
          )}
        </Button>
      </div>

      <div className="py-1">
        {checkRules.length === 0 ? (
          <p className="text-center text-xs text-gray-500 py-1">{t('commandStream.noRules')}</p>
        ) : (
          <div className="space-y-1">
            {checkRules.map((rule, index) => (
              <div key={index} className="flex items-center gap-1 p-1 border rounded">
                <Input
                  type="text"
                  className="flex-1 min-w-[80px] h-7 text-xs"
                  value={rule.name}
                  onChange={(e) => updateRule(index, "name", e.target.value)}
                  disabled={!isCheckRulesConfigurable}
                  placeholder={t('commandStream.ruleName')}
                />
                <Select
                  value={rule.type}
                  onValueChange={(value) => updateRule(index, "type", value as CheckRuleType)}
                  disabled={!isCheckRulesConfigurable}
                >
                  <SelectTrigger className="w-[110px] h-7 text-xs">
                    <SelectValue placeholder={t('commandStream.selectType')}/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CheckRuleType.StringEqual}>{t('commandStream.stringEqual')}</SelectItem>
                    <SelectItem value={CheckRuleType.Regex}>{t('commandStream.regex')}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  className="flex-1 min-w-[80px] h-7 text-xs"
                  value={rule.value}
                  onChange={(e) => updateRule(index, "value", e.target.value)}
                  disabled={!isCheckRulesConfigurable}
                  placeholder={t('commandStream.enterPattern')}
                />
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCheckRule(index)}
                    disabled={!isCheckRulesConfigurable}
                    className="h-6 w-6 p-0"
                  >
                    <XCircle className={`h-3.5 w-3.5 ${!isCheckRulesConfigurable ? "text-gray-300" : "text-red-500"}`}/>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveRuleUp(index)}
                    disabled={!isCheckRulesConfigurable || index === 0}
                    className="h-6 w-6 p-0"
                  >
                    <ArrowUp
                      className={`h-3.5 w-3.5 ${
                        !isCheckRulesConfigurable || index === 0 ? "text-gray-300" : "text-blue-500"
                      }`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveRuleDown(index)}
                    disabled={!isCheckRulesConfigurable || index === checkRules.length - 1}
                    className="h-6 w-6 p-0"
                  >
                    <ArrowDown
                      className={`h-3.5 w-3.5 ${
                        !isCheckRulesConfigurable || index === checkRules.length - 1 ? "text-gray-300" : "text-blue-500"
                      }`}
                    />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isCheckRulesConfigurable && (
          <div className="mt-2 border rounded p-2">
            <h3 className="text-xs font-medium mb-1">{t('commandStream.addNewRule')}</h3>
            <div className="flex items-center gap-1">
              <Input
                type="text"
                className="flex-grow min-w-[80px] h-7 text-xs"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder={t('commandStream.ruleName')}
              />
              <Select
                value={newRuleType}
                onValueChange={(value) => setNewRuleType(value as CheckRuleType)}
              >
                <SelectTrigger className="w-[110px] h-7 text-xs">
                  <SelectValue placeholder={t('commandStream.selectType')}/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CheckRuleType.StringEqual}>{t('commandStream.stringEqual')}</SelectItem>
                  <SelectItem value={CheckRuleType.Regex}>{t('commandStream.regex')}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="text"
                className="flex-grow min-w-[80px] h-7 text-xs"
                value={newRuleValue}
                onChange={(e) => setNewRuleValue(e.target.value)}
                placeholder={t('commandStream.enterPattern')}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={addCheckRule}
                disabled={!newRuleName.trim()}
                className="h-7 w-7 p-0"
              >
                <Plus className="h-4 w-4"/>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CheckRulesTable;
