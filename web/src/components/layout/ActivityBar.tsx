import * as React from "react";
import { cn } from "@/src/lib/utils";
import { 
  Sparkles, 
  Database, 
  Filter, 
  History, 
  Layers, 
  UserCircle 
} from "lucide-react";

export type TabType = "ai" | "data" | "filter" | "backtest" | "strategy";

interface ActivityBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onAuthClick: () => void;
}

export function ActivityBar({ activeTab, onTabChange, onAuthClick }: ActivityBarProps) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 z-50 w-20 flex flex-col items-center border-r border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900 py-6">
      <div className="mb-10">
        <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">QP</span>
      </div>
      
      <div className="flex flex-col gap-2 items-center w-full">
        <ActivityButton 
          icon={<Sparkles size={20} />} 
          label="分析" 
          active={activeTab === "ai"} 
          onClick={() => onTabChange("ai")}
        />
        <ActivityButton 
          icon={<Database size={20} />} 
          label="数据" 
          active={activeTab === "data"}
          onClick={() => onTabChange("data")}
        />
        <ActivityButton 
          icon={<Filter size={20} />} 
          label="选股" 
          active={activeTab === "filter"}
          onClick={() => onTabChange("filter")}
        />
        <ActivityButton 
          icon={<History size={20} />} 
          label="回测" 
          active={activeTab === "backtest"}
          onClick={() => onTabChange("backtest")}
        />
        <ActivityButton 
          icon={<Layers size={20} />} 
          label="策略" 
          active={activeTab === "strategy"}
          onClick={() => onTabChange("strategy")}
        />
      </div>

      <div className="mt-auto flex flex-col gap-2 items-center w-full">
        <ActivityButton 
          icon={<UserCircle size={20} />} 
          label="账户" 
          onClick={onAuthClick}
        />
      </div>
    </aside>
  );
}

function ActivityButton({ 
  icon, 
  active, 
  label, 
  onClick 
}: { 
  icon: React.ReactNode; 
  active?: boolean; 
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex flex-col items-center justify-center py-4 transition-all duration-200 group relative",
        active 
          ? "text-slate-900 dark:text-white border-l-2 border-slate-900 dark:border-white bg-white dark:bg-slate-800/50" 
          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/30"
      )}
    >
      <div className={cn("mb-1 transition-transform group-active:scale-90", active ? "scale-110" : "scale-100")}>
        {icon}
      </div>
      <span className="text-[10px] font-bold tracking-wider">{label}</span>
    </button>
  );
}
