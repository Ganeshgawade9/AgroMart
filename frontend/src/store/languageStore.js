import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SUPPORTED = ['en', 'hi', 'mr'];

const applyToDocument = (lang) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
};

// Remembers the chosen language in localStorage so it survives reloads
const useLanguageStore = create(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => {
        if (!SUPPORTED.includes(lang)) return;
        applyToDocument(lang);
        set({ lang });
      },
    }),
    {
      name: 'language-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!SUPPORTED.includes(state.lang)) state.lang = 'en';
          applyToDocument(state.lang);
        }
      },
    }
  )
);

export default useLanguageStore;
