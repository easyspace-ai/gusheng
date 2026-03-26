// FileTree 类型定义和简单实现
export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  path: string;
  content?: string;
  children?: FileItem[];
}

// 简单的 FileTree 组件实现
import React from 'react';

interface FileTreeProps {
  onFileSelect?: (file: FileItem) => void;
  selectedFileId?: string;
  onOpenRecent?: () => void;
}

const FileTree: React.FC<FileTreeProps> = ({ onOpenRecent }) => {
  // 这是一个占位符实现
  return (
    <div className="p-4">
      <h3>文件树</h3>
      <p>文件树组件尚未实现</p>
      {onOpenRecent && (
        <button onClick={onOpenRecent} className="mt-2 px-2 py-1 bg-blue-500 text-white rounded">
          打开最近文件
        </button>
      )}
    </div>
  );
};

export default FileTree;
