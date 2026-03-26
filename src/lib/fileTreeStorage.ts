/**
 * 文件树状态持久化管理
 * 提供多层持久化策略和状态恢复机制
 */

interface FileTreeState {
  expandedFolders: string[];
  selectedNodeId: string | null;
  scrollPosition: number;
  timestamp: number;
}

interface StorageConfig {
  key: string;
  version: string;
  ttl?: number; // 过期时间（毫秒）
}

class FileTreeStorage {
  private config: StorageConfig = {
    key: 'fileTreeState',
    version: '1.0.0',
    ttl: 7 * 24 * 60 * 60 * 1000, // 7天
  };

  /**
   * 保存状态到本地存储
   */
  save(state: Partial<FileTreeState>): void {
    try {
      const fullState: FileTreeState = {
        expandedFolders: [],
        selectedNodeId: null,
        scrollPosition: 0,
        timestamp: Date.now(),
        ...state,
      };

      const serialized = JSON.stringify({
        ...fullState,
        version: this.config.version,
      });

      localStorage.setItem(this.config.key, serialized);
    } catch (error) {
      console.warn('Failed to save file tree state:', error);
    }
  }

  /**
   * 从本地存储加载状态
   */
  load(): Partial<FileTreeState> | null {
    try {
      const serialized = localStorage.getItem(this.config.key);
      if (!serialized) return null;

      const parsed = JSON.parse(serialized);
      
      // 检查版本兼容性
      if (parsed.version !== this.config.version) {
        this.clear();
        return null;
      }

      // 检查过期时间
      if (this.config.ttl && parsed.timestamp) {
        const age = Date.now() - parsed.timestamp;
        if (age > this.config.ttl) {
          this.clear();
          return null;
        }
      }

      return {
        expandedFolders: parsed.expandedFolders || [],
        selectedNodeId: parsed.selectedNodeId || null,
        scrollPosition: parsed.scrollPosition || 0,
      };
    } catch (error) {
      console.warn('Failed to load file tree state:', error);
      this.clear();
      return null;
    }
  }

  /**
   * 清除存储的状态
   */
  clear(): void {
    try {
      localStorage.removeItem(this.config.key);
    } catch (error) {
      console.warn('Failed to clear file tree state:', error);
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 创建全局存储实例
export const fileTreeStorage = new FileTreeStorage();

// 导出类型
export type { FileTreeState, StorageConfig };
