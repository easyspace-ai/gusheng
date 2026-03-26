import React, { useState } from 'react';
import { X, MoreHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';

export interface TabType {
  id: string;
  title: string;
  isActive: boolean;
  isDirty?: boolean;
  isLocked?: boolean;
  filePath?: string;
}

interface TabProps {
  tab: TabType;
  onClose: (id: string) => void;
  onActivate: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onCloseAll: () => void;
  onSplitHorizontal: (id: string) => void;
  onSplitVertical: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onCopyPath?: (id: string) => void;
  onRevealInExplorer?: (id: string) => void;
}

const Tab: React.FC<TabProps> = ({ 
  tab, 
  onClose, 
  onActivate, 
  onCloseOthers, 
  onCloseAll, 
  onSplitHorizontal, 
  onSplitVertical,
  onToggleLock,
  onDuplicate,
  onRename,
  onCopyPath,
  onRevealInExplorer
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(tab.title);

  const handleDropdownClick = (action: string) => {
    setIsDropdownOpen(false);
    switch (action) {
      case 'close':
        if (!tab.isLocked) onClose(tab.id);
        break;
      case 'closeOthers':
        onCloseOthers(tab.id);
        break;
      case 'closeAll':
        onCloseAll();
        break;
      case 'splitHorizontal':
        onSplitHorizontal(tab.id);
        break;
      case 'splitVertical':
        onSplitVertical(tab.id);
        break;
      case 'toggleLock':
        onToggleLock(tab.id);
        break;
      case 'duplicate':
        onDuplicate(tab.id);
        break;
      case 'rename':
        setIsRenaming(true);
        setNewTitle(tab.title);
        break;
      case 'copyPath':
        if (onCopyPath) onCopyPath(tab.id);
        break;
      case 'revealInExplorer':
        if (onRevealInExplorer) onRevealInExplorer(tab.id);
        break;
    }
  };

  const handleRenameSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRename(tab.id, newTitle);
      setIsRenaming(false);
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setNewTitle(tab.title);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "group relative flex items-center min-w-0 max-w-[200px] h-8",
            "border-r border-tab-border",
            tab.isActive 
              ? "bg-tab-active" 
              : "bg-tab-inactive hover:bg-tab-hover"
          )}
        >
          {/* Tab content */}
          <div 
            className="flex-1 flex items-center px-3 cursor-pointer min-w-0"
            onClick={() => onActivate(tab.id)}
          >
        {tab.isLocked && (
          <svg className="w-3 h-3 mr-1.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
        
        {isRenaming ? (
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleRenameSubmit}
            onBlur={() => setIsRenaming(false)}
            className="flex-1 text-sm bg-transparent border-none outline-none text-foreground"
            autoFocus
          />
        ) : (
          <span className="text-sm text-foreground truncate">
            {tab.title}
          </span>
        )}
        
        {tab.isDirty && (
          <div className="ml-2 w-1.5 h-1.5 bg-primary rounded-full" />
        )}
      </div>

      {/* Close button */}
      <button 
        className={cn(
          "flex items-center justify-center w-5 h-5 mr-1",
          "opacity-0 group-hover:opacity-100 hover:bg-nav-hover rounded",
          "transition-opacity duration-150"
        )}
        onClick={(e) => {
          e.stopPropagation();
          if (!tab.isLocked) onClose(tab.id);
        }}
      >
        <X className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  </ContextMenuTrigger>
      
      <ContextMenuContent className="w-48 bg-card border border-border shadow-dropdown z-50">
        <ContextMenuItem 
          className="text-sm hover:bg-secondary cursor-pointer"
          onClick={() => handleDropdownClick('close')}
          disabled={tab.isLocked}
        >
          关闭
        </ContextMenuItem>
        <ContextMenuItem 
          className="text-sm hover:bg-secondary cursor-pointer"
          onClick={() => handleDropdownClick('closeOthers')}
        >
          关闭其他标签页
        </ContextMenuItem>
        <ContextMenuItem 
          className="text-sm hover:bg-secondary cursor-pointer"
          onClick={() => handleDropdownClick('closeAll')}
        >
          全部关闭
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          className="text-sm hover:bg-secondary cursor-pointer"
          onClick={() => handleDropdownClick('duplicate')}
        >
          复制标签页
        </ContextMenuItem>
        <ContextMenuItem 
          className="text-sm hover:bg-secondary cursor-pointer"
          onClick={() => handleDropdownClick('rename')}
        >
          重命名
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          className="text-sm hover:bg-secondary cursor-pointer"
          onClick={() => handleDropdownClick('toggleLock')}
        >
          {tab.isLocked ? '解锁' : '锁定'}
        </ContextMenuItem>
        <ContextMenuItem 
          className="text-sm hover:bg-secondary cursor-pointer"
          onClick={() => handleDropdownClick('copyPath')}
          disabled={!tab.filePath}
        >
          复制文件路径
        </ContextMenuItem>
        <ContextMenuItem 
          className="text-sm hover:bg-secondary cursor-pointer"
          onClick={() => handleDropdownClick('revealInExplorer')}
        >
          在资源管理器中显示
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          className="text-sm hover:bg-secondary cursor-pointer"
          onClick={() => handleDropdownClick('splitHorizontal')}
        >
          左右分屏
        </ContextMenuItem>
        <ContextMenuItem 
          className="text-sm hover:bg-secondary cursor-pointer"
          onClick={() => handleDropdownClick('splitVertical')}
        >
          上下分屏
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

interface TabBarProps {
  tabs: TabType[];
  onCloseTab: (id: string) => void;
  onActivateTab: (id: string) => void;
  onAddTab: () => void;
  onCloseOthers: (id: string) => void;
  onCloseAll: () => void;
  onSplitHorizontal: (id: string) => void;
  onSplitVertical: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onCopyPath?: (id: string) => void;
  onRevealInExplorer?: (id: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ 
  tabs, 
  onCloseTab, 
  onActivateTab, 
  onAddTab, 
  onCloseOthers, 
  onCloseAll, 
  onSplitHorizontal, 
  onSplitVertical,
  onToggleLock,
  onDuplicate,
  onRename,
  onCopyPath,
  onRevealInExplorer
}) => {
  return (
    <div className="flex items-center bg-panel border-b border-border">
      {/* Navigation controls */}
      <div className="flex items-center px-2 border-r border-border">
        <button className="p-1 hover:bg-nav-hover rounded">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <button className="p-1 hover:bg-nav-hover rounded">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tabs with inline add button */}
      <div className="flex flex-1 overflow-x-auto">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            tab={tab}
            onClose={onCloseTab}
            onActivate={onActivateTab}
            onCloseOthers={onCloseOthers}
            onCloseAll={onCloseAll}
            onSplitHorizontal={onSplitHorizontal}
            onSplitVertical={onSplitVertical}
            onToggleLock={onToggleLock}
            onDuplicate={onDuplicate}
            onRename={onRename}
            onCopyPath={onCopyPath}
            onRevealInExplorer={onRevealInExplorer}
          />
        ))}
        
        {/* Add tab button - positioned after last tab */}
        <button 
          onClick={onAddTab}
          className="flex items-center justify-center w-8 h-8 hover:bg-nav-hover rounded transition-colors flex-shrink-0"
          title="新建标签页"
        > 
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export { Tab, TabBar };
export type { Tab as TabType };