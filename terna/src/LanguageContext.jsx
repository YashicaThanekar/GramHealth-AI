import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";

// ── Only English is bundled inline (critical path). ──────────────
// Hindi & Marathi are lazy-loaded on demand → saves ~60 KB from initial load.
import enStrings from "./locales/en.json";

const LanguageContext = createContext();

// Cache loaded translations so we don't re-fetch
const translationCache = { en: enStrings };

async function loadTranslation(lang) {
  if (translationCache[lang]) return translationCache[lang];
  try {
    // Vite dynamic import — each JSON becomes its own tiny chunk
    const mod =
      lang === "hi"
        ? await import("./locales/hi.json")
        : await import("./locales/mr.json");
    translationCache[lang] = mod.default;
    return mod.default;
  } catch {
    return enStrings; // fallback
  }
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || "en";
  });

  const [strings, setStrings] = useState(
    translationCache[language] || enStrings,
  );

  useEffect(() => {
    localStorage.setItem("language", language);
    loadTranslation(language).then(setStrings);
  }, [language]);

  const t = useCallback(
    (key) => strings[key] || enStrings[key] || key,
    [strings],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
