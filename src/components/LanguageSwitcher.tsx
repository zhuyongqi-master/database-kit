import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@shadcn/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@shadcn/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { Language, useLanguage } from '@/lib/useLanguage';

const LanguageSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const { changeLanguage, isEnglish, isChinese } = useLanguage();

  const handleLanguageChange = (lng: Language) => {
    changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Globe className="h-4 w-4"/>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleLanguageChange('en')}
          className={isEnglish ? 'bg-accent' : ''}
        >
          {t('common.english')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange('zh')}
          className={isChinese ? 'bg-accent' : ''}
        >
          {t('common.chinese')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher; 