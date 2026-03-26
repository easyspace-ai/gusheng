/**
 * 文件树状态管理 Hook
 * 提供统一的文件树状态管理和操作方法
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '@/stores';
import { eventBus } from '@/lib/eventBus';
import { fileTreeStorage } from '@/lib/fileTreeStorage';

export function useFileTree() {
  const {
    nodes,
    expandedFolders,
    selectedNodeId,
    toggleFolder,
    expandFolder,
    collapseFolder,
    selectNode,
    expandAllFolders,
    collapseAllFolders,
  } = useAppStore();

  // 计算展开的文件夹路径集合
  const expandedPaths = useMemo(() => {
    return new Set(Array.from(expandedFolders));
  }, [expandedFolders]);

  // 获取根节点
  const rootNodes = useMemo(() => {
    return Object.values(nodes)
      .filter(node => !node.parentPath || node.parentPath === '/')
      .sort((a, b) => {
        // 文件夹在前，文件在后
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [nodes]);

  // 获取子节点
  const getChildNodes = useCallback((parentPath: string) => {
    return Object.values(nodes)
      .filter(node => node.parentPath === parentPath)
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [nodes]);

  // 检查节点是否可见
  const isNodeVisible = useCallback((nodePath: string) => {
    const node = Object.values(nodes).find(n => n.path === nodePath);
    if (!node || !node.parentPath) return true;

    // 检查所有祖先节点是否都展开
    let currentPath = node.parentPath;
    while (currentPath && currentPath !== '/') {
      if (!expandedPaths.has(currentPath)) {
        return false;
      }
      const parentNode = Object.values(nodes).find(n => n.path === currentPath);
      currentPath = parentNode?.parentPath || '';
    }
    return true;
  }, [nodes, expandedPaths]);

  // 获取祖先路径
  const getAncestorPaths = useCallback((nodePath: string) => {
    const ancestors: string[] = [];
    const node = Object.values(nodes).find(n => n.path === nodePath);
    if (!node) return ancestors;

    let currentPath = node.parentPath;
    while (currentPath && currentPath !== '/') {
      ancestors.unshift(currentPath);
      const parentNode = Object.values(nodes).find(n => n.path === currentPath);
      currentPath = parentNode?.parentPath || '';
    }
    return ancestors;
  }, [nodes]);

  // 展开到节点（展开所有祖先节点）
  const expandToNode = useCallback((nodePath: string) => {
    const ancestors = getAncestorPaths(nodePath);
    ancestors.forEach(path => {
      if (!expandedPaths.has(path)) {
        expandFolder(path);
      }
    });
  }, [getAncestorPaths, expandedPaths, expandFolder]);

  // 保存状态到本地存储
  const saveState = useCallback(() => {
    fileTreeStorage.save({
      expandedFolders: Array.from(expandedFolders),
      selectedNodeId,
    });
  }, [expandedFolders, selectedNodeId]);

  // 从本地存储加载状态
  const loadState = useCallback(() => {
    const savedState = fileTreeStorage.load();
    if (savedState) {
      if (savedState.expandedFolders) {
        savedState.expandedFolders.forEach(path => {
          expandFolder(path);
        });
      }
      if (savedState.selectedNodeId) {
        selectNode(savedState.selectedNodeId);
      }
    }
  }, [expandFolder, selectNode]);

  // 监听状态变化，自动保存
  useEffect(() => {
    const unsubscribe = eventBus.on('fileTree:stateChanged', () => {
      saveState();
    });

    return unsubscribe;
  }, [saveState]);

  // 监听展开状态变化
  useEffect(() => {
    eventBus.emit('fileTree:stateChanged', {
      expandedFolders: Array.from(expandedFolders),
      selectedNodeId,
    });
  }, [expandedFolders, selectedNodeId]);

  return {
    // 状态
    nodes,
    expandedFolders: expandedPaths,
    selectedNodeId,
    rootNodes,
    
    // 操作方法
    toggleFolder,
    expandFolder,
    collapseFolder,
    selectNode,
    expandAllFolders,
    collapseAllFolders,
    expandToNode,
    
    // 工具方法
    getChildNodes,
    isNodeVisible,
    getAncestorPaths,
    
    // 持久化
    saveState,
    loadState,
  };
}
