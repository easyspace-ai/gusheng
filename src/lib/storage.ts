/**
 * 浏览器端存储服务
 * 提供文件系统和编辑器状态的持久化存储
 */

import { type Note } from '@/stores/notesStore';
import { type Tab, type Pane } from '@/stores/editorStore';

// 存储键名常量
const STORAGE_KEYS = {
  NOTES: 'renote-notes',
  EDITOR_STATE: 'renote-editor-state',
  FILE_TREE_STATE: 'renote-file-tree-state',
  THEME: 'renote-theme',
  PREFERENCES: 'renote-preferences',
  VERSION: 'renote-storage-version'
} as const;

// 当前存储版本
const CURRENT_VERSION = '1.0.0';

export interface StoredNote extends Note {
  // 额外的持久化字段
  tags?: string[];
  pinned?: boolean;
  starred?: boolean;
}

export interface FileTreeState {
  expandedFolders: string[];
  selectedFileId: string | null;
  folderStructure: FolderNode[];
}

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  children: FolderNode[];
  fileCount?: number;
  isExpanded?: boolean;
}

export interface EditorPersistentState {
  panes: Pane[];
  activePaneId: string | null;
  openFiles: string[]; // 记录打开的文件ID顺序
  recentFiles: string[]; // 最近打开的文件
  filePositions: Record<string, { line: number; column: number }>; // 文件光标位置
}

export interface StorageData {
  version: string;
  notes: Record<string, StoredNote>;
  editorState: EditorPersistentState;
  fileTreeState: FileTreeState;
  lastModified: string;
}

class BrowserStorage {
  // 检查localStorage是否可用
  private isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // 获取存储大小（字节）
  getStorageSize(): number {
    if (!this.isStorageAvailable()) return 0;
    
    let size = 0;
    for (const key in localStorage) {
      if (key.startsWith('renote-')) {
        size += localStorage[key].length + key.length;
      }
    }
    return size * 2; // UTF-16编码，每个字符2字节
  }

  // 保存笔记数据
  saveNotes(notes: Record<string, Note>): boolean {
    try {
      if (!this.isStorageAvailable()) return false;
      
      const storedNotes: Record<string, StoredNote> = {};
      for (const [id, note] of Object.entries(notes)) {
        storedNotes[id] = {
          ...note,
          // 确保日期字段可序列化
          createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
          updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt
        } as StoredNote;
      }
      
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(storedNotes));
      return true;
    } catch (error) {
      console.error('Failed to save notes:', error);
      return false;
    }
  }

  // 加载笔记数据
  loadNotes(): Record<string, Note> | null {
    try {
      if (!this.isStorageAvailable()) return null;
      
      const data = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (!data) return null;
      
      const storedNotes = JSON.parse(data) as Record<string, StoredNote>;
      const notes: Record<string, Note> = {};
      
      for (const [id, storedNote] of Object.entries(storedNotes)) {
        notes[id] = {
          ...storedNote,
          createdAt: new Date(storedNote.createdAt),
          updatedAt: new Date(storedNote.updatedAt)
        };
      }
      
      return notes;
    } catch (error) {
      console.error('Failed to load notes:', error);
      return null;
    }
  }

  // 保存编辑器状态
  saveEditorState(state: EditorPersistentState): boolean {
    try {
      if (!this.isStorageAvailable()) return false;
      
      localStorage.setItem(STORAGE_KEYS.EDITOR_STATE, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('Failed to save editor state:', error);
      return false;
    }
  }

  // 加载编辑器状态
  loadEditorState(): EditorPersistentState | null {
    try {
      if (!this.isStorageAvailable()) return null;
      
      const data = localStorage.getItem(STORAGE_KEYS.EDITOR_STATE);
      if (!data) return null;
      
      return JSON.parse(data) as EditorPersistentState;
    } catch (error) {
      console.error('Failed to load editor state:', error);
      return null;
    }
  }

  // 保存文件树状态
  saveFileTreeState(state: FileTreeState): boolean {
    try {
      if (!this.isStorageAvailable()) return false;
      
      localStorage.setItem(STORAGE_KEYS.FILE_TREE_STATE, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('Failed to save file tree state:', error);
      return false;
    }
  }

  // 加载文件树状态
  loadFileTreeState(): FileTreeState | null {
    try {
      if (!this.isStorageAvailable()) return null;
      
      const data = localStorage.getItem(STORAGE_KEYS.FILE_TREE_STATE);
      if (!data) return null;
      
      return JSON.parse(data) as FileTreeState;
    } catch (error) {
      console.error('Failed to load file tree state:', error);
      return null;
    }
  }

  // 保存完整的存储数据（用于导出）
  exportData(): StorageData | null {
    try {
      const notes = this.loadNotes();
      const editorState = this.loadEditorState();
      const fileTreeState = this.loadFileTreeState();
      
      if (!notes || !editorState || !fileTreeState) return null;
      
      return {
        version: CURRENT_VERSION,
        notes: notes as Record<string, StoredNote>,
        editorState,
        fileTreeState,
        lastModified: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  // 导入存储数据
  importData(data: StorageData): boolean {
    try {
      if (!this.isStorageAvailable()) return false;
      
      // 检查版本兼容性
      if (data.version !== CURRENT_VERSION) {
        console.warn(`Storage version mismatch: expected ${CURRENT_VERSION}, got ${data.version}`);
      }
      
      // 保存各部分数据
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(data.notes));
      localStorage.setItem(STORAGE_KEYS.EDITOR_STATE, JSON.stringify(data.editorState));
      localStorage.setItem(STORAGE_KEYS.FILE_TREE_STATE, JSON.stringify(data.fileTreeState));
      localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_VERSION);
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // 清除所有存储数据
  clearAll(): boolean {
    try {
      if (!this.isStorageAvailable()) return false;
      
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }

  // 自动保存功能
  setupAutoSave(
    getNotesState: () => Record<string, Note>,
    getEditorState: () => EditorPersistentState,
    getFileTreeState: () => FileTreeState,
    interval: number = 30000 // 默认30秒
  ): () => void {
    const saveAll = () => {
      this.saveNotes(getNotesState());
      this.saveEditorState(getEditorState());
      this.saveFileTreeState(getFileTreeState());
    };

    // 立即保存一次
    saveAll();

    // 设置定时保存
    const intervalId = setInterval(saveAll, interval);

    // 监听页面关闭事件，确保数据保存
    const handleBeforeUnload = () => {
      saveAll();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 返回清理函数
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }
}

// 导出单例实例
export const storage = new BrowserStorage();

// 导出便捷方法
export const setupAutoSave = storage.setupAutoSave.bind(storage);
export const clearStorage = storage.clearAll.bind(storage);
export const exportData = storage.exportData.bind(storage);
export const importData = storage.importData.bind(storage);