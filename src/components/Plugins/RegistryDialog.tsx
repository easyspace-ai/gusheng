import React, { useState } from 'react';
import { X, Plus, Globe, Trash2, AlertCircle, Check } from 'lucide-react';
import { PluginRegistry } from '../../lib/plugins/types';
import { PluginAPI } from '../../lib/plugins/api';

interface RegistryDialogProps {
  registries: PluginRegistry[];
  onClose: () => void;
  onUpdate: () => void;
}

export function RegistryDialog({ registries, onClose, onUpdate }: RegistryDialogProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRegistry, setNewRegistry] = useState({
    name: '',
    url: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRegistry.name.trim() || !newRegistry.url.trim()) {
      setError('Name and URL are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      await PluginAPI.addRegistry(
        newRegistry.name.trim(),
        newRegistry.url.trim(),
        newRegistry.description.trim() || undefined
      );
      
      setSuccess('Registry added successfully');
      setNewRegistry({ name: '', url: '', description: '' });
      setShowAddForm(false);
      onUpdate();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add registry');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewRegistry({ name: '', url: '', description: '' });
    setShowAddForm(false);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
          <div className="flex items-center space-x-2">
            <Globe size={20} className="text-light-accent dark:text-dark-accent" />
            <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
              Plugin Registries
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Success message */}
          {success && (
            <div className="flex items-center space-x-2 p-3 mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <Check size={16} className="text-green-500" />
              <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start space-x-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Add registry button */}
          {!showAddForm && (
            <div className="mb-4">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:opacity-80 transition-opacity"
              >
                <Plus size={16} />
                <span>Add Registry</span>
              </button>
            </div>
          )}

          {/* Add registry form */}
          {showAddForm && (
            <div className="mb-6 p-4 border border-light-border dark:border-dark-border rounded-lg">
              <h3 className="text-sm font-medium text-light-text dark:text-dark-text mb-3">
                Add New Registry
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newRegistry.name}
                    onChange={(e) => setNewRegistry(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Registry name"
                    className="w-full px-3 py-2 text-sm border border-light-border dark:border-dark-border rounded bg-white dark:bg-dark-bg text-light-text dark:text-dark-text placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                    disabled={submitting}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                    URL *
                  </label>
                  <input
                    type="url"
                    value={newRegistry.url}
                    onChange={(e) => setNewRegistry(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://registry.example.com/api"
                    className="w-full px-3 py-2 text-sm border border-light-border dark:border-dark-border rounded bg-white dark:bg-dark-bg text-light-text dark:text-dark-text placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                    disabled={submitting}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                    Description
                  </label>
                  <textarea
                    value={newRegistry.description}
                    onChange={(e) => setNewRegistry(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-light-border dark:border-dark-border rounded bg-white dark:bg-dark-bg text-light-text dark:text-dark-text placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent resize-none"
                    disabled={submitting}
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={submitting}
                    className="px-3 py-1.5 text-sm border border-light-border dark:border-dark-border rounded text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={submitting || !newRegistry.name.trim() || !newRegistry.url.trim()}
                    className="px-3 py-1.5 text-sm bg-light-accent dark:bg-dark-accent text-white rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    {submitting ? 'Adding...' : 'Add Registry'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Registries list */}
          <div>
            <h3 className="text-sm font-medium text-light-text dark:text-dark-text mb-3">
              Configured Registries ({registries.length})
            </h3>
            
            {registries.length === 0 ? (
              <div className="text-center py-8">
                <Globe size={48} className="mx-auto text-light-text-secondary dark:text-dark-text-secondary mb-4" />
                <h4 className="text-light-text dark:text-dark-text font-medium mb-2">
                  No registries configured
                </h4>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
                  Add a plugin registry to discover and install plugins.
                </p>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-light-accent dark:bg-dark-accent text-white rounded hover:opacity-80 transition-opacity"
                  >
                    Add Your First Registry
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {registries.map(registry => (
                  <div
                    key={registry.id}
                    className="border border-light-border dark:border-dark-border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-light-text dark:text-dark-text">
                            {registry.name}
                          </h4>
                          <span className={`text-xs px-2 py-1 rounded ${
                            registry.enabled
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
                          }`}>
                            {registry.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2 break-all">
                          {registry.url}
                        </p>
                        
                        {registry.description && (
                          <p className="text-sm text-light-text dark:text-dark-text">
                            {registry.description}
                          </p>
                        )}
                        
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
                          Added {new Date(registry.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {registry.id !== 'default' && (
                          <button
                            onClick={() => {
                              // TODO: Implement registry deletion
                              console.log('Delete registry', registry.id);
                            }}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete registry"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Help information */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              About Plugin Registries
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Plugin registries are repositories that host and distribute plugins. The default registry 
              contains officially verified plugins. You can add custom registries to access plugins 
              from other sources, but be cautious about security when adding third-party registries.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-light-border dark:border-dark-border">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:opacity-80 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
