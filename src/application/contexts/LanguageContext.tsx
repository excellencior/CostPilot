import React, { createContext, useContext, useState, useEffect } from 'react';
import { locales } from '../../shared/i18n/locales';
import { LocalRepository } from '../../infrastructure/local/local-repository';

export type Language = 'bn' | 'en';

interface LanguageContextProps {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (path: string, variables?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        const settings = LocalRepository.getSettings();
        return (settings.language as Language) || 'bn';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        LocalRepository.updateSettings({ language: lang });
    };

    const t = (path: string, variables?: Record<string, string | number>): string => {
        const keys = path.split('.');
        let currentObj: any = locales[language];

        for (const key of keys) {
            if (currentObj && typeof currentObj === 'object' && key in currentObj) {
                currentObj = currentObj[key];
            } else {
                // Fallback to English dictionary if key not found in current language
                let englishObj: any = locales['en'];
                for (const engKey of keys) {
                    if (englishObj && typeof englishObj === 'object' && engKey in englishObj) {
                        englishObj = englishObj[engKey];
                    } else {
                        englishObj = path;
                        break;
                    }
                }
                currentObj = englishObj;
                break;
            }
        }

        if (typeof currentObj !== 'string') {
            return path;
        }

        let translatedString = currentObj;
        if (variables) {
            Object.entries(variables).forEach(([name, val]) => {
                translatedString = translatedString.replace(`{${name}}`, String(val));
            });
        }

        return translatedString;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
