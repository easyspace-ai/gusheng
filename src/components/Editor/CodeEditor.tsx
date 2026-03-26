import React, { useState, useEffect } from 'react';
import { FileItem } from './FileTree';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Play } from 'lucide-react';

interface CodeEditorProps {
  file: FileItem;
  onSave: (file: FileItem, content: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ file, onSave }) => {
  const [content, setContent] = useState(file.content || '// 在这里编写代码\nconsole.log("Hello World!");');
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');

  useEffect(() => {
    if (file.content !== undefined) {
      setContent(file.content);
    }
    
    // 根据文件名推断语言
    if (file.name.endsWith('.js')) setLanguage('javascript');
    else if (file.name.endsWith('.py')) setLanguage('python');
    else if (file.name.endsWith('.java')) setLanguage('java');
    else if (file.name.endsWith('.cpp') || file.name.endsWith('.c')) setLanguage('cpp');
    else if (file.name.endsWith('.ts')) setLanguage('typescript');
    else if (file.name.endsWith('.css')) setLanguage('css');
    else if (file.name.endsWith('.json')) setLanguage('json');
  }, [file.content, file.name]);

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

  const runCode = () => {
    if (language === 'javascript') {
      try {
        // 创建一个安全的执行环境
        const originalLog = console.log;
        const logs: string[] = [];
        
        console.log = (...args) => {
          logs.push(args.map(arg => String(arg)).join(' '));
        };

        // 执行代码
        eval(content);
        
        // 恢复原始的console.log
        console.log = originalLog;
        
        setOutput(logs.join('\n') || '代码执行完成，无输出');
      } catch (error) {
        setOutput(`错误: ${error}`);
      }
    } else {
      setOutput(`暂不支持执行 ${language} 代码`);
    }
  };

  const getLanguageTemplate = (lang: string) => {
    switch (lang) {
      case 'javascript':
        return '// JavaScript 代码\nconsole.log("Hello World!");';
      case 'python':
        return '# Python 代码\nprint("Hello World!")';
      case 'java':
        return 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}';
      case 'cpp':
        return '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World!" << endl;\n    return 0;\n}';
      case 'typescript':
        return '// TypeScript 代码\nconst message: string = "Hello World!";\nconsole.log(message);';
      case 'css':
        return '/* CSS 样式 */\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n}';
      case 'json':
        return '{\n  "name": "示例",\n  "version": "1.0.0",\n  "description": "JSON 数据"\n}';
      default:
        return '// 代码内容';
    }
  };

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            size="sm"
            onClick={() => {
              const template = getLanguageTemplate(language);
              setContent(template);
              handleContentChange(template);
            }}
            variant="outline"
          >
            模板
          </Button>
        </div>

        <div className="flex gap-1">
          {language === 'javascript' && (
            <Button size="sm" onClick={runCode} variant="outline">
              <Play className="h-4 w-4 mr-1" />
              运行
            </Button>
          )}
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            保存
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full h-full resize-none border-none font-mono text-sm focus-visible:ring-0"
            placeholder={`在这里编写${languages.find(l => l.value === language)?.label}代码...`}
            style={{ minHeight: '100%' }}
          />
        </div>
        
        {output && (
          <div className="w-1/3 border-l border-border">
            <div className="p-2 border-b border-border bg-muted">
              <span className="text-sm font-medium">输出</span>
            </div>
            <pre className="p-2 text-sm bg-background h-full overflow-auto">
              {output}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;