export interface ThemeOption {
  id: string;
  name: string;
  isDark?: boolean;
}

export const AVAILABLE_THEMES: ThemeOption[] = [
  { id: "system", name: "System (跟随系统)", isDark: false },
  { id: "light", name: "Light (经典明亮)", isDark: false },
  { id: "dark", name: "Dark (经典深色)", isDark: true },
  { id: "nord", name: "Nord (极地冰蓝)", isDark: true },
  { id: "dracula", name: "Dracula (德古拉暗紫)", isDark: true },
  { id: "dim", name: "Dim (深邃深蓝)", isDark: true },
  { id: "sunset", name: "Sunset (落日晚霞)", isDark: true },
  { id: "synthwave", name: "Synthwave (赛博霓虹)", isDark: true },
  { id: "cyberpunk", name: "Cyberpunk (赛博朋克)", isDark: false },
  { id: "emerald", name: "Emerald (翡翠清新)", isDark: false },
  { id: "cupcake", name: "Cupcake (甜美粉白)", isDark: false },
  { id: "luxury", name: "Luxury (奢华黑金)", isDark: true },
  { id: "night", name: "Night (夜幕幽蓝)", isDark: true },
];
