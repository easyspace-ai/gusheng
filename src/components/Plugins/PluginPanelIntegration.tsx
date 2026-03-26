import React, { useEffect, useState } from 'react';
import { PluginPanel, PluginContext } from '../../lib/plugins/types';
import { globalUIManager } from '../../lib/plugins/uiManager';
import { pluginManager } from '../../lib/plugins';

interface PluginPanelIntegrationProps {
  position: 'left' | 'right' | 'bottom';
  children: (panels: RenderedPluginPanel[]) => React.ReactNode;
}

interface RenderedPluginPanel extends Omit<PluginPanel, 'component'> {
  component: React.ComponentType<{ context: PluginContext }>;
  context: PluginContext;
}

export function PluginPanelIntegration({ position, children }: PluginPanelIntegrationProps) {
  const [panels, setPanels] = useState<RenderedPluginPanel[]>([]);

  useEffect(() => {
    // Load initial panels
    loadPanels();

    // Listen for panel changes
    const unsubscribeAdd = globalUIManager.onPanelAdded((panel) => {
      if (panel.position === position) {
        loadPanels();
      }
    });

    const unsubscribeRemove = globalUIManager.onPanelRemoved(() => {
      loadPanels();
    });

    return () => {
      unsubscribeAdd();
      unsubscribeRemove();
    };
  }, [position]);

  const loadPanels = () => {
    const allPanels = globalUIManager.getPanelsByPosition(position);
    const renderedPanels: RenderedPluginPanel[] = [];

    allPanels.forEach(panel => {
      // Extract plugin ID from panel ID (format: pluginId:panelId)
      const [pluginId] = panel.id.split(':');
      const context = pluginManager.getPluginContext(pluginId);
      
      if (context) {
        renderedPanels.push({
          ...panel,
          context,
        });
      }
    });

    setPanels(renderedPanels);
  };

  return <>{children(panels)}</>;
}

// Hook for using plugin panels
export function usePluginPanels(position?: 'left' | 'right' | 'bottom') {
  const [panels, setPanels] = useState<PluginPanel[]>([]);

  useEffect(() => {
    const loadPanels = () => {
      const allPanels = position 
        ? globalUIManager.getPanelsByPosition(position)
        : globalUIManager.getPanels();
      setPanels(allPanels);
    };

    // Load initial panels
    loadPanels();

    // Listen for changes
    const unsubscribeAdd = globalUIManager.onPanelAdded(() => loadPanels());
    const unsubscribeRemove = globalUIManager.onPanelRemoved(() => loadPanels());

    return () => {
      unsubscribeAdd();
      unsubscribeRemove();
    };
  }, [position]);

  return panels;
}
