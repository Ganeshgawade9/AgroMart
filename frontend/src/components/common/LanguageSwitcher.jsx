import { useState, useEffect, useRef } from 'react';
import { Languages, Check } from 'lucide-react';
import { LANGUAGES, useT } from '../../i18n';

// Dropdown in the navbar to switch between English, Hindi and Marathi
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={t('lang.label')}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1 px-2 py-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 text-sm font-medium transition-colors"
      >
        <Languages className="w-4 h-4" />
        <span>{current.label}</span>
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          {LANGUAGES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button
                type="button"
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={`flex items-center justify-between w-full px-4 py-2 text-sm hover:bg-gray-50 ${l.code === lang ? 'text-primary-700 font-semibold' : 'text-gray-700'}`}
              >
                {l.label}
                {l.code === lang && <Check className="w-4 h-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
