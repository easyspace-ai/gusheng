import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { File, Plus, X, Clock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type FileItem } from './FileTree';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  files: Record<string, FileItem>;
  onFileSelect: (file: FileItem) => void;
  onCreateFile: (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code') => void;
  onCloseTab?: () => void;
  recentFiles: string[];
}

interface Command {
  id: string;
  title: string;
  description?: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'action' | 'file' | 'recent';
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  files,
  onFileSelect,
  onCreateFile,
  onCloseTab,
  recentFiles
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 获取所有文件的平铺列表
  const allFiles = useMemo(() => {
    return Object.values(files).filter(file => file.type === 'file');
  }, [files]);

  // 获取近期文件
  const recentFileItems = useMemo(() => {
    return recentFiles
      .map(fileId => files[fileId])
      .filter(Boolean)
      .slice(0, 10);
  }, [recentFiles, files]);

  // 生成命令列表
  const commands = useMemo(() => {
    const actionCommands: Command[] = [
      {
        id: 'create-markdown',
        title: '创建新文件',
        description: 'Markdown文档',
        shortcut: '⌘N',
        icon: <Plus className="h-4 w-4" />,
        action: () => {
          onCreateFile('markdown');
          onClose();
        },
        category: 'action'
      },
      {
        id: 'create-database',
        title: '新建数据库',
        icon: <Plus className="h-4 w-4" />,
        action: () => {
          onCreateFile('database');
          onClose();
        },
        category: 'action'
      },
      {
        id: 'create-canvas',
        title: '新建画图',
        icon: <Plus className="h-4 w-4" />,
        action: () => {
          onCreateFile('canvas');
          onClose();
        },
        category: 'action'
      },
      {
        id: 'create-html',
        title: '新建HTML',
        icon: <Plus className="h-4 w-4" />,
        action: () => {
          onCreateFile('html');
          onClose();
        },
        category: 'action'
      },
      {
        id: 'create-code',
        title: '新建代码',
        icon: <Plus className="h-4 w-4" />,
        action: () => {
          onCreateFile('code');
          onClose();
        },
        category: 'action'
      }
    ];

    if (onCloseTab) {
      actionCommands.push({
        id: 'close-tab',
        title: '关闭标签页',
        icon: <X className="h-4 w-4" />,
        action: () => {
          onCloseTab();
          onClose();
        },
        category: 'action'
      });
    }

    const fileCommands: Command[] = allFiles.map(file => ({
      id: `file-${file.id}`,
      title: file.name,
      description: file.path,
      icon: <File className="h-4 w-4" />,
      action: () => {
        onFileSelect(file);
        onClose();
      },
      category: 'file' as const
    }));

    const recentCommands: Command[] = recentFileItems.map(file => ({
      id: `recent-${file.id}`,
      title: file.name,
      description: file.path,
      icon: <Clock className="h-4 w-4" />,
      action: () => {
        onFileSelect(file);
        onClose();
      },
      category: 'recent' as const
    }));

    return [...actionCommands, ...recentCommands, ...fileCommands];
  }, [allFiles, recentFileItems, onCreateFile, onFileSelect, onCloseTab, onClose]);

  // 过滤命令
  const filteredCommands = useMemo(() => {
    if (!search.trim()) {
      // 无搜索时，优先显示操作命令和近期文件
      const actions = commands.filter(cmd => cmd.category === 'action');
      const recents = commands.filter(cmd => cmd.category === 'recent').slice(0, 5);
      return [...actions, ...recents];
    }

    const searchLower = search.toLowerCase();
    return commands.filter(cmd =>
      cmd.title.toLowerCase().includes(searchLower) ||
      cmd.description?.toLowerCase().includes(searchLower)
    ).slice(0, 20);
  }, [commands, search]);

  // 重置选中项
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // 重置搜索
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // 键盘导航
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'action':
        return '操作';
      case 'recent':
        return '近期文件';
      case 'file':
        return '所有文件';
      default:
        return '';
    }
  };

  const renderCommands = () => {
    const groupedCommands = filteredCommands.reduce((acc, cmd) => {
      if (!acc[cmd.category]) {
        acc[cmd.category] = [];
      }
      acc[cmd.category].push(cmd);
      return acc;
    }, {} as Record<string, Command[]>);

    return Object.entries(groupedCommands).map(([category, cmds]) => (
      <div key={category} className="mb-4">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {getCategoryTitle(category)}
        </div>
        {cmds.map((cmd) => {
          const globalIndex = filteredCommands.indexOf(cmd);
          return (
            <Button
              key={cmd.id}
              variant="ghost"
              className={cn(
                "w-full justify-start px-3 py-2 h-auto text-left",
                globalIndex === selectedIndex && "bg-accent"
              )}
              onClick={() => cmd.action()}
            >
              <div className="flex items-center gap-3 w-full">
                {cmd.icon}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{cmd.title}</div>
                  {cmd.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {cmd.description}
                    </div>
                  )}
                </div>
                {cmd.shortcut && (
                  <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {cmd.shortcut}
                  </div>
                )}
              </div>
            </Button>
          );
        })}
      </div>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[70vh] p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="输入以切换或创建文件......"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-0 focus-visible:ring-0 text-base"
              autoFocus
            />
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-2">
          {filteredCommands.length > 0 ? (
            renderCommands()
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>未找到匹配的命令或文件</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t bg-muted/50">
          <div className="flex justify-between text-xs text-muted-foreground">
            <div className="flex gap-4">
              <span>↑↓ 导航</span>
              <span>↵ 打开</span>
              <span>⌘↵ 在新标签页中打开</span>
              <span>⌘⇧↵ 在新标签组中打开</span>
              <span>shift ↵ 创建</span>
            </div>
            <span>esc 退出</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;