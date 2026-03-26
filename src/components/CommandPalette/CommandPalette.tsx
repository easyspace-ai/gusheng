import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, 
  FileText, 
  Plus, 
  Eye, 
  Edit, 
  SplitSquareHorizontal,
  Sun,
  Moon,
  PanelLeft,
  PanelRight,
  Hash,
  Share2
} from 'lucide-react'
import { useAppStore } from '../../stores'

interface Command {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  keywords: string[]
  action: () => void
  category: 'file' | 'view' | 'navigation' | 'theme' | 'panel'
}

export function CommandPalette() {
  const {
    commandPaletteVisible,
    notes,
    isDarkMode,
    leftSidebarVisible,
    rightSidebarVisible,
    toggleCommandPalette,
    addNote,
    openNoteInTab,
    setEditorMode,
    toggleTheme,
    toggleLeftSidebar,
    toggleRightSidebar,
    setLeftPanel,
    setRightPanel
  } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')

  // 定义所有命令
  const allCommands: Command[] = useMemo(() => [
    // 文件操作
    {
      id: 'new-note',
      title: '新建笔记',
      description: '创建一个新的笔记',
      icon: <Plus size={16} />,
      keywords: ['新建', '创建', '笔记', 'new', 'note'],
      category: 'file' as const,
      action: () => {
        const id = `note-${Date.now()}`
        const note = {
          id,
          title: '新笔记',
          content: '# 新笔记\n\n开始编辑这个笔记...',
          links: [],
          backlinks: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          fileType: 'markdown' as const
        }
        addNote(note)
        openNoteInTab(id)
        toggleCommandPalette()
      }
    },
    
    // 视图模式
    {
      id: 'edit-mode',
      title: '编辑模式',
      description: '切换到编辑模式',
      icon: <Edit size={16} />,
      keywords: ['编辑', '模式', 'edit', 'mode'],
      category: 'view' as const,
      action: () => {
        setEditorMode('edit')
        toggleCommandPalette()
      }
    },
    {
      id: 'preview-mode',
      title: '预览模式',
      description: '切换到预览模式',
      icon: <Eye size={16} />,
      keywords: ['预览', '模式', 'preview', 'mode'],
      category: 'view' as const,
      action: () => {
        setEditorMode('preview')
        toggleCommandPalette()
      }
    },
    {
      id: 'split-mode',
      title: '分屏模式',
      description: '切换到分屏模式',
      icon: <SplitSquareHorizontal size={16} />,
      keywords: ['分屏', '模式', 'split', 'mode'],
      category: 'view' as const,
      action: () => {
        setEditorMode('split')
        toggleCommandPalette()
      }
    },

    // 主题切换
    {
      id: 'toggle-theme',
      title: isDarkMode ? '切换到浅色主题' : '切换到暗色主题',
      description: '切换应用主题',
      icon: isDarkMode ? <Sun size={16} /> : <Moon size={16} />,
      keywords: ['主题', '暗色', '浅色', 'theme', 'dark', 'light'],
      category: 'theme' as const,
      action: () => {
        toggleTheme()
        toggleCommandPalette()
      }
    },

    // 面板控制
    {
      id: 'toggle-left-sidebar',
      title: leftSidebarVisible ? '隐藏左侧边栏' : '显示左侧边栏',
      description: '切换左侧边栏显示状态',
      icon: <PanelLeft size={16} />,
      keywords: ['侧边栏', '左侧', '面板', 'sidebar', 'left', 'panel'],
      category: 'panel' as const,
      action: () => {
        toggleLeftSidebar()
        toggleCommandPalette()
      }
    },
    {
      id: 'toggle-right-sidebar',
      title: rightSidebarVisible ? '隐藏右侧边栏' : '显示右侧边栏',
      description: '切换右侧边栏显示状态',
      icon: <PanelRight size={16} />,
      keywords: ['侧边栏', '右侧', '面板', 'sidebar', 'right', 'panel'],
      category: 'panel' as const,
      action: () => {
        toggleRightSidebar()
        toggleCommandPalette()
      }
    },
    {
      id: 'show-graph',
      title: '显示关系图',
      description: '切换到关系图面板',
      icon: <Share2 size={16} />,
      keywords: ['关系图', '图谱', 'graph', 'relationship'],
      category: 'panel' as const,
      action: () => {
        setRightPanel('graph')
        if (!rightSidebarVisible) {
          toggleRightSidebar()
        }
        toggleCommandPalette()
      }
    },
    {
      id: 'show-outline',
      title: '显示大纲',
      description: '切换到大纲面板',
      icon: <Hash size={16} />,
      keywords: ['大纲', '目录', 'outline', 'toc'],
      category: 'panel' as const,
      action: () => {
        setRightPanel('outline')
        if (!rightSidebarVisible) {
          toggleRightSidebar()
        }
        toggleCommandPalette()
      }
    },

    // 导航到笔记
    ...Object.values(notes).map(note => ({
      id: `open-${note.id}`,
      title: `打开: ${note.title}`,
      description: '打开这个笔记',
      icon: <FileText size={16} />,
      keywords: [note.title, '打开', '笔记', 'open', 'note'],
      category: 'navigation' as const,
      action: () => {
        openNoteInTab(note.id)
        toggleCommandPalette()
      }
    }))
  ], [
    notes,
    isDarkMode,
    leftSidebarVisible,
    rightSidebarVisible,
    addNote,
    openNoteInTab,
    setEditorMode,
    toggleTheme,
    toggleLeftSidebar,
    toggleRightSidebar,
    setLeftPanel,
    setRightPanel,
    toggleCommandPalette
  ])

  // 过滤命令
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return allCommands.slice(0, 10) // 显示前10个常用命令

    const query = searchQuery.toLowerCase()
    return allCommands.filter(command => 
      command.title.toLowerCase().includes(query) ||
      command.description.toLowerCase().includes(query) ||
      command.keywords.some(keyword => keyword.toLowerCase().includes(query))
    ).slice(0, 20) // 最多显示20个结果
  }, [searchQuery, allCommands])

  const [selectedIndex, setSelectedIndex] = useState(0)

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredCommands])

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!commandPaletteVisible) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action()
          }
          break
        case 'Escape':
          e.preventDefault()
          toggleCommandPalette()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [commandPaletteVisible, filteredCommands, selectedIndex, toggleCommandPalette])

  // Ctrl+P / Cmd+P 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        toggleCommandPalette()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleCommandPalette])

  if (!commandPaletteVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50"
         onClick={() => toggleCommandPalette()}>
      <div className="w-full max-w-2xl bg-background rounded-lg shadow-2xl border border-border overflow-hidden"
           onClick={(e) => e.stopPropagation()}>
        
        {/* 搜索框 */}
        <div className="flex items-center p-4 border-b border-border">
          <Search size={20} className="text-muted-foreground mr-3" />
          <input
            type="text"
            placeholder="输入命令或搜索笔记..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* 命令列表 */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p>未找到匹配的命令</p>
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <div
                key={command.id}
                className={`flex items-center p-4 cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? 'bg-primary/15 text-primary'
                    : 'hover:bg-nav-hover'
                }`}
                onClick={() => command.action()}
              >
                <div className="mr-3 text-muted-foreground">
                  {command.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{command.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {command.description}
                  </div>
                </div>
                <div className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
                  {getCategoryBadge(command.category)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部提示 */}
        <div className="p-3 border-t border-border bg-secondary text-muted-foreground text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span>↑↓ 导航</span>
              <span>↵ 执行</span>
              <span>ESC 关闭</span>
            </div>
            <span>{filteredCommands.length} 个结果</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function getCategoryBadge(category: Command['category']) {
  const badges = {
    file: '文件',
    view: '视图',
    navigation: '导航',
    theme: '主题',
    panel: '面板'
  }
  return badges[category] || ''
}