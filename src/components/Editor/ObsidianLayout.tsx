import React, { useState, useCallback, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TabBar, type TabType } from './Tab';
import Editor from './Editor';
import { type FileItem } from './FileTree';
import MarkdownEditor from './MarkdownEditor';
import DatabaseEditor from './DatabaseEditor';
import CanvasEditor from './CanvasEditor';
import HtmlEditor from './HtmlEditor';
import CodeEditor from './CodeEditor';
import CommandPalette from './CommandPalette';

interface PanelNode {
  id: string;
  type: 'leaf' | 'split';
  direction?: 'horizontal' | 'vertical';
  tabs?: TabType[];
  children?: PanelNode[];
  size?: number;
  minSize?: number;
}

interface ExtendedTabType extends TabType {
  fileId?: string;
  content?: string;
}

const ObsidianLayout: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [files, setFiles] = useState<Record<string, FileItem>>({});
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  
  const [panelTree, setPanelTree] = useState<PanelNode>({
    id: 'root',
    type: 'split',
    direction: 'horizontal',
    children: [
      {
        id: 'sidebar',
        type: 'leaf',
        tabs: [],
        size: 25,
        minSize: 15
      },
      {
        id: 'main-area',
        type: 'split',
        direction: 'vertical',
        size: 75,
        children: [
          {
            id: 'editor',
            type: 'leaf',
            tabs: [{ id: 'welcome', title: '欢迎', isActive: true }],
            size: 100,
            minSize: 20
          }
        ]
      }
    ]
  });

  // Load recent files from localStorage
  useEffect(() => {
    const savedRecentFiles = localStorage.getItem('obsidian-recent-files');
    if (savedRecentFiles) {
      setRecentFiles(JSON.parse(savedRecentFiles));
    }
  }, []);

  // Save recent files to localStorage
  useEffect(() => {
    localStorage.setItem('obsidian-recent-files', JSON.stringify(recentFiles));
  }, [recentFiles]);

  // Add file to recent list
  const addToRecentFiles = useCallback((fileId: string) => {
    setRecentFiles(prev => {
      const filtered = prev.filter(id => id !== fileId);
      return [fileId, ...filtered].slice(0, 10);
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl key
      const isModifierPressed = e.metaKey || e.ctrlKey;
      
      if (isModifierPressed) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            setCommandPaletteOpen(true);
            break;
          case 'o':
            e.preventDefault();
            setCommandPaletteOpen(true);
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save file content to localStorage
  const saveFileContent = useCallback((file: FileItem, content: string) => {
    const savedFiles = localStorage.getItem('obsidian-files');
    if (savedFiles) {
      const parsedFiles = JSON.parse(savedFiles);
      parsedFiles[file.id] = { ...parsedFiles[file.id], content };
      localStorage.setItem('obsidian-files', JSON.stringify(parsedFiles));
      setFiles(parsedFiles);
    }
  }, []);

  // Handle file selection from FileTree
  const handleFileSelect = useCallback((file: FileItem) => {
    setSelectedFile(file);
    addToRecentFiles(file.id);
    
    // Find the main editor panel and add/activate tab
    const updatePanelWithFile = (node: PanelNode): PanelNode => {
      if (node.id === 'editor' && node.type === 'leaf') {
        const existingTabIndex = node.tabs?.findIndex(tab => 
          (tab as ExtendedTabType).fileId === file.id
        );
        
        if (existingTabIndex !== undefined && existingTabIndex >= 0) {
          // Activate existing tab
          const newTabs = node.tabs?.map((tab, index) => ({
            ...tab,
            isActive: index === existingTabIndex
          })) || [];
          return { ...node, tabs: newTabs };
        } else {
          // Add new tab
          const newTab: ExtendedTabType = {
            id: `file-${file.id}`,
            title: file.name,
            isActive: true,
            fileId: file.id,
            content: file.content
          };
          const newTabs = [
            ...(node.tabs?.map(tab => ({ ...tab, isActive: false })) || []),
            newTab
          ];
          return { ...node, tabs: newTabs };
        }
      }
      
      if (node.children) {
        return { ...node, children: node.children.map(updatePanelWithFile) };
      }
      
      return node;
    };
    
    setPanelTree(prevTree => updatePanelWithFile(prevTree));
  }, [addToRecentFiles]);

  const openRecent = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const createNewMarkdown = useCallback(() => {
    const id = Date.now().toString();
    const newFile: FileItem = {
      id,
      name: '新文档.md',
      type: 'file',
      fileType: 'markdown',
      path: `/新文档.md`,
      content: '# 新文档\n\n在这里开始编写...'
    };
    setFiles(prev => ({ ...prev, [id]: newFile }));
    handleFileSelect(newFile);
    const saved = localStorage.getItem('obsidian-files');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed[id] = newFile;
      localStorage.setItem('obsidian-files', JSON.stringify(parsed));
    }
  }, [handleFileSelect]);

  const findPanelById = useCallback((tree: PanelNode, id: string): PanelNode | null => {
    if (tree.id === id) return tree;
    if (tree.children) {
      for (const child of tree.children) {
        const result = findPanelById(child, id);
        if (result) return result;
      }
    }
    return null;
  }, []);

  const updatePanelTabs = useCallback((panelId: string, newTabs: TabType[]) => {
    setPanelTree(prevTree => {
      const updateNode = (node: PanelNode): PanelNode => {
        if (node.id === panelId && node.type === 'leaf') {
          return { ...node, tabs: newTabs };
        }
        if (node.children) {
          return { ...node, children: node.children.map(updateNode) };
        }
        return node;
      };
      return updateNode(prevTree);
    });
  }, []);

  const handleToggleLock = useCallback((panelId: string) => (id: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const newTabs = panel.tabs.map(tab => 
      tab.id === id ? { ...tab, isLocked: !tab.isLocked } : tab
    );
    updatePanelTabs(panelId, newTabs);
  }, [panelTree, findPanelById, updatePanelTabs]);

  const handleDuplicate = useCallback((panelId: string) => (id: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const targetTab = panel.tabs.find(tab => tab.id === id);
    if (targetTab) {
      const newTab = {
        ...targetTab,
        id: Date.now().toString(),
        title: `${targetTab.title} - 副本`,
        isActive: false
      };
      const newTabs = [...panel.tabs, newTab];
      updatePanelTabs(panelId, newTabs);
    }
  }, [panelTree, findPanelById, updatePanelTabs]);

  const handleRename = useCallback((panelId: string) => (id: string, newTitle: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const newTabs = panel.tabs.map(tab => 
      tab.id === id ? { ...tab, title: newTitle } : tab
    );
    updatePanelTabs(panelId, newTabs);
  }, [panelTree, findPanelById, updatePanelTabs]);

  const handleCopyPath = useCallback((panelId: string) => (id: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const targetTab = panel.tabs.find(tab => tab.id === id);
    if (targetTab?.filePath) {
      navigator.clipboard.writeText(targetTab.filePath);
    }
  }, [panelTree, findPanelById]);

  const handleRevealInExplorer = useCallback((panelId: string) => (id: string) => {
    // 在网页环境中，我们可以显示文件路径或其他相关信息
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const targetTab = panel.tabs.find(tab => tab.id === id);
    if (targetTab) {
      alert(`文件位置: ${targetTab.filePath || '新文件'}`);
    }
  }, [panelTree, findPanelById]);

  const splitPanel = useCallback((panelId: string, direction: 'horizontal' | 'vertical') => {
    setPanelTree(prevTree => {
      const splitNode = (node: PanelNode): PanelNode => {
        if (node.id === panelId && node.type === 'leaf') {
          // 获取当前标签页的活动标签
          const activeTab = node.tabs?.find(tab => tab.isActive);
          const newTab = activeTab 
            ? { ...activeTab, id: Date.now().toString(), isActive: true }
            : { id: Date.now().toString(), title: '新标签页', isActive: true };

          // 创建新的分割面板
          return {
            id: node.id,
            type: 'split',
            direction,
            size: node.size,
            minSize: node.minSize,
            children: [
              {
                id: `${node.id}-original`,
                type: 'leaf',
                tabs: node.tabs,
                size: 50,
                minSize: 20
              },
              {
                id: `${node.id}-split-${Date.now()}`,
                type: 'leaf',
                tabs: [newTab],
                size: 50,
                minSize: 20
              }
            ]
          };
        }
        if (node.children) {
          return { ...node, children: node.children.map(splitNode) };
        }
        return node;
      };
      return splitNode(prevTree);
    });
  }, []);

  const removePanelNode = useCallback((panelId: string) => {
    setPanelTree(prevTree => {
      const removeNode = (node: PanelNode, parentNode?: PanelNode): PanelNode | null => {
        if (node.id === panelId) {
          return null; // 标记为删除
        }
        
        if (node.children) {
          const newChildren = node.children
            .map(child => removeNode(child, node))
            .filter((child): child is PanelNode => child !== null);
          
          // 如果只剩一个子节点，将其提升到当前级别
          if (newChildren.length === 1 && parentNode) {
            return { ...newChildren[0], size: node.size };
          }
          
          return { ...node, children: newChildren };
        }
        
        return node;
      };
      
      const result = removeNode(prevTree);
      return result || {
        id: 'root',
        type: 'leaf',
        tabs: [{ id: Date.now().toString(), title: '新标签页', isActive: true }]
      };
    });
  }, []);

  const handleCloseTab = useCallback((panelId: string) => (id: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const newTabs = panel.tabs.filter(tab => tab.id !== id);
    
    if (newTabs.length === 0) {
      // 如果是根面板或唯一面板，保留一个新标签
      const isRootPanel = panelTree.id === panelId;
      const isOnlyPanel = panelTree.type === 'leaf';
      
      if (isRootPanel || isOnlyPanel) {
        const newTab = { id: Date.now().toString(), title: '新标签页', isActive: true };
        updatePanelTabs(panelId, [newTab]);
      } else {
        // 否则删除整个面板
        removePanelNode(panelId);
      }
    } else {
      const closedTab = panel.tabs.find(tab => tab.id === id);
      if (closedTab?.isActive && newTabs.length > 0) {
        newTabs[0].isActive = true;
      }
      updatePanelTabs(panelId, newTabs);
    }
  }, [panelTree, findPanelById, updatePanelTabs, removePanelNode]);

  const handleActivateTab = useCallback((panelId: string) => (id: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const newTabs = panel.tabs.map(tab => ({ ...tab, isActive: tab.id === id }));
    updatePanelTabs(panelId, newTabs);
  }, [panelTree, findPanelById, updatePanelTabs]);

  const handleAddTab = useCallback((panelId: string) => () => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const newTab = {
      id: Date.now().toString(),
      title: '新标签页',
      isActive: false
    };
    const newTabs = [...panel.tabs, newTab];
    updatePanelTabs(panelId, newTabs);
  }, [panelTree, findPanelById, updatePanelTabs]);

  const handleCloseOthers = useCallback((panelId: string) => (id: string) => {
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;

    const targetTab = panel.tabs.find(tab => tab.id === id);
    if (targetTab) {
      updatePanelTabs(panelId, [{ ...targetTab, isActive: true }]);
    }
  }, [panelTree, findPanelById, updatePanelTabs]);

  const handleCloseAll = useCallback((panelId: string) => () => {
    const newTab = { id: Date.now().toString(), title: '新标签页', isActive: true };
    updatePanelTabs(panelId, [newTab]);
  }, [updatePanelTabs]);

  // Create new file from command palette
  const handleCreateFileFromPalette = useCallback((type: 'markdown' | 'database' | 'canvas' | 'html' | 'code') => {
    const newId = Date.now().toString();
    let defaultName = '新文件';
    let defaultContent = '';
    
    switch (type) {
      case 'markdown':
        defaultName = '新文档.md';
        defaultContent = '# 新文档\n\n在这里开始编写...';
        break;
      case 'database':
        defaultName = '新数据库.db';
        defaultContent = JSON.stringify({ columns: ['ID', '名称', '类型'], rows: [] }, null, 2);
        break;
      case 'canvas':
        defaultName = '新画板.canvas';
        defaultContent = '';
        break;
      case 'html':
        defaultName = '新页面.html';
        defaultContent = '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>';
        break;
      case 'code':
        defaultName = '新代码.js';
        defaultContent = '// JavaScript 代码\nconsole.log("Hello World!");';
        break;
    }

    const newFile: FileItem = {
      id: newId,
      name: defaultName,
      type: 'file',
      fileType: type,
      path: `/${defaultName}`,
      content: defaultContent
    };

    // 更新文件列表
    setFiles(prev => ({
      ...prev,
      [newId]: newFile
    }));

    // 自动打开新文件
    handleFileSelect(newFile);
    
    // 保存到localStorage
    const savedFiles = localStorage.getItem('obsidian-files');
    if (savedFiles) {
      const parsedFiles = JSON.parse(savedFiles);
      parsedFiles[newId] = newFile;
      localStorage.setItem('obsidian-files', JSON.stringify(parsedFiles));
    }
  }, [handleFileSelect]);

  // Get current active tab for closing
  const getCurrentActiveTab = useCallback(() => {
    // Find the currently active tab
    const findActiveTab = (node: PanelNode): { panelId: string; tabId: string } | null => {
      if (node.type === 'leaf' && node.tabs) {
        const activeTab = node.tabs.find(tab => tab.isActive);
        if (activeTab) {
          return { panelId: node.id, tabId: activeTab.id };
        }
      }
      if (node.children) {
        for (const child of node.children) {
          const result = findActiveTab(child);
          if (result) return result;
        }
      }
      return null;
    };
    
    return findActiveTab(panelTree);
  }, [panelTree]);

  const handleCloseCurrentTab = useCallback(() => {
    const activeTab = getCurrentActiveTab();
    if (activeTab) {
      handleCloseTab(activeTab.panelId)(activeTab.tabId);
    }
  }, [getCurrentActiveTab, handleCloseTab]);

  const handleSplitHorizontal = useCallback((panelId: string) => (_id: string) => {
    splitPanel(panelId, 'horizontal');
  }, [splitPanel]);

  const handleSplitVertical = useCallback((panelId: string) => (_id: string) => {
    splitPanel(panelId, 'vertical');
  }, [splitPanel]);

  const renderPanelNode = useCallback((node: PanelNode): React.ReactElement => {
    if (node.type === 'leaf') {
      // Sidebar panel - show FileTree
      // if (node.id === 'sidebar') {
      //   return (
      //     <FileTree 
      //       onFileSelect={handleFileSelect}
      //       selectedFileId={selectedFile?.id}
      //       onOpenRecent={openRecent}
      //     />
      //   );
      // }
      
      // Editor panels - show TabBar + Editor3/MarkdownEditor
      if (node.tabs) {
        const activeTab = node.tabs.find(tab => tab.isActive) as ExtendedTabType | undefined;
        const activeFile = activeTab?.fileId ? files[activeTab.fileId] || selectedFile : null;
        
        return (
          <div className="h-full flex flex-col">
            <TabBar
              tabs={node.tabs}
              onCloseTab={handleCloseTab(node.id)}
              onActivateTab={handleActivateTab(node.id)}
              onAddTab={handleAddTab(node.id)}
              onCloseOthers={handleCloseOthers(node.id)}
              onCloseAll={handleCloseAll(node.id)}
              onSplitHorizontal={handleSplitHorizontal(node.id)}
              onSplitVertical={handleSplitVertical(node.id)}
              onToggleLock={handleToggleLock(node.id)}
              onDuplicate={handleDuplicate(node.id)}
              onRename={handleRename(node.id)}
              onCopyPath={handleCopyPath(node.id)}
              onRevealInExplorer={handleRevealInExplorer(node.id)}
            />
            {activeFile && activeFile.type === 'file' ? (
              (() => {
                switch (activeFile.fileType) {
                  case 'markdown':
                    return (
                      <MarkdownEditor 
                        file={activeFile}
                        onSave={saveFileContent}
                      />
                    );
                  case 'database':
                    return (
                      <DatabaseEditor 
                        file={activeFile}
                        onSave={saveFileContent}
                      />
                    );
                  case 'canvas':
                    return (
                      <CanvasEditor 
                        file={activeFile}
                        onSave={saveFileContent}
                      />
                    );
                  case 'html':
                    return (
                      <HtmlEditor 
                        file={activeFile}
                        onSave={saveFileContent}
                      />
                    );
                  case 'code':
                    return (
                      <CodeEditor 
                        file={activeFile}
                        onSave={saveFileContent}
                      />
                    );
                  default:
                    return (
                      <MarkdownEditor 
                        file={activeFile}
                        onSave={saveFileContent}
                      />
                    );
                }
              })()
            ) : (
              <Editor 
                className=""
                onCreateNew={createNewMarkdown}
                onOpenFile={() => setCommandPaletteOpen(true)}
                onOpenRecent={openRecent}
                onCloseCurrent={handleCloseCurrentTab}
              />
            )}
          </div>
        );
      }
    }

    if (node.type === 'split' && node.children && node.children.length > 0) {
      return (
        <PanelGroup direction={node.direction || 'horizontal'}>
          {node.children.map((child, index) => (
            <React.Fragment key={child.id}>
              <Panel 
                defaultSize={child.size || 50} 
                minSize={child.minSize || 20}
                className={node.direction === 'horizontal' && index === 0 ? 'border-r border-border' : ''}
              >
                {renderPanelNode(child)}
              </Panel>
              {index < node.children!.length - 1 && (
                <PanelResizeHandle 
                  className={node.direction === 'horizontal' 
                    ? "w-1 bg-border hover:bg-accent transition-colors duration-200" 
                    : "h-1 bg-border hover:bg-accent transition-colors duration-200"
                  } 
                />
              )}
            </React.Fragment>
          ))}
        </PanelGroup>
      );
    }

    return <div>Error: Invalid panel configuration</div>;
  }, [
    handleCloseTab,
    handleActivateTab,
    handleAddTab,
    handleCloseOthers,
    handleCloseAll,
    handleSplitHorizontal,
    handleSplitVertical,
    handleToggleLock,
    handleDuplicate,
    handleRename,
    handleCopyPath,
    handleRevealInExplorer,
    handleFileSelect,
    selectedFile,
    files,
    saveFileContent,
    openRecent,
    createNewMarkdown,
    handleCloseCurrentTab
  ]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {renderPanelNode(panelTree)}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        files={files}
        onFileSelect={handleFileSelect}
        onCreateFile={handleCreateFileFromPalette}
        onCloseTab={handleCloseCurrentTab}
        recentFiles={recentFiles}
      />
    </div>
  );
};

export default ObsidianLayout;