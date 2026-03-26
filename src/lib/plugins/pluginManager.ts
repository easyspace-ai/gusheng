import { 
  Plugin, 
  PluginClass, 
  PluginContext, 
  PluginManifest,
  PluginPanel,
  PluginMenu,
  PluginCommand,
  Logger,
  Storage,
  UIManager,
  WorkspaceManager,
  AppContext 
} from './types';
import { EventBus, globalEventBus } from './eventBus';
import { PluginAPI } from './api';

export class PluginManager {
  private loadedPlugins: Map<string, PluginClass> = new Map();
  private pluginContexts: Map<string, PluginContext> = new Map();
  private eventBus: EventBus = globalEventBus;
  private uiManager: UIManager;
  private workspaceManager: WorkspaceManager;
  
  constructor(uiManager: UIManager, workspaceManager: WorkspaceManager) {
    this.uiManager = uiManager;
    this.workspaceManager = workspaceManager;
    
    // Initialize system event listeners
    this.initializeSystemEvents();
  }
  
  private initializeSystemEvents(): void {
    // Listen for file system events
    this.eventBus.on('file:opened', (data) => {
      this.executeHook('onFileOpen', data);
    });
    
    this.eventBus.on('file:created', (data) => {
      this.executeHook('onFileCreate', data);
    });
    
    this.eventBus.on('file:deleted', (data) => {
      this.executeHook('onFileDelete', data);
    });
    
    this.eventBus.on('file:modified', (data) => {
      this.executeHook('onFileModify', data);
    });
    
    this.eventBus.on('editor:selection-changed', (data) => {
      this.executeHook('onSelectionChange', data);
    });
    
    this.eventBus.on('editor:content-changed', (data) => {
      this.executeHook('onEditorChange', data);
    });
  }
  
