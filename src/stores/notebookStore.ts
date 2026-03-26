import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface Notebook {
  id: string
  name: string
  icon: string
  sort: number
  closed: boolean
  created: string
  updated: string
}

interface NotebookState {
  notebooks: Notebook[]
  currentNotebook: Notebook | null
  loading: boolean
  error: string | null
}

interface NotebookActions {
  // 获取笔记本列表
  fetchNotebooks: () => Promise<void>
  
  // 创建笔记本
  createNotebook: (name: string, icon?: string) => Promise<Notebook | null>
  
  // 重命名笔记本
  renameNotebook: (id: string, name: string) => Promise<void>
  
  // 设置笔记本图标
  setNotebookIcon: (id: string, icon: string) => Promise<void>
  
  // 打开笔记本
  openNotebook: (id: string) => Promise<void>
  
  // 关闭笔记本
  closeNotebook: (id: string) => Promise<void>
  
  // 删除笔记本
  deleteNotebook: (id: string) => Promise<void>
  
  // 更改笔记本排序
  changeSortNotebook: (id: string, sort: number) => Promise<void>
  
  // 设置当前笔记本
  setCurrentNotebook: (notebook: Notebook | null) => void
  
  // 清除错误
  clearError: () => void
}

type NotebookStore = NotebookState & NotebookActions

// API 调用函数
const api = {
  async listNotebooks(): Promise<Notebook[]> {
    const response = await fetch('/api/notebook/lsNotebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    
    const result = await response.json()
    if (result.code !== 0) {
      throw new Error(result.msg || '获取笔记本列表失败')
    }
    
    return result.data.notebooks || []
  },

  async createNotebook(name: string, icon: string = '📔'): Promise<Notebook> {
    const response = await fetch('/api/notebook/createNotebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon })
    })
    
    const result = await response.json()
    if (result.code !== 0) {
      throw new Error(result.msg || '创建笔记本失败')
    }
    
    return result.data.notebook
  },

  async renameNotebook(notebook: string, name: string): Promise<void> {
    const response = await fetch('/api/notebook/renameNotebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notebook, name })
    })
    
    const result = await response.json()
    if (result.code !== 0) {
      throw new Error(result.msg || '重命名笔记本失败')
    }
  },

  async setNotebookIcon(notebook: string, icon: string): Promise<void> {
    const response = await fetch('/api/notebook/setNotebookIcon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notebook, icon })
    })
    
    const result = await response.json()
    if (result.code !== 0) {
      throw new Error(result.msg || '设置笔记本图标失败')
    }
  },

  async openNotebook(notebook: string): Promise<void> {
    const response = await fetch('/api/notebook/openNotebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notebook })
    })
    
    const result = await response.json()
    if (result.code !== 0) {
      throw new Error(result.msg || '打开笔记本失败')
    }
  },

  async closeNotebook(notebook: string): Promise<void> {
    const response = await fetch('/api/notebook/closeNotebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notebook })
    })
    
    const result = await response.json()
    if (result.code !== 0) {
      throw new Error(result.msg || '关闭笔记本失败')
    }
  },

  async removeNotebook(notebook: string): Promise<void> {
    const response = await fetch('/api/notebook/removeNotebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notebook })
    })
    
    const result = await response.json()
    if (result.code !== 0) {
      throw new Error(result.msg || '删除笔记本失败')
    }
  },

  async changeSortNotebook(notebook: string, sort: number): Promise<void> {
    const response = await fetch('/api/notebook/changeSortNotebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notebook, sort })
    })
    
    const result = await response.json()
    if (result.code !== 0) {
      throw new Error(result.msg || '更改笔记本排序失败')
    }
  }
}

export const useNotebookStore = create<NotebookStore>()(
  immer((set, get) => ({
    // 初始状态
    notebooks: [],
    currentNotebook: null,
    loading: false,
    error: null,

    // Actions
    fetchNotebooks: async () => {
      set((state) => {
        state.loading = true
        state.error = null
      })

      try {
        const notebooks = await api.listNotebooks()
        set((state) => {
          state.notebooks = notebooks
          state.loading = false
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : '获取笔记本列表失败'
          state.loading = false
        })
      }
    },

    createNotebook: async (name: string, icon = '📔') => {
      set((state) => {
        state.loading = true
        state.error = null
      })

      try {
        const notebook = await api.createNotebook(name, icon)
        set((state) => {
          state.notebooks.push(notebook)
          state.loading = false
        })
        return notebook
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : '创建笔记本失败'
          state.loading = false
        })
        return null
      }
    },

    renameNotebook: async (id: string, name: string) => {
      try {
        await api.renameNotebook(id, name)
        set((state) => {
          const notebook = state.notebooks.find(nb => nb.id === id)
          if (notebook) {
            notebook.name = name
            notebook.updated = new Date().toISOString()
          }
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : '重命名笔记本失败'
        })
      }
    },

    setNotebookIcon: async (id: string, icon: string) => {
      try {
        await api.setNotebookIcon(id, icon)
        set((state) => {
          const notebook = state.notebooks.find(nb => nb.id === id)
          if (notebook) {
            notebook.icon = icon
            notebook.updated = new Date().toISOString()
          }
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : '设置笔记本图标失败'
        })
      }
    },

    openNotebook: async (id: string) => {
      try {
        await api.openNotebook(id)
        set((state) => {
          const notebook = state.notebooks.find(nb => nb.id === id)
          if (notebook) {
            notebook.closed = false
            notebook.updated = new Date().toISOString()
          }
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : '打开笔记本失败'
        })
      }
    },

    closeNotebook: async (id: string) => {
      try {
        await api.closeNotebook(id)
        set((state) => {
          const notebook = state.notebooks.find(nb => nb.id === id)
          if (notebook) {
            notebook.closed = true
            notebook.updated = new Date().toISOString()
          }
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : '关闭笔记本失败'
        })
      }
    },

    deleteNotebook: async (id: string) => {
      try {
        await api.removeNotebook(id)
        set((state) => {
          state.notebooks = state.notebooks.filter(nb => nb.id !== id)
          if (state.currentNotebook?.id === id) {
            state.currentNotebook = null
          }
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : '删除笔记本失败'
        })
      }
    },

    changeSortNotebook: async (id: string, sort: number) => {
      try {
        await api.changeSortNotebook(id, sort)
        set((state) => {
          const notebook = state.notebooks.find(nb => nb.id === id)
          if (notebook) {
            notebook.sort = sort
            notebook.updated = new Date().toISOString()
          }
          // 重新排序
          state.notebooks.sort((a, b) => a.sort - b.sort)
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : '更改笔记本排序失败'
        })
      }
    },

    setCurrentNotebook: (notebook: Notebook | null) => {
      set((state) => {
        state.currentNotebook = notebook
      })
    },

    clearError: () => {
      set((state) => {
        state.error = null
      })
    }
  }))
)
