import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Files,
  Search,
  Hash,
  Puzzle,
  FileText,
  Eye,
  Share2,
  Sparkles,
  Code2,
  BarChart3,
  Newspaper,
  Target
} from 'lucide-react';
import { useAppStore } from '../../stores';
import { PluginAPI } from '../../lib/plugins/api';
import type { PluginMenu } from '../../lib/plugins/types';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// 主功能导航项配置
const PRIMARY_NAV_ITEMS = [
  { id: 'analysis', label: 'AI 分析', icon: Sparkles, path: '/analysis' },
  { id: 'market', label: '市场资讯', icon: Newspaper, path: '/market' },
  { id: 'backtest', label: '回测', icon: BarChart3, path: '/backtest' },
  { id: 'picker', label: '选股', icon: Target, path: '/picker' },
  { id: 'strategies', label: '策略管理', icon: Code2, path: '/strategies' }
] as const;

// 左侧边栏面板
const LEFT_PANELS = [
  { id: 'files' as const, label: '文件', icon: Files },
  { id: 'search' as const, label: '搜索', icon: Search },
  { id: 'tags' as const, label: '标签', icon: Hash },
  { id: 'plugins' as const, label: '插件', icon: Puzzle }
] as const;

// 右侧边栏面板
const RIGHT_PANELS = [
  { id: 'backlinks' as const, label: '反向链接', icon: FileText },
  { id: 'outline' as const, label: '大纲', icon: Eye },
  { id: 'graph' as const, label: '关系图', icon: Share2 }
] as const;

// 活动条按钮组件
function ActivityButton({
  icon: Icon,
  isActive,
  onClick,
  label
}: {
  icon: any;
  isActive: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'relative group flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200',
        isActive
          ? 'text-pro-fg-primary bg-pro-bg-elevated'
          : 'text-pro-fg-muted hover:text-pro-fg-secondary hover:bg-pro-bg-tertiary/60'
      )}
      title={label}
    >
      <Icon size={20} className="relative z-10 transition-colors duration-200" />

      {/* 激活指示器 - 左侧边框 */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-gradient-to-b from-amber-500 to-amber-400" />
      )}
    </motion.button>
  );
}

// 分隔线组件
function Divider() {
  return (
    <div className="w-6 h-px mx-auto my-2 rounded-full bg-gradient-to-r from-transparent via-pro-border-default to-transparent" />
  );
}

// 主 ActivityBar 组件
export function ProActivityBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    leftActivePanel,
    rightActivePanel,
    leftSidebarVisible,
    rightSidebarVisible,
    setLeftPanel,
    setRightPanel,
    toggleLeftSidebar,
    toggleRightSidebar
  } = useAppStore();

  const [toolMenus, setToolMenus] = useState<PluginMenu[]>([]);

  // 检查当前路由
  const getActiveRouteId = () => {
    for (const item of PRIMARY_NAV_ITEMS) {
      if (location.pathname.startsWith(item.path)) {
        return item.id;
      }
    }
    return null;
  };

  const activeRouteId = getActiveRouteId();

  const exitSpecialRoute = () => {
    const isSpecialRoute = PRIMARY_NAV_ITEMS.some(item =>
      location.pathname.startsWith(item.path)
    );
    if (isSpecialRoute) {
      navigate('/');
    }
  };

  const handleSetLeftPanel = (panel: typeof LEFT_PANELS[number]['id']) => {
    exitSpecialRoute();
    setLeftPanel(panel);
    if (!leftSidebarVisible) {
      toggleLeftSidebar();
    }
  };

  const handleSetRightPanel = (panel: typeof RIGHT_PANELS[number]['id']) => {
    exitSpecialRoute();
    setRightPanel(panel);
    if (!rightSidebarVisible) {
      toggleRightSidebar();
    }
  };

  // 加载插件菜单
  useEffect(() => {
    const loadMenus = async () => {
      try {
        const menus = await PluginAPI.getRuntimeMenus();
        const tools = (menus || []).filter(m => m.parent === 'tools');
        setToolMenus(tools);
      } catch (e) {
        console.error('Failed to load runtime menus:', e);
      }
    };
    loadMenus();
  }, []);

  return (
    <motion.div
      initial={{ x: -52, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col w-[52px] border-r border-pro-border-default"
      style={{ background: 'rgba(7, 11, 31, 0.75)' }}
    >
      {/* 顶部间距 */}
      <div className="h-1" />

      {/* 主要功能导航 */}
      <div className="flex flex-col items-center gap-0.5 px-1">
        {PRIMARY_NAV_ITEMS.map((item) => (
          <ActivityButton
            key={item.id}
            icon={item.icon}
            isActive={activeRouteId === item.id}
            onClick={() => navigate(item.path)}
            label={item.label}
          />
        ))}
      </div>

      {/* 分隔线 */}
      <Divider />

      {/* 左侧面板导航 */}
      <div className="flex flex-col items-center gap-0.5 px-1">
        {LEFT_PANELS.map((panel) => (
          <ActivityButton
            key={panel.id}
            icon={panel.icon}
            isActive={leftActivePanel === panel.id && leftSidebarVisible && !activeRouteId}
            onClick={() => handleSetLeftPanel(panel.id)}
            label={panel.label}
          />
        ))}
      </div>

      {/* 弹性空间 */}
      <div className="flex-1" />

      {/* 分隔线 */}
      <Divider />

      {/* 右侧面板导航 */}
      <div className="flex flex-col items-center gap-0.5 px-1 pb-2">
        {RIGHT_PANELS.map((panel) => (
          <ActivityButton
            key={panel.id}
            icon={panel.icon}
            isActive={rightActivePanel === panel.id && rightSidebarVisible && !activeRouteId}
            onClick={() => handleSetRightPanel(panel.id)}
            label={panel.label}
          />
        ))}
      </div>

      {/* 底部间距 */}
      <div className="h-1" />
    </motion.div>
  );
}
