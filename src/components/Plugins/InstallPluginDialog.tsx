import React, { useState } from 'react';
import { X, Upload, Link, Download, AlertCircle } from 'lucide-react';
import { PluginAPI } from '../../lib/plugins/api';

interface InstallPluginDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function InstallPluginDialog({ onClose, onSuccess }: InstallPluginDialogProps) {
  const [installMethod, setInstallMethod] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInstallFromUrl = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    try {
      setInstalling(true);
      setError(null);
      
      await PluginAPI.installPlugin(url);
      onSuccess();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install plugin');
    } finally {
      setInstalling(false);
    }
  };

  const handleInstallFromFile = async () => {
    if (!file) {
      setError('Please select a plugin file');
      return;
    }

    try {
      setInstalling(true);
      setError(null);
      
      await PluginAPI.installPluginFromFile(file);
      onSuccess();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install plugin from file');
    } finally {
      setInstalling(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.zip')) {
        setError('Please select a valid plugin file (.zip)');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (installMethod === 'url') {
      handleInstallFromUrl();
    } else {
      handleInstallFromFile();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
          <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
            Install Plugin
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Install method tabs */}
          <div className="flex space-x-1 mb-4 bg-light-hover dark:bg-dark-hover rounded-lg p-1">
            <button
              onClick={() => setInstallMethod('url')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded text-sm transition-colors ${
                installMethod === 'url'
                  ? 'bg-white dark:bg-dark-bg text-light-text dark:text-dark-text shadow-sm'
                  : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text'
              }`}
            >
              <Link size={16} />
              <span>From URL</span>
            </button>
            
            <button
              onClick={() => setInstallMethod('file')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded text-sm transition-colors ${
                installMethod === 'file'
                  ? 'bg-white dark:bg-dark-bg text-light-text dark:text-dark-text shadow-sm'
                  : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text'
              }`}
            >
              <Upload size={16} />
              <span>From File</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {installMethod === 'url' ? (
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  Plugin URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/plugin.zip"
                  className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-light-text dark:text-dark-text placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                  disabled={installing}
                />
                <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                  Enter the direct download URL for a plugin ZIP file.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  Plugin File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-light-text dark:text-dark-text file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-light-accent file:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                    disabled={installing}
                  />
                </div>
                <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                  Select a plugin ZIP file from your computer.
                </p>
                {file && (
                  <div className="mt-2 p-2 bg-light-hover dark:bg-dark-hover rounded text-sm">
                    <div className="flex items-center space-x-2">
                      <Upload size={14} />
                      <span className="text-light-text dark:text-dark-text">{file.name}</span>
                      <span className="text-light-text-secondary dark:text-dark-text-secondary">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={installing}
                className="px-4 py-2 text-sm border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={installing || (installMethod === 'url' ? !url.trim() : !file)}
                className="px-4 py-2 text-sm bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50 flex items-center space-x-2"
              >
                {installing && <Download size={14} className="animate-pulse" />}
                <span>{installing ? 'Installing...' : 'Install Plugin'}</span>
              </button>
            </div>
          </form>

          {/* Help text */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
              Plugin Installation
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Plugins extend the functionality of your application. Only install plugins from trusted sources. 
              Plugin files should be ZIP archives containing a manifest.json file and the plugin code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
