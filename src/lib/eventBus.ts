/**
 * 类型安全的事件总线系统
 * 提供高性能的事件发布/订阅机制
 */

type EventMap = Record<string, any>;
type EventHandler<T> = (payload: T) => void;
type Unsubscribe = () => void;

class EventBus<TEventMap extends EventMap = EventMap> {
  private handlers = new Map<keyof TEventMap, Set<EventHandler<any>>>();

  /**
   * 订阅事件
   */
  on<K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>
  ): Unsubscribe {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    this.handlers.get(event)!.add(handler);
    
    // 返回取消订阅函数
    return () => {
      const eventHandlers = this.handlers.get(event);
      if (eventHandlers) {
        eventHandlers.delete(handler);
        if (eventHandlers.size === 0) {
          this.handlers.delete(event);
        }
      }
    };
  }

  /**
   * 发布事件
   */
  emit<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
        }
      });
    }
  }

  /**
   * 取消订阅
   */
  off<K extends keyof TEventMap>(
    event: K,
    handler: EventHandler<TEventMap[K]>
  ): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * 清除所有订阅
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * 获取事件订阅数量
   */
  getListenerCount<K extends keyof TEventMap>(event: K): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

// 文件树事件类型定义
interface FileTreeEvents {
  'fileTree:expand': { folderId: string };
  'fileTree:collapse': { folderId: string };
  'fileTree:select': { nodeId: string };
  'fileTree:createFile': { parentId: string; fileName: string; fileType: string };
  'fileTree:createFolder': { parentId: string; folderName: string };
  'fileTree:delete': { nodeId: string; path: string };
  'fileTree:rename': { nodeId: string; oldName: string; newName: string };
  'fileTree:move': { nodeId: string; fromPath: string; toPath: string };
  'fileTree:refresh': { reason: string; incremental?: boolean };
  'fileTree:stateChanged': { expandedFolders: string[]; selectedNodeId: string | null };
}

// 创建全局事件总线实例
export const eventBus = new EventBus<FileTreeEvents>();

// 导出类型
export type { FileTreeEvents, EventHandler, Unsubscribe };
export { EventBus };
