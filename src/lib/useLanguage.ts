import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

export type Language = 'en' | 'zh';

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<Language>(
    (localStorage.getItem('i18nextLng') as Language) || 'en'
  );

  const changeLanguage = (language: Language) => {
    i18n.changeLanguage(language).then();
    setCurrentLanguage(language);
  };

  useEffect(() => {
    const savedLanguage = localStorage.getItem('i18nextLng') as Language;
    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  return {
    currentLanguage,
    changeLanguage,
    isEnglish: currentLanguage === 'en',
    isChinese: currentLanguage === 'zh',
  };
}; 