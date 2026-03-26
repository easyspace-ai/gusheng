/**
 * 文件树持久化 Hook
 * 提供状态保存、恢复和同步功能
 */

import { useCallback, useEffect } from 'react';
import { fileTreeStorage } from '@/lib/fileTreeStorage';
import { eventBus } from '@/lib/eventBus';

export function useFileTreePersistence() {
  
  // 保存状态
  const saveState = useCallback((state: {
    expandedFolders: string[];
    selectedNodeId: string | null;
    scrollPosition?: number;
  }) => {
    fileTreeStorage.save(state);
  }, []);

  // 加载状态
  const loadState = useCallback(() => {
    return fileTreeStorage.load();
  }, []);

  // 清除状态
  const clearState = useCallback(() => {
    fileTreeStorage.clear();
  }, []);

  // 自动保存状态变化
  useEffect(() => {
    const unsubscribe = eventBus.on('fileTree:stateChanged', (state) => {
      saveState(state);
    });

    return unsubscribe;
  }, [saveState]);

  // 初始化时加载状态
  useEffect(() => {
    const savedState = loadState();
    if (savedState) {
      // 发送状态恢复事件
      eventBus.emit('fileTree:refresh', { 
        reason: 'stateRestore',
        incremental: true 
      });
    }
  }, [loadState]);

  return {
    saveState,
    loadState,
    clearState,
  };
}
