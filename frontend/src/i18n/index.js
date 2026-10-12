import useLanguageStore from '../store/languageStore';
import en from './en';
import hi from './hi';
import mr from './mr';

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिन्दी', short: 'हि' },
  { code: 'mr', label: 'मराठी', short: 'मरा' },
];

export const DICTIONARIES = { en, hi, mr };
export const DEFAULT_LANGUAGE = 'en';

const interpolate = (text, params) =>
  params ? text.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m)) : text;

// Looks a key up in the chosen language, falls back to English, then to the key itself
export function translate(lang, key, params) {
  const text = DICTIONARIES[lang]?.[key] ?? en[key] ?? key;
  return interpolate(text, params);
}

// Same as translate, but returns `fallback` (not the key) when no translation exists.
// Used for values that come from the database, e.g. a unit like "bag" or a category name.
export function translateOr(lang, key, fallback) {
  return DICTIONARIES[lang]?.[key] ?? en[key] ?? fallback;
}

export function useT() {
  const lang = useLanguageStore((s) => s.lang);
  const setLang = useLanguageStore((s) => s.setLang);
  return {
    lang,
    setLang,
    t: (key, params) => translate(lang, key, params),
    tOr: (key, fallback) => translateOr(lang, key, fallback),
    // Translate a DB unit/pack value such as "bag" or "Litre"
    unit: (value) => (value ? translateOr(lang, `unit.${String(value).trim().toLowerCase()}`, value) : value),
  };
}
