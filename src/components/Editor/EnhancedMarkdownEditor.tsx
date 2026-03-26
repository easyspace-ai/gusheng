import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Eye, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditorDropZone } from './EditorDropZone';
import { useAppStore } from '@/stores';
import type { FileNode } from '@/stores/fileTreeStore';

interface EnhancedMarkdownEditorProps {
  noteId: string;
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  isDirty?: boolean;
}

export function EnhancedMarkdownEditor({ 
  noteId, 
  content, 
  onChange, 
  onSave,
  isDirty = false 
}: EnhancedMarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { notes } = useAppStore();
  
  const note = notes[noteId];

  // 处理拖拽释放
  const handleDrop = useCallback((data: any, position: { x: number; y: number }) => {
    if (data.node && data.node.type === 'file' && textareaRef.current) {
      const textarea = textareaRef.current;
      const fileNode = data.node as FileNode;
      
      // 计算光标位置（简化版）
      const lines = content.split('\n');
      const lineHeight = 24; // 大约的行高
      const lineIndex = Math.floor(position.y / lineHeight);
      const targetLine = Math.min(lineIndex, lines.length - 1);
      
      // 计算插入位置
      let insertPosition = 0;
      for (let i = 0; i < targetLine; i++) {
        insertPosition += lines[i].length + 1; // +1 for newline
      }
      
      // 生成链接文本
      const linkText = `[[${fileNode.name.replace(/\.(md|markdown)$/, '')}]]`;
      
      // 插入链接
      const newContent = 
        content.substring(0, insertPosition) + 
        linkText + 
        content.substring(insertPosition);
      
      onChange(newContent);
      
      // 设置光标位置到链接后
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = insertPosition + linkText.length;
      }, 0);
      
      // 显示链接插入动画效果
      showLinkInsertAnimation(position);
    }
  }, [content, onChange]);

  // 显示链接插入动画
  const showLinkInsertAnimation = (position: { x: number; y: number }) => {
    // 创建动画元素
    const animEl = document.createElement('div');
    animEl.className = 'fixed pointer-events-none z-50';
    animEl.innerHTML = '<div class="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>';
    animEl.style.left = `${position.x}px`;
    animEl.style.top = `${position.y}px`;
    
    if (textareaRef.current?.parentElement) {
      const rect = textareaRef.current.parentElement.getBoundingClientRect();
      animEl.style.left = `${rect.left + position.x}px`;
      animEl.style.top = `${rect.top + position.y}px`;
      document.body.appendChild(animEl);
      
      // 移除动画元素
      setTimeout(() => {
        document.body.removeChild(animEl);
      }, 600);
    }
  };

  // 自动保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  // 处理键盘输入
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;

    // Tab 键缩进
    if (e.key === 'Tab') {
      e.preventDefault();
      const newContent = 
        value.substring(0, selectionStart) + 
        '  ' + 
        value.substring(selectionEnd);
      onChange(newContent);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
      }, 0);
    }
    
    // 双击 [ 自动补全链接
    if (e.key === '[' && value[selectionStart - 1] === '[') {
      e.preventDefault();
      const newContent = 
        value.substring(0, selectionStart) + 
        ']]' + 
        value.substring(selectionEnd);
      onChange(newContent);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart;
      }, 0);
    }
  };

  // 渲染 Markdown 预览
  const renderMarkdown = useCallback((markdown: string) => {
    // 简单的 Markdown 渲染（实际应用中应使用专门的 Markdown 解析库）
    const lines = markdown.split('\n');
    const elements: React.ReactElement[] = [];
    let inCodeBlock = false;
    let codeContent = '';
    
    lines.forEach((line, index) => {
      // 代码块
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="bg-gray-100 dark:bg-gray-800 p-3 rounded my-2 overflow-x-auto">
              <code className="text-sm">{codeContent}</code>
            </pre>
          );
          codeContent = '';
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }
      
      if (inCodeBlock) {
        codeContent += line + '\n';
        return;
      }
      
      // 标题
      if (line.startsWith('### ')) {
        elements.push(<h3 key={index} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={index} className="text-xl font-semibold mt-4 mb-2">{line.slice(3)}</h2>);
      } else if (line.startsWith('# ')) {
        elements.push(<h1 key={index} className="text-2xl font-bold mt-4 mb-2">{line.slice(2)}</h1>);
      }
      // 列表
      else if (line.match(/^[-*+] /)) {
        elements.push(<li key={index} className="ml-4 mb-1">{line.slice(2)}</li>);
      }
      else if (line.match(/^\d+\. /)) {
        elements.push(<li key={index} className="ml-4 mb-1">{line.replace(/^\d+\. /, '')}</li>);
      }
      // 空行
      else if (line.trim() === '') {
        elements.push(<br key={index} />);
      }
      // 普通段落
      else {
        // 处理内联代码和链接
        const processedLine = line
          .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
          .replace(/\[\[([^\]]+)\]\]/g, '<span class="text-blue-600 dark:text-blue-400 underline cursor-pointer hover:text-blue-700 dark:hover:text-blue-300">$1</span>');
        
        elements.push(
          <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: processedLine }} />
        );
      }
    });
    
    return elements;
  }, []);

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <div className="text-center text-muted-foreground">
          <Edit className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>未找到笔记</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{note.title}</span>
          {isDirty && (
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
              isDirty && "text-primary"
            )}
            onClick={onSave}
            disabled={!isDirty}
          >
            <Save className="h-3 w-3" />
            <span className="ml-1 text-xs">保存</span>
          </Button>
        </div>
      </div>

      {/* 编辑区域 */}
      <EditorDropZone
        onDrop={handleDrop}
        className="flex-1 p-4 overflow-hidden"
      >
        {isPreview ? (
          <div className="h-full overflow-y-auto prose prose-sm max-w-none dark:prose-invert">
            {renderMarkdown(content)}
          </div>
        ) : (
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="开始编写你的 Markdown 文档..."
            className="h-full w-full resize-none border-0 p-0 focus-visible:ring-0 text-sm leading-relaxed font-mono"
            spellCheck={false}
          />
        )}
      </EditorDropZone>
    </div>
  );
}