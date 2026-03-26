/**
 * 文件操作服务
 * 提供文件创建、删除、重命名、移动等操作的业务逻辑
 */

import { eventBus } from '@/lib/eventBus';
import { wsManager } from '@/lib/wsOptimized';
import { useFileTreeStore } from '@/stores/fileTreeStore';
import { useAppStore } from '@/stores/appStore';

// 导入 API 函数
import { 
  createFile as apiCreateFile, 
  createFolder as apiCreateFolder,
  deletePath as apiDeletePath,
  movePath as apiMovePath
} from '@/api/fs';

export interface CreateFileOptions {
  parentId: string;
  fileName: string;
  fileType: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  content?: string;
}

export interface CreateFolderOptions {
  parentId: string;
  folderName: string;
}

export interface RenameOptions {
  nodeId: string;
  oldName: string;
  newName: string;
}

export interface MoveOptions {
  nodeId: string;
  fromPath: string;
  toPath: string;
}

export interface DeleteOptions {
  nodeId: string;
  path: string;
}

class FileOperationsService {
  private fileTreeStore = useFileTreeStore.getState();
  private appStore = useAppStore.getState();

  /**
   * 创建文件
   */
  async createFile(options: CreateFileOptions): Promise<void> {
    const { parentId, fileName, fileType, content = '' } = options;
    
    try {
      // 获取父文件夹路径
      const parentNode = this.fileTreeStore.getNodeByPath(parentId);
      const parentPath = parentNode?.path || parentId;
      
      // 构建文件路径
      const filePath = `${parentPath}/${fileName}`.replace(/\/\/+/g, '/');
      
      // 发送创建文件事件
      eventBus.emit('fileTree:createFile', {
        parentId,
        fileName,
        fileType,
      });

      // 确保父文件夹展开
      if (parentId) {
        this.fileTreeStore.expandFolder(parentId);
      }

      // 标记为手动操作，避免 WebSocket 监听器干扰
      wsManager.markManualOperation();
      
      // 调用 API 创建文件
      await apiCreateFile(filePath, content);
      
      // 创建文件节点
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newFile = {
        id: fileId,
        name: fileName,
        type: 'file' as const,
        fileType,
        path: filePath,
        parentPath: parentPath,
        content,
      };

      this.fileTreeStore.addNode(newFile);
      
      // 创建对应的笔记
      const note = {
        id: filePath,
        title: fileName.replace(/\.(md|db|canvas|html|js)$/, ''),
        content,
        links: [],
        backlinks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        fileType,
        folder: parentPath
      };

      this.appStore.addNote(note);
      
      // 自动打开新创建的文件
      this.appStore.openNoteInTabWithTitle(filePath);
      
      // 不需要触发刷新事件，因为我们已经在状态中直接添加了节点
      
    } catch (error) {
      console.error('Failed to create file:', error);
      throw error;
    }
  }

