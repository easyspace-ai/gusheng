import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// 启用 Immer 的 MapSet 插件
enableMapSet();

export interface Note {
  id: string;
  title: string;
  content: string;
  links: string[];
  backlinks: string[];
  createdAt: Date;
  updatedAt: Date;
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  folder?: string; // 文件所在的文件夹路径
}

export interface NotesState {
  notes: Record<string, Note>;
  expandedFolders: Set<string>;
  selectedFileId: string | null;
}

export interface NotesActions {
  // 笔记操作
  addNote: (note: Note) => void;
  updateNote: (noteId: string, updates: Partial<Note>) => void;
  deleteNote: (noteId: string) => void;
  renameNote: (noteId: string, newTitle: string) => void;
  duplicateNote: (noteId: string) => void;
  moveNote: (noteId: string, targetFolder: string) => void;
  
  // 文件夹操作
  createFolder: (path: string, name: string) => void;
  renameFolder: (oldPath: string, newName: string) => void;
  deleteFolder: (path: string) => void;
  
  // 文件树操作
  toggleFolder: (path: string) => void;
  setSelectedFile: (fileId: string | null) => void;
}

const initialNotes: Record<string, Note> = {
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

## 快捷键

- \`Ctrl/Cmd + P\`: 打开命令面板
- \`Ctrl/Cmd + N\`: 新建笔记
- \`Ctrl/Cmd + O\`: 打开笔记

尝试点击链接或使用快捷键开始使用吧！`,
    links: ['Markdown编辑', '双向链接'],
    backlinks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    fileType: 'markdown',
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
- 项目一
- 项目二
- 项目三

### 链接
可以使用 [[双向链接]] 语法来链接其他笔记。

### 代码
\`\`\`javascript
console.log('Hello, ReNote!');
\`\`\`

返回 [[欢迎]] 页面。`,
    links: ['双向链接', '欢迎'],
    backlinks: ['欢迎'],
    createdAt: new Date(),
    updatedAt: new Date(),
    fileType: 'markdown'
  },
  '双向链接': {
    id: '双向链接',
    title: '双向链接',
    content: `# 双向链接

双向链接是知识管理的核心功能。

## 使用方法

使用 \`[[笔记名]]\` 语法来创建链接。

例如：
- [[欢迎]]
- [[Markdown编辑]]

## 反向链接

在右侧面板可以看到指向当前笔记的所有链接。

这有助于发现知识之间的联系。`,
    links: ['欢迎', 'Markdown编辑'],
    backlinks: ['欢迎', 'Markdown编辑'],
    createdAt: new Date(),
    updatedAt: new Date(),
    fileType: 'markdown'
  }
};

export const useNotesStore = create<NotesState & NotesActions>()(
  immer((set) => ({
    // 初始状态
    notes: initialNotes,
    expandedFolders: new Set(['/workspace', '/workspace/笔记']),
    selectedFileId: null,

    // Actions
    addNote: (note) => set((state) => {
      state.notes[note.id] = note;
    }),

    updateNote: (noteId, updates) => set((state) => {
      if (state.notes[noteId]) {
        Object.assign(state.notes[noteId], updates, { updatedAt: new Date() });
      }
    }),

    deleteNote: (noteId) => set((state) => {
      delete state.notes[noteId];
    }),

    renameNote: (noteId, newTitle) => set((state) => {
      if (state.notes[noteId]) {
        state.notes[noteId].title = newTitle;
        state.notes[noteId].updatedAt = new Date();
      }
    }),

    duplicateNote: (noteId) => set((state) => {
      const originalNote = state.notes[noteId];
      if (originalNote) {
        const duplicatedId = `note-${Date.now()}-copy`;
        const duplicatedNote: Note = {
          ...originalNote,
          id: duplicatedId,
          title: `${originalNote.title} - 副本`,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        state.notes[duplicatedId] = duplicatedNote;
      }
    }),

    moveNote: (noteId, _targetFolder) => set((state) => {
      if (state.notes[noteId]) {
        state.notes[noteId].updatedAt = new Date();
        // 这里可以添加更复杂的文件夹移动逻辑
      }
    }),

    createFolder: (_path, _name) => set((_state) => {
      // 文件夹创建逻辑
    }),

    renameFolder: (_oldPath, _newName) => set((_state) => {
      // 文件夹重命名逻辑
    }),

    deleteFolder: (_path) => set((_state) => {
      // 文件夹删除逻辑
    }),

    toggleFolder: (path) => set((state) => {
      if (state.expandedFolders.has(path)) {
        state.expandedFolders.delete(path);
      } else {
        state.expandedFolders.add(path);
      }
    }),

    setSelectedFile: (fileId) => set((state) => {
      state.selectedFileId = fileId;
    })
  }))
);
