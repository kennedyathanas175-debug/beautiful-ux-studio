import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate, type Lang, type TKey } from "./i18n";

type Theme = "light" | "dark";

interface PrefsValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey) => string;
  theme: Theme;
  toggleTheme: () => void;
  liked: Set<string>;
  saved: Set<string>;
  toggleLike: (id: string) => boolean;
  toggleSave: (id: string) => boolean;
}

const PrefsContext = createContext<PrefsValue | null>(null);

function readSet(key: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  // English is the default; stored choices are applied after hydration.
  const [lang, setLangState] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("light");
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    const l = window.localStorage.getItem("tie.lang");
    if (l === "sw" || l === "en") setLangState(l);
    const th = window.localStorage.getItem("tie.theme");
    if (th === "dark" || th === "light") setTheme(th);
    setLiked(readSet("tie.liked"));
    setSaved(readSet("tie.saved"));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("tie.lang", l);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem("tie.theme", next);
      return next;
    });
  }, []);

  const makeToggle = (key: string, setter: typeof setLiked, current: Set<string>) => (id: string) => {
    const next = new Set(current);
    const on = !next.has(id);
    if (on) next.add(id);
    else next.delete(id);
    setter(next);
    window.localStorage.setItem(key, JSON.stringify([...next]));
    return on;
  };

  const value = useMemo<PrefsValue>(
    () => ({
      lang,
      setLang,
      t: (key) => translate(lang, key),
      theme,
      toggleTheme,
      liked,
      saved,
      toggleLike: makeToggle("tie.liked", setLiked, liked),
      toggleSave: makeToggle("tie.saved", setSaved, saved),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, theme, liked, saved],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside PrefsProvider");
  return ctx;
}