  // Load a plugin
  async loadPlugin(plugin: Plugin): Promise<void> {
    if (this.loadedPlugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already loaded`);
    }
    
    try {
      // Parse manifest
      const manifest: PluginManifest = JSON.parse(plugin.manifest);
      
      // Create plugin context
      const context = this.createPluginContext(plugin.id, manifest);
      
      // Load plugin code dynamically
      const pluginModule = await this.loadPluginModule(plugin);
      
      // Create plugin instance
      const pluginInstance: PluginClass = new pluginModule.default(manifest);
      
      // Store plugin and context
      this.loadedPlugins.set(plugin.id, pluginInstance);
      this.pluginContexts.set(plugin.id, context);
      
      // Call onLoad hook
      if (pluginInstance.onLoad) {
        await pluginInstance.onLoad(context);
      }
      
      // Register plugin commands
      if (manifest.commands) {
        manifest.commands.forEach(command => {
          this.uiManager.addCommand({
            ...command,
            id: `${plugin.id}:${command.id}`,
          });
        });
      }
      
      // Register plugin menus
      if (manifest.menus) {
        manifest.menus.forEach(menu => {
          this.uiManager.addMenuItem({
            ...menu,
            id: `${plugin.id}:${menu.id}`,
          });
        });
      }
      
      this.eventBus.emit('plugin:loaded', { pluginId: plugin.id });
      
    } catch (error) {
      console.error(`Failed to load plugin ${plugin.id}:`, error);
      throw error;
    }
  }
  
  // Unload a plugin
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginId);
    const context = this.pluginContexts.get(pluginId);
    
    if (!plugin || !context) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }
    
    try {
      // Call onUnload hook
      if (plugin.onUnload) {
        await plugin.onUnload(context);
      }
      
      // Remove plugin commands
      if (plugin.manifest.commands) {
        plugin.manifest.commands.forEach(command => {
          this.uiManager.removeCommand(`${pluginId}:${command.id}`);
        });
      }
      
      // Remove plugin menus
      if (plugin.manifest.menus) {
        plugin.manifest.menus.forEach(menu => {
          this.uiManager.removeMenuItem(`${pluginId}:${menu.id}`);
        });
      }
      
      // Clean up context
      this.loadedPlugins.delete(pluginId);
      this.pluginContexts.delete(pluginId);
      
      this.eventBus.emit('plugin:unloaded', { pluginId });
      
    } catch (error) {
      console.error(`Failed to unload plugin ${pluginId}:`, error);
      throw error;
    }
  }
  
  // Load all enabled plugins
  async loadEnabledPlugins(): Promise<void> {
    try {
      const plugins = await PluginAPI.getPlugins({ enabled: true });
      
      if (plugins && Array.isArray(plugins)) {
        for (const plugin of plugins) {
          try {
            await this.loadPlugin(plugin);
          } catch (error) {
            console.error(`Failed to load plugin ${plugin.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load enabled plugins:', error);
    }
  }
  
  // Execute hook for all loaded plugins
  private executeHook(hookName: keyof PluginClass['hooks'], data: any): void {
    this.loadedPlugins.forEach((plugin, pluginId) => {
      const context = this.pluginContexts.get(pluginId);
      if (plugin.hooks && plugin.hooks[hookName] && context) {
        try {
          plugin.hooks[hookName]!(context, data);
        } catch (error) {
          console.error(`Error executing hook ${hookName} for plugin ${pluginId}:`, error);
        }
      }
    });
  }
  
  // Create plugin context
  private createPluginContext(pluginId: string, manifest: PluginManifest): PluginContext {
    const logger = new PluginLogger(pluginId);
    const storage = new PluginStorage(pluginId);
    const appContext = this.getAppContext();
    
    return {
      pluginId,
      pluginPath: `/plugins/${pluginId}`,
      app: appContext,
      eventBus: this.eventBus,
      logger,
      storage,
      ui: this.uiManager,
      workspace: this.workspaceManager,
    };
  }
  
  // Get current app context
  private getAppContext(): AppContext {
    return {
      version: '1.0.0', // TODO: Get from app
      workspace: {
        path: '/workspace', // TODO: Get actual workspace path
        files: [], // TODO: Get actual files
      },
      currentFile: this.workspaceManager.getActiveFile(),
      selection: this.workspaceManager.getCurrentSelection(),
    };
  }
  
  // Load plugin module dynamically
  private async loadPluginModule(plugin: Plugin): Promise<any> {
    // In a real implementation, this would load the plugin's JavaScript/TypeScript code
    // For now, we'll simulate this with a mock module
    return {
      default: class MockPlugin implements PluginClass {
        id: string;
        manifest: PluginManifest;
        
        constructor(manifest: PluginManifest) {
          this.id = manifest.id;
          this.manifest = manifest;
        }
        
        async onLoad(context: PluginContext): Promise<void> {
          context.logger.info(`Plugin ${this.id} loaded`);
        }
        
        async onUnload(context: PluginContext): Promise<void> {
          context.logger.info(`Plugin ${this.id} unloaded`);
        }
      }
    };
  }
  
  // Get loaded plugin
  getLoadedPlugin(pluginId: string): PluginClass | undefined {
    return this.loadedPlugins.get(pluginId);
  }
  
  // Get plugin context
  getPluginContext(pluginId: string): PluginContext | undefined {
    return this.pluginContexts.get(pluginId);
  }
  
  // Check if plugin is loaded
  isPluginLoaded(pluginId: string): boolean {
    return this.loadedPlugins.has(pluginId);
  }
  
  // Get all loaded plugins
  getLoadedPlugins(): string[] {
    return Array.from(this.loadedPlugins.keys());
  }
}

// Plugin Logger implementation
class PluginLogger implements Logger {
  constructor(private pluginId: string) {}
  
  info(message: string, ...args: any[]): void {
    console.log(`[Plugin:${this.pluginId}] INFO:`, message, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    console.error(`[Plugin:${this.pluginId}] ERROR:`, message, ...args);
  }
  
  debug(message: string, ...args: any[]): void {
    console.debug(`[Plugin:${this.pluginId}] DEBUG:`, message, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    console.warn(`[Plugin:${this.pluginId}] WARN:`, message, ...args);
  }
}

// Plugin Storage implementation
class PluginStorage implements Storage {
  private storageKey: string;
  
  constructor(pluginId: string) {
    this.storageKey = `plugin:${pluginId}`;
  }
  
  get(key: string): any {
    try {
      const data = localStorage.getItem(`${this.storageKey}:${key}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
  
  set(key: string, value: any): void {
    try {
      localStorage.setItem(`${this.storageKey}:${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save plugin data:', error);
    }
  }
  
  remove(key: string): void {
    localStorage.removeItem(`${this.storageKey}:${key}`);
  }
  
  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.storageKey)) {
        localStorage.removeItem(key);
      }
    });
  }
}
