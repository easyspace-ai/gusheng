import React, { createContext, useContext, useState, useRef, useEffect } from 'react'

interface MenuItem {
  id: string
  label: string
  icon?: React.ReactNode
  action: () => void
  disabled?: boolean
  divider?: boolean
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  items: MenuItem[]
}

interface ContextMenuContextType {
  showContextMenu: (event: React.MouseEvent, items: MenuItem[]) => void
  hideContextMenu: () => void
  contextMenu: ContextMenuState
}

const ContextMenuContext = createContext<ContextMenuContextType | null>(null)

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    items: []
  })
  
  const menuRef = useRef<HTMLDivElement>(null)

  const showContextMenu = (event: React.MouseEvent, items: MenuItem[]) => {
    event.preventDefault()
    event.stopPropagation()
    
    const { clientX, clientY } = event
    
    setContextMenu({
      visible: true,
      x: clientX,
      y: clientY,
      items
    })
  }

  const hideContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        hideContextMenu()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hideContextMenu()
      }
    }

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [contextMenu.visible])

  // 调整菜单位置避免超出屏幕
  const adjustMenuPosition = () => {
    if (!menuRef.current || !contextMenu.visible) return

    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let x = contextMenu.x
    let y = contextMenu.y

    // 如果菜单超出右边界，向左调整
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 8
    }

    // 如果菜单超出底部边界，向上调整
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 8
    }

    // 确保菜单不会超出左边和顶部
    x = Math.max(8, x)
    y = Math.max(8, y)

    if (x !== contextMenu.x || y !== contextMenu.y) {
      setContextMenu(prev => ({ ...prev, x, y }))
    }
  }

  useEffect(() => {
    if (contextMenu.visible) {
      // 使用 setTimeout 确保 DOM 更新后再调整位置
      setTimeout(adjustMenuPosition, 0)
    }
  }, [contextMenu.visible, contextMenu.x, contextMenu.y])

  const handleMenuItemClick = (item: MenuItem) => {
    if (!item.disabled) {
      item.action()
      hideContextMenu()
    }
  }

  return (
    <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu, contextMenu }}>
      {children}
      
      {/* 上下文菜单 */}
      {contextMenu.visible && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-light-panel dark:bg-dark-panel border border-light-border dark:border-dark-border rounded-lg shadow-lg py-1 min-w-48 animate-fade-in"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          {contextMenu.items.map((item, index) => (
            <React.Fragment key={item.id}>
              {item.divider && index > 0 && (
                <div className="h-px bg-light-border dark:bg-dark-border mx-1 my-1" />
              )}
              <button
                className={`w-full flex items-center px-3 py-2 text-sm text-left transition-colors ${
                  item.disabled
                    ? 'text-light-text-secondary dark:text-dark-text-secondary cursor-not-allowed'
                    : 'text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover'
                }`}
                onClick={() => handleMenuItemClick(item)}
                disabled={item.disabled}
              >
                {item.icon && (
                  <span className="mr-3 flex-shrink-0">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </ContextMenuContext.Provider>
  )
}

export function useContextMenu() {
  const context = useContext(ContextMenuContext)
  if (!context) {
    throw new Error('useContextMenu must be used within ContextMenuProvider')
  }
  return context
}