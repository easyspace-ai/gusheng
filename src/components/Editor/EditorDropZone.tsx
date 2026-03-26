import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

interface EditorDropZoneProps {
  onDrop: (data: any, position: { x: number; y: number }) => void;
  children: React.ReactNode;
  className?: string;
}

export function EditorDropZone({ onDrop, children, className }: EditorDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<{ x: number; y: number } | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 检查是否是文件拖拽
    const types = Array.from(e.dataTransfer.types);
    if (types.includes('application/json')) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
      
      // 更新放置指示器位置
      const rect = e.currentTarget.getBoundingClientRect();
      setDropIndicatorPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // 只有当离开整个容器时才隐藏指示器
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
      setDropIndicatorPosition(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    setDropIndicatorPosition(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const rect = e.currentTarget.getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      onDrop(data, position);
    } catch (error) {
      console.error('Failed to parse drop data:', error);
    }
  }, [onDrop]);

  return (
    <div
      className={cn("relative", className)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      
      {/* 拖拽悬停效果 */}
      {isDragOver && (
        <div className="absolute inset-0 pointer-events-none">
          {/* 边框高亮 */}
          <div className="absolute inset-0 border-2 border-blue-500 rounded-md opacity-50" />
          
          {/* 放置指示器 */}
          {dropIndicatorPosition && (
            <div
              className="absolute w-0.5 h-6 bg-blue-500 -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
              style={{
                left: dropIndicatorPosition.x,
                top: dropIndicatorPosition.y
              }}
            >
              {/* 指示器光标 */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}