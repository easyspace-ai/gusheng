import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder,
  FolderOpen,
  FileText,
  Database,
  Image,
  Code,
  Globe,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FsNode } from '@/api/fs';
import { getTree, createFile as apiCreateFile, createFolder as apiCreateFolder, movePath as apiMovePath, deletePath as apiDeletePath } from '@/api/fs';
import { connectWS, addFsListener } from '@/lib/ws';
import { useAppStore } from '@/stores';

import {
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar"
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  path: string;
  parentId?: string;
  children?: string[];
  isExpanded?: boolean;
  content?: string;
}

interface FileTreeProps {
  className?: string;
  onFileSelect?: (file: FileItem) => void;
  selectedFileId?: string;
  onTreeChange?: (files: Record<string, FileItem>) => void;
}

export function FileTree({ className, onFileSelect, selectedFileId, onTreeChange }: FileTreeProps) {
  const [files, setFiles] = useState<Record<string, FileItem>>({});
  const [rootItems, setRootItems] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // 防抖定时器引用
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 用于避免循环依赖的 expandedFolders 引用
  const expandedFoldersRef = useRef<Set<string>>(new Set());

  // 从 store 中获取需要的函数和状态
  const { selectNode, openNoteInTabWithTitle, selectedNodeId: globalSelectedNodeId } = useAppStore();

  // 同步 expandedFolders 状态到 ref
  useEffect(() => {
    expandedFoldersRef.current = expandedFolders;
  }, [expandedFolders]);

  const toId = useCallback((p: string) => p, []);

  const buildFromFs = useCallback((node: FsNode, currentExpandedFolders: Set<string>): { map: Record<string, FileItem>; roots: string[] } => {
    const map: Record<string, FileItem> = {};
    const roots: string[] = [];

    const walk = (n: FsNode, parentId?: string, depth: number = 0) => {
      if (n.type === 'folder' && n.children) {
        // Skip adding synthetic root node as an item; add children as roots
        if (n.path === '/' && !parentId) {
          n.children.forEach(child => walk(child, undefined, depth + 1));
          return;
        }
      }

      const id = toId(n.path);
      const item: FileItem = {
        id,
        name: n.name,
        type: n.type as 'file' | 'folder',
        fileType: n.fileType as any,
        path: n.path,
        parentId,
        children: n.type === 'folder' ? [] : undefined,
        isExpanded: n.type === 'folder' ? (n.path === '/' ? true : currentExpandedFolders.has(id)) : undefined,
      };
      map[id] = item;
      if (!parentId) {
        roots.push(id);
      } else if (parentId) {
        const parent = map[parentId];
        if (parent && parent.children) parent.children.push(id);
      }

      if (n.children && n.children.length > 0) {
        n.children.forEach(child => walk(child, id, depth + 1));
      }
    };

    walk(node);
    return { map, roots };
  }, [toId]);

  const loadTree = useCallback(async () => {
    try {
      const data = await getTree('/');
      const { map, roots } = buildFromFs(data, expandedFoldersRef.current);
      setFiles(map);
      setRootItems(roots);
    } catch (error) {
      console.error('Failed to load tree:', error);
    }
  }, [buildFromFs]);

  // 防抖刷新函数 - 避免频繁的文件系统事件触发过多 API 调用
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      // 保存当前展开状态，在刷新后恢复
      loadTree();
    }, 300); // 300ms 防抖
  }, [loadTree]);

  // 获取文件图标
  const getFileIcon = (fileType?: string) => {
    const iconProps = { size: 16, className: "text-folder-icon" };
    
    switch (fileType) {
      case 'database':
        return <Database {...iconProps} />;
      case 'canvas':
        return <Image {...iconProps} />;
      case 'html':
        return <Globe {...iconProps} />;
      case 'code':
        return <Code {...iconProps} />;
      case 'markdown':
      default:
        return <FileText {...iconProps} />;
    }
  };

  // 获取文件类型标签
  const getFileTypeLabel = (fileType?: string) => {
    switch (fileType) {
      case 'canvas': return 'CANVAS';
      case 'database': return 'BASE';
      case 'html': return 'HTML';
      case 'code': return 'CODE';
      default: return null;
    }
  };

  // Load from backend & subscribe to realtime updates
  useEffect(() => {
    // 初始加载
    loadTree();
    
    // 连接 WebSocket
    connectWS();
    
    // 订阅文件系统事件 - 使用防抖刷新
    const off = addFsListener(() => {
      debouncedRefresh();
    });
    
    // 清理函数
    return () => {
      off();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []); // 移除 loadTree 依赖，避免无限循环

  // Notify parent on tree changes
  useEffect(() => {
    onTreeChange?.(files);
  }, [files]); // 移除 onTreeChange 依赖，避免无限循环

  const toggleExpand = useCallback((id: string) => {
    setFiles(prev => {
      const newFiles = {
        ...prev,
        [id]: { ...prev[id], isExpanded: !prev[id].isExpanded }
      };
      
      // 更新展开状态集合
      const newExpanded = new Set(expandedFolders);
      if (newFiles[id].isExpanded) {
        newExpanded.add(id);
      } else {
        newExpanded.delete(id);
      }
      setExpandedFolders(newExpanded);
      
      return newFiles;
    });
  }, [expandedFolders]);

  const createNewItem = useCallback(async (parentId: string | null, type: 'file' | 'folder', fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code') => {
    const parentPath = parentId ? files[parentId]?.path : '';
    let defaultName = type === 'folder' ? '新文件夹' : '新文件.md';
    let defaultContent = '';
    if (type === 'file') {
      switch (fileType) {
        case 'markdown': defaultName = '新文档.md'; defaultContent = '# 新文档\n\n在这里开始编写...'; break;
        case 'database': defaultName = '新数据库.db'; defaultContent = JSON.stringify({ columns: ['ID', '名称', '类型'], rows: [] }, null, 2); break;
        case 'canvas': defaultName = '新画板.canvas'; break;
        case 'html': defaultName = '新页面.html'; defaultContent = '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>'; break;
        case 'code': defaultName = '新代码.js'; defaultContent = '// JavaScript 代码\nconsole.log("Hello World!");'; break;
        default: defaultName = '新文件.md'; defaultContent = '# 新文件\n\n在这里开始编写...'; fileType = 'markdown';
      }
    }
    const newPath = `${parentPath}/${defaultName}`.replace(/\/\/+/g, '/');
    
    // 确保父文件夹保持展开状态
    if (parentId) {
      setExpandedFolders(prev => new Set([...prev, parentId]));
    }
    
    if (type === 'folder') {
      await apiCreateFolder(newPath);
    } else {
      await apiCreateFile(newPath, defaultContent);
      
      // 创建笔记并打开标签页
      const tempNote = {
        id: newPath,
        title: defaultName.replace(/\.(md|db|canvas|html|js)$/, ''),
        content: defaultContent,
        links: [],
        backlinks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        fileType: fileType || 'markdown' as const,
        folder: parentPath || '/'
      };
      
      const { addNote } = useAppStore.getState();
      addNote(tempNote);
      openNoteInTabWithTitle(newPath);
    }
    
    // 在重新加载文件树之前，确保展开状态被保存
    expandedFoldersRef.current = expandedFolders;
    
    await loadTree();
    setEditingId(toId(newPath));
    setNewItemName(defaultName);
  }, [files, loadTree, toId, openNoteInTabWithTitle]);

  const handleRename = useCallback(async (id: string, newName: string) => {
    if (!newName.trim()) { setEditingId(null); setNewItemName(''); return; }
    const item = files[id];
    if (!item) return;
    const parentPath = item.parentId ? files[item.parentId!].path : '';
    const newPath = `${parentPath}/${newName}`.replace(/\/\/+/g, '/');
    if (newPath !== item.path) {
      // 确保父文件夹保持展开状态
      if (item.parentId) {
        setExpandedFolders(prev => new Set([...prev, item.parentId!]));
      }
      
      // 在重新加载文件树之前，确保展开状态被保存
      expandedFoldersRef.current = expandedFolders;
      
      await apiMovePath(item.path, newPath);
      await loadTree();
    }
    setEditingId(null);
    setNewItemName('');
  }, [files, loadTree]);

  // 处理拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, item: FileItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.path);
  }, []);

  // 处理拖拽进入
  const handleDragEnter = useCallback((e: React.DragEvent, item: FileItem) => {
    e.preventDefault();
    if (draggedItem && item.type === 'folder' && item.id !== draggedItem.id) {
      setDragOverId(item.id);
    }
  }, [draggedItem]);

  // 处理拖拽离开
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverId(null);
  }, []);

  // 处理拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // 处理放置
  const handleDrop = useCallback(async (e: React.DragEvent, targetItem: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);

    if (!draggedItem || draggedItem.id === targetItem.id) return;

    // 如果目标是文件夹，则移动到该文件夹内
    if (targetItem.type === 'folder') {
      const newPath = `${targetItem.path}/${draggedItem.name}`.replace(/\/\/+/g, '/');
      
      // 检查是否是移动到自己的子文件夹
      if (draggedItem.type === 'folder' && newPath.startsWith(draggedItem.path + '/')) {
        alert('不能将文件夹移动到其子文件夹中');
        return;
      }

      try {
        // 确保目标文件夹保持展开状态
        setExpandedFolders(prev => new Set([...prev, targetItem.id]));
        
        // 在重新加载文件树之前，确保展开状态被保存
        expandedFoldersRef.current = expandedFolders;
        
        await apiMovePath(draggedItem.path, newPath);
        await loadTree();
      } catch (error) {
        console.error('Failed to move:', error);
        alert('移动失败：' + (error as Error).message);
      }
    }
  }, [draggedItem, loadTree]);

  // 处理拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverId(null);
  }, []);

  // 处理文件/文件夹点击
  const handleNodeClick = useCallback(async (file: FileItem) => {
    if (file.type === 'file') {
      // 首先设置文件树选中状态，这会触发双向同步
      selectNode(file.id);
      
      if (onFileSelect) {
        onFileSelect(file);
      }
      
      // 使用文件路径加载文件并在标签页中打开
      try {
        const { getFile } = await import('@/api/fs');
        const fileData = await getFile(file.path);
        
        // 创建临时笔记对象
        const tempNote = {
          id: file.path,
          title: file.name,
          content: fileData.content,
          links: [],
          backlinks: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          fileType: file.fileType || 'markdown' as const,
          folder: file.path.substring(0, file.path.lastIndexOf('/')) || '/'
        };
        
        // 添加到 notes store 并打开标签页
        const { addNote } = useAppStore.getState();
        addNote(tempNote);
        openNoteInTabWithTitle(file.path);
      } catch (error) {
        console.error('Failed to load file:', error);
      }
      
    } else if (file.type === 'folder') {
      toggleExpand(file.id);
    }
  }, [onFileSelect, toggleExpand, openNoteInTabWithTitle, selectNode]);

  // 处理双击（固定标签页）
  const handleNodeDoubleClick = useCallback(async (file: FileItem) => {
    if (file.type === 'file') {
      // 双击文件时，以固定模式打开
      try {
        const { getFile } = await import('@/api/fs');
        const fileData = await getFile(file.path);
        
        // 创建临时笔记对象
        const tempNote = {
          id: file.path,
          title: file.name,
          content: fileData.content,
          links: [],
          backlinks: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          fileType: file.fileType || 'markdown' as const,
          folder: file.path.substring(0, file.path.lastIndexOf('/')) || '/'
        };
        
        // 添加到 notes store 并以固定模式打开标签页
        const { addNote } = useAppStore.getState();
        addNote(tempNote);
        openNoteInTabWithTitle(file.path);
        
        // TODO: 实现固定标签页功能
        if (onFileSelect) {
          onFileSelect(file);
        }
      } catch (error) {
        console.error('Failed to load file:', error);
      }
    }
  }, [onFileSelect, openNoteInTabWithTitle]);

  function Tree({ item }: { item: FileItem }) {
    const isEditing = editingId === item.id;
    // 优先使用全局选中状态，如果没有则使用props传递的状态
    const isSelected = (globalSelectedNodeId === item.id) || (selectedFileId === item.id);
    const isDragOver = dragOverId === item.id;
    const typeLabel = getFileTypeLabel(item.fileType);

    return (
      <SidebarMenuItem key={item.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 cursor-pointer group relative",
            "text-[13px] transition-all duration-150",
            "h-[28px] rounded-md", // 参考图片风格：更高的行高和圆角
            isSelected 
              ? "bg-background-selected text-file-selected shadow-sm ring-1 ring-blue-200 scale-[1.02] transform-gpu" 
              : "text-file-default hover:bg-background-hover hover:text-file-hover hover:scale-[1.01] transform-gpu transition-transform",
            isDragOver && "bg-blue-500/20 ring-1 ring-blue-500/50",
            draggedItem?.id === item.id && "opacity-50"
          )}
          onClick={() => !isEditing && handleNodeClick(item)}
          onDoubleClick={() => !isEditing && handleNodeDoubleClick(item)}
          draggable={!isEditing}
          onDragStart={(e) => handleDragStart(e, item)}
          onDragEnter={(e) => handleDragEnter(e, item)}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, item)}
          onDragEnd={handleDragEnd}
        >
          {/* 参考图片风格：移除左侧选中指示条 */}

          {item.type === 'folder' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent shrink-0 -ml-0.5"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(item.id);
              }}
            >
              {item.isExpanded ? (
                <ChevronDown className="h-3 w-3 text-folder-icon transition-transform duration-150" />
              ) : (
                <ChevronRight className="h-3 w-3 text-folder-icon transition-transform duration-150" />
              )}
            </Button>
          )}
          
          {item.type === 'folder' ? (
            item.isExpanded ? (
              <FolderOpen className="h-4 w-4 text-folder-icon shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-folder-icon shrink-0" />
            )
          ) : (
            <div className="shrink-0">
              {getFileIcon(item.fileType)}
            </div>
          )}

          {isEditing ? (
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onBlur={() => handleRename(item.id, newItemName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename(item.id, newItemName);
                } else if (e.key === 'Escape') {
                  setEditingId(null);
                  setNewItemName('');
                }
              }}
              className="h-5 px-1 text-xs border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-accent"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="truncate text-inherit font-normal leading-tight">
                {item.name}
              </span>
              {typeLabel && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-sm uppercase tracking-wide shrink-0">
                  {typeLabel}
                </span>
              )}
              {item.type === 'file' && (item as any).unlinkedMentions > 0 && (
                <span className="ml-auto mr-1 px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full min-w-[18px] h-[18px] flex items-center justify-center hover:bg-gray-200 transition-all duration-150">
                  {(item as any).unlinkedMentions}
                </span>
              )}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 shrink-0 hover:bg-muted/50"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => {
                setEditingId(item.id);
                setNewItemName(item.name);
              }}>
                重命名
              </DropdownMenuItem>
              {item.type === 'folder' && (
                <>
                  <DropdownMenuItem onClick={() => createNewItem(item.id, 'file', 'markdown')}>
                    新建Markdown文档
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(item.id, 'file', 'database')}>
                    新建数据库
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(item.id, 'file', 'canvas')}>
                    新建画图
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(item.id, 'file', 'html')}>
                    新建HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(item.id, 'file', 'code')}>
                    新建代码
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNewItem(item.id, 'folder')}>
                    新建文件夹
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={async () => {
                  if (confirm(`确定要删除 "${item.name}" ${item.type === 'folder' ? '文件夹及其所有内容' : '文件'}吗？`)) {
                    try {
                      // 在重新加载文件树之前，确保展开状态被保存
                      expandedFoldersRef.current = expandedFolders;
                      
                      await apiDeletePath(item.path);
                      await loadTree();
                    } catch (error) {
                      console.error('Failed to delete:', error);
                      alert('删除失败：' + (error as Error).message);
                    }
                  }
                }}
                className="text-destructive hover:text-destructive"
              >
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {item.type === 'folder' && item.isExpanded && item.children && (
          <SidebarMenuSub>
            {item.children.map(childId => {
              const childItem = files[childId];
              return childItem ? <Tree key={childId} item={childItem} /> : null;
            })}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  }

  return (
    <div className={cn("h-full flex flex-col bg-sidebar-background border-r border-sidebar-border", className)}>
      {/* <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border bg-sidebar-background">
        <span className="text-xs font-medium text-sidebar-foreground tracking-wide">文件</span>
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-sidebar-accent rounded"
            onClick={() => createNewItem(null, 'file', 'markdown')}
          >
            <FilePlus className="h-3.5 w-3.5 text-sidebar-foreground/70" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-sidebar-accent rounded"
            onClick={() => createNewItem(null, 'folder')}
          >
            <FolderPlus className="h-3.5 w-3.5 text-sidebar-foreground/70" />
          </Button>
        </div>
      </div> */}
      
      <div className="flex-1 overflow-y-auto py-1">
        <SidebarProvider>
          <SidebarMenu>
            {rootItems.map(id => {
              const item = files[id];
              return item ? <Tree key={id} item={item} /> : null;
            })}
          </SidebarMenu>
        </SidebarProvider>
      </div>
    </div>
  );
}