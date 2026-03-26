import React, { useState, useRef, useEffect } from 'react';
import { FileItem } from './FileTree';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Eye, Code, Save } from 'lucide-react';

interface HtmlEditorProps {
  file: FileItem;
  onSave: (file: FileItem, content: string) => void;
}

const HtmlEditor: React.FC<HtmlEditorProps> = ({ file, onSave }) => {
  const [content, setContent] = useState(file.content || '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>');
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (file.content !== undefined) {
      setContent(file.content);
    }
  }, [file.content]);

  useEffect(() => {
    if (viewMode === 'preview' && iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(content);
        iframeDoc.close();
      }
    }
  }, [content, viewMode]);

  const handleContentChange = (value: string) => {
    setContent(value);
    // Auto-save after 1 second of no typing
    setTimeout(() => {
      onSave(file, value);
    }, 1000);
  };

  const handleSave = () => {
    onSave(file, content);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={viewMode === 'code' ? 'default' : 'outline'}
            onClick={() => setViewMode('code')}
          >
            <Code className="h-4 w-4 mr-1" />
            代码
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'preview' ? 'default' : 'outline'}
            onClick={() => setViewMode('preview')}
          >
            <Eye className="h-4 w-4 mr-1" />
            预览
          </Button>
        </div>
        <Button size="sm" onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" />
          保存
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'code' ? (
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full h-full resize-none border-none font-mono text-sm focus-visible:ring-0"
            placeholder="在这里编写HTML代码..."
            style={{ minHeight: '100%' }}
          />
        ) : (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-none"
            title="HTML Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
    </div>
  );
};

export default HtmlEditor;