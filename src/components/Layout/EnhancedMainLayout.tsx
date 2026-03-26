import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Resizable, ResizableHandle, ResizablePanel } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores';
import { EnhancedFileTree } from '@/components/FileExplorer/EnhancedFileTree';
import { EnhancedTabSystem } from '@/components/Editor/EnhancedTabSystem';
import { FileExplorer } from '@/components/FileExplorer/FileExplorer';
import { 
  PanelLeft, 
  PanelRight,
  Search,
  FileText,
  Hash,
  GitBranch,
  Settings,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// 侧边栏面板类型
type SidebarPanel = 'files' | 'search' | 'outline' | 'tags' | 'graph' | 'settings';

interface SidebarTabProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const SidebarTab: React.FC<SidebarTabProps> = ({ icon, label, isActive, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05, y: -1 }}
    whileTap={{ scale: 0.95 }}
    className={cn(
      "flex flex-col items-center gap-1 p-3 rounded-lg transition-all duration-200",
      "text-xs font-medium min-w-[60px]",
      isActive 
        ? "bg-blue-100 text-blue-700 shadow-sm" 
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
    )}
    onClick={onClick}
    title={label}
  >
    <div className="w-5 h-5 flex items-center justify-center">
      {icon}
    </div>
    <span className="truncate max-w-full">{label}</span>
  </motion.button>
);

export function EnhancedMainLayout() {
  const navigate = useNavigate();
  const {
    leftSidebarVisible,
    rightSidebarVisible,
    leftSidebarWidth,
    rightSidebarWidth,
    setLeftSidebarWidth,
    setRightSidebarWidth,
    toggleLeftSidebar,
    toggleRightSidebar
  } = useAppStore();

  const [leftActivePanel, setLeftActivePanel] = useState<SidebarPanel>('files');
  const [rightActivePanel, setRightActivePanel] = useState<SidebarPanel>('outline');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  // 侧边栏配置
  const leftPanels: { id: SidebarPanel; icon: React.ReactNode; label: string }[] = [
    { id: 'files', icon: <FileText size={16} />, label: '文件' },
    { id: 'search', icon: <Search size={16} />, label: '搜索' },
    { id: 'tags', icon: <Hash size={16} />, label: '标签' },
  ];

  const rightPanels: { id: SidebarPanel; icon: React.ReactNode; label: string }[] = [
    { id: 'outline', icon: <FileText size={16} />, label: '大纲' },
    { id: 'graph', icon: <GitBranch size={16} />, label: '图谱' },
    { id: 'settings', icon: <Settings size={16} />, label: '设置' },
  ];

  // 渲染左侧面板内容
  const renderLeftPanelContent = useCallback(() => {
    switch (leftActivePanel) {
      case 'files':
        return (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">文件资源管理器</h3>
            </div>
            <div className="flex-1">
              <EnhancedFileTree />
            </div>
          </div>
        );
      case 'search':
        return (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">搜索</h3>
            </div>
            <div className="flex-1 p-4">
              <p className="text-sm text-gray-500">搜索功能开发中...</p>
            </div>
          </div>
        );
      case 'tags':
        return (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">标签</h3>
            </div>
            <div className="flex-1 p-4">
              <p className="text-sm text-gray-500">标签功能开发中...</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  }, [leftActivePanel]);

  // 渲染右侧面板内容
  const renderRightPanelContent = useCallback(() => {
    switch (rightActivePanel) {
      case 'outline':
        return (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">文档大纲</h3>
            </div>
            <div className="flex-1 p-4">
              <p className="text-sm text-gray-500">大纲功能开发中...</p>
            </div>
          </div>
        );
      case 'graph':
        return (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">关系图谱</h3>
            </div>
            <div className="flex-1 p-4">
              <p className="text-sm text-gray-500">图谱功能开发中...</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">设置</h3>
            </div>
            <div className="flex-1 p-4">
              <p className="text-sm text-gray-500">设置功能开发中...</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  }, [rightActivePanel]);

  return (
    <div className="h-full flex bg-gray-50">
      {/* 左侧边栏 */}
      <AnimatePresence>
        {leftSidebarVisible && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isLeftCollapsed ? 80 : leftSidebarWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex bg-white border-r border-gray-200 shadow-sm"
          >
            {/* 左侧标签栏 */}
            <div className="w-20 flex flex-col border-r border-gray-200 bg-gray-50">
              <div className="flex flex-col gap-1 p-2">
                {leftPanels.map((panel) => (
                  <SidebarTab
                    key={panel.id}
                    icon={panel.icon}
                    label={panel.label}
                    isActive={leftActivePanel === panel.id}
                    onClick={() => {
                      setLeftActivePanel(panel.id);
                      if (isLeftCollapsed) {
                        setIsLeftCollapsed(false);
                      }
                    }}
                  />
                ))}
              </div>
              
              <div className="mt-auto p-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
                  title={isLeftCollapsed ? "展开" : "折叠"}
                >
                  <PanelLeft size={16} className={cn(
                    "transition-transform",
                    isLeftCollapsed && "rotate-180"
                  )} />
                </motion.button>
              </div>
            </div>

            {/* 左侧面板内容 */}
            <AnimatePresence mode="wait">
              {!isLeftCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-w-0"
                  style={{ width: leftSidebarWidth - 80 }}
                >
                  {renderLeftPanelContent()}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主编辑区域 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="h-12 flex items-center justify-between px-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors text-sm font-medium flex items-center gap-1.5"
              onClick={() => navigate('/analysis')}
              title="进入 AI 分析"
            >
              <Sparkles size={15} />
              AI 分析
            </button>

            {!leftSidebarVisible && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={toggleLeftSidebar}
                title="显示左侧边栏"
              >
                <PanelLeft size={16} />
              </motion.button>
            )}
            <h1 className="text-lg font-semibold text-gray-800">ReNote</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {!rightSidebarVisible && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={toggleRightSidebar}
                title="显示右侧边栏"
              >
                <PanelRight size={16} />
              </motion.button>
            )}
          </div>
        </div>

        {/* 标签页和编辑器 */}
        <div className="flex-1 min-h-0 p-4">
          <EnhancedTabSystem />
        </div>
      </div>

      {/* 右侧边栏 */}
      <AnimatePresence>
        {rightSidebarVisible && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isRightCollapsed ? 80 : rightSidebarWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex bg-white border-l border-gray-200 shadow-sm"
          >
            {/* 右侧面板内容 */}
            <AnimatePresence mode="wait">
              {!isRightCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-w-0"
                  style={{ width: rightSidebarWidth - 80 }}
                >
                  {renderRightPanelContent()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 右侧标签栏 */}
            <div className="w-20 flex flex-col border-l border-gray-200 bg-gray-50">
              <div className="flex flex-col gap-1 p-2">
                {rightPanels.map((panel) => (
                  <SidebarTab
                    key={panel.id}
                    icon={panel.icon}
                    label={panel.label}
                    isActive={rightActivePanel === panel.id}
                    onClick={() => {
                      setRightActivePanel(panel.id);
                      if (isRightCollapsed) {
                        setIsRightCollapsed(false);
                      }
                    }}
                  />
                ))}
              </div>
              
              <div className="mt-auto p-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => setIsRightCollapsed(!isRightCollapsed)}
                  title={isRightCollapsed ? "展开" : "折叠"}
                >
                  <PanelRight size={16} className={cn(
                    "transition-transform",
                    isRightCollapsed && "rotate-180"
                  )} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
