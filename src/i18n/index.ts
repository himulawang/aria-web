import { createMemo, createSignal, createEffect } from "solid-js";
import { aria2Store } from "../store";

type TranslationMap = Record<string, string>;
const translations: Record<string, () => Promise<{ default: TranslationMap }>> =
  {
    en: () => import("./langs/en.json"),
    "zh-cn": () => import("./langs/zh-cn.json"),
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
