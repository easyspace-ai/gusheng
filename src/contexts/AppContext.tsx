import React, { createContext, useContext, useReducer, ReactNode } from 'react'

// 编辑器文件类型定义
export interface EditorFile {
  id: string
  name: string
  type: 'file' | 'folder'
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code'
  path: string
  content?: string
}

// 编辑器回调函数类型
export interface EditorCallbacks {
  onFileSelect?: (file: EditorFile) => void
  onCreateFile?: (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code') => void
}

// 类型定义
export interface Note {
  id: string
  title: string
  content: string
  links: string[]
  backlinks: string[]
  createdAt: Date
  updatedAt: Date
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code'
}

export interface Tab {
  id: string
  noteId: string
  title: string
  isDirty: boolean
}

export interface Pane {
  id: string
  tabs: Tab[]
  activeTabId: string | null
}

export interface AppState {
  // 主题相关
  isDarkMode: boolean
  
  // 侧边栏状态
  leftSidebarVisible: boolean
  rightSidebarVisible: boolean
  leftSidebarWidth: number
  rightSidebarWidth: number
  
  // 左侧边栏面板
  leftActivePanel: 'files' | 'search' | 'tags' | 'plugins'
  
  // 右侧边栏面板
  rightActivePanel: 'backlinks' | 'outline' | 'graph'
  
  // 笔记数据
  notes: Record<string, Note>
  
  // 编辑器状态
  panes: Pane[]
  activePaneId: string | null
  
  // 命令面板
  commandPaletteVisible: boolean
  
  // 文件树
  expandedFolders: Set<string>
  selectedFileId: string | null
  
  // 当前编辑模式 ('edit' | 'preview' | 'split')
  editorMode: 'edit' | 'preview' | 'split'
  
