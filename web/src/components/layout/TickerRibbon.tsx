import * as React from "react";

export function TickerRibbon() {
  const tickers = [
    { symbol: "BTC/USDT", price: "64,210.50", change: "+2.1%", up: true },
    { symbol: "ETH/USDT", price: "3,452.12", change: "-1.4%", up: false },
    { symbol: "XAU/USD", price: "2,154.20", change: "+0.4%", up: true },
    { symbol: "HS300", price: "3,542.80", change: "+1.2%", up: true },
  ];

  return (
    <div className="h-8 bg-white dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center overflow-hidden whitespace-nowrap px-4 z-50">
      <div className="flex items-center gap-8 animate-marquee">
        {tickers.map((ticker, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{ticker.symbol}</span>
            <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200">{ticker.price}</span>
            <span className={`text-[10px] font-black ${ticker.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {ticker.change}
            </span>
          </div>
        ))}
        {/* Duplicate for seamless loop if needed, but for now just one set */}
        {tickers.map((ticker, i) => (
          <div key={`dup-${i}`} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{ticker.symbol}</span>
            <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200">{ticker.price}</span>
            <span className={`text-[10px] font-black ${ticker.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {ticker.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
