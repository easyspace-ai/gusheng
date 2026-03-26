/**
 * 智能防抖 Hook
 * 提供高级防抖功能，支持优先级和条件控制
 */

import { useCallback, useRef, useState } from 'react';

interface DebounceOptions {
  delay: number;
  leading?: boolean; // 是否在开始时立即执行
  trailing?: boolean; // 是否在结束时执行
  maxWait?: number; // 最大等待时间
}

interface SmartDebounceOptions extends DebounceOptions {
  priority?: 'low' | 'normal' | 'high';
  condition?: () => boolean; // 执行条件
}

export function useSmartDebounce<T extends (...args: any[]) => void>(
  fn: T,
  options: SmartDebounceOptions = { delay: 300 }
): T {
  const {
    delay,
    leading = false,
    trailing = true,
    maxWait,
    priority = 'normal',
    condition = () => true,
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);
  const lastArgsRef = useRef<Parameters<T>>();
  const isInvokingRef = useRef(false);

  const invokeFunc = useCallback(() => {
    if (!condition()) return;

    const args = lastArgsRef.current;
    if (args) {
      lastInvokeTimeRef.current = Date.now();
      isInvokingRef.current = true;
      fn(...args);
      isInvokingRef.current = false;
    }
  }, [fn, condition]);

  const shouldInvoke = useCallback((time: number) => {
    const timeSinceLastCall = time - lastCallTimeRef.current;
    const timeSinceLastInvoke = time - lastInvokeTimeRef.current;

    return (
      lastCallTimeRef.current === 0 ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait && timeSinceLastInvoke >= maxWait)
    );
  }, [delay, maxWait]);

  const startTimer = useCallback((pendingFunc: () => void, wait: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(pendingFunc, wait);
  }, []);

  const debounced = useCallback<T>((...args: Parameters<T>) => {
    const time = Date.now();
    lastArgsRef.current = args;
    lastCallTimeRef.current = time;

    const isInvoking = isInvokingRef.current;
    const shouldInvokeNow = shouldInvoke(time);

    if (shouldInvokeNow && !isInvoking) {
      if (maxWait) {
        if (maxTimeoutRef.current) {
          clearTimeout(maxTimeoutRef.current);
        }
        maxTimeoutRef.current = setTimeout(invokeFunc, maxWait);
      }
      if (leading) {
        invokeFunc();
      }
    }

    if (trailing && !isInvoking) {
      startTimer(invokeFunc, delay);
    }
  }, [delay, leading, trailing, maxWait, shouldInvoke, invokeFunc, startTimer]);

  // 清理函数
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = undefined;
    }
    lastCallTimeRef.current = 0;
    lastInvokeTimeRef.current = 0;
    lastArgsRef.current = undefined;
    isInvokingRef.current = false;
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      invokeFunc();
    }
  }, [invokeFunc]);

  // 返回增强的防抖函数
  const enhancedDebounced = Object.assign(debounced, {
    cancel,
    flush,
    pending: () => !!timeoutRef.current,
  });

  return enhancedDebounced as T & {
    cancel: () => void;
    flush: () => void;
    pending: () => boolean;
  };
}

/**
 * 简单防抖 Hook（用于向后兼容）
 */
export function useDebounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number = 300
): T {
  return useSmartDebounce(fn, { delay });
}
