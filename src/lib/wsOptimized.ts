/**
 * 优化后的 WebSocket 集成
 * 提供智能的文件系统监听和防抖机制
 */

import { eventBus } from './eventBus';

type FsEvent = {
  type: 'fs';
  action: 'created' | 'modified' | 'deleted' | 'renamed';
  path: string;
  from?: string;
  to?: string;
};

type Listener = (evt: FsEvent) => void;

class OptimizedWebSocketManager {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isManualOperation = false;
  private refreshTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // 不需要在构造函数中设置防抖，WebSocket 事件会直接触发刷新
  }

  /**
   * 获取 WebSocket URL
   */
  private getWsUrl(): string {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/ws`;
  }

  /**
   * 连接 WebSocket
   */
  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.socket = new WebSocket(this.getWsUrl());

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // 连接成功后，请求一次文件树刷新
      eventBus.emit('fileTree:refreshRequest', { reason: 'WebSocket connected' });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as FsEvent;
        if (data?.type === 'fs') {
          // 过滤掉不需要的文件
          const shouldIgnore = (
            data.path.includes('.DS_Store') ||
            data.path.includes('Thumbs.db') ||
            data.path.includes('.git/') ||
            data.path.includes('node_modules/')
          );

          if (!shouldIgnore) {
            this.listeners.forEach((listener) => {
              try {
                listener(data);
              } catch (error) {
                console.error('Error in WebSocket listener:', error);
              }
            });
          }
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
        setTimeout(() => this.connect(), this.reconnectDelay);
      } else {
        console.error('Max reconnection attempts reached');
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  /**
   * 断开 WebSocket 连接
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * 添加文件系统事件监听器
   */
  public addFsListener(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 移除文件系统事件监听器
   */
  public removeFsListener(listener: Listener): void {
    this.listeners.delete(listener);
  }

  /**
   * 标记手动操作开始
   */
  public markManualOperation(): void {
    this.isManualOperation = true;
    console.log('Manual operation started. Auto-refresh suppressed.');
  }

  /**
   * 重置手动操作标记
   */
  public resetManualOperation(): void {
    this.isManualOperation = false;
    console.log('Manual operation reset. Auto-refresh enabled.');
  }

  /**
   * 检查是否在手动操作中
   */
  public isInManualOperation(): boolean {
    return this.isManualOperation;
  }

  /**
   * 防抖刷新文件树
   */
  private debouncedRefresh(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.refreshTimeout = setTimeout(() => {
      if (!this.isManualOperation) {
        eventBus.emit('fileTree:refreshRequest', { 
          reason: 'fileSystemChange'
        });
      }
      this.isManualOperation = false;
    }, 300);
  }

  /**
   * 处理文件系统事件
   */
  public handleFsEvent(event: FsEvent): void {
    // 如果不是手动操作，则触发防抖刷新
    if (!this.isManualOperation) {
      this.debouncedRefresh();
    }
  }
}

// 创建全局实例
export const wsManager = new OptimizedWebSocketManager();

// 自动连接
wsManager.connect();
