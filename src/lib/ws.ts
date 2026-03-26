type FsEvent = {
  type: 'fs';
  action: 'created' | 'modified' | 'deleted' | 'renamed';
  path: string;
  from?: string;
  to?: string;
};

type Listener = (evt: FsEvent) => void;

let socket: WebSocket | null = null;
const listeners = new Set<Listener>();

function getWsUrl(): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws`;
}

export function connectWS(): void {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  
  socket = new WebSocket(getWsUrl());
  
  socket.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data) as FsEvent;
      if (data?.type === 'fs') {
        // 过滤掉一些不重要的文件变化事件，减少不必要的刷新
        const shouldIgnore = (
          data.path.includes('.DS_Store') ||
          data.path.includes('Thumbs.db') ||
          data.path.includes('.git/') ||
          data.path.includes('node_modules/')
        );
        
        if (!shouldIgnore) {
          listeners.forEach((l) => l(data));
        }
      }
    } catch (error) {
      console.error('WebSocket message parsing error:', error);
    }
  };
  
  socket.onopen = () => {
    console.log('WebSocket connected');
  };
  
  socket.onclose = () => {
    console.log('WebSocket disconnected, reconnecting...');
    // 简单的重连机制
    setTimeout(connectWS, 1000);
  };
  
  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

export function addFsListener(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

