import React, { useEffect } from 'react';
import { initializePluginSystem, globalEventBus, globalWorkspaceManager } from '../../lib/plugins';
import { PluginNotificationIntegration } from './PluginNotificationIntegration';
import { PluginModalIntegration } from './PluginModalIntegration';

interface PluginSystemIntegrationProps {
  children: React.ReactNode;
}

export function PluginSystemIntegration({ children }: PluginSystemIntegrationProps) {
  useEffect(() => {
    // Initialize plugin system
    initializePluginSystem().catch(error => {
      console.error('Failed to initialize plugin system:', error);
    });

    // Set up workspace event forwarding
    const setupWorkspaceEvents = () => {
      // Listen for app events and forward to plugin system
      
      // File events (these would typically come from your main app)
      const handleFileOpen = (file: any) => {
        globalWorkspaceManager.setCurrentFile(file);
        globalEventBus.emit('workspace:file-opened', file);
      };

      const handleFileCreate = (file: any) => {
        globalEventBus.emit('workspace:file-created', file);
      };

      const handleFileDelete = (file: any) => {
        globalEventBus.emit('workspace:file-deleted', file);
      };

      const handleFileModify = (file: any) => {
        globalEventBus.emit('workspace:file-modified', file);
      };

      // Editor events
      const handleSelectionChange = (selection: any) => {
        globalWorkspaceManager.setCurrentSelection(selection);
        globalEventBus.emit('workspace:selection-changed', selection);
      };

      const handleContentChange = (content: string) => {
        globalWorkspaceManager.updateCurrentFileContent(content);
        globalEventBus.emit('workspace:content-changed', { content });
      };

      // Listen for plugin requests
      globalEventBus.on('workspace:request-file-open', ({ path }) => {
        // Forward to main app to open file
        console.log('Plugin requested to open file:', path);
        // This would integrate with your main app's file opening logic
      });

      globalEventBus.on('workspace:request-text-insert', ({ text }) => {
        // Forward to main app to insert text
        console.log('Plugin requested to insert text:', text);
        // This would integrate with your editor
      });

      globalEventBus.on('workspace:request-selection-replace', ({ text }) => {
        // Forward to main app to replace selection
        console.log('Plugin requested to replace selection:', text);
        // This would integrate with your editor
      });

      // Return cleanup function
      return () => {
        // Cleanup event listeners if needed
      };
    };

    const cleanup = setupWorkspaceEvents();

    return () => {
      cleanup();
    };
  }, []);

  return (
    <>
      {children}
      <PluginNotificationIntegration />
      <PluginModalIntegration />
    </>
  );
}

// Context for plugin system integration
export const PluginSystemContext = React.createContext<{
  isInitialized: boolean;
}>({
  isInitialized: false,
});

// Provider component
export function PluginSystemProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    initializePluginSystem()
      .then(() => {
        setIsInitialized(true);
      })
      .catch(error => {
        console.error('Failed to initialize plugin system:', error);
      });
  }, []);

  return (
    <PluginSystemContext.Provider value={{ isInitialized }}>
      <PluginSystemIntegration>
        {children}
      </PluginSystemIntegration>
    </PluginSystemContext.Provider>
  );
}

// Hook to use plugin system context
export function usePluginSystem() {
  return React.useContext(PluginSystemContext);
}
