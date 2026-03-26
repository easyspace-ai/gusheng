import React, { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores';
import { ProTopBar } from './ProTopBar';
import { ProActivityBar } from './ProActivityBar';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { EnhancedMainEditor } from './EnhancedMainEditor';
import { Resizable, ResizableHandle, ResizablePanel } from '../ui/resizable';
import { AnalysisRouteLayout } from '@/components/Analysis/AnalysisRouteLayout';
import { BacktestRouteLayout } from '@/components/Backtest/BacktestRouteLayout';
import { MarketRouteLayout } from '@/components/Market/MarketRouteLayout';
import { PickerRouteLayout } from '@/components/Picker/PickerRouteLayout';
import { StrategyRouteLayout } from '@/components/Strategy/StrategyRouteLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const WORKBENCH_ROUTES = [
  { prefix: '/analysis', Component: AnalysisRouteLayout },
  { prefix: '/market', Component: MarketRouteLayout },
  { prefix: '/backtest', Component: BacktestRouteLayout },
  { prefix: '/picker', Component: PickerRouteLayout },
  { prefix: '/strategies', Component: StrategyRouteLayout },
] as const;

// 侧边栏动画包装组件
function SidebarWrapper({
  children,
  side,
  isVisible
}: {
  children: React.ReactNode;
  side: 'left' | 'right';
  isVisible: boolean;
}) {
  return (
    <AnimatePresence initial={false} mode="sync">
      {isVisible && (
        <motion.div
          initial={{
            opacity: 0,
            x: side === 'left' ? -20 : 20,
            scale: 0.98
          }}
          animate={{
            opacity: 1,
            x: 0,
            scale: 1
          }}
          exit={{
            opacity: 0,
            x: side === 'left' ? -20 : 20,
            scale: 0.98
          }}
          transition={{
            duration: 0.25,
            ease: [0.22, 1, 0.36, 1]
          }}
          className="h-full"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 调整柄组件
function ResizeHandle({ isHorizontal = false }: { isHorizontal?: boolean }) {
  return (
    <ResizableHandle
      className={cn(
        'relative group',
        isHorizontal ? 'h-1' : 'w-1',
        'bg-transparent hover:bg-pro-accent-amber/40 transition-colors duration-150',
        'active:bg-pro-accent-amber'
      )}
    >
      <div className={cn(
        'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150',
        isHorizontal
          ? 'bg-gradient-to-b from-transparent via-pro-accent-amber/50 to-transparent'
          : 'bg-gradient-to-r from-transparent via-pro-accent-amber/50 to-transparent'
      )} />
    </ResizableHandle>
  );
}

// 主布局组件
export function ProLayout() {
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);

  // 初始化
  useEffect(() => {
    loadStateFromStorage();
    syncFileTreeWithNotes();
  }, [loadStateFromStorage, syncFileTreeWithNotes]);

  // 监听容器尺寸
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 尺寸计算
  const leftMinPx = 220;
  const leftMaxPx = 520;
  const rightMinPx = 220;
  const rightMaxPx = 520;

  const toPct = useCallback((px: number) => {
    if (!containerWidth || containerWidth <= 0) return 22;
    return Math.max(0, Math.min(100, (px / containerWidth) * 100));
  }, [containerWidth]);

  const leftDefault = toPct(leftSidebarWidth);
  const rightDefault = toPct(rightSidebarWidth);
  const leftMin = toPct(leftMinPx);
  const leftMax = toPct(leftMaxPx);
  const rightMin = toPct(rightMinPx);
  const rightMax = toPct(rightMaxPx);

  const onLeftResize = useCallback((size: number) => {
    if (!containerWidth) return;
    const width = Math.round((size / 100) * containerWidth);
    setLeftSidebarWidth(width);
  }, [containerWidth, setLeftSidebarWidth]);

  const onRightResize = useCallback((size: number) => {
    if (!containerWidth) return;
    const width = Math.round((size / 100) * containerWidth);
    setRightSidebarWidth(width);
  }, [containerWidth, setRightSidebarWidth]);

  // 生成布局 key，确保侧边栏可见性改变时重新创建组件
  const layoutKey = `${leftSidebarVisible ? 'L' : ''}${rightSidebarVisible ? 'R' : ''}`;
  const activeWorkbenchRoute = WORKBENCH_ROUTES.find(({ prefix }) =>
    location.pathname.startsWith(prefix)
  );

  // 渲染主内容
  const renderMainContent = () => {
    if (activeWorkbenchRoute) {
      const { Component } = activeWorkbenchRoute;
      return (
        <div className="flex flex-1 min-w-0">
          <ProActivityBar />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex-1 min-w-0"
          >
            <Component />
          </motion.div>
        </div>
      );
    }

    // 如果没有侧边栏需要显示，使用简单的 flex 布局
    if (!leftSidebarVisible && !rightSidebarVisible) {
      return (
        <div className="flex flex-1">
          <ProActivityBar />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="flex-1"
          >
            <EnhancedMainEditor />
          </motion.div>
        </div>
      );
    }

    // 使用 Resizable 组件处理有侧边栏的情况
    return (
      <div className="flex flex-1">
        <ProActivityBar />
        <div className="flex flex-1" ref={containerRef}>
          <Resizable
            direction="horizontal"
            className="flex flex-1"
            key={layoutKey}
            id={`pro-layout-${layoutKey}`}
          >
            {/* 左侧边栏 */}
            {leftSidebarVisible && (
              <>
                <ResizablePanel
                  id="pro-left-sidebar"
                  order={1}
                  defaultSize={leftDefault}
                  minSize={leftMin}
                  maxSize={leftMax}
                  onResize={onLeftResize}
                >
                  <SidebarWrapper side="left" isVisible={leftSidebarVisible}>
                    <LeftSidebar />
                  </SidebarWrapper>
                </ResizablePanel>
                <ResizeHandle />
              </>
            )}

            {/* 主编辑区 */}
            <ResizablePanel
              id="pro-main-editor"
              order={2}
              className="flex-1 min-w-0"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="h-full"
              >
                <EnhancedMainEditor />
              </motion.div>
            </ResizablePanel>

            {/* 右侧边栏 */}
            {rightSidebarVisible && (
              <>
                <ResizeHandle />
                <ResizablePanel
                  id="pro-right-sidebar"
                  order={3}
                  defaultSize={rightDefault}
                  minSize={rightMin}
                  maxSize={rightMax}
                  onResize={onRightResize}
                >
                  <SidebarWrapper side="right" isVisible={rightSidebarVisible}>
                    <RightSidebar />
                  </SidebarWrapper>
                </ResizablePanel>
              </>
            )}
          </Resizable>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full bg-background text-foreground overflow-hidden">
      {/* 主内容区域 */}
      <div className="flex flex-col w-full h-full">
        {/* 顶部工具栏 */}
        <ProTopBar />

        {/* 主体区域 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-1 overflow-hidden"
        >
          {renderMainContent()}
        </motion.div>
      </div>
    </div>
  );
}
