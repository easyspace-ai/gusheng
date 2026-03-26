import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Eye, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileItem } from './FileTree';

interface MarkdownEditorProps {
  file: FileItem | null;
  onSave?: (file: FileItem, content: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ file, onSave, onDirtyChange }) => {
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Use ref to keep the latest onDirtyChange callback
  const onDirtyChangeRef = useRef(onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  // Update content when file changes
  useEffect(() => {
    if (file) {
      setContent(file.content || '');
      setHasUnsavedChanges(false);
      if (onDirtyChangeRef.current) onDirtyChangeRef.current(false);
    } else {
      setContent('');
      setHasUnsavedChanges(false);
      if (onDirtyChangeRef.current) onDirtyChangeRef.current(false);
    }
  }, [file]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    if (onDirtyChangeRef.current) onDirtyChangeRef.current(true);
  }, []);

  const handleSave = useCallback(() => {
    if (file && onSave) {
      onSave(file, content);
      setHasUnsavedChanges(false);
      if (onDirtyChangeRef.current) onDirtyChangeRef.current(false);
    }
  }, [file, content, onSave]);

  // Auto-save on Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Render markdown as HTML (basic implementation)
  const renderMarkdown = useCallback((markdown: string) => {
    return markdown
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
        }
        
        // Lists
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return <li key={index} className="ml-4">{line.slice(2)}</li>;
        }
        if (line.match(/^\d+\. /)) {
          return <li key={index} className="ml-4">{line.replace(/^\d+\. /, '')}</li>;
        }
        
        // Empty lines
        if (line.trim() === '') {
          return <br key={index} />;
        }
        
        // Regular paragraphs
        return <p key={index} className="mb-2">{line}</p>;
      });
  }, []);

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <div className="text-center text-muted-foreground">
          <Edit className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>选择一个文件开始编辑</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{file.name}</span>
          {hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground">• 未保存</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? <Edit className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span className="ml-1 text-xs">
              {isPreview ? '编辑' : '预览'}
            </span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2",
              hasUnsavedChanges && "text-primary"
            )}
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
          >
            <Save className="h-3 w-3" />
            <span className="ml-1 text-xs">保存</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4">
        {isPreview ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {renderMarkdown(content)}
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="开始编写你的markdown文档..."
            className="h-full w-full resize-none border-0 p-0 focus-visible:ring-0 text-sm leading-relaxed"
          />
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;