/**
 * 重构后的 AppStore
 * 提供简洁、高效的应用状态管理
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { type UIState, type UIActions } from './uiStore';
import { type NotesState, type NotesActions } from './notesStore';
import { type EditorState, type EditorActions } from './editorStore';
import { useFileTreeStore } from './fileTreeStore';
import { storage } from '@/lib/storage';
import { UnlinkedMentionsCalculator } from '@/lib/unlinkedMentions';
import { eventBus } from '@/lib/eventBus';
import { fileTreeStorage } from '@/lib/fileTreeStorage';

// 启用 Immer 的 MapSet 插件
enableMapSet();

// 组合所有 store 的状态和 actions
export type AppState = UIState & NotesState & EditorState;
export type AppActions = UIActions & NotesActions & EditorActions & {
  // 跨 store 的便捷方法
  selectFileInEditor: (noteId: string, options?: { openMode?: 'preview' | 'pinned' }) => void;
  createFileInEditor: (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code', folder?: string) => void;
  openNoteInTab: (noteId: string, paneId?: string) => void;
  openNoteInTabWithTitle: (noteId: string, paneId?: string) => void;
  renameNoteAndUpdateTabs: (noteId: string, newTitle: string) => void;
  deleteNoteAndCloseTabs: (noteId: string) => void;
  revealInExplorer: (noteId: string) => void;
  
  // 文件树与笔记同步方法
  syncFileTreeWithNotes: () => void;
  loadStateFromStorage: () => void;
  saveStateToStorage: () => void;
  
  // 未链接提及计算
  calculateAndUpdateUnlinkedMentions: () => void;
  
  // 事件系统集成
  initializeEventSystem: () => void;
  
  // 文件树功能（从 fileTreeStore 代理）
  nodes: Record<string, any>;
  selectedNodeId: string | null;
  selectNode: (nodeId: string | null) => void;
  expandedFolders: Set<string>;
  toggleFolder: (folderId: string) => void;
  expandFolder: (folderId: string) => void;
  collapseFolder: (folderId: string) => void;
};

// 创建未链接提及计算器实例
const unlinkedMentionsCalculator = new UnlinkedMentionsCalculator();

// 创建组合 store
export const useAppStore = create<AppState & AppActions>()(
  immer((set, get) => ({
    // UI 状态
    isDarkMode: false,
    theme: 'obsidian' as 'obsidian' | 'nord' | 'solarized',
    leftSidebarVisible: true,
    rightSidebarVisible: true,
    leftSidebarWidth: 280,
    rightSidebarWidth: 280,
    leftActivePanel: 'files' as const,
    rightActivePanel: 'outline' as const,
    commandPaletteVisible: false,
    editorMode: 'split' as const,

    // Notes 状态
    notes: {
      'welcome': {
        id: 'welcome',
        title: '欢迎',
        content: `# 欢迎使用 ReNote

这是一个模仿 Obsidian 的笔记应用。

## 功能特性

- [[Markdown编辑]]
- [[双向链接]]
- 图谱视图
- 多标签页
- 分屏功能
- 拖拽功能：从文件树拖拽文件到编辑器生成链接
- 未链接提及：自动检测文本中提到但未链接的笔记

## 快捷键

- \`Ctrl/Cmd + P\`: 打开命令面板
- \`Ctrl/Cmd + N\`: 新建笔记
- \`Ctrl/Cmd + O\`: 打开笔记
- \`Ctrl/Cmd + S\`: 保存当前笔记

在文本中提到 Markdown编辑 但没有创建链接时，会在文件树中显示未链接提及计数。

尝试点击链接或使用快捷键开始使用吧！`,
        links: ['Markdown编辑', '双向链接'],
        backlinks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        fileType: 'markdown' as const,
        folder: '/workspace/笔记'
      },
      'markdown编辑': {
        id: 'markdown编辑',
        title: 'Markdown编辑',
        content: `# Markdown 编辑

这是一个支持实时预览的 Markdown 编辑器。

## 基础语法

### 标题
使用 # 来创建标题

### 列表
- 无序列表
- 使用 - 或 * 

1. 有序列表
2. 使用数字

### 链接
[链接文本](URL)

### 代码
\`行内代码\`

\`\`\`javascript
// 代码块
console.log('Hello World');
\`\`\`

### 表格
| 列1 | 列2 |
|-----|-----|
| 数据1 | 数据2 |

### 引用
> 这是一个引用块

### 分割线
---

## 高级功能

### 双向链接
使用 [[笔记名称]] 创建双向链接

### 标签
#标签名

### 任务列表
- [x] 已完成的任务
- [ ] 未完成的任务`,
        links: [],
        backlinks: ['welcome'],
        createdAt: new Date(),
        updatedAt: new Date(),
        fileType: 'markdown' as const,
        folder: '/workspace/笔记'
      },
      '双向链接': {
        id: '双向链接',
        title: '双向链接',
        content: `# 双向链接

双向链接是知识管理的重要功能，可以帮助你建立笔记之间的关联。

## 创建双向链接

使用双方括号语法：[[笔记名称]]

例如：[[Markdown编辑]]

## 反向链接

当你创建了一个链接到其他笔记的双向链接时，被链接的笔记会自动显示反向链接。

## 未链接提及

当你提到一个笔记名称但没有创建链接时，系统会检测到这种"未链接提及"，并在文件树中显示计数。

例如：提到 "Markdown编辑" 但没有创建 [[Markdown编辑]] 链接。`,
        links: ['Markdown编辑'],
        backlinks: ['welcome'],
        createdAt: new Date(),
        updatedAt: new Date(),
        fileType: 'markdown' as const,
        folder: '/workspace/笔记'
      }
    },
    unlinkedMentions: {},

    // Editor 状态
    panes: [
      {
        id: 'main-pane',
        tabs: [
          {
            id: 'welcome-tab',
            noteId: 'welcome',
            title: '欢迎',
            isActive: true,
            isPinned: false,
            isDirty: false
          }
        ]
      }
    ],
    activePaneId: 'main-pane',
    editorCallbacks: {},

    // 直接实现所有 actions
    // UI Actions
    toggleTheme: () => set((state) => {
      state.isDarkMode = !state.isDarkMode;
    }),

    setTheme: (theme) => set((state) => {
      state.theme = theme;
    }),

    toggleLeftSidebar: () => set((state) => {
      state.leftSidebarVisible = !state.leftSidebarVisible;
    }),

    toggleRightSidebar: () => set((state) => {
      state.rightSidebarVisible = !state.rightSidebarVisible;
    }),

    setLeftSidebarWidth: (width) => set((state) => {
      state.leftSidebarWidth = width;
    }),

    setRightSidebarWidth: (width) => set((state) => {
      state.rightSidebarWidth = width;
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
    }),

    // Notes Actions
    addNote: (note) => set((state) => {
      state.notes[note.id] = note;
    }),

    updateNote: (noteId, updates) => set((state) => {
      if (state.notes[noteId]) {
        Object.assign(state.notes[noteId], updates);
      }
    }),

    deleteNote: (noteId) => set((state) => {
      delete state.notes[noteId];
      delete state.unlinkedMentions[noteId];
    }),

    renameNote: (noteId, newTitle) => set((state) => {
      if (state.notes[noteId]) {
        state.notes[noteId].title = newTitle;
      }
    }),

    // Editor Actions
    addTab: (paneId, tab) => set((state) => {
      const pane = state.panes.find(p => p.id === paneId);
      if (pane) {
        pane.tabs.push(tab);
      }
    }),

    removeTab: (paneId, tabId) => set((state) => {
      const pane = state.panes.find(p => p.id === paneId);
      if (pane) {
        pane.tabs = pane.tabs.filter(t => t.id !== tabId);
      }
    }),

    closeTab: (tabId, paneId) => set((state) => {
      const pane = state.panes.find(p => p.id === paneId);
      if (!pane) return;

      // 移除标签页
      pane.tabs = pane.tabs.filter(tab => tab.id !== tabId);
      
      // 如果关闭的是当前活动标签页，激活下一个标签页
      if (pane.tabs.length > 0) {
        const activeTab = pane.tabs.find(tab => tab.isActive);
        if (!activeTab) {
          pane.tabs[0].isActive = true;
        }
      }

      // 如果面板没有标签页了，自动创建一个新的空标签页
      if (pane.tabs.length === 0) {
        // 创建新的空白笔记
        const newNoteId = `note-${Date.now()}`;
        const newNote = {
          id: newNoteId,
          title: '新笔记',
          content: '# 新笔记\n\n开始编写...',
          links: [],
          backlinks: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          fileType: 'markdown' as const,
          folder: undefined
        };

        // 添加到笔记存储
        state.notes[newNoteId] = newNote;

        // 创建新的标签页
        const newTab = {
          id: `${newNoteId}-${Date.now()}`,
          noteId: newNoteId,
          title: newNote.title,
          isActive: true,
          isPinned: false,
          isDirty: false
        };

        // 添加到当前面板
        pane.tabs.push(newTab);
      }
    }),

    setActiveTab: (paneId, tabId) => set((state) => {
      const pane = state.panes.find(p => p.id === paneId);
      if (pane) {
        pane.tabs.forEach(tab => {
          tab.isActive = tab.id === tabId;
        });
        pane.activeTabId = tabId;
      }
    }),

    setActivePane: (paneId) => set((state) => {
      state.activePaneId = paneId;
    }),

    setEditorCallbacks: (callbacks) => set((state) => {
      state.editorCallbacks = callbacks;
    }),

    // 跨 store 的便捷方法
    selectFileInEditor: (noteId, options = {}) => {
      const { openMode = 'preview' } = options;
      const note = get().notes[noteId];
      if (!note) return;

      // 查找是否已有该笔记的标签页
      const existingTab = get().panes
        .flatMap(p => p.tabs)
        .find(t => t.noteId === noteId);

      if (existingTab) {
        // 激活现有标签页
        const pane = get().panes.find(p => p.tabs.some(t => t.id === existingTab.id));
        if (pane) {
          get().setActiveTab(pane.id, existingTab.id);
          get().setActivePane(pane.id);
        }
      } else {
        // 创建新标签页
        const tab = {
          id: `${noteId}-${Date.now()}`,
          noteId,
          title: note.title,
          isActive: true,
          isPinned: openMode === 'pinned',
          isDirty: false
        };

        const activePaneId = get().activePaneId;
        if (activePaneId) {
          get().addTab(activePaneId, tab);
          get().setActiveTab(activePaneId, tab.id);
        }
      }
    },

    createFileInEditor: (type, folder = '/workspace/笔记') => {
      const id = `note-${Date.now()}`;
      const note = {
        id,
        title: '新笔记',
        content: '# 新笔记\n\n开始编写...',
        links: [],
        backlinks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        fileType: type,
        folder
      };

      get().addNote(note);
      get().selectFileInEditor(id, { openMode: 'preview' });
    },

    openNoteInTabWithTitle: (noteId, paneId) => {
      const note = get().notes[noteId];
      if (!note) return;

      const targetPaneId = paneId || get().activePaneId;
      
      // 检查是否已经存在相同 noteId 的标签页
      const existingTab = get().panes.find(pane => 
        pane.tabs.some(tab => tab.noteId === noteId)
      );
      
      if (existingTab) {
        // 如果已存在，直接激活该标签页
        const tab = existingTab.tabs.find(tab => tab.noteId === noteId);
        if (tab) {
          get().setActiveTab(existingTab.id, tab.id);
          return;
        }
      }

      // 如果不存在，创建新标签页
      const tab = {
        id: `${noteId}-${Date.now()}`,
        noteId,
        title: note.title,
        isActive: true,
        isPinned: false,
        isDirty: false
      };

      if (targetPaneId) {
        get().addTab(targetPaneId, tab);
        get().setActiveTab(targetPaneId, tab.id);
      }
    },

    renameNoteAndUpdateTabs: (noteId, newTitle) => {
      get().renameNote(noteId, newTitle);
      
      // 更新相关标签页的标题
      get().panes.forEach(pane => {
        pane.tabs.forEach(tab => {
          if (tab.noteId === noteId) {
            tab.title = newTitle;
          }
        });
      });
    },

    deleteNoteAndCloseTabs: (noteId) => {
      get().deleteNote(noteId);
      
      // 关闭相关标签页
      get().panes.forEach(pane => {
        pane.tabs = pane.tabs.filter(tab => tab.noteId !== noteId);
      });
    },

    revealInExplorer: (noteId) => {
      const note = get().notes[noteId];
      if (!note) return;

      // 在文件树中展开到该笔记
      const fileTreeStore = useFileTreeStore.getState();
      fileTreeStore.expandToNode?.(note.folder);
      fileTreeStore.selectNode?.(noteId);
    },

    // 文件树与笔记同步方法
    syncFileTreeWithNotes: () => {
      const fileTreeStore = useFileTreeStore.getState();
      
      // 创建默认的文件夹结构
      const workspaceFolder = fileTreeStore.createFolder('/', 'workspace');
      const notesFolder = fileTreeStore.createFolder('/workspace', '笔记');
      const draftFolder = fileTreeStore.createFolder('/workspace', '草稿');

      // 为每个笔记创建文件节点
      Object.values(get().notes).forEach(note => {
        fileTreeStore.createFileInFolder(note.folder, `${note.title}.md`, note.fileType);
      });
    },

    // 状态管理
    loadStateFromStorage: () => {
      const notes = storage.loadNotes();
      const editorState = storage.loadEditorState();
      const fileTreeState = fileTreeStorage.load();

      if (notes) {
        set((state) => {
          state.notes = notes;
        });
      }

      if (editorState) {
        set((state) => {
          state.panes = editorState.panes;
          state.activePaneId = editorState.activePaneId;
        });
      }

      if (fileTreeState) {
        const fileTreeStore = useFileTreeStore.getState();
        fileTreeStore.setState({
          expandedFolders: new Set(fileTreeState.expandedFolders || []),
          selectedNodeId: fileTreeState.selectedNodeId || null,
        });
      }
    },

    saveStateToStorage: () => {
      const state = get();
      storage.saveNotes(state.notes);
      storage.saveEditorState({
        panes: state.panes,
        activePaneId: state.activePaneId,
        openFiles: state.panes.flatMap(p => p.tabs.map(t => t.noteId)),
        recentFiles: [],
        filePositions: {}
      });
      
      const fileTreeStore = useFileTreeStore.getState();
      fileTreeStorage.save({
        expandedFolders: Array.from(fileTreeStore.expandedFolders),
        selectedNodeId: fileTreeStore.selectedNodeId,
      });
    },

    // 未链接提及计算
    calculateAndUpdateUnlinkedMentions: () => {
      const state = get();
      const counts = unlinkedMentionsCalculator.calculate(state.notes);
      set((state) => {
        state.unlinkedMentions = counts;
      });
    },

    // 事件系统集成
    initializeEventSystem: () => {
      // 监听文件树事件
      eventBus.on('fileTree:createFile', ({ parentId, fileName, fileType }) => {
        console.log('File created:', { parentId, fileName, fileType });
      });

      eventBus.on('fileTree:stateChanged', (state) => {
        console.log('File tree state changed:', state);
      });

      // 初始化文件树与笔记同步
      get().syncFileTreeWithNotes();
    },

    // 文件树功能代理
    get nodes() {
      return useFileTreeStore.getState().nodes;
    },

    get selectedNodeId() {
      return useFileTreeStore.getState().selectedNodeId;
    },

    selectNode: (nodeId: string | null) => {
      useFileTreeStore.getState().selectNode(nodeId);
    },

    get expandedFolders() {
      return useFileTreeStore.getState().expandedFolders;
    },

    toggleFolder: (folderId: string) => {
      useFileTreeStore.getState().toggleFolder(folderId);
    },

    expandFolder: (folderId: string) => {
      useFileTreeStore.getState().expandFolder(folderId);
    },

    collapseFolder: (folderId: string) => {
      useFileTreeStore.getState().collapseFolder(folderId);
    },

    // 编辑器功能代理
    openNoteInTab: (noteId: string, paneId?: string) => {
      // 使用 openNoteInTabWithTitle 来实现 openNoteInTab 的功能
      get().openNoteInTabWithTitle(noteId, paneId);
    }
  }))
);

// 初始化时加载存储的状态
useAppStore.getState().loadStateFromStorage();

// 设置自动保存
storage.setupAutoSave(
  () => useAppStore.getState().notes,
  () => ({
    panes: useAppStore.getState().panes,
    activePaneId: useAppStore.getState().activePaneId,
    openFiles: useAppStore.getState().panes.flatMap(p => p.tabs.map(t => t.noteId)),
    recentFiles: [],
    filePositions: {}
  }),
  () => {
    const fileTreeStore = useFileTreeStore.getState();
    return {
      expandedFolders: Array.from(fileTreeStore.expandedFolders),
      selectedFileId: fileTreeStore.selectedNodeId,
      folderStructure: []
    };
  }
);

// 主题切换时更新 HTML class
useAppStore.subscribe((state) => {
  if (state.isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  // 设置多主题 data 属性
  document.documentElement.setAttribute('data-theme', state.theme || 'obsidian');
  try {
    localStorage.setItem('app-theme', state.theme || 'obsidian');
    localStorage.setItem('app-dark', state.isDarkMode ? '1' : '0');
  } catch {}
});

// 导出类型
export type { Note } from './notesStore';
export type { Tab, Pane, EditorFile } from './editorStore';
export type { TreeNode, FileNode, FolderNode } from './fileTreeStore';
export type { UIState, UIActions } from './uiStore';
export type { NotesState, NotesActions } from './notesStore';
export type { EditorState, EditorActions } from './editorStore';
export type { FileTreeState, FileTreeActions } from './fileTreeStore';
