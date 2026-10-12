import { ar } from "@/dictionaries/ar";
import { en } from "@/dictionaries/en";
import type { Lang } from "./types";

export type Dictionary = typeof en;

export const dictionaries: Record<Lang, Dictionary> = { en, ar };

export function getDictionary(lang: Lang): Dictionary {
  return dictionaries[lang] || dictionaries.en;
}

export function oppositeLang(lang: Lang): Lang {
  return lang === "ar" ? "en" : "ar";
}
