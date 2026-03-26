import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TabBar, type TabType } from '../Editor/Tab';
import Editor from '../Editor/Editor';
import MarkdownEditor from '../Editor/MarkdownEditor';
import DatabaseEditor from '../Editor/DatabaseEditor';
import CanvasEditor from '../Editor/CanvasEditor';
import HtmlEditor from '../Editor/HtmlEditor';
import CodeEditor from '../Editor/CodeEditor';
import CommandPalette from '../Editor/CommandPalette';
import { useAppStore, type EditorFile } from '../../stores';

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

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  fileType?: 'markdown' | 'database' | 'canvas' | 'html' | 'code';
  path: string;
  content?: string;
}

export function MainEditor() {
  const { 
    setEditorCallbacks, 
    revealInExplorer, 
    setLeftPanel,
    // 添加双向同步需要的状态和方法
    selectedNodeId,
    selectNode,
    notes
  } = useAppStore();
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [files, setFiles] = useState<Record<string, FileItem>>({});
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  
  const [panelTree, setPanelTree] = useState<PanelNode>({
    id: 'root',
    type: 'leaf',
    tabs: [{ id: 'welcome', title: '欢迎', isActive: true }],
    size: 100,
    minSize: 20
  });

  // Load recent files from localStorage
  useEffect(() => {
    const savedRecentFiles = localStorage.getItem('obsidian-recent-files');
    if (savedRecentFiles) {
      setRecentFiles(JSON.parse(savedRecentFiles));
    }
    
    // Load saved files
    const savedFiles = localStorage.getItem('obsidian-files');
    if (savedFiles) {
      setFiles(JSON.parse(savedFiles));
    }
  }, []);

  // Save recent files to localStorage
  useEffect(() => {
    localStorage.setItem('obsidian-recent-files', JSON.stringify(recentFiles));
  }, [recentFiles]);

  // Load panel tree if persisted
  useEffect(() => {
    try {
      const savedTree = localStorage.getItem('obsidian-panel-tree');
      if (savedTree) {
        const parsed = JSON.parse(savedTree);
        if (parsed && (parsed.type === 'leaf' || parsed.type === 'split')) {
          setPanelTree(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load panel tree:', error);
    }
  }, []);

  // Persist panel tree
  useEffect(() => {
    try {
      localStorage.setItem('obsidian-panel-tree', JSON.stringify(panelTree));
    } catch (error) {
      console.warn('Failed to save panel tree:', error);
    }
  }, [panelTree]);

  // 双向同步：监听文件树选中状态变化，同步到标签页
  useEffect(() => {
    if (selectedNodeId && notes[selectedNodeId]) {
      // 在当前活跃标签页中打开笔记
      const note = notes[selectedNodeId];
      const fileItem: FileItem = {
        id: selectedNodeId,
        name: note.title,
        type: 'file',
        fileType: note.fileType,
        path: selectedNodeId,
        content: note.content
      };
      
      // 使用 preview 模式打开，这样不会创建太多标签页
      handleFileSelectWithMode(fileItem, 'preview');
    }
  }, [selectedNodeId, notes, handleFileSelectWithMode]);

  // 双向同步：监听标签页激活状态变化，同步到文件树
  useEffect(() => {
    const getCurrentActiveTab = () => {
      const findActiveTab = (node: PanelNode): ExtendedTabType | null => {
        if (node.type === 'leaf') {
          return node.tabs?.find(tab => tab.isActive) as ExtendedTabType || null;
        } else if (node.children) {
          for (const child of node.children) {
            const activeTab = findActiveTab(child);
            if (activeTab) return activeTab;
          }
        }
        return null;
      };
      return findActiveTab(panelTree);
    };

    const activeTab = getCurrentActiveTab();
    if (activeTab?.fileId && activeTab.fileId !== selectedNodeId) {
      // 同步选中状态到文件树，但避免循环更新
      selectNode(activeTab.fileId);
    }
  }, [panelTree, selectedNodeId, selectNode]);

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

  // Find current active tab info to determine target leaf panel
  const getCurrentActiveTab = useCallback(() => {
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

  // Handle file selection - only add/activate in the active leaf panel with preview/pinned semantics
  const handleFileSelectWithMode = useCallback((file: FileItem, openMode: 'preview' | 'pinned') => {
    setSelectedFile(file);
    addToRecentFiles(file.id);
    
    // 更新files状态，确保文件内容可以被渲染
    setFiles(prev => ({
      ...prev,
      [file.id]: file
    }));

    const active = getCurrentActiveTab();
    const targetPanelId = active?.panelId || 'root';

    const updatePanelWithFileForPanel = (node: PanelNode): PanelNode => {
      if (node.type === 'leaf' && node.id === targetPanelId) {
        const tabs = node.tabs || [];
        const existingTabIndex = tabs.findIndex(tab => (tab as ExtendedTabType).fileId === file.id);
        if (existingTabIndex >= 0) {
          const newTabs = tabs.map((tab, index) => ({ ...tab, isActive: index === existingTabIndex }));
          return { ...node, tabs: newTabs };
        }

        if (openMode === 'preview') {
          const previewIndex = tabs.findIndex(tab => !(tab as any).isLocked);
          if (previewIndex >= 0) {
            const newTabs = tabs.map((tab, index) => {
              if (index === previewIndex) {
                return { ...tab, id: `file-${file.id}`, title: file.name, isActive: true, fileId: file.id } as ExtendedTabType;
              }
              return { ...tab, isActive: false };
            });
            return { ...node, tabs: newTabs };
          }
        }

        const newTab: (ExtendedTabType & { isLocked?: boolean }) = {
          id: `file-${file.id}`,
          title: file.name,
          isActive: true,
          fileId: file.id,
          content: file.content,
          ...(openMode === 'pinned' ? { isLocked: true } : {})
        };
        const newTabs = [ ...(tabs.map(tab => ({ ...tab, isActive: false })) || []), newTab ];
        return { ...node, tabs: newTabs };
      }
      if (node.children) {
        return { ...node, children: node.children.map(updatePanelWithFileForPanel) };
      }
      return node;
    };

    setPanelTree(prevTree => updatePanelWithFileForPanel(prevTree));
  }, [addToRecentFiles, getCurrentActiveTab]);

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
    handleFileSelectWithMode(newFile, 'pinned');
    
    // Save to localStorage
    const saved = localStorage.getItem('obsidian-files') || '{}';
    const parsed = JSON.parse(saved);
    parsed[id] = newFile;
    localStorage.setItem('obsidian-files', JSON.stringify(parsed));
  }, [handleFileSelectWithMode]);

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

  // Tab management functions
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
    const panel = findPanelById(panelTree, panelId);
    if (!panel?.tabs) return;
    const targetTab = panel.tabs.find(tab => tab.id === id);
    if (targetTab) {
      setLeftPanel('files');
      if ((targetTab as any).fileId) {
        revealInExplorer((targetTab as any).fileId as string);
      }
    }
  }, [panelTree, findPanelById, setLeftPanel, revealInExplorer]);

  // Panel splitting logic
  const splitPanel = useCallback((panelId: string, direction: 'horizontal' | 'vertical') => {
    setPanelTree(prevTree => {
      const splitNode = (node: PanelNode): PanelNode => {
        if (node.id === panelId && node.type === 'leaf') {
          const activeTab = node.tabs?.find(tab => tab.isActive);
          const newTab = activeTab 
            ? { ...activeTab, id: Date.now().toString(), isActive: true }
            : { id: Date.now().toString(), title: '新标签页', isActive: true };

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
          return null;
        }
        
        if (node.children) {
          const newChildren = node.children
            .map(child => removeNode(child, node))
            .filter((child): child is PanelNode => child !== null);
          
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
      const isRootPanel = panelTree.id === panelId;
      const isOnlyPanel = panelTree.type === 'leaf';
      
      if (isRootPanel || isOnlyPanel) {
        const newTab = { id: Date.now().toString(), title: '新标签页', isActive: true };
        updatePanelTabs(panelId, [newTab]);
      } else {
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
    
    // 创建新的文件ID和内容
    const newFileId = Date.now().toString();
    const newFile: FileItem = {
      id: newFileId,
      name: '新笔记',
      type: 'file',
      fileType: 'markdown',
      path: `/新笔记-${newFileId}.md`,
      content: '# 新笔记\n\n开始编辑这个笔记...'
    };
    
    // 添加到files状态
    setFiles(prev => ({
      ...prev,
      [newFileId]: newFile
    }));
    
    // 创建新标签页，并设置为激活状态
    const newTab = {
      id: `tab-${newFileId}`,
      title: '新笔记',
      isActive: true,
      fileId: newFileId
    } as ExtendedTabType;
    
    // 将其他标签页设置为非激活状态，添加新标签页
    const newTabs = [
      ...panel.tabs.map(tab => ({ ...tab, isActive: false })),
      newTab
    ];
    
    updatePanelTabs(panelId, newTabs);
  }, [panelTree, findPanelById, updatePanelTabs, setFiles]);

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

    setFiles(prev => ({ ...prev, [newId]: newFile }));
    handleFileSelectWithMode(newFile, 'pinned');
    
    const savedFiles = localStorage.getItem('obsidian-files') || '{}';
    const parsedFiles = JSON.parse(savedFiles);
    parsedFiles[newId] = newFile;
    localStorage.setItem('obsidian-files', JSON.stringify(parsedFiles));
  }, [handleFileSelectWithMode]);

  // Handle file selection from FileExplorer
  const handleFileSelectFromExplorer = useCallback((editorFile: EditorFile, options?: { openMode?: 'preview' | 'pinned' }) => {
    // Convert EditorFile to FileItem for internal use
    const fileItem: FileItem = {
      id: editorFile.id,
      name: editorFile.name,
      type: editorFile.type,
      fileType: editorFile.fileType,
      path: editorFile.path,
      content: editorFile.content
    };
    
    // Add to files if not already there
    setFiles(prev => ({
      ...prev,
      [fileItem.id]: fileItem
    }));
    
    // Select and open in tab
    handleFileSelectWithMode(fileItem, options?.openMode || 'preview');
  }, [handleFileSelectWithMode]);

  // Handle create file from FileExplorer
  const handleCreateFileFromExplorer = useCallback((type: 'markdown' | 'database' | 'canvas' | 'html' | 'code', folder?: string) => {
    // 创建文件但不自动打开，因为 FileExplorer 会处理
    const newId = Date.now().toString();
    let defaultName = '新文件';
    let defaultContent = '';
    
    switch (type) {
      case 'markdown':
        defaultName = '新笔记';
        defaultContent = '# 新笔记\n\n开始编辑这个笔记...';
        break;
      case 'database':
        defaultName = '新数据库';
        defaultContent = JSON.stringify({ columns: ['ID', '名称', '类型'], rows: [] }, null, 2);
        break;
      case 'canvas':
        defaultName = '新画图';
        defaultContent = '';
        break;
      case 'html':
        defaultName = '新页面';
        defaultContent = '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>';
        break;
      case 'code':
        defaultName = '新代码';
        defaultContent = '// JavaScript 代码\nconsole.log("Hello World!");';
        break;
    }

    const newFile: FileItem = {
      id: newId,
      name: defaultName,
      type: 'file',
      fileType: type,
      path: `${folder || '/workspace/笔记'}/${defaultName}`,
      content: defaultContent
    };

    setFiles(prev => ({ ...prev, [newId]: newFile }));
    handleFileSelectWithMode(newFile, 'pinned');
    
    const savedFiles = localStorage.getItem('obsidian-files') || '{}';
    const parsedFiles = JSON.parse(savedFiles);
    parsedFiles[newId] = newFile;
    localStorage.setItem('obsidian-files', JSON.stringify(parsedFiles));
  }, [handleFileSelectWithMode]);

  // Register callbacks with Zustand store
  useEffect(() => {
    setEditorCallbacks({
      onFileSelect: handleFileSelectFromExplorer,
      onCreateFile: handleCreateFileFromExplorer
    });
  }, [setEditorCallbacks, handleFileSelectFromExplorer, handleCreateFileFromExplorer]);

  // Mark the active tab in a panel as dirty/clean
  const setActiveTabDirty = useCallback((panelId: string, isDirty: boolean) => {
    setPanelTree(prevTree => {
      const updateNode = (node: PanelNode): PanelNode => {
        if (node.id === panelId && node.type === 'leaf' && node.tabs) {
          const newTabs = node.tabs.map(tab => tab.isActive ? { ...tab, isDirty } : tab);
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

  // Create memoized dirty change callbacks for each panel
  const dirtyChangeCallbacks = useMemo(() => {
    const callbacks: Record<string, (isDirty: boolean) => void> = {};
    return callbacks;
  }, []);

  const getDirtyChangeCallback = useCallback((panelId: string) => {
    if (!dirtyChangeCallbacks[panelId]) {
      dirtyChangeCallbacks[panelId] = (isDirty: boolean) => setActiveTabDirty(panelId, isDirty);
    }
    return dirtyChangeCallbacks[panelId];
  }, [dirtyChangeCallbacks, setActiveTabDirty]);

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
      if (node.tabs) {
        const activeTab = node.tabs.find(tab => tab.isActive) as ExtendedTabType | undefined;
        const activeFile = activeTab?.fileId ? files[activeTab.fileId] || selectedFile : selectedFile;
        
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
                        onDirtyChange={getDirtyChangeCallback(node.id)}
                      />
                    );
                  case 'database':
                    return (
                      <DatabaseEditor 
                        file={activeFile}
                        onSave={saveFileContent}
                        // databases don't participate in dirty indicator yet
                      />
                    );
                  case 'canvas':
                    return (
                      <CanvasEditor 
                        file={activeFile}
                        onSave={saveFileContent}
                        // canvases don't participate in dirty indicator yet
                      />
                    );
                  case 'html':
                    return (
                      <HtmlEditor 
                        file={activeFile}
                        onSave={saveFileContent}
                        // html editor doesn't participate in dirty indicator yet
                      />
                    );
                  case 'code':
                    return (
                      <CodeEditor 
                        file={activeFile}
                        onSave={saveFileContent}
                        // code editor doesn't participate in dirty indicator yet
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
                onOpenRecent={() => setCommandPaletteOpen(true)}
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
    selectedFile,
    files,
    saveFileContent,
    createNewMarkdown,
    handleCloseCurrentTab
  ]);

  return (
    <div className="h-full flex flex-col bg-background">
      {renderPanelNode(panelTree)}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        files={files}
        //onFileSelect={(file) => handleFileSelectWithMode(file, 'preview')}
        onCreateFile={handleCreateFileFromPalette}
        onCloseTab={handleCloseCurrentTab}
        recentFiles={recentFiles}
      />
    </div>
  );
}
