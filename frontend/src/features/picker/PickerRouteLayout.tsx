import type { ComponentType } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { TrendingUp, Flame, Fish, Filter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { WorkbenchLayout } from "@/components/layout/WorkbenchLayout";
import { useWorkbenchChrome } from "@/components/layout/WorkbenchChromeContext";
import { ToastProvider } from "@/components/picker/common/Toast";
import { ScreenerSidebarRight } from "@/components/screener/ScreenerSidebarRight";

type StrategyItem = {
  to: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const STRATEGIES: StrategyItem[] = [
  {
    to: "/picker/eod",
    label: "尾盘选股",
    description: "一日持股法，盘尾筛出强势候选",
    icon: TrendingUp,
  },
  {
    to: "/picker/momentum",
    label: "妖股扫描",
    description: "动量、趋势、活跃度三因子",
    icon: Flame,
  },
  {
    to: "/picker/kunpeng",
    label: "鲲鹏战法",
    description: "安全垫与潜在倍数初筛",
    icon: Fish,
  },
];

function PickerStrategiesSidebar() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 dark:bg-slate-950 border-r border-slate-200/50 dark:border-slate-800/50">
      <div className="p-5 pb-2 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">选股</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">已保存策略</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-3">
        <nav className="space-y-1 pb-5">
          {STRATEGIES.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "w-full flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all",
                  isActive
                    ? "border-blue-500/50 bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-800"
                    : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/60",
                )
              }
            >
              {({ isActive }) => {
                const Icon = item.icon;
                return (
                  <>
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        isActive ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-slate-200/60 dark:bg-slate-800 text-slate-500",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-900 dark:text-white">{item.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">{item.description}</span>
                    </span>
                  </>
                );
              }}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}

export function PickerRouteLayout() {
  const { leftCollapsed, rightCollapsed } = useWorkbenchChrome();

  return (
    <ToastProvider>
      <WorkbenchLayout
        className="min-h-0 flex-1 bg-slate-100/80 dark:bg-slate-950/80"
        innerClassName="min-h-0"
        mainClassName="min-h-0 overflow-hidden flex flex-col"
        leftPanelId="picker-left"
        mainPanelId="picker-main"
        rightPanelId="picker-right"
        leftMinPx={220}
        leftMaxPx={320}
        rightMinPx={260}
        rightMaxPx={400}
        leftSidebarVisible={!leftCollapsed}
        rightSidebarVisible={!rightCollapsed}
        left={<PickerStrategiesSidebar />}
        main={
          <div className="picker-unified min-h-0 min-w-0 flex flex-1 flex-col overflow-hidden bg-background text-foreground">
            <div className="mx-auto min-h-0 w-full max-w-[1800px] flex-1 overflow-auto px-4 py-4 md:px-6 md:py-6">
              <Outlet />
            </div>
          </div>
        }
        right={
          <div className="h-full min-h-0">
            <ScreenerSidebarRight />
          </div>
        }
      />
    </ToastProvider>
  );
}
