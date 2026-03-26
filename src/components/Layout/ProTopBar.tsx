import React, { useEffect, useState } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sun,
  Moon,
  Search,
  Plus,
  Settings,
  Sparkles,
  Target,
  ChevronDown,
  Zap,
  TrendingUp,
  Activity,
  Newspaper,
  Code2
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getCurrentUser, type CurrentUser } from '@/lib/authApi';
import { SettingsDialog } from '@/components/Settings/SettingsDialog';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// 专业导航项
const PRO_NAV_ITEMS = [
  { id: 'analysis', label: 'AI 分析', icon: Sparkles, path: '/analysis' },
  { id: 'picker', label: '选股', icon: Target, path: '/picker' },
  { id: 'market', label: '市场', icon: Newspaper, path: '/market' },
  { id: 'backtest', label: '回测', icon: Activity, path: '/backtest' },
  { id: 'strategies', label: '策略', icon: Code2, path: '/strategies' }
] as const;

// 工作区切换器
function WorkspaceSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pro-bg-tertiary/60 hover:bg-pro-bg-tertiary border border-pro-border-subtle hover:border-pro-border-default transition-all duration-200">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Zap size={12} className="text-black" />
          </div>
          <span className="text-sm font-medium text-pro-fg-primary">ReNote Pro</span>
          <ChevronDown size={14} className="text-pro-fg-subtle" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-pro-bg-glass-strong border-pro-border-default backdrop-blur-xl mt-1.5">
        <DropdownMenuLabel className="text-pro-fg-muted text-xs font-medium uppercase tracking-wider">工作区</DropdownMenuLabel>
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer bg-pro-accent-amber-bg/50 text-pro-accent-amber-light">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Zap size={12} className="text-black" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium">ReNote Pro</span>
            <span className="text-xs text-pro-fg-muted">当前工作区</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 主 TopBar 组件
export function ProTopBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    leftSidebarVisible,
    rightSidebarVisible,
    isDarkMode,
    theme,
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleTheme,
    toggleCommandPalette,
    addNote,
    openNoteInTab,
    setTheme
  } = useAppStore();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((response) => {
        if (!cancelled) setCurrentUser(response.user);
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null);
      });
    return () => { cancelled = true; };
  }, []);

  const createNewNote = () => {
    const id = `note-${Date.now()}`;
    const note = {
      id,
      title: '未命名',
      content: '# 未命名\n\n开始编辑这个笔记...',
      links: [],
      backlinks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      fileType: 'markdown' as const
    };
    addNote(note);
    openNoteInTab(id);
  };

  return (
    <>
      <motion.div
        initial={{ y: -44, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between h-[44px] px-3 border-b border-pro-border-default z-50"
        style={{
          background: 'rgba(7, 11, 31, 0.85)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(148, 163, 184, 0.14)'
        }}
      >
        {/* 左侧区域 */}
        <div className="flex items-center gap-2">
          {/* 工作区切换器 */}
          <WorkspaceSwitcher />

          {/* 分隔线 */}
          <div className="w-px h-5 bg-pro-border-subtle mx-1" />

          {/* 专业导航项 */}
          <div className="flex items-center gap-1">
            {PRO_NAV_ITEMS.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;

              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-pro-fg-primary bg-pro-bg-elevated'
                      : 'text-pro-fg-muted hover:text-pro-fg-secondary hover:bg-pro-bg-tertiary/60'
                  )}
                >
                  <Icon size={16} className={isActive ? 'text-amber-400' : ''} />
                  <span className="hidden sm:inline">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* 中间搜索区域 */}
        <div className="flex-1 max-w-xl mx-4">
          <button
            onClick={toggleCommandPalette}
            className="w-full flex items-center gap-3 px-4 py-1.5 rounded-xl bg-pro-input-bg border border-pro-input-border hover:border-pro-input-focus-border transition-all duration-200"
          >
            <Search size={16} className="text-pro-fg-muted" />
            <span className="text-sm text-pro-fg-muted flex-1 text-left">
              搜索笔记、运行命令...
            </span>
            <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-pro-bg-tertiary border border-pro-border-subtle text-[10px] font-medium text-pro-fg-muted">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* 右侧区域 */}
        <div className="flex items-center gap-1.5">
          {/* 侧边栏控制 */}
          <button
            onClick={toggleLeftSidebar}
            className="p-1.5 rounded-lg hover:bg-pro-bg-tertiary text-pro-fg-muted hover:text-pro-fg-secondary transition-all duration-200"
            title={leftSidebarVisible ? '隐藏左侧边栏' : '显示左侧边栏'}
          >
            {leftSidebarVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>

          <button
            onClick={toggleRightSidebar}
            className="p-1.5 rounded-lg hover:bg-pro-bg-tertiary text-pro-fg-muted hover:text-pro-fg-secondary transition-all duration-200"
            title={rightSidebarVisible ? '隐藏右侧边栏' : '显示右侧边栏'}
          >
            {rightSidebarVisible ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>

          {/* 分隔线 */}
          <div className="w-px h-5 bg-pro-border-subtle mx-1" />

          {/* 新建笔记 */}
          <button
            onClick={createNewNote}
            className="p-1.5 rounded-lg hover:bg-pro-bg-tertiary text-pro-fg-muted hover:text-pro-fg-secondary transition-all duration-200"
            title="新建笔记"
          >
            <Plus size={16} />
          </button>

          {/* 主题切换 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-pro-bg-tertiary text-pro-fg-muted hover:text-pro-fg-secondary transition-all duration-200">
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-pro-bg-glass-strong border-pro-border-default backdrop-blur-xl mt-1.5">
              <DropdownMenuLabel className="text-pro-fg-muted text-xs font-medium uppercase tracking-wider">外观</DropdownMenuLabel>
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer gap-2">
                {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                <span>切换 {isDarkMode ? '浅色' : '深色'} 模式</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-pro-border-subtle" />
              <DropdownMenuLabel className="text-pro-fg-muted text-xs font-medium uppercase tracking-wider">主题</DropdownMenuLabel>
              {(['obsidian', 'nord', 'solarized'] as const).map((t) => (
                <DropdownMenuItem
                  key={t}
                  onClick={() => setTheme?.(t)}
                  className="cursor-pointer"
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  <span className="ml-auto text-xs text-pro-fg-muted">{theme === t ? '当前' : ''}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 设置 */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-pro-bg-tertiary text-pro-fg-muted hover:text-pro-fg-secondary transition-all duration-200"
            title="设置"
          >
            <Settings size={16} />
          </button>

          {/* 用户头像 */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-pro-border-subtle">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-blue-500 flex items-center justify-center text-xs font-bold text-black">
                      {currentUser?.name?.charAt(0) || 'D'}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-pro-bg-elevated bg-emerald-500" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-pro-bg-glass-strong border-pro-border-default backdrop-blur-xl mt-1.5">
                <div className="flex items-center gap-3 p-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-blue-500 flex items-center justify-center text-sm font-bold text-black">
                    {currentUser?.name?.charAt(0) || 'D'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-pro-fg-primary">{currentUser?.name || 'Dev User'}</span>
                    <span className="text-xs text-pro-fg-muted">{currentUser?.email || 'dev@local'}</span>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} currentUser={currentUser} />
    </>
  );
}
