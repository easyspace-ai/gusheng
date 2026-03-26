import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  X, 
  Plus,
  MoreHorizontal,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Pin,
  PinOff,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores';
import type { Tab, Pane } from '@/stores/editorStore';
import { Input } from '@/components/ui/input';
import { EnhancedEditor } from './EnhancedEditor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EnhancedTabSystemProps {
  className?: string;
}

// 动画配置
const TAB_ANIMATIONS = {
  initial: { opacity: 0, x: -20, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 20, scale: 0.95 },
  hover: { y: -2, transition: { duration: 0.2 } },
  tap: { scale: 0.95 },
  transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
};

const PANE_ANIMATIONS = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
};

// 拖拽区域指示器
const DropZone: React.FC<{
  isVisible: boolean;
  position: 'left' | 'right' | 'top' | 'bottom' | 'center';
  onDrop: () => void;
}> = ({ isVisible, position, onDrop }) => {
  if (!isVisible) return null;

  const getPositionStyles = () => {
    switch (position) {
      case 'left':
        return 'left-0 top-0 w-1/2 h-full';
      case 'right':
        return 'right-0 top-0 w-1/2 h-full';
      case 'top':
        return 'top-0 left-0 w-full h-1/2';
      case 'bottom':
        return 'bottom-0 left-0 w-full h-1/2';
      case 'center':
        return 'inset-4';
      default:
        return 'inset-0';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "absolute z-50 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/50 backdrop-blur-sm",
        "flex items-center justify-center text-blue-600 font-medium",
        getPositionStyles()
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      {position === 'center' ? '放置到此标签页' : `分割到${position === 'left' ? '左侧' : position === 'right' ? '右侧' : position === 'top' ? '上方' : '下方'}`}
    </motion.div>
  );
};

// 单个标签页组件
const TabItem: React.FC<{
  tab: Tab;
  paneId: string;
  isActive: boolean;
  onClose: () => void;
  onSelect: () => void;
  onRename: (newTitle: string) => void;
  onPin: () => void;
  isDragging?: boolean;
}> = ({ tab, paneId, isActive, onClose, onSelect, onRename, onPin, isDragging }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(tab.title);
  const [isHovered, setIsHovered] = useState(false);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditTitle(tab.title);
  }, [tab.title]);

  const handleRename = useCallback(() => {
    if (editTitle.trim() && editTitle !== tab.title) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  }, [editTitle, tab.title, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(tab.title);
    }
  }, [handleRename, tab.title]);

  return (
    <Reorder.Item
      value={tab}
      dragListener={!isEditing}
      className={cn(
        "relative group flex items-center gap-2 px-3 py-2 min-w-0 max-w-48",
        "border-r border-gray-200 cursor-pointer select-none",
        "transition-all duration-200 ease-out",
        isActive 
          ? "bg-white text-gray-900 shadow-sm border-b-2 border-b-blue-500" 
          : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800",
        isDragging && "opacity-50 rotate-2 scale-95 shadow-lg z-50",
        tab.isPinned && "border-l-2 border-l-blue-400"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      whileHover={!isEditing ? TAB_ANIMATIONS.hover : undefined}
      whileTap={!isEditing ? TAB_ANIMATIONS.tap : undefined}
    >
      {/* 固定指示器 */}
      {tab.isPinned && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"
        />
      )}

      {/* 标题 */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="h-6 px-1 text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <span className={cn(
            "text-sm font-medium truncate block",
            tab.isDirty && "italic"
          )}>
            {tab.title}
            {tab.isDirty && (
              <span className="ml-1 text-orange-500">•</span>
            )}
          </span>
        )}
      </div>

      {/* 操作按钮 */}
      <div className={cn(
        "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
        (isActive || isHovered) && "opacity-100"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={12} />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit2 size={14} className="mr-2" />
              重命名
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPin}>
              {tab.isPinned ? <PinOff size={14} className="mr-2" /> : <Pin size={14} className="mr-2" />}
              {tab.isPinned ? '取消固定' : '固定标签'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onClose}
              className="text-red-600 hover:text-red-700"
            >
              <X size={14} className="mr-2" />
              关闭
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-1 rounded hover:bg-red-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X size={12} className="text-gray-500 hover:text-red-500" />
        </motion.button>
      </div>
    </Reorder.Item>
  );
};

