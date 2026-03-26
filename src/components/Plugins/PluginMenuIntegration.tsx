import React, { useEffect, useState } from 'react';
import { PluginMenu } from '../../lib/plugins/types';
import { globalUIManager } from '../../lib/plugins/uiManager';
import { PluginAPI } from '../../lib/plugins/api';

interface PluginMenuIntegrationProps {
  children: (menus: PluginMenu[]) => React.ReactNode;
}

export function PluginMenuIntegration({ children }: PluginMenuIntegrationProps) {
  const [pluginMenus, setPluginMenus] = useState<PluginMenu[]>([]);

  useEffect(() => {
    // Load initial plugin menus
    loadPluginMenus();

    // Listen for menu changes
    const unsubscribeAdd = globalUIManager.onMenuAdded((menu) => {
      setPluginMenus(prev => [...prev, menu]);
    });

    const unsubscribeRemove = globalUIManager.onMenuRemoved(({ id }) => {
      setPluginMenus(prev => prev.filter(menu => menu.id !== id));
    });

    return () => {
      unsubscribeAdd();
      unsubscribeRemove();
    };
  }, []);

  const loadPluginMenus = async () => {
    try {
      // Get menus from runtime
      const runtimeMenus = await PluginAPI.getRuntimeMenus();
      
      // Also get local UI manager menus
      const localMenus = globalUIManager.getMenuItems();
      
      // Combine and deduplicate
      const allMenus = [...runtimeMenus, ...localMenus];
      const uniqueMenus = allMenus.filter((menu, index, self) => 
        index === self.findIndex(m => m.id === menu.id)
      );
      
      setPluginMenus(uniqueMenus);
    } catch (error) {
      console.error('Failed to load plugin menus:', error);
    }
  };

  return <>{children(pluginMenus)}</>;
}

// Hook for using plugin menus in components
export function usePluginMenus() {
  const [menus, setMenus] = useState<PluginMenu[]>([]);

  useEffect(() => {
    // Get initial menus
    const initialMenus = globalUIManager.getMenuItems();
    setMenus(initialMenus);

    // Listen for changes
    const unsubscribeAdd = globalUIManager.onMenuAdded((menu) => {
      setMenus(prev => [...prev, menu]);
    });

    const unsubscribeRemove = globalUIManager.onMenuRemoved(({ id }) => {
      setMenus(prev => prev.filter(menu => menu.id !== id));
    });

    return () => {
      unsubscribeAdd();
      unsubscribeRemove();
    };
  }, []);

  const executeMenuAction = async (menu: PluginMenu) => {
    try {
      // If it's a plugin command, execute it
      if (menu.action.includes(':')) {
        await PluginAPI.executeCommand(menu.action);
      } else {
        // Execute UI manager command
        await globalUIManager.executeCommand(menu.action);
      }
    } catch (error) {
      console.error('Failed to execute menu action:', error);
    }
  };

  return {
    menus,
    executeMenuAction,
  };
}