  /**
   * 创建文件夹
   */
  async createFolder(options: CreateFolderOptions): Promise<void> {
    const { parentId, folderName } = options;
    
    try {
      // 获取父文件夹路径
      const parentNode = this.fileTreeStore.getNodeByPath(parentId);
      const parentPath = parentNode?.path || parentId;
      
      // 构建文件夹路径
      const folderPath = `${parentPath}/${folderName}`.replace(/\/\/+/g, '/');
      
      // 发送创建文件夹事件
      eventBus.emit('fileTree:createFolder', {
        parentId,
        folderName,
      });

      // 确保父文件夹展开
      if (parentId) {
        this.fileTreeStore.expandFolder(parentId);
      }

      // 标记为手动操作
      wsManager.markManualOperation();
      
      // 调用 API 创建文件夹
      await apiCreateFolder(folderPath);
      
      // 创建文件夹节点
      const folderId = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newFolder = {
        id: folderId,
        name: folderName,
        type: 'folder' as const,
        path: folderPath,
        parentPath: parentPath,
        isExpanded: false,
        childCount: 0,
      };

      this.fileTreeStore.addNode(newFolder);
      
      // 不需要触发刷新事件，因为我们已经在状态中直接添加了节点
      
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  }

  /**
   * 删除文件/文件夹
   */
  async deleteFile(options: DeleteOptions): Promise<void> {
    const { nodeId, path } = options;
    
    try {
      // 发送删除事件
      eventBus.emit('fileTree:delete', { nodeId, path });

      // 标记为手动操作
      wsManager.markManualOperation();
      
      // 调用 API 删除文件
      await apiDeletePath(path);
      
      // 从状态中删除节点
      this.fileTreeStore.deleteNode(nodeId);
      
      // 如果删除的是笔记文件，也要删除对应的笔记
      const note = this.appStore.notes[path];
      if (note) {
        this.appStore.deleteNoteAndCloseTabs(path);
      }
      
      // 不需要触发刷新事件，因为我们已经在状态中直接删除了节点
      
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * 重命名文件/文件夹
   */
  async renameFile(options: RenameOptions): Promise<void> {
    const { nodeId, oldName, newName } = options;
    
    try {
      const node = this.fileTreeStore.nodes[nodeId];
      if (!node) throw new Error('Node not found');

      const oldPath = node.path;
      const newPath = `${node.parentPath}/${newName}`.replace(/\/\/+/g, '/');
      
      // 发送重命名事件
      eventBus.emit('fileTree:rename', { nodeId, oldName, newName });

      // 标记为手动操作
      wsManager.markManualOperation();
      
      // 调用 API 重命名文件
      await apiMovePath(oldPath, newPath);
      
      // 更新节点名称和路径
      this.fileTreeStore.updateNode(nodeId, { 
        name: newName, 
        path: newPath 
      });
      
      // 如果是笔记文件，也要更新对应的笔记
      const note = this.appStore.notes[oldPath];
      if (note) {
        this.appStore.updateNote(oldPath, {
          title: newName.replace(/\.(md|db|canvas|html|js)$/, ''),
        });
        
        // 更新笔记 ID（路径）
        const newNote = { ...note, id: newPath, title: newName.replace(/\.(md|db|canvas|html|js)$/, '') };
        this.appStore.addNote(newNote);
        this.appStore.deleteNote(oldPath);
      }
      
      // 不需要触发刷新事件，因为我们已经在状态中直接更新了节点
      
    } catch (error) {
      console.error('Failed to rename file:', error);
      throw error;
    }
  }

  /**
   * 移动文件/文件夹
   */
  async moveFile(options: MoveOptions): Promise<void> {
    const { nodeId, fromPath, toPath } = options;
    
    try {
      // 发送移动事件
      eventBus.emit('fileTree:move', { nodeId, fromPath, toPath });

      // 标记为手动操作
      wsManager.markManualOperation();
      
      // 调用 API 移动文件
      await apiMovePath(fromPath, toPath);
      
      // 更新节点路径
      this.fileTreeStore.moveNode(nodeId, toPath.substring(0, toPath.lastIndexOf('/')));
      
      // 如果是笔记文件，也要更新对应的笔记
      const note = this.appStore.notes[fromPath];
      if (note) {
        const newNote = { ...note, id: toPath, folder: toPath.substring(0, toPath.lastIndexOf('/')) };
        this.appStore.addNote(newNote);
        this.appStore.deleteNote(fromPath);
      }
      
      // 不需要触发刷新事件，因为我们已经在状态中直接移动了节点
      
    } catch (error) {
      console.error('Failed to move file:', error);
      throw error;
    }
  }

  /**
   * 获取默认文件名
   */
  getDefaultFileName(fileType: 'markdown' | 'database' | 'canvas' | 'html' | 'code'): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    switch (fileType) {
      case 'markdown': return `新文档-${timestamp}.md`;
      case 'database': return `新数据库-${timestamp}.db`;
      case 'canvas': return `新画板-${timestamp}.canvas`;
      case 'html': return `新页面-${timestamp}.html`;
      case 'code': return `新代码-${timestamp}.js`;
      default: return `新文件-${timestamp}.md`;
    }
  }

  /**
   * 获取默认文件内容
   */
  getDefaultFileContent(fileType: 'markdown' | 'database' | 'canvas' | 'html' | 'code'): string {
    switch (fileType) {
      case 'markdown':
        return '# 新文档\n\n在这里开始编写...';
      case 'database':
        return JSON.stringify({ columns: ['ID', '名称', '类型'], rows: [] }, null, 2);
      case 'canvas':
        return '';
      case 'html':
        return '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>';
      case 'code':
        return '// JavaScript 代码\nconsole.log("Hello World!");';
      default:
        return '# 新文件\n\n在这里开始编写...';
    }
  }
}

// 创建全局服务实例
export const fileOperationsService = new FileOperationsService();

// 导出类型
export type { CreateFileOptions, CreateFolderOptions, RenameOptions, MoveOptions, DeleteOptions };
