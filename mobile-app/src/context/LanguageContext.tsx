import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppLanguage = 'vi' | 'en';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: (viText: string, enText: string) => string;
  translateCategory: (rawName?: string | null) => string;
}

const STORAGE_KEY = 'appLanguage';

const CATEGORY_TRANSLATIONS: Array<{ aliases: string[]; vi: string; en: string }> = [
  { aliases: ['potholes', 'pothole', 'ổ gà', 'o ga'], vi: 'Ổ gà', en: 'Potholes' },
  { aliases: ['road damage', 'đường hỏng'], vi: 'Đường hỏng', en: 'Road Damage' },
  { aliases: ['streetlight & power', 'streetlight and power', 'đèn đường & điện', 'mất điện', 'đèn đường', 'đèn bị hư'], vi: 'Đèn đường & Điện', en: 'Streetlight & Power' },
  { aliases: ['traffic congestion', 'tắc đường'], vi: 'Tắc đường', en: 'Traffic Congestion' },
  { aliases: ['waste & litter', 'waste and litter', 'rác thải', 'rác trên đường'], vi: 'Rác thải', en: 'Waste & Litter' },
  { aliases: ['public safety', 'an toàn công cộng'], vi: 'An toàn công cộng', en: 'Public Safety' },
  { aliases: ['fallen / damaged trees', 'fallen/damaged trees', 'cây cối', 'cây cối hư hỏng'], vi: 'Cây cối', en: 'Fallen / Damaged Trees' },
  { aliases: ['flooding & wastewater', 'flooding and wastewater', 'ngập nước & nước thải', 'ngập nước', 'nước ngập', 'nước thải'], vi: 'Ngập nước & Nước thải', en: 'Flooding & Wastewater' },
  { aliases: ['clogged drain', 'cống tắc'], vi: 'Cống tắc', en: 'Clogged Drain' },
  { aliases: ['public facility / elevator', 'public facility/elevator', 'thang máy & tiện ích', 'thang máy'], vi: 'Thang máy & Tiện ích', en: 'Public Facility / Elevator' },
];

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: React.PropsWithChildren) {
  const [language, setLanguageState] = useState<AppLanguage>('vi');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedLanguage) => {
        if (active && (storedLanguage === 'vi' || storedLanguage === 'en')) {
          setLanguageState(storedLanguage);
        }
      })
      .catch((error) => console.error('Unable to load saved language preference:', error));
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    await AsyncStorage.setItem(STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  const toggleLanguage = useCallback(
    async () => setLanguage(language === 'vi' ? 'en' : 'vi'),
    [language, setLanguage]
  );

  const translateCategory = useCallback(
    (rawName?: string | null) => {
      if (!rawName) return '';
      const normalizedName = rawName.trim().toLowerCase();
      const match = CATEGORY_TRANSLATIONS.find((category) =>
        category.aliases.some((alias) => alias.toLowerCase() === normalizedName)
      );
      return match ? match[language] : rawName;
    },
    [language]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t: (viText, enText) => (language === 'vi' ? viText : enText),
      translateCategory,
    }),
    [language, setLanguage, toggleLanguage, translateCategory]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider.');
  }
  return context;
}
