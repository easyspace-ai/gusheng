import React, { useState, useEffect } from 'react';
import { 
  Puzzle, 
  Download, 
  Settings, 
  Star, 
  Search,
  Plus,
  Filter,
  RefreshCw,
  Upload,
  Globe,
  Package,
  Shield,
  Clock,
  User
} from 'lucide-react';
import { Plugin, PluginRegistry } from '../../lib/plugins/types';
import { PluginAPI } from '../../lib/plugins/api';
import { PluginCard } from './PluginCard';
import { PluginDetails } from './PluginDetails';
import { InstallPluginDialog } from './InstallPluginDialog';
import { RegistryDialog } from './RegistryDialog';

interface PluginManagerProps {
  className?: string;
}

type FilterType = 'all' | 'installed' | 'enabled' | 'available';

export function PluginManager({ className }: PluginManagerProps) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [filteredPlugins, setFilteredPlugins] = useState<Plugin[]>([]);
  const [registries, setRegistries] = useState<PluginRegistry[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showRegistryDialog, setShowRegistryDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter plugins when search or filter changes
  useEffect(() => {
    filterPlugins();
  }, [plugins, searchQuery, filterType]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [pluginsData, registriesData] = await Promise.all([
        PluginAPI.getPlugins(),
        PluginAPI.getRegistries(),
      ]);
      
      setPlugins(pluginsData);
      setRegistries(registriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plugins');
    } finally {
      setLoading(false);
    }
  };

  const filterPlugins = () => {
    let filtered = plugins || [];

    // Apply filter type
    switch (filterType) {
      case 'installed':
        filtered = filtered.filter(p => p.installed);
        break;
      case 'enabled':
        filtered = filtered.filter(p => p.enabled);
        break;
      case 'available':
        filtered = filtered.filter(p => !p.installed);
        break;
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.author.toLowerCase().includes(query) ||
        (p.tags && p.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    setFilteredPlugins(filtered);
  };

  const handlePluginAction = async (plugin: Plugin, action: 'install' | 'uninstall' | 'enable' | 'disable') => {
    try {
      switch (action) {
        case 'install':
          // For now, we can't install directly without a URL
          setShowInstallDialog(true);
          break;
        case 'uninstall':
          await PluginAPI.uninstallPlugin(plugin.id);
          break;
        case 'enable':
          await PluginAPI.enablePlugin(plugin.id);
          break;
        case 'disable':
          await PluginAPI.disablePlugin(plugin.id);
          break;
      }
      
      // Refresh plugins list
      await loadData();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} plugin`);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleInstallSuccess = async () => {
    setShowInstallDialog(false);
    await loadData();
  };

  const getFilterCounts = () => {
    const pluginsList = plugins || [];
    return {
      all: pluginsList.length,
      installed: pluginsList.filter(p => p.installed).length,
      enabled: pluginsList.filter(p => p.enabled).length,
      available: pluginsList.filter(p => !p.installed).length,
    };
  };

  const filterCounts = getFilterCounts();

  if (loading) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex items-center justify-center flex-1">
          <div className="flex items-center space-x-2 text-light-text-secondary dark:text-dark-text-secondary">
            <RefreshCw size={16} className="animate-spin" />
            <span>Loading plugins...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Puzzle size={20} className="text-light-accent dark:text-dark-accent" />
            <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
              Plugin Manager
            </h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={`${refreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => setShowRegistryDialog(true)}
              className="p-2 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
              title="Manage Registries"
            >
              <Globe size={16} />
            </button>
            
            <button
              onClick={() => setShowInstallDialog(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-light-accent dark:bg-dark-accent text-white rounded text-sm hover:opacity-80 transition-opacity"
            >
              <Plus size={14} />
              <span>Install</span>
            </button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-light-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-light-text dark:text-dark-text placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex space-x-1">
            {[
              { key: 'all', label: 'All', count: filterCounts.all },
              { key: 'installed', label: 'Installed', count: filterCounts.installed },
              { key: 'enabled', label: 'Enabled', count: filterCounts.enabled },
              { key: 'available', label: 'Available', count: filterCounts.available },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilterType(key as FilterType)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded text-sm transition-colors ${
                  filterType === key
                    ? 'bg-light-accent dark:bg-dark-accent text-white'
                    : 'hover:bg-light-hover dark:hover:bg-dark-hover text-light-text dark:text-dark-text'
                }`}
              >
                <span>{label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  filterType === key
                    ? 'bg-white/20'
                    : 'bg-light-hover dark:bg-dark-hover'
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex">
        {/* Plugin list */}
        <div className="flex-1 overflow-y-auto">
          {filteredPlugins.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Package size={48} className="text-light-text-secondary dark:text-dark-text-secondary mb-4" />
              <h3 className="text-lg font-medium text-light-text dark:text-dark-text mb-2">
                {searchQuery || filterType !== 'all' ? 'No plugins found' : 'No plugins available'}
              </h3>
              <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Install plugins to extend the functionality of your application.'
                }
              </p>
              {(!searchQuery && filterType === 'all') && (
                <button
                  onClick={() => setShowInstallDialog(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-light-accent dark:bg-dark-accent text-white rounded hover:opacity-80 transition-opacity"
                >
                  <Plus size={16} />
                  <span>Install Your First Plugin</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredPlugins.map(plugin => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  onAction={handlePluginAction}
                  onSelect={() => setSelectedPlugin(plugin)}
                  isSelected={selectedPlugin?.id === plugin.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Plugin details sidebar */}
        {selectedPlugin && (
          <div className="w-80 border-l border-light-border dark:border-dark-border">
            <PluginDetails
              plugin={selectedPlugin}
              onAction={handlePluginAction}
              onClose={() => setSelectedPlugin(null)}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showInstallDialog && (
        <InstallPluginDialog
          onClose={() => setShowInstallDialog(false)}
          onSuccess={handleInstallSuccess}
        />
      )}

      {showRegistryDialog && (
        <RegistryDialog
          registries={registries}
          onClose={() => setShowRegistryDialog(false)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
