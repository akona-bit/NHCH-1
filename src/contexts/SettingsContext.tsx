import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'vi';
type Theme = 'dark' | 'light';

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.spatial_map': 'Spatial Map',
    'nav.alerts': 'System Alerts',
    'nav.knowledge': 'Knowledge',
    'nav.questions': 'Questions',
    'nav.matrix': 'Matrix',
    'nav.exams': 'Exams',
    'nav.analytics': 'Analytics',
    'nav.irt': 'IRT Analysis',
    'nav.users': 'Users',
    'app.title': 'VACT Admin',
    'app.subtitle': 'System Control',
    'app.deploy': 'Deploy_Patch',
    'app.search': 'Search parameters, nodes, ids...',
  },
  vi: {
    'nav.dashboard': 'Bảng điều khiển',
    'nav.spatial_map': 'Kho ngữ liệu',
    'nav.alerts': 'Cảnh báo hệ thống',
    'nav.knowledge': 'Kiến thức',
    'nav.questions': 'Câu hỏi',
    'nav.matrix': 'Ma trận',
    'nav.exams': 'Đề thi',
    'nav.analytics': 'Phân tích',
    'nav.irt': 'Hiệu chuẩn IRT',
    'nav.users': 'Người dùng',
    'app.title': 'VACT Admin',
    'app.subtitle': 'Hệ thống điều khiển',
    'app.deploy': 'Triển khai bản vá',
    'app.search': 'Tìm kiếm tham số, mã...',
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('app-language') as Language) || 'en';
  });
  
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = (localStorage.getItem('app-theme') as Theme) || 'dark';
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (savedTheme === 'light') {
        root.classList.add('theme-light');
        document.body.classList.add('theme-light');
      } else {
        root.classList.remove('theme-light');
        document.body.classList.remove('theme-light');
      }
    }
    return savedTheme;
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
  }, [language]);

  React.useLayoutEffect(() => {
    localStorage.setItem('app-theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('theme-light');
      document.body.classList.add('theme-light');
    } else {
      root.classList.remove('theme-light');
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <SettingsContext.Provider value={{ language, setLanguage, theme, setTheme, t }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
