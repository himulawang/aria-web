import { createMemo, createSignal, createEffect } from "solid-js";
import { aria2Store } from "../store";
import en from "./langs/en.json";
import zhCn from "./langs/zh-cn.json";
import zhTw from "./langs/zh-tw.json";
import jaJp from "./langs/ja-JP.json";
import ruRu from "./langs/ru-RU.json";
import deDe from "./langs/de-DE.json";
import frFr from "./langs/fr-FR.json";
import es from "./langs/es.json";
import itIt from "./langs/it-IT.json";
import plPl from "./langs/pl-PL.json";
import czCz from "./langs/cz-CZ.json";

type TranslationMap = Record<string, string>;
const translations: Record<string, any> = {
  en,
  "zh-cn": zhCn,
  "zh-tw": zhTw,
  "ja-JP": jaJp,
  "ru-RU": ruRu,
  "de-DE": deDe,
  "fr-FR": frFr,
  "es": es,
  "it-IT": itIt,
  "pl-PL": plPl,
  "cz-CZ": czCz,
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
