import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface UIState {
  // 主题相关
  isDarkMode: boolean;
  theme?: 'obsidian' | 'nord' | 'solarized';
  
  // 侧边栏状态
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  
  // 面板状态
  leftActivePanel: 'files' | 'search' | 'tags' | 'plugins';
  rightActivePanel: 'backlinks' | 'outline' | 'graph';
  
  // 命令面板
  commandPaletteVisible: boolean;
  
  // 编辑器模式
  editorMode: 'edit' | 'preview' | 'split';
}

export interface UIActions {
  // 主题操作
  toggleTheme: () => void;
  setTheme?: (theme: 'obsidian' | 'nord' | 'solarized') => void;
  
  // 侧边栏操作
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  
  // 面板操作
  setLeftPanel: (panel: 'files' | 'search' | 'tags' | 'plugins') => void;
  setRightPanel: (panel: 'backlinks' | 'outline' | 'graph') => void;
  
  // UI 操作
  toggleCommandPalette: () => void;
  setEditorMode: (mode: 'edit' | 'preview' | 'split') => void;
}

export const useUIStore = create<UIState & UIActions>()(
  immer((set) => ({
    // 初始状态
    isDarkMode: true,
    theme: 'obsidian',
    leftSidebarVisible: true,
    rightSidebarVisible: true,
    leftSidebarWidth: 280,
    rightSidebarWidth: 280,
    leftActivePanel: 'files',
    rightActivePanel: 'outline',
    commandPaletteVisible: false,
    editorMode: 'split',

    // Actions
    toggleTheme: () => set((state) => {
      state.isDarkMode = !state.isDarkMode;
    }),
    setTheme: (theme: 'obsidian' | 'nord' | 'solarized') => set((state) => {
      state.theme = theme;
    }),

    toggleLeftSidebar: () => set((state) => {
      state.leftSidebarVisible = !state.leftSidebarVisible;
    }),

    toggleRightSidebar: () => set((state) => {
      state.rightSidebarVisible = !state.rightSidebarVisible;
    }),

    setLeftSidebarWidth: (width: number) => set((state) => {
      state.leftSidebarWidth = Math.max(200, Math.min(500, width));
    }),

    setRightSidebarWidth: (width: number) => set((state) => {
      state.rightSidebarWidth = Math.max(200, Math.min(500, width));
    }),

    setLeftPanel: (panel) => set((state) => {
      state.leftActivePanel = panel;
    }),

    setRightPanel: (panel) => set((state) => {
      state.rightActivePanel = panel;
    }),

    toggleCommandPalette: () => set((state) => {
      state.commandPaletteVisible = !state.commandPaletteVisible;
    }),

    setEditorMode: (mode) => set((state) => {
      state.editorMode = mode;
    })
  }))
);

// 主题切换时更新 HTML class
useUIStore.subscribe((state) => {
  if (state.isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
});
