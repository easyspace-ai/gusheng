/**
 * 文件树同步服务
 * 提供文件树与文件系统的同步机制
 */

import { eventBus } from '@/lib/eventBus';
import { wsManager } from '@/lib/wsOptimized';
import { useFileTreeStore } from '@/stores/fileTreeStore';
import { useAppStore } from '@/stores/appStore';
import { getTree } from '@/api/fs';

interface FsNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  children?: FsNode[];
}

class FileTreeSyncService {
  private fileTreeStore = useFileTreeStore.getState();
  private appStore = useAppStore.getState();
  private isInitialized = false;

  /**
   * 初始化同步服务
   */
  initialize(): void {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    
    // 监听文件系统变化事件
    eventBus.on('fileTree:refreshRequest', ({ reason }) => {
      console.log(`FileTreeSyncService: Refreshing tree due to ${reason}`);
      this.refreshFileTree();
    });

    // 设置 WebSocket 监听器
    wsManager.addFsListener((event) => {
      if (!wsManager.isInManualOperation()) {
        eventBus.emit('fileTree:refreshRequest', { reason: `fs event: ${event.action} ${event.path}` });
      }
      wsManager.resetManualOperation();
    });

    // 初始加载
    this.loadFileTree();
  }

  /**
   * 加载文件树
   */
  async loadFileTree(): Promise<void> {
    try {
      const data = await getTree('/');
      this.buildFileTreeFromFs(data);
      
      // 同步文件树与笔记
      this.syncWithNotes();
      
      eventBus.emit('fileTree:stateChanged', {
        expandedFolders: Array.from(this.fileTreeStore.expandedFolders),
        selectedNodeId: this.fileTreeStore.selectedNodeId,
      });
      
    } catch (error) {
      console.error('Failed to load file tree:', error);
    }
  }

  /**
   * 刷新文件树
   */
  async refreshFileTree(): Promise<void> {
    await this.loadFileTree();
  }

  /**
   * 处理增量更新
   */
  private handleIncrementalUpdate(reason: string): void {
    console.log('Incremental update:', reason);
    // 这里可以实现更精细的增量更新逻辑
    // 目前先进行全量刷新
    this.refreshFileTree();
  }

  /**
   * 从文件系统数据构建文件树
   */
  private buildFileTreeFromFs(node: FsNode, parentPath?: string): void {
    const { path, name, type, fileType, children } = node;
    
    // 跳过根节点，但在第一次调用时清空现有节点
    if (path === '/' && !parentPath) {
      // 清空现有节点，但保留展开状态
      this.fileTreeStore.setState({
        nodes: {},
        selectedNodeId: null,
        draggedNode: null,
        dragOverNodeId: null,
        renamingNodeId: null,
        searchQuery: '',
        filteredNodeIds: new Set(),
      });
      
      if (children) {
        children.forEach(child => this.buildFileTreeFromFs(child, '/'));
      }
      return;
    }

    // 创建节点
    const nodeId = path;
    const isExpanded = this.fileTreeStore.expandedFolders.has(path);
    
    if (type === 'folder') {
      const folderNode = {
        id: nodeId,
        name,
        type: 'folder' as const,
        path,
        parentPath: parentPath || null,
        isExpanded,
        childCount: children?.length || 0,
      };
      
      this.fileTreeStore.addNode(folderNode);
      
      // 递归处理子节点
      if (children) {
        children.forEach(child => this.buildFileTreeFromFs(child, path));
      }
    } else {
      const fileNode = {
        id: nodeId,
        name,
        type: 'file' as const,
        fileType: fileType || 'markdown',
        path,
        parentPath: parentPath || null,
        content: '', // 内容会在需要时单独加载
      };
      
      this.fileTreeStore.addNode(fileNode);
    }
  }

  /**
   * 同步文件树与笔记
   */
  private syncWithNotes(): void {
    const notes = this.appStore.notes;
    
    // 为每个笔记创建或更新文件节点
    Object.values(notes).forEach(note => {
      const filePath = `${note.folder}/${note.title}.md`;
      const existingNode = this.fileTreeStore.nodes[filePath];
      
      if (!existingNode) {
        // 创建新的文件节点
        const fileNode = {
          id: filePath,
          name: `${note.title}.md`,
          type: 'file' as const,
          fileType: note.fileType,
          path: filePath,
          parentPath: note.folder,
          content: note.content,
        };
        
        this.fileTreeStore.addNode(fileNode);
      } else {
        // 更新现有节点的内容
        this.fileTreeStore.updateNode(filePath, {
          content: note.content,
        });
      }
    });
  }

  /**
   * 获取子节点
   */
  getChildNodes(parentPath: string): any[] {
    return this.fileTreeStore.getChildNodes(parentPath);
  }

  /**
   * 检查节点是否可见
   */
  isNodeVisible(nodePath: string): boolean {
    return this.fileTreeStore.isPathVisible(nodePath);
  }

  /**
   * 展开到指定节点
   */
  expandToNode(nodePath: string): void {
    const ancestors = this.fileTreeStore.getAncestorPaths(nodePath);
    ancestors.forEach(path => {
      if (!this.fileTreeStore.expandedFolders.has(path)) {
        this.fileTreeStore.expandFolder(path);
      }
    });
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.isInitialized = false;
    // 清理事件监听器等资源
  }
}

// 创建全局服务实例
export const fileTreeSyncService = new FileTreeSyncService();

// 导出类型
export type { FsNode };
