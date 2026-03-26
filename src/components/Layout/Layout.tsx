import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores';
import { TopBar } from './TopBar';
import { ActivityBar } from './ActivityBar';
import { LeftSidebar } from './LeftSidebar';
import { EnhancedMainEditor } from './EnhancedMainEditor';
//import { EnhancedMainEditor } from './MainEditor.tsx';
import { RightSidebar } from './RightSidebar';
import { Resizable, ResizableHandle, ResizablePanel } from '../ui/resizable';
import { AnalysisRouteLayout } from '@/components/Analysis/AnalysisRouteLayout';
import { BacktestRouteLayout } from '@/components/Backtest/BacktestRouteLayout';
import { MarketRouteLayout } from '@/components/Market/MarketRouteLayout';
import { PickerRouteLayout } from '@/components/Picker/PickerRouteLayout';
import { StrategyRouteLayout } from '@/components/Strategy/StrategyRouteLayout';

const WORKBENCH_ROUTES = [
  { prefix: '/analysis', Component: AnalysisRouteLayout },
  { prefix: '/market', Component: MarketRouteLayout },
  { prefix: '/backtest', Component: BacktestRouteLayout },
  { prefix: '/picker', Component: PickerRouteLayout },
  { prefix: '/strategies', Component: StrategyRouteLayout },
] as const;

export function Layout() {
  const location = useLocation();
  const {
    leftSidebarVisible,
    rightSidebarVisible,
    leftSidebarWidth,
    rightSidebarWidth,
    setLeftSidebarWidth,
    setRightSidebarWidth,
    syncFileTreeWithNotes,
    loadStateFromStorage
  } = useAppStore();

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);

  // 初始化加载存储状态和同步文件树
  useEffect(() => {
    loadStateFromStorage();
    syncFileTreeWithNotes();
  }, [loadStateFromStorage, syncFileTreeWithNotes]);

  React.useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const leftMinPx = 200;
  const leftMaxPx = 500;
  const rightMinPx = 200;
  const rightMaxPx = 500;

  const toPct = (px: number) => {
    if (!containerWidth || containerWidth <= 0) return 20;
    return Math.max(0, Math.min(100, (px / containerWidth) * 100));
  };

  const leftDefault = toPct(leftSidebarWidth);
  const rightDefault = toPct(rightSidebarWidth);
  const leftMin = toPct(leftMinPx);
  const leftMax = toPct(leftMaxPx);
  const rightMin = toPct(rightMinPx);
  const rightMax = toPct(rightMaxPx);

  const onLeftResize = (size: number) => {
    if (!containerWidth) return;
    const width = Math.round((size / 100) * containerWidth);
    setLeftSidebarWidth(width);
  };

  const onRightResize = (size: number) => {
    if (!containerWidth) return;
    const width = Math.round((size / 100) * containerWidth);
    setRightSidebarWidth(width);
  };

  // 生成动态的 panel 布局 key，确保在侧边栏可见性改变时重新创建组件
  const layoutKey = `${leftSidebarVisible ? 'L' : ''}${rightSidebarVisible ? 'R' : ''}`;
  const activeWorkbenchRoute = WORKBENCH_ROUTES.find(({ prefix }) => location.pathname.startsWith(prefix));

  const renderMainContent = () => {
    if (activeWorkbenchRoute) {
      const { Component } = activeWorkbenchRoute;
      return (
        <div className="flex flex-1 min-w-0">
          <ActivityBar />
          <Component />
        </div>
      );
    }

    // 如果没有侧边栏需要显示，使用简单的flex布局
    if (!leftSidebarVisible && !rightSidebarVisible) {
      return (
        <div className="flex flex-1">
          <ActivityBar />
          <div className="flex-1">
            <EnhancedMainEditor />
          </div>
        </div>
      );
    }

    // 使用Resizable组件处理有侧边栏的情况
    return (
      <div className="flex flex-1">
        <ActivityBar />
        <div className="flex flex-1" ref={containerRef}>
          <Resizable 
            direction="horizontal" 
            className="flex flex-1"
            key={layoutKey}
            id={`layout-${layoutKey}`}
          >
            {leftSidebarVisible && (
              <>
                <ResizablePanel 
                  id="left-sidebar"
                  order={1}
                  defaultSize={leftDefault} 
                  minSize={leftMin} 
                  maxSize={leftMax} 
                  onResize={onLeftResize}
                >
                  <LeftSidebar />
                </ResizablePanel>
                <ResizableHandle className="w-px bg-border" />
              </>
            )}
            
            <ResizablePanel 
              id="main-editor"
              order={2}
              className="flex-1"
            >
              <EnhancedMainEditor />
            </ResizablePanel>
            
            {rightSidebarVisible && (
              <>
                <ResizableHandle className="w-px bg-border" />
                <ResizablePanel 
                  id="right-sidebar"
                  order={3}
                  defaultSize={rightDefault} 
                  minSize={rightMin} 
                  maxSize={rightMax} 
                  onResize={onRightResize}
                >
                  <RightSidebar />
                </ResizablePanel>
              </>
            )}
          </Resizable>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full bg-background text-foreground">
      {/* 顶部工具栏 */}
      <TopBar />
      
      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {renderMainContent()}
      </div>
    </div>
  );
}
