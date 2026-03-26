import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit, 
  Eye, 
  SplitSquareHorizontal,
  Type,
  Code,
  Save,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores';
import type { Note } from '@/stores/notesStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

interface EnhancedEditorProps {
  note: Note;
  className?: string;
}

// 编辑模式类型
type EditorMode = 'edit' | 'preview' | 'split' | 'rich';

// 动画配置
const EDITOR_ANIMATIONS = {
  modeSwitch: {
    initial: { opacity: 0, y: 10, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 },
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  toolbar: {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: 0.1 }
  }
};

// 工具栏按钮组件
const ToolbarButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  variant?: 'default' | 'primary';
}> = ({ icon, label, isActive, onClick, variant = 'default' }) => (
  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
    <Button
      variant={isActive ? 'default' : 'ghost'}
      size="sm"
      className={cn(
        "h-8 px-3 gap-2 transition-all duration-200",
        isActive && variant === 'primary' && "bg-blue-600 hover:bg-blue-700 text-white",
        isActive && variant === 'default' && "bg-gray-100 text-gray-900"
      )}
      onClick={onClick}
      title={label}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </Button>
  </motion.div>
);

// Markdown 编辑器组件
const MarkdownEditor: React.FC<{
  content: string;
  onChange: (content: string) => void;
  className?: string;
}> = ({ content, onChange, className }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

  return (
    <motion.div
      {...EDITOR_ANIMATIONS.modeSwitch}
      className={cn("h-full", className)}
    >
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        className={cn(
          "w-full h-full p-4 border-0 resize-none outline-none",
          "font-mono text-sm leading-relaxed",
          "bg-transparent text-gray-800",
          "placeholder-gray-400"
        )}
        placeholder="开始编写你的笔记..."
        spellCheck={false}
      />
    </motion.div>
  );
};

// Markdown 预览组件
const MarkdownPreview: React.FC<{
  content: string;
  className?: string;
}> = ({ content, className }) => {
  // 简单的 Markdown 渲染（实际项目中应使用专业的 Markdown 解析器）
  const renderMarkdown = useCallback((text: string) => {
    return text
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\[\[(.*?)\]\]/g, '<a href="#" class="wiki-link">$1</a>')
      .replace(/\n/g, '<br>');
  }, []);

  return (
    <motion.div
      {...EDITOR_ANIMATIONS.modeSwitch}
      className={cn("h-full overflow-y-auto", className)}
    >
      <div 
        className={cn(
          "p-4 prose prose-sm max-w-none",
          "prose-headings:text-gray-900 prose-p:text-gray-700",
          "prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded",
          "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
        )}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </motion.div>
  );
};

// 富文本编辑器组件（简化版）
const RichTextEditor: React.FC<{
  content: string;
  onChange: (content: string) => void;
  className?: string;
}> = ({ content, onChange, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  return (
    <motion.div
      {...EDITOR_ANIMATIONS.modeSwitch}
      className={cn("h-full", className)}
    >
      <div
        ref={editorRef}
        contentEditable
        className={cn(
          "w-full h-full p-4 outline-none",
          "prose prose-sm max-w-none",
          "focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 rounded-lg"
        )}
        onInput={handleInput}
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </motion.div>
  );
};

export function EnhancedEditor({ note, className }: EnhancedEditorProps) {
  const [content, setContent] = useState(note.content);
  const [editorMode, setEditorMode] = useState<EditorMode>('edit');
  const [isRichMode, setIsRichMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const { updateNote } = useAppStore();

  // 自动保存
  const saveContent = useCallback(async (newContent: string) => {
    if (newContent !== note.content) {
      setIsSaving(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 500)); // 模拟保存延迟
        updateNote(note.id, { content: newContent, updatedAt: new Date() });
        setLastSaved(new Date());
      } catch (error) {
        console.error('Failed to save:', error);
      } finally {
        setIsSaving(false);
      }
    }
  }, [note.id, note.content, updateNote]);

  // 防抖保存
  const debouncedSave = useCallback((newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveContent(newContent);
    }, 1000);
  }, [saveContent]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    debouncedSave(newContent);
  }, [debouncedSave]);

  // 当切换笔记时更新内容
  useEffect(() => {
    setContent(note.content);
  }, [note.id, note.content]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 渲染编辑器内容
  const renderEditorContent = useCallback(() => {
    switch (editorMode) {
      case 'edit':
        return isRichMode ? (
          <RichTextEditor
            content={content}
            onChange={handleContentChange}
            className="flex-1"
          />
        ) : (
          <MarkdownEditor
            content={content}
            onChange={handleContentChange}
            className="flex-1"
          />
        );
      
      case 'preview':
        return (
          <MarkdownPreview
            content={content}
            className="flex-1"
          />
        );
      
      case 'split':
        return (
          <div className="flex flex-1 gap-1">
            <div className="flex-1 border-r border-gray-200">
              {isRichMode ? (
                <RichTextEditor
                  content={content}
                  onChange={handleContentChange}
                />
              ) : (
                <MarkdownEditor
                  content={content}
                  onChange={handleContentChange}
                />
              )}
            </div>
            <div className="flex-1">
              <MarkdownPreview content={content} />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  }, [editorMode, isRichMode, content, handleContentChange]);

  return (
    <div className={cn("flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200", className)}>
      {/* 编辑器工具栏 */}
      <motion.div
        {...EDITOR_ANIMATIONS.toolbar}
        className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50/50"
      >
        <div className="flex items-center gap-4">
          {/* 文件信息 */}
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-800 truncate max-w-48">
              {note.title}
            </h2>
            {isSaving && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 text-xs text-blue-600"
              >
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                保存中...
              </motion.div>
            )}
            {lastSaved && !isSaving && (
              <span className="text-xs text-gray-500">
                已保存 {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* 编辑模式切换 */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              icon={<Edit size={14} />}
              label="编辑"
              isActive={editorMode === 'edit'}
              onClick={() => setEditorMode('edit')}
              variant="primary"
            />
            
            <ToolbarButton
              icon={<Eye size={14} />}
              label="预览"
              isActive={editorMode === 'preview'}
              onClick={() => setEditorMode('preview')}
              variant="primary"
            />
            
            <ToolbarButton
              icon={<SplitSquareHorizontal size={14} />}
              label="分屏"
              isActive={editorMode === 'split'}
              onClick={() => setEditorMode('split')}
              variant="primary"
            />
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* 编辑器类型切换 */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              icon={<Code size={14} />}
              label="Markdown"
              isActive={!isRichMode}
              onClick={() => setIsRichMode(false)}
            />
            
            <ToolbarButton
              icon={<Type size={14} />}
              label="富文本"
              isActive={isRichMode}
              onClick={() => setIsRichMode(true)}
            />
          </div>
        </div>

        {/* 右侧工具 */}
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3"
              onClick={() => saveContent(content)}
              disabled={isSaving}
            >
              <Save size={14} className="mr-1" />
              保存
            </Button>
          </motion.div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal size={14} />
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                导出为 PDF
              </DropdownMenuItem>
              <DropdownMenuItem>
                导出为 HTML
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                文档设置
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* 编辑器内容区 */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {renderEditorContent()}
        </AnimatePresence>
      </div>

      {/* 状态栏 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50/30 text-xs text-gray-500"
      >
        <div className="flex items-center gap-4">
          <span>字数: {content.length}</span>
          <span>行数: {content.split('\n').length}</span>
          <span>类型: {note.fileType}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span>创建: {note.createdAt.toLocaleDateString()}</span>
          <span>修改: {note.updatedAt.toLocaleDateString()}</span>
        </div>
      </motion.div>
    </div>
  );
}