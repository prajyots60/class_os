import { create } from 'zustand';
import { THEME_PRESETS, type ThemeConfig } from '@coaching-os/shared';

interface UIState {
  currentTheme: ThemeConfig;
  sidebarOpen: boolean;
  setTheme: (themeId: string) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentTheme: THEME_PRESETS.sharma_classes,
  sidebarOpen: false,
  setTheme: (themeId: string) => {
    const targetTheme = THEME_PRESETS[themeId] || THEME_PRESETS.sharma_classes;
    set({ currentTheme: targetTheme });
  },
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
