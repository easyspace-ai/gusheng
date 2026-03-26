import React, { useMemo } from 'react'
import { List, ChevronRight, ChevronDown, Hash, FileText } from 'lucide-react'
import { useAppStore } from '../../stores'

interface OutlineItem {
  id: string
  text: string
  level: number
  line: number
  children: OutlineItem[]
}

export function OutlinePanel() {
  const { notes, panes, activePaneId } = useAppStore()

  // 获取当前活动笔记
  const getActiveNote = () => {
    const activePane = panes.find(pane => pane.id === activePaneId) || panes[0]
    if (!activePane || !activePane.activeTabId) return null
    
    const activeTab = activePane.tabs.find(tab => tab.id === activePane.activeTabId)
    if (!activeTab) return null
    
    return notes[activeTab.noteId]
  }

  const activeNote = getActiveNote()

  // 解析大纲
  const outline = useMemo(() => {
    if (!activeNote) return []

    const lines = activeNote.content.split('\n')
    const headings: OutlineItem[] = []
    const stack: OutlineItem[] = []

    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const text = headingMatch[2].trim()
        
        const item: OutlineItem = {
          id: `heading-${index}`,
          text,
          level,
          line: index + 1,
          children: []
        }

        // 找到合适的父级
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop()
        }

        if (stack.length === 0) {
          headings.push(item)
        } else {
          stack[stack.length - 1].children.push(item)
        }

        stack.push(item)
      }
    })

    return headings
  }, [activeNote])

  const handleHeadingClick = (line: number) => {
    // TODO: 滚动到对应行
    console.log('Jump to line:', line)
  }

  if (!activeNote) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <div className="text-center">
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">请选择一个笔记</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 当前笔记信息 */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center text-sm text-foreground mb-2">
          <List size={14} className="mr-2" />
          <span className="font-medium truncate">{activeNote.title}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {outline.length} 个标题
        </div>
      </div>

      {/* 大纲列表 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {outline.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Hash size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-1">暂无大纲</p>
              <p className="text-xs">在笔记中使用 # 标题来创建大纲</p>
            </div>
          </div>
        ) : (
          <div className="p-2">
            <div className="space-y-1">
              {outline.map(item => (
                <OutlineItemComponent
                  key={item.id}
                  item={item}
                  onClick={handleHeadingClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface OutlineItemComponentProps {
  item: OutlineItem
  onClick: (line: number) => void
}

function OutlineItemComponent({ item, onClick }: OutlineItemComponentProps) {
  const [isExpanded, setIsExpanded] = React.useState(true)
  const hasChildren = item.children.length > 0

  const getIndentClass = (level: number) => {
    switch (level) {
      case 1: return 'pl-0'
      case 2: return 'pl-4'
      case 3: return 'pl-8'
      case 4: return 'pl-12'
      case 5: return 'pl-16'
      case 6: return 'pl-20'
      default: return 'pl-0'
    }
  }

  const getTextSizeClass = (level: number) => {
    switch (level) {
      case 1: return 'text-sm font-semibold'
      case 2: return 'text-sm font-medium'
      case 3: return 'text-sm'
      case 4: return 'text-xs font-medium'
      case 5: return 'text-xs'
      case 6: return 'text-xs'
      default: return 'text-sm'
    }
  }

  const handleClick = () => {
    onClick(item.line)
  }

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div>
      <div
        className={`flex items-center py-1 rounded hover:bg-light-hover dark:hover:bg-dark-hover cursor-pointer transition-colors group ${getIndentClass(item.level)}`}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            onClick={toggleExpand}
            className="flex-shrink-0 mr-1 p-0.5 rounded hover:bg-light-hover dark:hover:bg-dark-hover"
          >
            {isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </button>
        ) : (
          <div className="w-5 flex justify-center">
            <Hash size={10} className="text-light-text-secondary dark:text-dark-text-secondary" />
          </div>
        )}
        
        <span className={`flex-1 truncate text-light-text dark:text-dark-text ${getTextSizeClass(item.level)}`}>
          {item.text}
        </span>
        
        <span className="opacity-0 group-hover:opacity-100 text-xs text-light-text-secondary dark:text-dark-text-secondary">
          {item.line}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {item.children.map(child => (
            <OutlineItemComponent
              key={child.id}
              item={child}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}