import * as React from "react";
import { 
  PanelLeft, 
  PanelRight, 
  Play, 
  MoreVertical,
  ChevronDown,
  Settings,
  UserCircle,
  Rocket,
  ChevronRight,
  Network,
  Filter,
  History
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Separator } from "@/src/components/ui/separator";
import { Badge } from "@/src/components/ui/badge";
import { TabType } from "./ActivityBar";
import { cn } from "@/src/lib/utils";

interface TopNavProps {
  activeTab: TabType;
  toggleLeft: () => void;
  toggleRight: () => void;
}

export function TopNav({ activeTab, toggleLeft, toggleRight }: TopNavProps) {
  const isStrategy = activeTab === "strategy";
  const isFilter = activeTab === "filter";
  const isBacktest = activeTab === "backtest";

  return (
    <header className="flex items-center justify-between px-6 sticky top-0 z-40 w-full bg-white dark:bg-slate-950 h-14 border-b border-slate-200/50 dark:border-slate-800/50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleLeft} className="h-8 w-8">
            <PanelLeft size={18} className="text-slate-500" />
          </Button>
          <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white uppercase">
            Quant Pro Prism
          </h1>
        </div>
        
        {isStrategy ? (
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-500">
            <Separator orientation="vertical" className="h-4 mx-2" />
            <Network size={14} />
            <span>Strategy Manager</span>
            <ChevronRight size={14} />
            <span className="text-slate-900 dark:text-white font-bold">Project Alpha</span>
          </div>
        ) : isFilter ? (
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-500">
            <Separator orientation="vertical" className="h-4 mx-2" />
            <Filter size={14} />
            <span>Screener</span>
            <ChevronRight size={14} />
            <span className="text-slate-900 dark:text-white font-bold">Late Session Selection</span>
          </div>
        ) : isBacktest ? (
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-500">
            <Separator orientation="vertical" className="h-4 mx-2" />
            <History size={14} />
            <span>Backtest Engine</span>
            <ChevronRight size={14} />
            <span className="text-slate-900 dark:text-white font-bold">双均线对冲策略</span>
          </div>
        ) : (
          <nav className="hidden md:flex gap-6 items-center text-sm font-semibold">
            <a href="#" className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Workspace</a>
            <a href="#" className="text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white pb-1">Analysis</a>
            <a href="#" className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">History</a>
          </nav>
        )}
      </div>

      {isStrategy && (
        <nav className="hidden xl:flex items-center gap-8 h-full">
          <StrategyNavLink active>Editor</StrategyNavLink>
          <StrategyNavLink>Backtest</StrategyNavLink>
          <StrategyNavLink>Optimize</StrategyNavLink>
          <StrategyNavLink>Deploy</StrategyNavLink>
        </nav>
      )}

      {isFilter && (
        <nav className="hidden xl:flex items-center gap-8 h-full">
          <StrategyNavLink>Market Overview</StrategyNavLink>
          <StrategyNavLink active>Scanner</StrategyNavLink>
          <StrategyNavLink>Journal</StrategyNavLink>
        </nav>
      )}

      {isBacktest && (
        <nav className="hidden xl:flex items-center gap-8 h-full">
          <StrategyNavLink active>Results</StrategyNavLink>
          <StrategyNavLink>Attribution</StrategyNavLink>
          <StrategyNavLink>Parameters</StrategyNavLink>
        </nav>
      )}

      <div className="flex items-center gap-4">
        {!isStrategy && (
          <Badge variant="secondary" className="font-medium px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[10px] uppercase tracking-wider">
            Project: Alpha-Vortex-Backtest
          </Badge>
        )}
        
        <Button size="sm" className="bg-black dark:bg-white text-white dark:text-black hover:opacity-90 font-bold gap-2 rounded-lg px-4">
          <Rocket size={14} fill="currentColor" />
          Deploy
        </Button>

        <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 ml-2 pl-4">
          <Button variant="ghost" size="icon" onClick={toggleRight} className="h-8 w-8">
            <PanelRight size={18} className="text-slate-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings size={18} className="text-slate-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <UserCircle size={18} className="text-slate-500" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function StrategyNavLink({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <a 
      href="#" 
      className={cn(
        "h-full flex items-center px-1 text-sm font-bold transition-all border-b-2",
        active 
          ? "text-slate-900 dark:text-white border-slate-900 dark:border-white" 
          : "text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-200"
      )}
    >
      {children}
    </a>
  );
}
