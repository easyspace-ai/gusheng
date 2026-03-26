/**
 * 重构后的文件树状态管理
 * 提供简洁、高效的文件树状态管理
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// 启用 Immer 的 MapSet 插件
enableMapSet();

export interface TreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  parentPath: string | null;
  isSelected?: boolean;
  isExpanded?: boolean;
  childCount?: number;
  unlinkedMentions?: number;
}

export interface FileNode extends TreeNode {
  type: 'file';
  fileType: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  content?: string;
}

export interface FolderNode extends TreeNode {
  type: 'folder';
  childCount: number;
}

export interface FileTreeState {
  // 节点索引
  nodes: Record<string, TreeNode>;
  
  // 展开的文件夹集合（使用路径作为键）
  expandedFolders: Set<string>;
  
  // 选中的节点ID
  selectedNodeId: string | null;
  
  // 拖拽状态
  draggedNode: TreeNode | null;
  dragOverNodeId: string | null;
  
  // 重命名状态
  renamingNodeId: string | null;
  
  // 搜索状态
  searchQuery: string;
  filteredNodeIds: Set<string>;
}

export interface FileTreeActions {
  // 节点操作
  addNode: (node: TreeNode) => void;
  updateNode: (nodeId: string, updates: Partial<TreeNode>) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, newParentPath: string) => void;
  
  // 文件夹操作
  toggleFolder: (folderId: string) => void;
  expandFolder: (folderId: string) => void;
  collapseFolder: (folderId: string) => void;
  expandAllFolders: () => void;
  collapseAllFolders: () => void;
  
  // 选择操作
  selectNode: (nodeId: string | null) => void;
  
  // 拖拽操作
  startDrag: (node: TreeNode) => void;
  endDrag: () => void;
  setDragOver: (nodeId: string | null) => void;
  
  // 重命名操作
  startRename: (nodeId: string) => void;
  endRename: () => void;
  
  // 搜索操作
  setSearchQuery: (query: string) => void;
  updateFilteredNodes: () => void;
  
  // 批量操作
  createFileInFolder: (parentPath: string, fileName: string, fileType: FileNode['fileType']) => string;
  createFolder: (parentPath: string, folderName: string) => string;
  deleteFolder: (folderPath: string) => void;
  
  // 未链接提及更新
  updateUnlinkedMentions: (counts: Record<string, number>) => void;
  
  // 工具方法
  getNodeByPath: (path: string) => TreeNode | undefined;
  getChildNodes: (parentPath: string) => TreeNode[];
  getAncestorPaths: (path: string) => string[];
  isPathVisible: (path: string) => boolean;
  
  // 状态管理
  resetState: () => void;
  setState: (state: Partial<FileTreeState>) => void;
}

export const useFileTreeStore = create<FileTreeState & FileTreeActions>()(
  immer((set, get) => ({
    // 初始状态
    nodes: {},
    expandedFolders: new Set(['/workspace']),
    selectedNodeId: null,
    draggedNode: null,
    dragOverNodeId: null,
    renamingNodeId: null,
    searchQuery: '',
    filteredNodeIds: new Set(),

    // 节点操作
    addNode: (node) => set((state) => {
      state.nodes[node.id] = node;
      
      // 更新父文件夹的子节点数
      if (node.parentPath && state.nodes[node.parentPath]) {
        const parentNode = state.nodes[node.parentPath] as FolderNode;
        parentNode.childCount = (parentNode.childCount || 0) + 1;
      }
    }),

    updateNode: (nodeId, updates) => set((state) => {
      if (state.nodes[nodeId]) {
        Object.assign(state.nodes[nodeId], updates);
      }
    }),

    deleteNode: (nodeId) => set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return;
      
      // 如果是文件夹，递归删除所有子节点
      if (node.type === 'folder') {
        const childNodes = Object.values(state.nodes).filter(n => n.parentPath === node.path);
        childNodes.forEach(child => {
          delete state.nodes[child.id];
        });
      }
      
      // 更新父文件夹的子节点数
      if (node.parentPath && state.nodes[node.parentPath]) {
        const parentNode = state.nodes[node.parentPath] as FolderNode;
        parentNode.childCount = Math.max(0, (parentNode.childCount || 0) - 1);
      }
      
      // 删除节点
      delete state.nodes[nodeId];
      
      // 清理相关状态
      if (state.selectedNodeId === nodeId) {
        state.selectedNodeId = null;
      }
      if (state.renamingNodeId === nodeId) {
        state.renamingNodeId = null;
      }
    }),

    moveNode: (nodeId, newParentPath) => set((state) => {
      const node = state.nodes[nodeId];
      if (!node) return;
      
      const oldPath = node.path;
      const newPath = `${newParentPath}/${node.name}`;
      
      node.parentPath = newParentPath;
      node.path = newPath;
      
      // 如果是文件夹，递归更新所有子节点路径
      if (node.type === 'folder') {
        const updateChildPaths = (parentPath: string, newParentPath: string) => {
          Object.values(state.nodes).forEach(child => {
            if (child.parentPath === parentPath) {
              child.parentPath = newParentPath;
              child.path = `${newParentPath}/${child.name}`;
              
              if (child.type === 'folder') {
                updateChildPaths(parentPath + '/' + child.name, child.path);
              }
            }
          });
        };
        updateChildPaths(oldPath, newPath);
      }
    }),

    // 文件夹操作
    toggleFolder: (folderId) => set((state) => {
      const folder = state.nodes[folderId];
      if (folder?.type === 'folder') {
        const folderNode = folder as FolderNode;
        if (state.expandedFolders.has(folder.path)) {
          state.expandedFolders.delete(folder.path);
          folderNode.isExpanded = false;
        } else {
          state.expandedFolders.add(folder.path);
          folderNode.isExpanded = true;
        }
      }
    }),

    expandFolder: (folderId) => set((state) => {
      const folder = state.nodes[folderId];
      if (folder?.type === 'folder') {
        state.expandedFolders.add(folder.path);
        (folder as FolderNode).isExpanded = true;
      }
    }),

    collapseFolder: (folderId) => set((state) => {
      const folder = state.nodes[folderId];
      if (folder?.type === 'folder') {
        state.expandedFolders.delete(folder.path);
        (folder as FolderNode).isExpanded = false;
      }
    }),

    expandAllFolders: () => set((state) => {
      Object.values(state.nodes).forEach(node => {
        if (node.type === 'folder') {
          state.expandedFolders.add(node.path);
          (node as FolderNode).isExpanded = true;
        }
      });
    }),

    collapseAllFolders: () => set((state) => {
      state.expandedFolders.clear();
      Object.values(state.nodes).forEach(node => {
        if (node.type === 'folder') {
          (node as FolderNode).isExpanded = false;
        }
      });
    }),

    // 选择操作
    selectNode: (nodeId) => set((state) => {
      // 清除之前的选中状态
      if (state.selectedNodeId) {
        const prevNode = state.nodes[state.selectedNodeId];
        if (prevNode) {
          prevNode.isSelected = false;
        }
      }
      
      // 设置新的选中状态
      state.selectedNodeId = nodeId;
      if (nodeId && state.nodes[nodeId]) {
        state.nodes[nodeId].isSelected = true;
      }
    }),

    // 拖拽操作
    startDrag: (node) => set((state) => {
      state.draggedNode = node;
      if (node.type === 'file') {
        (node as FileNode).isDragging = true;
      }
    }),

    endDrag: () => set((state) => {
      if (state.draggedNode?.type === 'file') {
        (state.draggedNode as FileNode).isDragging = false;
      }
      state.draggedNode = null;
      state.dragOverNodeId = null;
    }),

    setDragOver: (nodeId) => set((state) => {
      state.dragOverNodeId = nodeId;
    }),

    // 重命名操作
    startRename: (nodeId) => set((state) => {
      state.renamingNodeId = nodeId;
    }),

    endRename: () => set((state) => {
      state.renamingNodeId = null;
    }),

    // 搜索操作
    setSearchQuery: (query) => set((state) => {
      state.searchQuery = query;
      get().updateFilteredNodes();
    }),

    updateFilteredNodes: () => set((state) => {
      const query = state.searchQuery.toLowerCase();
      if (!query) {
        state.filteredNodeIds.clear();
        return;
      }

      state.filteredNodeIds.clear();
      Object.values(state.nodes).forEach(node => {
        if (node.name.toLowerCase().includes(query)) {
          state.filteredNodeIds.add(node.id);
        }
      });
    }),

    // 批量操作
    createFileInFolder: (parentPath, fileName, fileType = 'markdown') => {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newFile: FileNode = {
        id: fileId,
        name: fileName,
        type: 'file',
        fileType,
        path: `${parentPath}/${fileName}`.replace(/\/\/+/g, '/'),
        parentPath,
        content: ''
      };
      
      get().addNode(newFile);
      return fileId;
    },

    createFolder: (parentPath, folderName) => {
      const folderId = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newFolder: FolderNode = {
        id: folderId,
        name: folderName,
        type: 'folder',
        path: `${parentPath}/${folderName}`.replace(/\/\/+/g, '/'),
        parentPath,
        isExpanded: false,
        childCount: 0
      };
      
      get().addNode(newFolder);
      return folderId;
    },

    deleteFolder: (folderPath) => {
      const folder = Object.values(get().nodes).find(node => node.path === folderPath);
      if (folder) {
        get().deleteNode(folder.id);
      }
    },

    // 未链接提及更新
    updateUnlinkedMentions: (counts) => set((state) => {
      Object.entries(counts).forEach(([fileId, count]) => {
        const node = state.nodes[fileId];
        if (node && node.type === 'file') {
          (node as FileNode).unlinkedMentions = count;
        }
      });
    }),

    // 工具方法
    getNodeByPath: (path) => {
      return Object.values(get().nodes).find(n => n.path === path);
    },

    getChildNodes: (parentPath) => {
      return Object.values(get().nodes)
        .filter(n => n.parentPath === parentPath)
        .sort((a, b) => {
          // 文件夹在前，文件在后
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          // 同类型按名称排序
          return a.name.localeCompare(b.name);
        });
    },

    getAncestorPaths: (path) => {
      const ancestors: string[] = [];
      let currentPath = path;
      
      while (currentPath && currentPath !== '/') {
        const node = get().getNodeByPath(currentPath);
        if (node?.parentPath) {
          ancestors.unshift(node.parentPath);
          currentPath = node.parentPath;
        } else {
          break;
        }
      }
      
      return ancestors;
    },

    isPathVisible: (path) => {
      const state = get();
      const ancestors = state.getAncestorPaths(path);
      
      // 检查所有祖先文件夹是否都展开
      return ancestors.every(ancestorPath => state.expandedFolders.has(ancestorPath));
    },

    // 状态管理
    resetState: () => set((state) => {
      state.nodes = {};
      state.expandedFolders.clear();
      state.selectedNodeId = null;
      state.draggedNode = null;
      state.dragOverNodeId = null;
      state.renamingNodeId = null;
      state.searchQuery = '';
      state.filteredNodeIds.clear();
    }),

    setState: (newState) => set((state) => {
      Object.assign(state, newState);
    }),
  }))
);