// 标签栏组件
const TabBar: React.FC<{
  pane: Pane;
  onTabReorder: (tabs: Tab[]) => void;
  onTabClose: (tabId: string) => void;
  onTabSelect: (tabId: string) => void;
  onTabRename: (tabId: string, newTitle: string) => void;
  onTabPin: (tabId: string) => void;
  onNewTab: () => void;
  onSplitPane: (direction: 'horizontal' | 'vertical') => void;
}> = ({ 
  pane, 
  onTabReorder, 
  onTabClose, 
  onTabSelect, 
  onTabRename, 
  onTabPin,
  onNewTab,
  onSplitPane
}) => {
  const [draggedTab, setDraggedTab] = useState<Tab | null>(null);
  
  return (
    <div className="flex items-center bg-gray-50 border-b border-gray-200 min-h-[44px]">
      <Reorder.Group
        axis="x"
        values={pane.tabs}
        onReorder={onTabReorder}
        className="flex flex-1 min-w-0"
      >
        <AnimatePresence mode="popLayout">
          {pane.tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              paneId={pane.id}
              isActive={tab.isActive}
              onClose={() => onTabClose(tab.id)}
              onSelect={() => onTabSelect(tab.id)}
              onRename={(newTitle) => onTabRename(tab.id, newTitle)}
              onPin={() => onTabPin(tab.id)}
              isDragging={draggedTab?.id === tab.id}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* 工具按钮 */}
      <div className="flex items-center gap-1 px-2 border-l border-gray-200">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          onClick={onNewTab}
          title="新建标签"
        >
          <Plus size={14} />
        </motion.button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded hover:bg-gray-200 transition-colors"
              title="分割编辑器"
            >
              <SplitSquareHorizontal size={14} />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSplitPane('horizontal')}>
              <SplitSquareHorizontal size={14} className="mr-2" />
              水平分割
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSplitPane('vertical')}>
              <SplitSquareVertical size={14} className="mr-2" />
              垂直分割
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// 编辑器面板组件
const EditorPane: React.FC<{
  pane: Pane;
  isActive: boolean;
  onActivate: () => void;
  onTabReorder: (tabs: Tab[]) => void;
  onTabClose: (tabId: string) => void;
  onTabSelect: (tabId: string) => void;
  onTabRename: (tabId: string, newTitle: string) => void;
  onTabPin: (tabId: string) => void;
  onNewTab: () => void;
  onSplitPane: (direction: 'horizontal' | 'vertical') => void;
  onClosePane: () => void;
}> = ({ 
  pane, 
  isActive, 
  onActivate,
  onTabReorder,
  onTabClose,
  onTabSelect,
  onTabRename,
  onTabPin,
  onNewTab,
  onSplitPane,
  onClosePane
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropZone, setDropZone] = useState<'left' | 'right' | 'top' | 'bottom' | 'center' | null>(null);

  const activeTab = pane.tabs.find(tab => tab.isActive);
  const { notes } = useAppStore();
  const activeNote = activeTab ? notes[activeTab.noteId] : null;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const threshold = 100;

    if (x < threshold) {
      setDropZone('left');
    } else if (x > rect.width - threshold) {
      setDropZone('right');
    } else if (y < threshold) {
      setDropZone('top');
    } else if (y > rect.height - threshold) {
      setDropZone('bottom');
    } else {
      setDropZone('center');
    }

    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
    setDropZone(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDropZone(null);
    
    // 处理标签页拖拽到分割区域的逻辑
    const tabData = e.dataTransfer.getData('text/plain');
    if (tabData && dropZone && dropZone !== 'center') {
      onSplitPane(dropZone === 'left' || dropZone === 'right' ? 'horizontal' : 'vertical');
    }
  }, [dropZone, onSplitPane]);

  return (
    <motion.div
      {...PANE_ANIMATIONS}
      className={cn(
        "flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden",
        isActive && "ring-2 ring-blue-500/20 border-blue-300"
      )}
      onClick={onActivate}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <TabBar
        pane={pane}
        onTabReorder={onTabReorder}
        onTabClose={onTabClose}
        onTabSelect={onTabSelect}
        onTabRename={onTabRename}
        onTabPin={onTabPin}
        onNewTab={onNewTab}
        onSplitPane={onSplitPane}
      />

      <div className="flex-1 relative overflow-hidden">
        {activeNote ? (
          <EnhancedEditor note={activeNote} className="h-full" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">没有打开的文件</h3>
              <p className="text-sm">从文件树中选择一个文件来开始编辑</p>
            </div>
          </div>
        )}

        {/* 拖拽区域指示器 */}
        <AnimatePresence>
          {isDragOver && dropZone && (
            <DropZone
              isVisible={true}
              position={dropZone}
              onDrop={() => {
                if (dropZone !== 'center') {
                  onSplitPane(dropZone === 'left' || dropZone === 'right' ? 'horizontal' : 'vertical');
                }
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// 主要的标签系统组件
export function EnhancedTabSystem({ className }: EnhancedTabSystemProps) {
  const { 
    panes, 
    activePaneId,
    setActivePane,
    addTab,
    removeTab,
    setActiveTab,
    closeTab,
    renameNoteAndUpdateTabs,
    createFileInEditor
  } = useAppStore();

  const handleTabReorder = useCallback((paneId: string, tabs: Tab[]) => {
    // 更新标签页顺序的逻辑
    console.log('Reorder tabs in pane:', paneId, tabs);
  }, []);

  const handleTabClose = useCallback((paneId: string, tabId: string) => {
    closeTab(tabId, paneId);
  }, [closeTab]);

  const handleTabSelect = useCallback((paneId: string, tabId: string) => {
    setActiveTab(paneId, tabId);
    setActivePane(paneId);
  }, [setActiveTab, setActivePane]);

  const handleTabRename = useCallback((tabId: string, newTitle: string) => {
    // 找到对应的标签页和笔记
    const tab = panes.flatMap(p => p.tabs).find(t => t.id === tabId);
    if (tab) {
      renameNoteAndUpdateTabs(tab.noteId, newTitle);
    }
  }, [panes, renameNoteAndUpdateTabs]);

  const handleTabPin = useCallback((paneId: string, tabId: string) => {
    // 切换标签页固定状态的逻辑
    console.log('Toggle pin for tab:', tabId, 'in pane:', paneId);
  }, []);

  const handleNewTab = useCallback((paneId: string) => {
    createFileInEditor('markdown');
  }, [createFileInEditor]);

  const handleSplitPane = useCallback((paneId: string, direction: 'horizontal' | 'vertical') => {
    // 分割面板的逻辑
    console.log('Split pane:', paneId, 'direction:', direction);
  }, []);

  const handleClosePane = useCallback((paneId: string) => {
    // 关闭面板的逻辑
    console.log('Close pane:', paneId);
  }, []);

  return (
    <div className={cn("h-full flex", className)}>
      <AnimatePresence>
        {panes.map((pane, index) => (
          <motion.div
            key={pane.id}
            layout
            className={cn(
              "flex-1 min-w-0",
              index > 0 && "ml-2"
            )}
          >
            <EditorPane
              pane={pane}
              isActive={activePaneId === pane.id}
              onActivate={() => setActivePane(pane.id)}
              onTabReorder={(tabs) => handleTabReorder(pane.id, tabs)}
              onTabClose={(tabId) => handleTabClose(pane.id, tabId)}
              onTabSelect={(tabId) => handleTabSelect(pane.id, tabId)}
              onTabRename={handleTabRename}
              onTabPin={(tabId) => handleTabPin(pane.id, tabId)}
              onNewTab={() => handleNewTab(pane.id)}
              onSplitPane={(direction) => handleSplitPane(pane.id, direction)}
              onClosePane={() => handleClosePane(pane.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}