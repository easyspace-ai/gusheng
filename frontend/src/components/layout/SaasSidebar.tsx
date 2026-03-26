import * as React from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Database,
  Filter,
  History,
  Layers,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Zap,
} from "lucide-react";
import { WORKBENCH_PREFIX, type WorkbenchTab } from "@/lib/workbenchRoutes";

export type TabType = WorkbenchTab;

interface SaasSidebarProps {
  /** 退出登录并应跳转至登录页（由外层处理导航） */
  onLogout: () => void;
  /** 是否折叠状态 */
  collapsed?: boolean;
  /** 切换折叠状态 */
  onToggleCollapse?: () => void;
}

// 导航项配置
const NAV_ITEMS = [
  {
    id: "analysis" as const,
    to: WORKBENCH_PREFIX.analysis,
    icon: Sparkles,
    label: "AI 分析",
    description: "智能分析与洞察",
  },
  {
    id: "market" as const,
    to: WORKBENCH_PREFIX.market,
    icon: Database,
    label: "市场数据",
    description: "实时市场行情",
  },
  {
    id: "picker" as const,
    to: WORKBENCH_PREFIX.picker,
    icon: Filter,
    label: "智能选股",
    description: "多维度筛选",
  },
  {
    id: "backtest" as const,
    to: WORKBENCH_PREFIX.backtest,
    icon: History,
    label: "策略回测",
    description: "历史回测验证",
  },
  {
    id: "strategies" as const,
    to: WORKBENCH_PREFIX.strategies,
    icon: Layers,
    label: "策略管理",
    description: "策略库管理",
  },
] as const;

// Logo 组件
function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="relative">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <TrendingUp size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 bg-emerald-500" />
        )}
      </div>
      {!collapsed && (
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
            Quantum
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 -mt-0.5">
            Pro Platform
          </span>
        </div>
      )}
    </div>
  );
}

// 导航项组件
function NavItem({
  to,
  icon: Icon,
  label,
  description,
  collapsed,
}: {
  to: string;
  icon: any;
  label: string;
  description?: string;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/analysis"}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all duration-200",
          isActive
            ? "bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-500/10 dark:to-blue-500/5 text-blue-700 dark:text-blue-300 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* 选中指示器 */}
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-r-full" />
          )}

          {/* 图标 */}
          <div
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
              isActive
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-700"
            )}
          >
            <Icon size={18} strokeWidth={isActive ? 2.2 : 2} />
          </div>

          {/* 文本 */}
          {!collapsed && (
            <div className="flex flex-col">
              <span
                className={cn(
                  "text-sm font-semibold leading-tight",
                  isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"
                )}
              >
                {label}
              </span>
              {description && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {description}
                </span>
              )}
            </div>
          )}

          {/* 折叠状态下的 Tooltip */}
          {collapsed && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 delay-100">
              <div className="px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg shadow-xl whitespace-nowrap">
                {label}
                {description && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 font-normal">
                    {description}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </NavLink>
  );
}

// 分隔线
function Divider() {
  return <div className="mx-4 my-3 h-px bg-gray-200 dark:bg-gray-800" />;
}

// 升级卡片
function UpgradeCard({ collapsed }: { collapsed: boolean }) {
  if (collapsed) return null;

  return (
    <div className="mx-3 mb-3">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-4 text-white">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-2 w-16 h-16 rounded-full bg-white/10" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-yellow-200" />
            <span className="text-xs font-semibold uppercase tracking-wider text-yellow-100">
              Pro Plan
            </span>
          </div>
          <p className="text-sm font-medium mb-3">
            解锁高级分析功能
          </p>
          <button className="w-full py-1.5 px-3 bg-white text-amber-600 text-xs font-semibold rounded-lg hover:bg-yellow-50 transition-colors">
            立即升级
          </button>
        </div>
      </div>
    </div>
  );
}

// 底部用户区域
function UserArea({ collapsed, onLogout }: { collapsed: boolean; onLogout: () => void }) {
  return (
    <div className="mt-auto px-3 pb-3">
      <div
        className={cn(
          "relative group",
          collapsed ? "flex justify-center" : ""
        )}
      >
        {collapsed ? (
          <button
            onClick={onLogout}
            className="flex items-center justify-center w-11 h-11 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200"
            title="退出登录"
          >
            <LogOut size={18} />
          </button>
        ) : (
          <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                Q
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 bg-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                量化交易员
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                pro@quantum.dev
              </p>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
              title="退出登录"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 主组件
export function SaasSidebar({
  onLogout,
  collapsed = false,
  onToggleCollapse,
}: SaasSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo 区域 */}
      <div className="relative">
        <Logo collapsed={collapsed} />

        {/* 折叠按钮 */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              "absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all z-10",
              collapsed && "right-1/2 translate-x-1/2"
            )}
          >
            {collapsed ? (
              <ChevronRight size={14} strokeWidth={2.5} />
            ) : (
              <ChevronLeft size={14} strokeWidth={2.5} />
            )}
          </button>
        )}
      </div>

      <Divider />

      {/* 导航列表 */}
      <nav className="flex-1 py-2 overflow-hidden">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.id}
              to={item.to}
              icon={item.icon}
              label={item.label}
              description={item.description}
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      {/* 底部区域 */}
      <div className="mt-auto">
        <Divider />
        <UpgradeCard collapsed={collapsed} />
        <UserArea collapsed={collapsed} onLogout={onLogout} />
      </div>
    </aside>
  );
}
