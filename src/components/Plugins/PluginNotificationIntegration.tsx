import React, { useEffect, useState } from 'react';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { globalUIManager } from '../../lib/plugins/uiManager';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export function PluginNotificationIntegration() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = globalUIManager.onNotificationShow(({ message, type }) => {
      const notification: Notification = {
        id: `notification-${Date.now()}-${Math.random()}`,
        message,
        type: type || 'info',
        timestamp: Date.now(),
      };

      setNotifications(prev => [...prev, notification]);

      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    });

    return unsubscribe;
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-500" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />;
      default:
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getNotificationStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`flex items-start space-x-3 p-4 rounded-lg border shadow-lg transition-all duration-300 transform ${getNotificationStyles(notification.type)}`}
        >
          {getNotificationIcon(notification.type)}
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium break-words">
              {notification.message}
            </p>
          </div>
          
          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// Hook for plugin notifications
export function usePluginNotifications() {
  const showNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    globalUIManager.showNotification(message, type);
  };

  return { showNotification };
}
