import { createMemo, createSignal, createEffect } from "solid-js";
import { aria2Store } from "../store";

type TranslationMap = Record<string, string>;
const translations: Record<string, () => Promise<{ default: TranslationMap }>> =
  {
    en: () => import("./langs/en.json"),
    "zh-cn": () => import("./langs/zh-cn.json"),
    "zh-tw": () => import("./langs/zh-tw.json"),
    "es": () => import("./langs/es.json"),
    "fr-FR": () => import("./langs/fr-FR.json"),
    "de-DE": () => import("./langs/de-DE.json"),
    "it-IT": () => import("./langs/it-IT.json"),
    "ja-JP": () => import("./langs/ja-JP.json"),
    "ru-RU": () => import("./langs/ru-RU.json"),
    "pl-PL": () => import("./langs/pl-PL.json"),
    "cz-CZ": () => import("./langs/cz-CZ.json"),
  };

const [currentTranslations, setCurrentTranslations] =
  createSignal<TranslationMap>({});

async function loadTranslations(lang: string) {
  const loader = translations[lang] || translations["en"];
  try {
    const module = await loader();
    setCurrentTranslations(module.default);
  } catch (e) {
    console.error(`Failed to load translations for language: ${lang}`, e);
  }
}

// Create a reactive effect to load translations when the language changes in the store
createEffect(() => {
  const lang = aria2Store.getState().appSettings.language || "en";
  loadTranslations(lang);
});

export const t = (key: string) => {
  return createMemo(() => {
    const map = currentTranslations();
    return map[key] || key;
  });
};
