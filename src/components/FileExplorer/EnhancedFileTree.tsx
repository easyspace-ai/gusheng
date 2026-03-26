import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  FolderPlus,
  FilePlus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FsNode } from '@/api/fs';
import { 
  getTree, 
  createFile as apiCreateFile, 
  createFolder as apiCreateFolder, 
  movePath as apiMovePath, 
  deletePath as apiDeletePath,
  getFile 
} from '@/api/fs';
import { connectWS, addFsListener } from '@/lib/ws';
import { useAppStore } from '@/stores';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
  level?: number;
}

interface EnhancedFileTreeProps {
  className?: string;
  onFileSelect?: (file: FileItem) => void;
  selectedFileId?: string;
  onTreeChange?: (files: Record<string, FileItem>) => void;
}

// 动画配置
const ANIMATION_CONFIG = {
  expand: {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { 
      duration: 0.2, 
      ease: [0.25, 0.46, 0.45, 0.94] // ease-out
    }
  },
  hover: {
    scale: 1.02,
    transition: { duration: 0.15 }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

// 拖拽指示线组件
const DropIndicator: React.FC<{ 
  isVisible: boolean; 
  position: 'top' | 'bottom' | 'inside';
  level: number;
}> = ({ isVisible, position, level }) => {
  if (!isVisible) return null;

  const leftOffset = level * 20 + 12;

  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0 }}
      className={cn(
        "absolute left-0 right-2 h-0.5 bg-blue-500 z-10 rounded-full",
        position === 'top' && "-top-px",
        position === 'bottom' && "-bottom-px",
        position === 'inside' && "top-1/2 -translate-y-1/2 bg-blue-500/30 h-full rounded"
      )}
      style={{ marginLeft: position === 'inside' ? leftOffset : 0 }}
    />
  );
};

