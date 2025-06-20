import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

// Define your translations
const resources = {
  en: {
    translation: {
      greeting: 'Hello, welcome!',
      dashboard: 'Dashboard',
    },
  },
  tr: {
    translation: {
      greeting: 'Merhaba, hoş geldiniz!',
      dashboard: 'Gösterge Paneli',
    },
  },
};

i18n
  // Detect user language
  // Learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // Init i18next
  // For all options read: https://www.i18next.com/overview/configuration-options
  .init({
    debug: process.env.NODE_ENV === 'development', // Enable debug mode in development
    fallbackLng: 'tr', // Fallback language if detected language is not available
    lng: 'tr', // Default language
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    resources, // Your translation resources
  });

export default i18n; 