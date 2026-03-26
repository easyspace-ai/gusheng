import React, { useState, useCallback } from 'react';
import { 
  Plus,
  Search,
  MoreHorizontal,
  FolderPlus,
  FileText,
  Database,
  Image,
  Code,
  Globe
} from 'lucide-react';
import { useAppStore } from '@/stores';
import { createFile as apiCreateFile, createFolder as apiCreateFolder } from '@/api/fs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { FileTree } from './FileTree';
import { Input } from '../ui/input';

export function FileExplorer() {
  const { searchQuery, setSearchQuery } = useAppStore();
  
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // 创建新文件
  const createNewFile = useCallback(async (type: 'markdown' | 'database' | 'canvas' | 'html' | 'code') => {
    let fileName = '新文件.md';
    let content = '';
    switch (type) {
      case 'markdown': fileName = '新笔记.md'; content = '# 新笔记\n\n开始编辑这个笔记...'; break;
      case 'database': fileName = '新数据库.db'; content = JSON.stringify({ columns: ['ID', '名称', '类型'], rows: [] }, null, 2); break;
      case 'canvas': fileName = '新画板.canvas'; content = ''; break;
      case 'html': fileName = '新页面.html'; content = '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>'; break;
      case 'code': fileName = '新代码.js'; content = '// JavaScript 代码\nconsole.log("Hello World!");'; break;
    }
    const parent = '/workspace/笔记';
    const path = `${parent}/${fileName}`.replace(/\/+/g, '/');
    await apiCreateFile(path, content);
  }, []);

  // 创建新文件夹
  const createNewFolder = useCallback(async () => {
    const folderName = `新文件夹-${Date.now()}`;
    const parent = '/workspace/笔记';
    const path = `${parent}/${folderName}`.replace(/\/+/g, '/');
    await apiCreateFolder(path);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 单行工具栏 - 参考图片风格 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="新建"
              >
                <Plus size={16} className="text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => createNewFile('markdown')}>
                <FileText size={16} className="mr-2" />
                新建 Markdown 文档
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewFile('database')}>
                <Database size={16} className="mr-2" />
                新建数据库
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewFile('canvas')}>
                <Image size={16} className="mr-2" />
                新建画板
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewFile('html')}>
                <Globe size={16} className="mr-2" />
                新建 HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewFile('code')}>
                <Code size={16} className="mr-2" />
                新建代码
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={createNewFolder}>
                <FolderPlus size={16} className="mr-2" />
                新建文件夹
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="搜索"
            onClick={() => setIsSearchVisible(!isSearchVisible)}
          >
            <Search size={16} className="text-gray-600" />
          </button>
          <button
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="新建文件"
            onClick={() => createNewFile('markdown')}
          >
            <FileText size={16} className="text-gray-600" />
          </button>
          <button
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="新建文件夹"
            onClick={createNewFolder}
          >
            <FolderPlus size={16} className="text-gray-600" />
          </button>
          <button
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="更多选项"
          >
            <MoreHorizontal size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* 搜索框 - 参考图片风格 */}
      {isSearchVisible && (
        <div className="px-3 py-2 border-b border-gray-200">
          <Input
            type="text"
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm border-gray-300 focus:border-gray-400 focus:ring-gray-400"
          />
        </div>
      )}

      {/* 文件树 */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex-1 overflow-hidden bg-white">
            <FileTree className="h-full px-1 py-2" />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => createNewFile('markdown')}>
            <FileText size={16} className="mr-2" />
            新建 Markdown 文档
          </ContextMenuItem>
          <ContextMenuItem onClick={() => createNewFile('database')}>
            <Database size={16} className="mr-2" />
            新建数据库
          </ContextMenuItem>
          <ContextMenuItem onClick={() => createNewFile('canvas')}>
            <Image size={16} className="mr-2" />
            新建画板
          </ContextMenuItem>
          <ContextMenuItem onClick={() => createNewFile('html')}>
            <Globe size={16} className="mr-2" />
            新建 HTML
          </ContextMenuItem>
          <ContextMenuItem onClick={() => createNewFile('code')}>
            <Code size={16} className="mr-2" />
            新建代码
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={createNewFolder}>
            <FolderPlus size={16} className="mr-2" />
            新建文件夹
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}