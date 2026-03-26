/**
 * 重新导出新的 AppStore 和 FileTreeStore
 * 这个文件现在只是一个重新导出文件，实际的实现已经移动到 appStore.ts
 */

// 重新导出新的 AppStore
export { useAppStore } from './appStore';
export { useFileTreeStore } from './fileTreeStore';

// 重新导出类型
export type { 
  AppState, 
  AppActions,
  Note,
  Tab, 
  Pane, 
  EditorFile,
  TreeNode, 
  FileNode, 
  FolderNode,
  UIState, 
  UIActions,
  NotesState, 
  NotesActions,
  EditorState, 
  EditorActions,
  FileTreeState, 
  FileTreeActions
} from './appStore';