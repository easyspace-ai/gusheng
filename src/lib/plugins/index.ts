// Plugin system exports
export * from './types';
export * from './api';
export * from './eventBus';
export * from './pluginManager';
export * from './uiManager';
export * from './workspaceManager';

// Re-export instances for easy access
export { globalEventBus } from './eventBus';
export { globalUIManager } from './uiManager';
export { globalWorkspaceManager } from './workspaceManager';

// Plugin system initialization
import { PluginManager } from './pluginManager';
import { globalUIManager } from './uiManager';
import { globalWorkspaceManager } from './workspaceManager';

export const pluginManager = new PluginManager(globalUIManager, globalWorkspaceManager);

// Initialize plugin system
export async function initializePluginSystem(): Promise<void> {
  try {
    console.log('Initializing plugin system...');
    
    // Load enabled plugins
    await pluginManager.loadEnabledPlugins();
    
    console.log('Plugin system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize plugin system:', error);
  }
}

// Plugin system utilities
export class PluginUtils {
  static createPluginManifest(data: Partial<import('./types').PluginManifest>): import('./types').PluginManifest {
    return {
      id: data.id || '',
      name: data.name || '',
      description: data.description || '',
      version: data.version || '1.0.0',
      author: data.author || '',
      main: data.main || 'index.js',
      ...data,
    };
  }
  
  static validateManifest(manifest: import('./types').PluginManifest): boolean {
    const required = ['id', 'name', 'version', 'author', 'main'];
    return required.every(field => Boolean(manifest[field as keyof import('./types').PluginManifest]));
  }
  
  static generatePluginId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  }
  
  static parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.').map(Number);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0,
    };
  }
  
  static compareVersions(a: string, b: string): number {
    const vA = this.parseVersion(a);
    const vB = this.parseVersion(b);
    
    if (vA.major !== vB.major) return vA.major - vB.major;
    if (vA.minor !== vB.minor) return vA.minor - vB.minor;
    return vA.patch - vB.patch;
  }
}

// Plugin development helpers
export abstract class BasePlugin implements import('./types').PluginClass {
  abstract id: string;
  abstract manifest: import('./types').PluginManifest;
  hooks?: import('./types').PluginHooks;
  
  constructor(manifest: import('./types').PluginManifest) {
    this.manifest = manifest;
    this.id = manifest.id;
  }
  
  abstract onLoad(context: import('./types').PluginContext): void | Promise<void>;
  abstract onUnload(context: import('./types').PluginContext): void | Promise<void>;
  
  // Helper methods for plugin development
  protected log(context: import('./types').PluginContext, level: 'info' | 'error' | 'debug' | 'warn', message: string, ...args: any[]): void {
    context.logger[level](message, ...args);
  }
  
  protected emit(context: import('./types').PluginContext, event: string, data?: any): void {
    context.eventBus.emit(event, data);
  }
  
  protected on(context: import('./types').PluginContext, event: string, callback: (data: any) => void): void {
    context.eventBus.on(event, callback);
  }
  
  protected off(context: import('./types').PluginContext, event: string, callback: (data: any) => void): void {
    context.eventBus.off(event, callback);
  }
  
  protected showNotification(context: import('./types').PluginContext, message: string, type?: 'info' | 'success' | 'warning' | 'error'): void {
    context.ui.showNotification(message, type);
  }
  
  protected getConfig(context: import('./types').PluginContext, key: string): any {
    return context.storage.get(key);
  }
  
  protected setConfig(context: import('./types').PluginContext, key: string, value: any): void {
    context.storage.set(key, value);
  }
}

// Plugin hook decorators for easier development
export function Hook(hookName: keyof import('./types').PluginHooks) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!target.hooks) {
      target.hooks = {};
    }
    target.hooks[hookName] = descriptor.value;
  };
}

// Command decorator
export function Command(id: string, name: string, hotkey?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!target.commands) {
      target.commands = [];
    }
    target.commands.push({
      id,
      name,
      callback: propertyKey,
      hotkey,
    });
  };
}

// Menu decorator
export function Menu(id: string, label: string, options?: { icon?: string; parent?: string; position?: string }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!target.menus) {
      target.menus = [];
    }
    target.menus.push({
      id,
      label,
      action: propertyKey,
      ...options,
    });
  };
}
