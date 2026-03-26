import {
  Plugin,
  PluginListResponse,
  PluginResponse,
  PluginConfigResponse,
  RegistryListResponse,
  MenuListResponse,
  CommandExecuteResponse,
  HookExecuteResponse,
} from './types';

const API_BASE = '/api';

// Plugin management API
export class PluginAPI {
  // Get all plugins
  static async getPlugins(options?: {
    installed?: boolean;
    enabled?: boolean;
  }): Promise<Plugin[]> {
    const params = new URLSearchParams();
    if (options?.installed) params.append('installed', 'true');
    if (options?.enabled) params.append('enabled', 'true');
    
    const url = `${API_BASE}/plugins${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch plugins: ${response.statusText}`);
    }
    
    const data: PluginListResponse = await response.json();
    const plugins = data.plugins || [];
    
    // Convert tags and asset_files from JSON strings to arrays
    return plugins.map(plugin => ({
      ...plugin,
      tags: typeof plugin.tags === 'string' ? JSON.parse(plugin.tags) : plugin.tags,
      asset_files: typeof plugin.asset_files === 'string' ? JSON.parse(plugin.asset_files) : plugin.asset_files
    }));
  }

  // Get a specific plugin
  static async getPlugin(id: string): Promise<Plugin> {
    const response = await fetch(`${API_BASE}/plugins/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch plugin ${id}: ${response.statusText}`);
    }
    
    const data: PluginResponse = await response.json();
    const plugin = data.plugin;
    
    // Convert tags and asset_files from JSON strings to arrays
    return {
      ...plugin,
      tags: typeof plugin.tags === 'string' ? JSON.parse(plugin.tags) : plugin.tags,
      asset_files: typeof plugin.asset_files === 'string' ? JSON.parse(plugin.asset_files) : plugin.asset_files
    };
  }

  // Install plugin from URL
  static async installPlugin(url: string): Promise<Plugin> {
    const response = await fetch(`${API_BASE}/plugins/install`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to install plugin: ${response.statusText}`);
    }
    
    const data: PluginResponse = await response.json();
    return data.plugin;
  }

  // Install plugin from file
  static async installPluginFromFile(file: File): Promise<Plugin> {
    const formData = new FormData();
    formData.append('plugin', file);
    
    const response = await fetch(`${API_BASE}/plugins/install-file`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to install plugin from file: ${response.statusText}`);
    }
    
    const data: PluginResponse = await response.json();
    return data.plugin;
  }

  // Uninstall plugin
  static async uninstallPlugin(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/plugins/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to uninstall plugin ${id}: ${response.statusText}`);
    }
  }

  // Enable plugin
  static async enablePlugin(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/plugins/${id}/enable`, {
      method: 'PUT',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to enable plugin ${id}: ${response.statusText}`);
    }
  }

  // Disable plugin
  static async disablePlugin(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/plugins/${id}/disable`, {
      method: 'PUT',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to disable plugin ${id}: ${response.statusText}`);
    }
  }

  // Search plugins
  static async searchPlugins(query: string): Promise<Plugin[]> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    
    const response = await fetch(`${API_BASE}/plugins/search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to search plugins: ${response.statusText}`);
    }
    
    const data: PluginListResponse = await response.json();
    return data.plugins;
  }

  // Get plugin configuration
  static async getPluginConfig(id: string): Promise<Record<string, any>> {
    const response = await fetch(`${API_BASE}/plugins/${id}/config`);
    if (!response.ok) {
      throw new Error(`Failed to get plugin config: ${response.statusText}`);
    }
    
    const data: PluginConfigResponse = await response.json();
    return data.config;
  }

  // Set plugin configuration
  static async setPluginConfig(id: string, config: Record<string, any>): Promise<void> {
    const response = await fetch(`${API_BASE}/plugins/${id}/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to set plugin config: ${response.statusText}`);
    }
  }

  // Get plugin registries
  static async getRegistries() {
    const response = await fetch(`${API_BASE}/plugins/registries`);
    if (!response.ok) {
      throw new Error(`Failed to fetch registries: ${response.statusText}`);
    }
    
    const data: RegistryListResponse = await response.json();
    return data.registries;
  }

  // Add plugin registry
  static async addRegistry(name: string, url: string, description?: string): Promise<void> {
    const response = await fetch(`${API_BASE}/plugins/registries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, url, description }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add registry: ${response.statusText}`);
    }
  }

  // Get runtime menus
  static async getRuntimeMenus() {
    const response = await fetch(`${API_BASE}/plugins/runtime/menus`);
    if (!response.ok) {
      throw new Error(`Failed to fetch runtime menus: ${response.statusText}`);
    }
    
    const data: MenuListResponse = await response.json();
    return data.menus;
  }

  // Get runtime panels
  static async getRuntimePanels() {
    const response = await fetch(`${API_BASE}/plugins/runtime/panels`);
    if (!response.ok) {
      throw new Error(`Failed to fetch runtime panels: ${response.statusText}`);
    }
    
    const data: PanelListResponse = await response.json();
    return data.panels;
  }

  // Execute plugin command
  static async executeCommand(commandId: string, args: string[] = []): Promise<any> {
    const response = await fetch(`${API_BASE}/plugins/runtime/commands/${commandId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ args }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to execute command: ${response.statusText}`);
    }
    
    const data: CommandExecuteResponse = await response.json();
    return data.result;
  }

  // Execute plugin hook
  static async executeHook(hookName: string, data?: any): Promise<any[]> {
    const response = await fetch(`${API_BASE}/plugins/runtime/hooks/${hookName}/execute`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to execute hook: ${response.statusText}`);
    }
    
    const result: HookExecuteResponse = await response.json();
    return result.results;
  }
}