export function EnhancedFileTree({ className, onFileSelect, selectedFileId, onTreeChange }: EnhancedFileTreeProps) {
  const [files, setFiles] = useState<Record<string, FileItem>>({});
  const [rootItems, setRootItems] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | 'inside'>('inside');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const refreshTimeoutRef = useRef<number | null>(null);
  const expandedFoldersRef = useRef<Set<string>>(new Set());
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  const { selectNode, openNoteInTabWithTitle } = useAppStore();

  // 同步展开状态
  useEffect(() => {
    expandedFoldersRef.current = expandedFolders;
  }, [expandedFolders]);

  const toId = useCallback((p: string) => p, []);

  // 构建文件树结构
  const buildFromFs = useCallback((node: FsNode, currentExpandedFolders: Set<string>, level = 0): { map: Record<string, FileItem>; roots: string[] } => {
    const map: Record<string, FileItem> = {};
    const roots: string[] = [];

    const walk = (n: FsNode, parentId?: string, currentLevel = 0) => {
      if (n.type === 'folder' && n.children) {
        if (n.path === '/' && !parentId) {
          n.children.forEach(child => walk(child, undefined, currentLevel));
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
        level: currentLevel
      };
      
      map[id] = item;
      
      if (!parentId) {
        roots.push(id);
      } else if (parentId && map[parentId]) {
        const parent = map[parentId];
        if (parent && parent.children) parent.children.push(id);
      }

      if (n.children && n.children.length > 0) {
        n.children.forEach(child => walk(child, id, currentLevel + 1));
      }
    };

    walk(node, undefined, level);
    return { map, roots };
  }, [toId]);

  // 加载文件树
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

  // 防抖刷新
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      loadTree();
    }, 300);
  }, [loadTree]);

  // 获取文件图标
  const getFileIcon = useCallback((fileType?: string, isSelected = false, isHovered = false) => {
    const iconProps = { 
      size: 16, 
      className: cn(
        "transition-colors duration-150",
        isSelected ? "text-blue-500" : isHovered ? "text-gray-700" : "text-gray-500"
      )
    };
    
    switch (fileType) {
      case 'database': return <Database {...iconProps} />;
      case 'canvas': return <Image {...iconProps} />;
      case 'html': return <Globe {...iconProps} />;
      case 'code': return <Code {...iconProps} />;
      case 'markdown':
      default: return <FileText {...iconProps} />;
    }
  }, []);

  // 获取文件夹图标
  const getFolderIcon = useCallback((isExpanded: boolean, isSelected = false, isHovered = false) => {
    const iconProps = { 
      size: 16, 
      className: cn(
        "transition-all duration-150",
        isSelected ? "text-blue-500" : isHovered ? "text-gray-700" : "text-gray-500"
      )
    };
    
    return isExpanded ? <FolderOpen {...iconProps} /> : <Folder {...iconProps} />;
  }, []);

  // 初始化
  useEffect(() => {
    loadTree();
    connectWS();
    
    const off = addFsListener(() => {
      debouncedRefresh();
    });
    
    return () => {
      off();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // 通知父组件树结构变化
  useEffect(() => {
    onTreeChange?.(files);
  }, [files, onTreeChange]);

  // 切换展开状态
  const toggleExpand = useCallback((id: string) => {
    setFiles(prev => {
      const newFiles = {
        ...prev,
        [id]: { ...prev[id], isExpanded: !prev[id].isExpanded }
      };
      
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

  // 创建新项目
  const createNewItem = useCallback(async (
    parentId: string | null, 
    type: 'file' | 'folder', 
    fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code'
  ) => {
    const parentPath = parentId ? files[parentId]?.path : '';
    let defaultName = type === 'folder' ? '新文件夹' : '新文件.md';
    let defaultContent = '';
    
    if (type === 'file') {
      switch (fileType) {
        case 'markdown':
          defaultName = '新文档.md';
          defaultContent = '# 新文档\n\n在这里开始编写...';
          break;
        case 'database':
          defaultName = '新数据库.db';
          defaultContent = JSON.stringify({ columns: ['ID', '名称', '类型'], rows: [] }, null, 2);
          break;
        case 'canvas':
          defaultName = '新画板.canvas';
          break;
        case 'html':
          defaultName = '新页面.html';
          defaultContent = '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>';
          break;
        case 'code':
          defaultName = '新代码.js';
          defaultContent = '// JavaScript 代码\nconsole.log("Hello World!");';
          break;
        default:
          defaultName = '新文件.md';
          defaultContent = '# 新文件\n\n在这里开始编写...';
          fileType = 'markdown';
      }
    }
    
    const newPath = `${parentPath}/${defaultName}`.replace(/\/\/+/g, '/');
    
    if (parentId) {
      setExpandedFolders(prev => new Set([...prev, parentId]));
    }
    
    if (type === 'folder') {
      await apiCreateFolder(newPath);
    } else {
      await apiCreateFile(newPath, defaultContent);
      
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
    
    expandedFoldersRef.current = expandedFolders;
    await loadTree();
    setEditingId(toId(newPath));
    setNewItemName(defaultName);
  }, [files, loadTree, toId, openNoteInTabWithTitle, expandedFolders]);

  // 重命名处理
  const handleRename = useCallback(async (id: string, newName: string) => {
    if (!newName.trim()) {
      setEditingId(null);
      setNewItemName('');
      return;
    }
    
    const item = files[id];
    if (!item) return;
    
    const parentPath = item.parentId ? files[item.parentId].path : '';
    const newPath = `${parentPath}/${newName}`.replace(/\/\/+/g, '/');
    
    if (newPath !== item.path) {
      if (item.parentId) {
        setExpandedFolders(prev => new Set([...prev, item.parentId!]));
      }
      
      expandedFoldersRef.current = expandedFolders;
      await apiMovePath(item.path, newPath);
      await loadTree();
    }
    
    setEditingId(null);
    setNewItemName('');
  }, [files, loadTree, expandedFolders]);

  // 拖拽处理
  const handleDragStart = useCallback((e: React.DragEvent, item: FileItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.path);
    
    // 创建拖拽预览
    if (dragPreviewRef.current) {
      const preview = dragPreviewRef.current;
      preview.textContent = item.name;
      preview.style.position = 'absolute';
      preview.style.top = '-1000px';
      document.body.appendChild(preview);
      e.dataTransfer.setDragImage(preview, 0, 0);
      setTimeout(() => document.body.removeChild(preview), 0);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, item: FileItem) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedItem || draggedItem.id === item.id) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    if (item.type === 'folder') {
      if (y < height * 0.25) {
        setDropPosition('top');
      } else if (y > height * 0.75) {
        setDropPosition('bottom');
      } else {
        setDropPosition('inside');
      }
    } else {
      setDropPosition(y < height * 0.5 ? 'top' : 'bottom');
    }
    
    setDragOverId(item.id);
  }, [draggedItem]);

  const handleDrop = useCallback(async (e: React.DragEvent, targetItem: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragOverId(null);
    setDropPosition('inside');
    
    if (!draggedItem || draggedItem.id === targetItem.id) return;
    
    try {
      let newPath: string;
      
      if (dropPosition === 'inside' && targetItem.type === 'folder') {
        newPath = `${targetItem.path}/${draggedItem.name}`.replace(/\/\/+/g, '/');
        setExpandedFolders(prev => new Set([...prev, targetItem.id]));
      } else {
        // 移动到同级
        const targetParentPath = targetItem.parentId ? files[targetItem.parentId].path : '';
        newPath = `${targetParentPath}/${draggedItem.name}`.replace(/\/\/+/g, '/');
      }
      
      if (draggedItem.type === 'folder' && newPath.startsWith(draggedItem.path + '/')) {
        alert('不能将文件夹移动到其子文件夹中');
        return;
      }
      
      expandedFoldersRef.current = expandedFolders;
      await apiMovePath(draggedItem.path, newPath);
      await loadTree();
    } catch (error) {
      console.error('Failed to move:', error);
      alert('移动失败：' + (error as Error).message);
    }
  }, [draggedItem, dropPosition, files, loadTree, expandedFolders]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverId(null);
    setDropPosition('inside');
  }, []);

  // 文件/文件夹点击处理
  const handleNodeClick = useCallback(async (file: FileItem) => {
    if (file.type === 'file') {
      onFileSelect?.(file);
      
      try {
        const fileData = await getFile(file.path);
        
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
        
        const { addNote } = useAppStore.getState();
        addNote(tempNote);
        openNoteInTabWithTitle(file.path);
        selectNode(file.id);
      } catch (error) {
        console.error('Failed to load file:', error);
      }
    } else if (file.type === 'folder') {
      toggleExpand(file.id);
    }
  }, [onFileSelect, toggleExpand, openNoteInTabWithTitle, selectNode]);

  // 删除项目
  const handleDelete = useCallback(async (item: FileItem) => {
    if (confirm(`确定要删除 "${item.name}" ${item.type === 'folder' ? '文件夹及其所有内容' : '文件'}吗？`)) {
      try {
        expandedFoldersRef.current = expandedFolders;
        await apiDeletePath(item.path);
        await loadTree();
      } catch (error) {
        console.error('Failed to delete:', error);
        alert('删除失败：' + (error as Error).message);
      }
    }
  }, [expandedFolders, loadTree]);

  // 文件树项目组件
  const TreeItem: React.FC<{ item: FileItem }> = ({ item }) => {
    const isEditing = editingId === item.id;
    const isSelected = selectedFileId === item.id;
    const isDragOver = dragOverId === item.id;
    const isHovered = hoveredId === item.id;
    const isDragging = draggedItem?.id === item.id;
    const level = item.level || 0;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        whileHover={!isEditing && !isDragging ? ANIMATION_CONFIG.hover : undefined}
        whileTap={!isEditing ? ANIMATION_CONFIG.tap : undefined}
        className="relative"
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                "group flex items-center gap-2 px-2 py-1.5 cursor-pointer relative",
                "text-sm transition-all duration-200 ease-out rounded-md mx-1",
                "hover:bg-gray-100 hover:shadow-sm",
                isSelected && "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200",
                isDragOver && "bg-blue-100 ring-2 ring-blue-300",
                isDragging && "opacity-50 scale-95",
                isHovered && !isSelected && "bg-gray-50"
              )}
              style={{ paddingLeft: `${level * 20 + 8}px` }}
              onClick={() => !isEditing && handleNodeClick(item)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              draggable={!isEditing}
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={(e) => handleDragOver(e, item)}
              onDrop={(e) => handleDrop(e, item)}
              onDragEnd={handleDragEnd}
            >
              {/* 拖拽指示线 */}
              <DropIndicator
                isVisible={isDragOver}
                position={dropPosition}
                level={level}
              />

              {/* 展开/收起按钮 */}
              {item.type === 'folder' && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex items-center justify-center w-4 h-4 rounded hover:bg-gray-200 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(item.id);
                  }}
                >
                  <motion.div
                    animate={{ rotate: item.isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ChevronRight size={12} className="text-gray-600" />
                  </motion.div>
                </motion.button>
              )}
              
              {/* 图标 */}
              <div className="flex-shrink-0">
                {item.type === 'folder' 
                  ? getFolderIcon(!!item.isExpanded, isSelected, isHovered)
                  : getFileIcon(item.fileType, isSelected, isHovered)
                }
              </div>

              {/* 文件名 */}
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
                  className="h-6 px-2 text-sm border-0 bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                <span className={cn(
                  "flex-1 truncate font-medium transition-colors",
                  isSelected ? "text-blue-700" : "text-gray-700"
                )}>
                  {item.name}
                </span>
              )}

              {/* 操作按钮 */}
              <div className={cn(
                "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                isSelected && "opacity-100"
              )}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(item.id);
                    setNewItemName(item.name);
                  }}
                >
                  <Edit2 size={12} className="text-gray-500" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1 rounded hover:bg-red-100 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item);
                  }}
                >
                  <Trash2 size={12} className="text-red-500" />
                </motion.button>
              </div>
            </div>
          </ContextMenuTrigger>
          
          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={() => {
              setEditingId(item.id);
              setNewItemName(item.name);
            }}>
              <Edit2 size={14} className="mr-2" />
              重命名
            </ContextMenuItem>
            
            {item.type === 'folder' && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => createNewItem(item.id, 'file', 'markdown')}>
                  <FileText size={14} className="mr-2" />
                  新建 Markdown 文档
                </ContextMenuItem>
                <ContextMenuItem onClick={() => createNewItem(item.id, 'file', 'database')}>
                  <Database size={14} className="mr-2" />
                  新建数据库
                </ContextMenuItem>
                <ContextMenuItem onClick={() => createNewItem(item.id, 'file', 'canvas')}>
                  <Image size={14} className="mr-2" />
                  新建画板
                </ContextMenuItem>
                <ContextMenuItem onClick={() => createNewItem(item.id, 'file', 'html')}>
                  <Globe size={14} className="mr-2" />
                  新建 HTML
                </ContextMenuItem>
                <ContextMenuItem onClick={() => createNewItem(item.id, 'file', 'code')}>
                  <Code size={14} className="mr-2" />
                  新建代码
                </ContextMenuItem>
                <ContextMenuItem onClick={() => createNewItem(item.id, 'folder')}>
                  <FolderPlus size={14} className="mr-2" />
                  新建文件夹
                </ContextMenuItem>
              </>
            )}
            
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => handleDelete(item)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 size={14} className="mr-2" />
              删除
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* 子项目 */}
        <AnimatePresence>
          {item.type === 'folder' && item.isExpanded && item.children && (
            <motion.div
              {...ANIMATION_CONFIG.expand}
              className="overflow-hidden"
            >
              {item.children.map(childId => {
                const childItem = files[childId];
                return childItem ? <TreeItem key={childId} item={childItem} /> : null;
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className={cn("h-full flex flex-col bg-white border-r border-gray-200", className)}>
      {/* 拖拽预览元素 */}
      <div 
        ref={dragPreviewRef}
        className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded shadow-lg border"
        style={{ pointerEvents: 'none' }}
      />
      
      <div className="flex-1 overflow-y-auto py-2">
        <motion.div layout>
          {rootItems.map(id => {
            const item = files[id];
            return item ? <TreeItem key={id} item={item} /> : null;
          })}
        </motion.div>
      </div>
    </div>
  );
}