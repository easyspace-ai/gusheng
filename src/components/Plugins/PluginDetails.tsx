import React, { useState, useEffect } from 'react';
import { 
  X,
  Puzzle,
  Star,
  Download,
  User,
  Calendar,
  Shield,
  Link,
  Settings,
  Code,
  Package,
  Globe,
  GitBranch
} from 'lucide-react';
import { Plugin, PluginManifest } from '../../lib/plugins/types';
import { PluginAPI } from '../../lib/plugins/api';

interface PluginDetailsProps {
  plugin: Plugin;
  onAction: (plugin: Plugin, action: 'install' | 'uninstall' | 'enable' | 'disable') => void;
  onClose: () => void;
}

export function PluginDetails({ plugin, onAction, onClose }: PluginDetailsProps) {
  const [manifest, setManifest] = useState<PluginManifest | null>(null);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    // Parse manifest
    try {
      const parsedManifest = JSON.parse(plugin.manifest);
      setManifest(parsedManifest);
    } catch (error) {
      console.error('Failed to parse plugin manifest:', error);
    }

    // Load config if plugin is installed
    if (plugin.installed) {
      loadConfig();
    }
  }, [plugin]);

  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      const pluginConfig = await PluginAPI.getPluginConfig(plugin.id);
      setConfig(pluginConfig);
    } catch (error) {
      console.error('Failed to load plugin config:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleAction = (action: 'install' | 'uninstall' | 'enable' | 'disable') => {
    onAction(plugin, action);
  };

  const getStatusColor = () => {
    if (!plugin.installed) return 'text-blue-600 dark:text-blue-400';
    if (plugin.enabled) return 'text-green-600 dark:text-green-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  const getStatusText = () => {
    if (!plugin.installed) return 'Available for installation';
    if (plugin.enabled) return 'Installed and enabled';
    return 'Installed but disabled';
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-bg">
      {/* Header */}
      <div className="p-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-light-accent/10 dark:bg-dark-accent/10 flex items-center justify-center">
              <Puzzle size={24} className="text-light-accent dark:text-dark-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
                {plugin.name}
              </h2>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                v{plugin.version} by {plugin.author}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status */}
        <div className="mb-4">
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          {!plugin.installed ? (
            <button
              onClick={() => handleAction('install')}
              className="flex-1 px-4 py-2 bg-light-accent dark:bg-dark-accent text-white rounded hover:opacity-80 transition-opacity"
            >
              Install Plugin
            </button>
          ) : (
            <>
              <button
                onClick={() => handleAction(plugin.enabled ? 'disable' : 'enable')}
                className={`flex-1 px-4 py-2 rounded transition-colors ${
                  plugin.enabled
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                    : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                }`}
              >
                {plugin.enabled ? 'Disable' : 'Enable'}
              </button>
              
              <button
                onClick={() => handleAction('uninstall')}
                className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                Uninstall
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-light-text dark:text-dark-text mb-2">
            Description
          </h3>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
            {plugin.description}
          </p>
        </div>

        {/* Tags */}
        {plugin.tags.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-light-text dark:text-dark-text mb-2">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {plugin.tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 bg-light-hover dark:bg-dark-hover text-light-text-secondary dark:text-dark-text-secondary rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Plugin information */}
        <div>
          <h3 className="text-sm font-medium text-light-text dark:text-dark-text mb-3">
            Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <User size={16} className="text-light-text-secondary dark:text-dark-text-secondary" />
              <span className="text-light-text-secondary dark:text-dark-text-secondary">Author:</span>
              <span className="text-light-text dark:text-dark-text">{plugin.author}</span>
            </div>
            
            <div className="flex items-center space-x-3 text-sm">
              <Package size={16} className="text-light-text-secondary dark:text-dark-text-secondary" />
              <span className="text-light-text-secondary dark:text-dark-text-secondary">Version:</span>
              <span className="text-light-text dark:text-dark-text">{plugin.version}</span>
            </div>
            
            {plugin.license && (
              <div className="flex items-center space-x-3 text-sm">
                <Shield size={16} className="text-light-text-secondary dark:text-dark-text-secondary" />
                <span className="text-light-text-secondary dark:text-dark-text-secondary">License:</span>
                <span className="text-light-text dark:text-dark-text">{plugin.license}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-3 text-sm">
              <Calendar size={16} className="text-light-text-secondary dark:text-dark-text-secondary" />
              <span className="text-light-text-secondary dark:text-dark-text-secondary">Updated:</span>
              <span className="text-light-text dark:text-dark-text">
                {new Date(plugin.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Links */}
        {(plugin.homepage || plugin.repository) && (
          <div>
            <h3 className="text-sm font-medium text-light-text dark:text-dark-text mb-3">
              Links
            </h3>
            <div className="space-y-2">
              {plugin.homepage && (
                <a
                  href={plugin.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 text-sm text-light-accent dark:text-dark-accent hover:underline"
                >
                  <Globe size={16} />
                  <span>Homepage</span>
                </a>
              )}
              
              {plugin.repository && (
                <a
                  href={plugin.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 text-sm text-light-accent dark:text-dark-accent hover:underline"
                >
                  <GitBranch size={16} />
                  <span>Repository</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Commands and Menus */}
        {manifest && (manifest.commands?.length || manifest.menus?.length) && (
          <div>
            <h3 className="text-sm font-medium text-light-text dark:text-dark-text mb-3">
              Features
            </h3>
            <div className="space-y-3">
              {manifest.commands && manifest.commands.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                    Commands ({manifest.commands.length})
                  </h4>
                  <ul className="space-y-1">
                    {manifest.commands.map(command => (
                      <li key={command.id} className="text-sm text-light-text dark:text-dark-text">
                        <span className="font-mono text-xs bg-light-hover dark:bg-dark-hover px-1 py-0.5 rounded mr-2">
                          {command.id}
                        </span>
                        {command.name}
                        {command.hotkey && (
                          <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary ml-2">
                            ({command.hotkey})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {manifest.menus && manifest.menus.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                    Menu Items ({manifest.menus.length})
                  </h4>
                  <ul className="space-y-1">
                    {manifest.menus.map(menu => (
                      <li key={menu.id} className="text-sm text-light-text dark:text-dark-text">
                        {menu.label}
                        {menu.parent && (
                          <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary ml-2">
                            (in {menu.parent})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Permissions */}
        {manifest?.permissions && manifest.permissions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-light-text dark:text-dark-text mb-3">
              Permissions
            </h3>
            <ul className="space-y-1">
              {manifest.permissions.map(permission => (
                <li key={permission} className="flex items-center space-x-2 text-sm">
                  <Shield size={14} className="text-yellow-500" />
                  <span className="text-light-text dark:text-dark-text">{permission}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Configuration */}
        {plugin.installed && (
          <div>
            <h3 className="text-sm font-medium text-light-text dark:text-dark-text mb-3">
              Configuration
            </h3>
            {loadingConfig ? (
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Loading configuration...
              </div>
            ) : Object.keys(config).length === 0 ? (
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                No configuration options available.
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(config).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">
                      {key}:
                    </span>
                    <span className="text-light-text dark:text-dark-text font-mono">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