  // 编辑器回调函数
  editorCallbacks: EditorCallbacks
}

type AppAction =
  | { type: 'TOGGLE_THEME' }
  | { type: 'TOGGLE_LEFT_SIDEBAR' }
  | { type: 'TOGGLE_RIGHT_SIDEBAR' }
  | { type: 'SET_LEFT_SIDEBAR_WIDTH'; width: number }
  | { type: 'SET_RIGHT_SIDEBAR_WIDTH'; width: number }
  | { type: 'SET_LEFT_PANEL'; panel: 'files' | 'search' | 'tags' | 'plugins' }
  | { type: 'SET_RIGHT_PANEL'; panel: 'backlinks' | 'outline' | 'graph' }
  | { type: 'ADD_NOTE'; note: Note }
  | { type: 'UPDATE_NOTE'; noteId: string; updates: Partial<Note> }
  | { type: 'DELETE_NOTE'; noteId: string }
  | { type: 'RENAME_NOTE'; noteId: string; newTitle: string }
  | { type: 'DUPLICATE_NOTE'; noteId: string }
  | { type: 'MOVE_NOTE'; noteId: string; targetFolder: string }
  | { type: 'CREATE_FOLDER'; path: string; name: string }
  | { type: 'RENAME_FOLDER'; oldPath: string; newName: string }
  | { type: 'DELETE_FOLDER'; path: string }
  | { type: 'OPEN_NOTE_IN_TAB'; noteId: string; paneId?: string }
  | { type: 'CLOSE_TAB'; tabId: string; paneId: string }
  | { type: 'SET_ACTIVE_TAB'; tabId: string; paneId: string }
  | { type: 'CREATE_PANE'; pane: Pane; direction?: 'horizontal' | 'vertical' }
  | { type: 'CLOSE_PANE'; paneId: string }
  | { type: 'SET_ACTIVE_PANE'; paneId: string }
  | { type: 'SPLIT_TAB'; tabId: string; paneId: string; direction: 'horizontal' | 'vertical' }
  | { type: 'TOGGLE_COMMAND_PALETTE' }
  | { type: 'TOGGLE_FOLDER'; path: string }
  | { type: 'SET_SELECTED_FILE'; fileId: string | null }
  | { type: 'SET_EDITOR_MODE'; mode: 'edit' | 'preview' | 'split' }
  | { type: 'SET_EDITOR_CALLBACKS'; callbacks: EditorCallbacks }

const initialState: AppState = {
  isDarkMode: true,
  leftSidebarVisible: true,
  rightSidebarVisible: true,
  leftSidebarWidth: 280,
  rightSidebarWidth: 280,
  leftActivePanel: 'files',
  rightActivePanel: 'outline',
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

## 快捷键

- \`Ctrl/Cmd + P\`: 打开命令面板
- \`Ctrl/Cmd + N\`: 新建笔记
- \`Ctrl/Cmd + O\`: 打开笔记

尝试点击链接或使用快捷键开始使用吧！`,
      links: ['Markdown编辑', '双向链接'],
      backlinks: [],
      createdAt: new Date(),
      updatedAt: new Date()
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
      updatedAt: new Date()
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
      updatedAt: new Date()
    }
  },
  panes: [
    {
      id: 'main-pane',
      tabs: [
        {
          id: 'welcome-tab',
          noteId: 'welcome',
          title: '欢迎',
          isDirty: false
        }
      ],
      activeTabId: 'welcome-tab'
    }
  ],
  activePaneId: 'main-pane',
  commandPaletteVisible: false,
  expandedFolders: new Set(['/workspace', '/workspace/笔记']),
  selectedFileId: null,
  editorMode: 'split',
  editorCallbacks: {}
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'TOGGLE_THEME':
      return { ...state, isDarkMode: !state.isDarkMode }
    
    case 'TOGGLE_LEFT_SIDEBAR':
      return { ...state, leftSidebarVisible: !state.leftSidebarVisible }
    
    case 'TOGGLE_RIGHT_SIDEBAR':
      return { ...state, rightSidebarVisible: !state.rightSidebarVisible }
    
    case 'SET_LEFT_SIDEBAR_WIDTH':
      return { ...state, leftSidebarWidth: Math.max(200, Math.min(500, action.width)) }
    
    case 'SET_RIGHT_SIDEBAR_WIDTH':
      return { ...state, rightSidebarWidth: Math.max(200, Math.min(500, action.width)) }
    
    case 'SET_LEFT_PANEL':
      return { ...state, leftActivePanel: action.panel }
    
    case 'SET_RIGHT_PANEL':
      return { ...state, rightActivePanel: action.panel }
    
    case 'ADD_NOTE':
      return {
        ...state,
        notes: { ...state.notes, [action.note.id]: action.note }
      }
    
    case 'UPDATE_NOTE':
      if (!state.notes[action.noteId]) return state
      return {
        ...state,
        notes: {
          ...state.notes,
          [action.noteId]: {
            ...state.notes[action.noteId],
            ...action.updates,
            updatedAt: new Date()
          }
        }
      }
    
    case 'DELETE_NOTE':
      const { [action.noteId]: deletedNote, ...remainingNotes } = state.notes
      return {
        ...state,
        notes: remainingNotes,
        panes: state.panes.map(pane => ({
          ...pane,
          tabs: pane.tabs.filter(tab => tab.noteId !== action.noteId),
          activeTabId: pane.tabs.some(tab => tab.id === pane.activeTabId && tab.noteId === action.noteId)
            ? pane.tabs.find(tab => tab.noteId !== action.noteId)?.id || null
            : pane.activeTabId
        })).filter(pane => pane.tabs.length > 0)
      }
    
    case 'RENAME_NOTE':
      if (!state.notes[action.noteId]) return state
      const renamedNote = {
        ...state.notes[action.noteId],
        title: action.newTitle,
        updatedAt: new Date()
      }
      return {
        ...state,
        notes: { ...state.notes, [action.noteId]: renamedNote },
        panes: state.panes.map(pane => ({
          ...pane,
          tabs: pane.tabs.map(tab => 
            tab.noteId === action.noteId 
              ? { ...tab, title: action.newTitle }
              : tab
          )
        }))
      }
    
    case 'DUPLICATE_NOTE':
      const originalNote = state.notes[action.noteId]
      if (!originalNote) return state
      const duplicatedId = `note-${Date.now()}-copy`
      const duplicatedNote: Note = {
        ...originalNote,
        id: duplicatedId,
        title: `${originalNote.title} - 副本`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      return {
        ...state,
        notes: { ...state.notes, [duplicatedId]: duplicatedNote }
      }
    
    case 'MOVE_NOTE':
      // 这里简化处理，实际应用中可能需要更复杂的文件夹结构管理
      if (!state.notes[action.noteId]) return state
      return {
        ...state,
        notes: {
          ...state.notes,
          [action.noteId]: {
            ...state.notes[action.noteId],
            updatedAt: new Date()
          }
        }
      }
    
    case 'CREATE_FOLDER':
      // 文件夹创建逻辑，这里只是示例
      return state
    
    case 'RENAME_FOLDER':
      // 文件夹重命名逻辑
      return state
    
    case 'DELETE_FOLDER':
      // 文件夹删除逻辑
      return state
    
    case 'OPEN_NOTE_IN_TAB': {
      const targetPaneId = action.paneId || state.activePaneId || 'main-pane'
      const targetPane = state.panes.find(p => p.id === targetPaneId)
      if (!targetPane) return state
      
      // 检查是否已经打开了这个笔记
      const existingTab = targetPane.tabs.find(tab => tab.noteId === action.noteId)
      if (existingTab) {
        return {
          ...state,
          panes: state.panes.map(pane => 
            pane.id === targetPaneId
              ? { ...pane, activeTabId: existingTab.id }
              : pane
          )
        }
      }
      
      // 创建新标签页
      const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const note = state.notes[action.noteId]
      if (!note) return state
      
      return {
        ...state,
        panes: state.panes.map(pane =>
          pane.id === targetPaneId
            ? {
                ...pane,
                tabs: [...pane.tabs, {
                  id: newTabId,
                  noteId: action.noteId,
                  title: note.title,
                  isDirty: false
                }],
                activeTabId: newTabId
              }
            : pane
        )
      }
    }
    
    case 'CLOSE_TAB': {
      const pane = state.panes.find(p => p.id === action.paneId)
      if (!pane) return state
      
      const updatedTabs = pane.tabs.filter(tab => tab.id !== action.tabId)
      const newActiveTabId = pane.activeTabId === action.tabId
        ? updatedTabs[0]?.id || null
        : pane.activeTabId
      
      return {
        ...state,
        panes: state.panes.map(p =>
          p.id === action.paneId
            ? { ...p, tabs: updatedTabs, activeTabId: newActiveTabId }
            : p
        ).filter(p => p.tabs.length > 0)
      }
    }
    
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        panes: state.panes.map(pane =>
          pane.id === action.paneId
            ? { ...pane, activeTabId: action.tabId }
            : pane
        )
      }
    
    case 'SET_ACTIVE_PANE':
      return { ...state, activePaneId: action.paneId }
    
    case 'SPLIT_TAB': {
      const sourcePane = state.panes.find(p => p.id === action.paneId)
      const sourceTab = sourcePane?.tabs.find(t => t.id === action.tabId)
      
      if (!sourcePane || !sourceTab) return state
      
      // Create new pane with the tab
      const newPaneId = `pane-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newPane: Pane = {
        id: newPaneId,
        tabs: [{ ...sourceTab, id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }],
        activeTabId: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
      
      // Update the new tab id in the new pane
      newPane.activeTabId = newPane.tabs[0].id
      
      return {
        ...state,
        panes: [...state.panes, newPane],
        activePaneId: newPaneId
      }
    }
    
    case 'TOGGLE_COMMAND_PALETTE':
      return { ...state, commandPaletteVisible: !state.commandPaletteVisible }
    
    case 'TOGGLE_FOLDER':
      const newExpandedFolders = new Set(state.expandedFolders)
      if (newExpandedFolders.has(action.path)) {
        newExpandedFolders.delete(action.path)
      } else {
        newExpandedFolders.add(action.path)
      }
      return { ...state, expandedFolders: newExpandedFolders }
    
    case 'SET_SELECTED_FILE':
      return { ...state, selectedFileId: action.fileId }
    
    case 'SET_EDITOR_MODE':
      return { ...state, editorMode: action.mode }
    
    case 'SET_EDITOR_CALLBACKS':
      return { ...state, editorCallbacks: action.callbacks }
    
    default:
      return state
  }
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  
  // 主题切换时更新 HTML class
  React.useEffect(() => {
    if (state.isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [state.isDarkMode])
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}