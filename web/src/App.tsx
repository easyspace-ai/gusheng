import * as React from "react";
import { ActivityBar, TabType } from "./components/layout/ActivityBar";
import { TopNav } from "./components/layout/TopNav";
import { ResizablePanel } from "./components/layout/ResizablePanel";
import { SidebarLeft } from "./components/layout/SidebarLeft";
import { SidebarRight } from "./components/layout/SidebarRight";
import { DashboardMetrics, TradeDistribution } from "./components/dashboard/DashboardMetrics";
import { MainChart } from "./components/dashboard/MainChart";
import { ScrollArea } from "./components/ui/scroll-area";
import { StrategySidebarLeft } from "./components/strategy/StrategySidebarLeft";
import { StrategySidebarRight } from "./components/strategy/StrategySidebarRight";
import { StrategyEditor } from "./components/strategy/StrategyEditor";
import { ScreenerSidebarLeft } from "./components/screener/ScreenerSidebarLeft";
import { ScreenerSidebarRight } from "./components/screener/ScreenerSidebarRight";
import { StockScreener } from "./components/screener/StockScreener";
import { BacktestSidebarLeft } from "./components/backtest/BacktestSidebarLeft";
import { BacktestSidebarRight } from "./components/backtest/BacktestSidebarRight";
import { BacktestPage } from "./components/backtest/BacktestPage";
import { TickerRibbon } from "./components/layout/TickerRibbon";
import { LoginPage } from "./components/auth/LoginPage";
import { RegisterPage } from "./components/auth/RegisterPage";
import { MarketSidebarLeft } from "./components/market/MarketSidebarLeft";
import { MarketSidebarRight } from "./components/market/MarketSidebarRight";
import { MarketPage } from "./components/market/MarketPage";

export default function App() {
  const [leftCollapsed, setLeftCollapsed] = React.useState(false);
  const [rightCollapsed, setRightCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabType>("ai");
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"login" | "register">("login");
  const [showAuth, setShowAuth] = React.useState(false);

  // If showing auth view
  if (showAuth && !isLoggedIn) {
    if (authMode === "login") {
      return (
        <LoginPage 
          onRegisterClick={() => setAuthMode("register")} 
          onLoginSuccess={() => {
            setIsLoggedIn(true);
            setShowAuth(false);
          }} 
        />
      );
    }
    return (
      <RegisterPage 
        onLoginClick={() => setAuthMode("login")} 
        onRegisterSuccess={() => setAuthMode("login")} 
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans selection:bg-slate-200 dark:selection:bg-slate-800">
      {/* Activity Bar - Fixed */}
      <ActivityBar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onAuthClick={() => {
          if (isLoggedIn) {
            setIsLoggedIn(false); // Simple logout for demo
          } else {
            setShowAuth(true);
            setAuthMode("login");
          }
        }}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col ml-20 overflow-hidden">
        {/* Top Navigation */}
        <TopNav 
          activeTab={activeTab}
          toggleLeft={() => setLeftCollapsed(!leftCollapsed)} 
          toggleRight={() => setRightCollapsed(!rightCollapsed)} 
        />

        {/* Three Column Layout */}
        <main className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Secondary Navigation */}
          <ResizablePanel 
            side="left" 
            defaultWidth={activeTab === "strategy" || activeTab === "filter" || activeTab === "backtest" || activeTab === "data" ? 240 : 280} 
            isCollapsed={leftCollapsed}
          >
            {activeTab === "strategy" ? (
              <StrategySidebarLeft />
            ) : activeTab === "filter" ? (
              <ScreenerSidebarLeft />
            ) : activeTab === "backtest" ? (
              <BacktestSidebarLeft />
            ) : activeTab === "data" ? (
              <MarketSidebarLeft />
            ) : (
              <SidebarLeft />
            )}
          </ResizablePanel>

          {/* Center Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
            {activeTab === "strategy" ? (
              <StrategyEditor />
            ) : activeTab === "filter" ? (
              <StockScreener />
            ) : activeTab === "backtest" ? (
              <BacktestPage />
            ) : activeTab === "data" ? (
              <MarketPage />
            ) : (
              <ScrollArea className="flex-1">
                <div className="max-w-6xl mx-auto p-8 space-y-8">
                  <DashboardMetrics />
                  <MainChart />
                  <TradeDistribution />
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Right Sidebar - AI & Logs */}
          <ResizablePanel 
            side="right" 
            defaultWidth={320} 
            isCollapsed={rightCollapsed}
          >
            {activeTab === "strategy" ? (
              <StrategySidebarRight />
            ) : activeTab === "filter" ? (
              <ScreenerSidebarRight />
            ) : activeTab === "backtest" ? (
              <BacktestSidebarRight />
            ) : activeTab === "data" ? (
              <MarketSidebarRight />
            ) : (
              <SidebarRight />
            )}
          </ResizablePanel>
        </main>

        {/* Bottom Ticker Ribbon */}
        <TickerRibbon />
      </div>
    </div>
  );
}
