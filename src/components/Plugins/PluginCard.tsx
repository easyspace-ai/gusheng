import React from 'react';
import { 
  Puzzle, 
  Download, 
  Settings, 
  Star, 
  Shield,
  Clock,
  User,
  ChevronRight
} from 'lucide-react';
import { Plugin } from '../../lib/plugins/types';

interface PluginCardProps {
  plugin: Plugin;
  onAction: (plugin: Plugin, action: 'install' | 'uninstall' | 'enable' | 'disable') => void;
  onSelect: () => void;
  isSelected: boolean;
}

export function PluginCard({ plugin, onAction, onSelect, isSelected }: PluginCardProps) {
  const handleAction = (action: 'install' | 'uninstall' | 'enable' | 'disable') => {
    onAction(plugin, action);
  };

  const getStatusBadge = () => {
    if (!plugin.installed) {
      return (
        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Available
        </span>
      );
    }
    
    if (plugin.enabled) {
      return (
        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
          Enabled
        </span>
      );
    }
    
    return (
      <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
        Disabled
      </span>
    );
  };

  const getActionButtons = () => {
    if (!plugin.installed) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAction('install');
          }}
          className="text-xs px-3 py-1.5 rounded bg-light-accent text-white dark:bg-dark-accent hover:opacity-80 transition-opacity"
        >
          Install
        </button>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAction(plugin.enabled ? 'disable' : 'enable');
          }}
          className={`text-xs px-3 py-1.5 rounded transition-colors ${
            plugin.enabled
              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-800'
              : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
          }`}
        >
          {plugin.enabled ? 'Disable' : 'Enable'}
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAction('uninstall');
          }}
          className="text-xs px-3 py-1.5 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
        >
          Uninstall
        </button>
      </div>
    );
  };

  return (
    <div
      onClick={onSelect}
      className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-light-accent dark:border-dark-accent bg-light-accent/5 dark:bg-dark-accent/5'
          : 'border-light-border dark:border-dark-border hover:border-light-accent/50 dark:hover:border-dark-accent/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-light-accent/10 dark:bg-dark-accent/10 flex items-center justify-center">
              <Puzzle size={20} className="text-light-accent dark:text-dark-accent" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-light-text dark:text-dark-text truncate">
                {plugin.name}
              </h3>
              {getStatusBadge()}
            </div>
            
            <div className="flex items-center space-x-3 text-xs text-light-text-secondary dark:text-dark-text-secondary">
              <span>v{plugin.version}</span>
              <div className="flex items-center space-x-1">
                <User size={12} />
                <span>{plugin.author}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock size={12} />
                <span>{new Date(plugin.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        <ChevronRight size={16} className={`text-light-text-secondary dark:text-dark-text-secondary transition-transform ${
          isSelected ? 'rotate-90' : ''
        }`} />
      </div>

      {/* Description */}
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary line-clamp-2 mb-3">
        {plugin.description}
      </p>

      {/* Tags */}
      {plugin.tags && plugin.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {plugin.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-1 bg-light-hover dark:bg-dark-hover text-light-text-secondary dark:text-dark-text-secondary rounded"
            >
              {tag}
            </span>
          ))}
          {plugin.tags.length > 3 && (
            <span className="text-xs px-2 py-1 bg-light-hover dark:bg-dark-hover text-light-text-secondary dark:text-dark-text-secondary rounded">
              +{plugin.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-xs text-light-text-secondary dark:text-dark-text-secondary">
          {plugin.license && (
            <div className="flex items-center space-x-1">
              <Shield size={12} />
              <span>{plugin.license}</span>
            </div>
          )}
        </div>
        
        <div onClick={(e) => e.stopPropagation()}>
          {getActionButtons()}
        </div>
      </div>
    </div>
  );
}
