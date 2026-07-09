import { createMemo, createSignal, createEffect } from "solid-js";
import { aria2Store } from "../store";
import en from "./langs/en.json";
import zhCn from "./langs/zh-cn.json";

type TranslationMap = Record<string, string>;
const translations: Record<string, any> = {
  en,
  "zh-cn": zhCn,
};

const [currentTranslations, setCurrentTranslations] =
  createSignal<TranslationMap>(en); // Default to English synchronously

async function loadTranslations(lang: string) {
  if (translations[lang]) {
    setCurrentTranslations(translations[lang]);
    return;
  }
  
  try {
    // For other languages, we still use dynamic import to keep bundle size small
    const module = await import(`./langs/${lang}.json`);
    setCurrentTranslations(module.default);
  } catch (e) {
    console.error(`Failed to load translations for language: ${lang}`, e);
    setCurrentTranslations(en);
  }
}

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
