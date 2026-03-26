import React from 'react';
import { cn } from '@/lib/utils';

interface EditorProps {
  className?: string;
  onCreateNew?: () => void;
  onOpenFile?: () => void;
  onOpenRecent?: () => void;
  onCloseCurrent?: () => void;
}

const Editor: React.FC<EditorProps> = ({ className, onCreateNew, onOpenFile, onOpenRecent, onCloseCurrent }) => {

  return (
    <div className={cn("flex flex-col items-center justify-center h-full bg-card", className)}>
      <div className="text-center space-y-6">
        <div className="group">
          <button 
            className={cn(
              "text-lg font-medium text-accent hover:text-accent/80",
              "transition-colors duration-150 cursor-pointer"
            )}
            onClick={onCreateNew}
          >
            创建新文件
            <span className="ml-2 text-muted-foreground">(⌘ N)</span>
          </button>
        </div>
        <div className="group">
          <button 
            className={cn(
              "text-lg font-medium text-accent hover:text-accent/80",
              "transition-colors duration-150 cursor-pointer"
            )}
            onClick={onOpenFile}
          >
            打开文件
            <span className="ml-2 text-muted-foreground">(⌘ O)</span>
          </button>
        </div>
        <div className="group">
          <button 
            className={cn(
              "text-lg font-medium text-accent hover:text-accent/80",
              "transition-colors duration-150 cursor-pointer"
            )}
            onClick={onOpenRecent}
          >
            查看近期文件
            <span className="ml-2 text-muted-foreground">(⌘ O)</span>
          </button>
        </div>
        <div className="group">
          <button 
            className={cn(
              "text-lg font-medium text-accent hover:text-accent/80",
              "transition-colors duration-150 cursor-pointer"
            )}
            onClick={onCloseCurrent}
          >
            关闭标签页
          </button>
        </div>
      </div>
    </div>
  );
};

export default Editor;