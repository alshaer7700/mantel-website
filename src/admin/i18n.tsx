import { createContext, useCallback, useContext } from "react";
import { AR } from "@/admin/ar";

/*
 * The dashboard's two languages.
 *
 * Every visible string is written in English at the call site — t("Save") —
 * and the English sentence is the key into the Arabic dictionary in ar.ts. A
 * sentence without a translation shows in English rather than as a blank or a
 * key name, so a missing entry is a small visual inconsistency, never a broken
 * screen. scripts/admin-i18n-check.mjs lists anything still untranslated.
 */

export type Lang = "en" | "ar";

let activeLang: Lang = "en";

/** For code outside React (error helpers) that still needs to speak the language. */
export function currentLang(): Lang {
  return activeLang;
}

export function setActiveLang(lang: Lang) {
  activeLang = lang;
}

export function translate(lang: Lang, text: string, vars?: Record<string, string | number>): string {
  let out = lang === "ar" ? (AR[text] ?? text) : text;
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      out = out.split(`{${key}}`).join(String(value));
    }
  }
  return out;
}

type LangContextValue = { lang: Lang; setLang: (lang: Lang) => void };

export const LangContext = createContext<LangContextValue>({ lang: "en", setLang: () => {} });

export function useLang() {
  return useContext(LangContext);
}

export type TFunction = (text: string, vars?: Record<string, string | number>) => string;

export function useT(): TFunction {
  const { lang } = useLang();
  return useCallback((text: string, vars?: Record<string, string | number>) => translate(lang, text, vars), [lang]);
}

/** Picks the Arabic field when the dashboard is in Arabic and it has a value. */
export function pick(lang: Lang, en: string | null | undefined, ar: string | null | undefined): string {
  if (lang === "ar" && ar && ar.trim()) return ar;
  return en ?? "";
}
