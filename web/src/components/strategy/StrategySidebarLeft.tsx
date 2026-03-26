import * as React from "react";
import { Plus, BarChart3, History } from "lucide-react";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { cn } from "@/src/lib/utils";

export function StrategySidebarLeft() {
  const [activeStrategy, setActiveStrategy] = React.useState("Trend Following V2");

  const strategies = [
    { name: "Trend Following V2", icon: <BarChart3 size={18} /> },
    { name: "Mean Reversion Alpha", icon: <BarChart3 size={18} /> },
    { name: "Volatility Arb", icon: <BarChart3 size={18} /> },
    { name: "Legacy Scalper", icon: <History size={18} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-xl">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">Strategies</h2>
        <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors">
          <Plus size={16} className="text-slate-500" />
        </button>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1">
          {strategies.map((strategy) => (
            <button
              key={strategy.name}
              onClick={() => setActiveStrategy(strategy.name)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all text-left",
                activeStrategy === strategy.name
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-medium"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/40"
              )}
            >
              <span className={cn(
                "shrink-0",
                activeStrategy === strategy.name ? "text-slate-900 dark:text-white" : "text-slate-400"
              )}>
                {strategy.icon}
              </span>
              <span className="truncate">{strategy.name}</span>
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 mt-auto border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Strategy Info</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">ACTIVE</span>
        </div>
        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Version</span>
            <span className="font-medium text-slate-900 dark:text-slate-200">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Last Modified</span>
            <span className="font-medium text-slate-900 dark:text-slate-200">2h ago</span>
          </div>
          <div className="pt-2 flex flex-wrap gap-1">
            <Tag text="Python" />
            <Tag text="HFT" />
            <Tag text="BTC/USD" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-bold uppercase tracking-wider">
      {text}
    </span>
  );
}
