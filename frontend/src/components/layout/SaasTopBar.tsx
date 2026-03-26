import * as React from "react";
import {
  Bell,
  Search,
  Settings,
  HelpCircle,
  Menu,
  Command,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkbenchChrome } from "@/components/layout/WorkbenchChromeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

// Breadcrumb 配置
const BREADCRUMB_LABELS: Record<string, string> = {
  analysis: "AI 分析",
  market: "市场数据",
  picker: "智能选股",
  backtest: "策略回测",
  strategies: "策略管理",
  eod: "尾盘选股",
  momentum: "动量扫描",
  kunpeng: "鲲鹏策略",
};

// Workspace Switcher
function WorkspaceSwitcher() {
  return (
    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
        <span className="text-white text-xs font-bold">Q</span>
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
        量化平台
      </span>
    </button>
  );
}

// Search Bar
function SearchBar({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="hidden md:flex items-center gap-2 flex-1 max-w-md px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-sm"
    >
      <Search size={16} className="text-gray-400" />
      <span className="text-sm text-gray-400 flex-1 text-left">
        搜索功能、数据、策略...
      </span>
      <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[10px] font-medium text-gray-500">
        <Command size={10} />
        K
      </kbd>
    </button>
  );
}

// Quick Actions
function QuickActions() {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="w-9 h-9 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        <HelpCircle size={18} />
      </Button>
      <Button variant="ghost" size="icon" className="w-9 h-9 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 relative">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-white dark:border-gray-950" />
      </Button>
      <Button variant="ghost" size="icon" className="w-9 h-9 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        <Settings size={18} />
      </Button>
    </div>
  );
}

// Breadcrumb
function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <div className="hidden sm:flex items-center gap-2 text-sm">
      {segments.map((segment, index) => {
        const label = BREADCRUMB_LABELS[segment] || segment;
        const isLast = index === segments.length - 1;

        return (
          <React.Fragment key={segment}>
            <span
              className={cn(
                "text-sm font-medium",
                isLast
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              {label}
            </span>
            {!isLast && (
              <span className="text-gray-300 dark:text-gray-600">/</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Mobile Menu Button
function MobileMenuButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="md:hidden w-9 h-9" onClick={onClick}>
      <Menu size={20} />
    </Button>
  );
}

/** 专业顶部栏 */
export function SaasTopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { toggleLeft, toggleRight } = useWorkbenchChrome();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 w-full h-[56px] bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between h-full px-4 gap-3">
        {/* 左侧区域 - 左侧边栏控制按钮在最前面 */}
        <div className="flex items-center gap-3">
          <MobileMenuButton onClick={onMenuClick} />
          <Button variant="ghost" size="icon" className="w-9 h-9 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onClick={toggleLeft}>
            <PanelLeft size={18} />
          </Button>
          <div className="hidden md:block h-5 w-px bg-gray-200 dark:bg-gray-800" />
          <WorkspaceSwitcher />
          <div className="hidden md:block h-5 w-px bg-gray-200 dark:bg-gray-800" />
          <Breadcrumb pathname={location.pathname} />
        </div>

        {/* 中间搜索区域 */}
        <SearchBar onClick={() => {}} />

        {/* 右侧区域 - 右侧边栏控制按钮在最后面 */}
        <div className="flex items-center gap-1">
          <QuickActions />
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-800 mx-1" />

          {/* 右侧边栏控制按钮 */}
          <Button variant="ghost" size="icon" className="w-9 h-9 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onClick={toggleRight}>
            <PanelRight size={18} />
          </Button>

          {/* 用户菜单 */}
          <button
            onClick={() => void handleLogout()}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="点击退出登录"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                {user?.name?.charAt(0) || "Q"}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-950 bg-emerald-500" />
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {user?.name || "量化交易员"}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
