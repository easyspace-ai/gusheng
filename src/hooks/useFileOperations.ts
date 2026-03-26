/**
 * 文件操作 Hook
 * 提供文件创建、删除、重命名、移动等操作
 */

import { useCallback } from 'react';
import { useAppStore } from '@/stores';
import { eventBus } from '@/lib/eventBus';
import { useSmartDebounce } from './useSmartDebounce';
import { 
  createFile as apiCreateFile, 
  createFolder as apiCreateFolder,
  deletePath as apiDeletePath,
  movePath as apiMovePath
} from '@/api/fs';

interface CreateFileOptions {
  parentId: string;
  fileName: string;
  fileType: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  content?: string;
}

interface CreateFolderOptions {
  parentId: string;
  folderName: string;
}

export function useFileOperations() {
  const { addNode, deleteNode, updateNode, expandFolder } = useAppStore();

  // 防抖刷新函数
  const debouncedRefresh = useSmartDebounce(() => {
    eventBus.emit('fileTree:refresh', { reason: 'fileOperation' });
  }, { delay: 300 });

  // 创建文件
  const createFile = useCallback(async (options: CreateFileOptions) => {
    const { parentId, fileName, fileType, content = '' } = options;
    
    try {
      // 发送创建文件事件
      eventBus.emit('fileTree:createFile', {
        parentId,
        fileName,
        fileType,
      });

      // 确保父文件夹展开
      if (parentId) {
        expandFolder(parentId);
      }

      // 构建文件路径
      const filePath = `${parentId}/${fileName}`.replace(/\/\/+/g, '/');
      
      // 调用实际的 API 创建文件
      await apiCreateFile(filePath, content);
      
      // 创建节点
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newFile = {
        id: fileId,
        name: fileName,
        type: 'file' as const,
        fileType,
        path: filePath,
        parentPath: parentId,
        content,
      };

      addNode(newFile);
      
      // 触发刷新
      debouncedRefresh();
      
      return newFile;
    } catch (error) {
      console.error('Failed to create file:', error);
      throw error;
    }
  }, [addNode, expandFolder, debouncedRefresh]);

  // 创建文件夹
  const createFolder = useCallback(async (options: CreateFolderOptions) => {
    const { parentId, folderName } = options;
    
    try {
      // 发送创建文件夹事件
      eventBus.emit('fileTree:createFolder', {
        parentId,
        folderName,
      });

      // 确保父文件夹展开
      if (parentId) {
        expandFolder(parentId);
      }

      // 构建文件夹路径
      const folderPath = `${parentId}/${folderName}`.replace(/\/\/+/g, '/');
      
      // 调用实际的 API 创建文件夹
      await apiCreateFolder(folderPath);
      
      // 创建节点
      const folderId = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newFolder = {
        id: folderId,
        name: folderName,
        type: 'folder' as const,
        path: folderPath,
        parentPath: parentId,
        isExpanded: false,
        childCount: 0,
      };

      addNode(newFolder);
      
      // 触发刷新
      debouncedRefresh();
      
      return newFolder;
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  }, [addNode, expandFolder, debouncedRefresh]);

  // 删除文件/文件夹
  const deleteFile = useCallback(async (nodeId: string, path: string) => {
    try {
      // 发送删除事件
      eventBus.emit('fileTree:delete', { nodeId, path });

      // 调用实际的 API 删除文件
      await apiDeletePath(path);
      
      // 从状态中删除节点
      deleteNode(nodeId);
      
      // 触发刷新
      debouncedRefresh();
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }, [deleteNode, debouncedRefresh]);

  // 重命名文件/文件夹
  const renameFile = useCallback(async (nodeId: string, oldName: string, newName: string, oldPath: string, newPath: string) => {
    try {
      // 发送重命名事件
      eventBus.emit('fileTree:rename', { nodeId, oldName, newName });

      // 调用实际的 API 重命名文件
      await apiMovePath(oldPath, newPath);
      
      // 更新节点名称和路径
      updateNode(nodeId, { name: newName, path: newPath });
      
      // 触发刷新
      debouncedRefresh();
    } catch (error) {
      console.error('Failed to rename file:', error);
      throw error;
    }
  }, [updateNode, debouncedRefresh]);

  // 移动文件/文件夹
  const moveFile = useCallback(async (nodeId: string, fromPath: string, toPath: string) => {
    try {
      // 发送移动事件
      eventBus.emit('fileTree:move', { nodeId, fromPath, toPath });

      // 调用实际的 API 移动文件
      await apiMovePath(fromPath, toPath);
      
      // 更新节点路径
      updateNode(nodeId, { path: toPath });
      
      // 触发刷新
      debouncedRefresh();
    } catch (error) {
      console.error('Failed to move file:', error);
      throw error;
    }
  }, [updateNode, debouncedRefresh]);

  return {
    createFile,
    createFolder,
    deleteFile,
    renameFile,
    moveFile,
  };
}
