import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { globalUIManager } from '../../lib/plugins/uiManager';

interface Modal {
  id: string;
  component: React.ComponentType;
  props?: any;
}

export function PluginModalIntegration() {
  const [modals, setModals] = useState<Modal[]>([]);

  useEffect(() => {
    const unsubscribeShow = globalUIManager.onModalShow((data) => {
      setModals(prev => [...prev, data]);
    });

    const unsubscribeHide = globalUIManager.onModalHide(({ id }) => {
      setModals(prev => prev.filter(m => m.id !== id));
    });

    return () => {
      unsubscribeShow();
      unsubscribeHide();
    };
  }, []);

  const hideModal = (id: string) => {
    globalUIManager.hideModal(id);
  };

  if (modals.length === 0) {
    return null;
  }

  return (
    <>
      {modals.map((modal, index) => (
        <div
          key={modal.id}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ zIndex: 1000 + index }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => hideModal(modal.id)}
          />
          
          {/* Modal content */}
          <div className="relative bg-white dark:bg-dark-bg rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
            {/* Close button */}
            <button
              onClick={() => hideModal(modal.id)}
              className="absolute top-4 right-4 z-10 p-2 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
            >
              <X size={16} />
            </button>
            
            {/* Plugin component */}
            <div className="overflow-auto max-h-[90vh]">
              <modal.component {...modal.props} onClose={() => hideModal(modal.id)} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// Hook for plugin modals
export function usePluginModals() {
  const showModal = (component: React.ComponentType, props?: any) => {
    globalUIManager.showModal(component, props);
  };

  return { showModal };
}
