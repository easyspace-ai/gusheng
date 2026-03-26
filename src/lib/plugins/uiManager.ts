import React from 'react';
import { 
  UIManager as IUIManager, 
  PluginMenu, 
  PluginPanel, 
  PluginCommand 
} from './types';
import { globalEventBus } from './eventBus';

export class UIManager implements IUIManager {
  private menus: Map<string, PluginMenu> = new Map();
  private panels: Map<string, PluginPanel> = new Map();
  private commands: Map<string, PluginCommand> = new Map();
  private modals: Map<string, { component: React.ComponentType; props?: any }> = new Map();
  
  // Menu management
  addMenuItem(item: PluginMenu): void {
    this.menus.set(item.id, item);
    globalEventBus.emit('ui:menu-added', item);
  }
  
  removeMenuItem(id: string): void {
    const menu = this.menus.get(id);
    if (menu) {
      this.menus.delete(id);
      globalEventBus.emit('ui:menu-removed', { id });
    }
  }
  
  getMenuItems(): PluginMenu[] {
    return Array.from(this.menus.values());
  }
  
  getMenuItem(id: string): PluginMenu | undefined {
    return this.menus.get(id);
  }
  
  // Panel management
  addPanel(panel: PluginPanel): void {
    this.panels.set(panel.id, panel);
    globalEventBus.emit('ui:panel-added', panel);
  }
  
  removePanel(id: string): void {
    const panel = this.panels.get(id);
    if (panel) {
      this.panels.delete(id);
      globalEventBus.emit('ui:panel-removed', { id });
    }
  }
  
  getPanels(): PluginPanel[] {
    return Array.from(this.panels.values());
  }
  
  getPanel(id: string): PluginPanel | undefined {
    return this.panels.get(id);
  }
  
  // Command management
  addCommand(command: PluginCommand): void {
    this.commands.set(command.id, command);
    globalEventBus.emit('ui:command-added', command);
  }
  
  removeCommand(id: string): void {
    const command = this.commands.get(id);
    if (command) {
      this.commands.delete(id);
      globalEventBus.emit('ui:command-removed', { id });
    }
  }
  
  getCommands(): PluginCommand[] {
    return Array.from(this.commands.values());
  }
  
  getCommand(id: string): PluginCommand | undefined {
    return this.commands.get(id);
  }
  
  // Modal management
  showModal(content: React.ComponentType, props?: any): void {
    const modalId = `modal-${Date.now()}`;
    this.modals.set(modalId, { component: content, props });
    globalEventBus.emit('ui:modal-show', { id: modalId, component: content, props });
  }
  
  hideModal(id: string): void {
    if (this.modals.has(id)) {
      this.modals.delete(id);
      globalEventBus.emit('ui:modal-hide', { id });
    }
  }
  
  // Notification management
  showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    globalEventBus.emit('ui:notification-show', { message, type });
  }
  
  // Menu organization helpers
  getMenuItemsByParent(parentId?: string): PluginMenu[] {
    return Array.from(this.menus.values()).filter(menu => menu.parent === parentId);
  }
  
  getMenuTree(): PluginMenu[] {
    const rootMenus = this.getMenuItemsByParent();
    
    const buildTree = (menu: PluginMenu): PluginMenu => {
      const children = this.getMenuItemsByParent(menu.id);
      return {
        ...menu,
        children: children.map(buildTree),
      };
    };
    
    return rootMenus.map(buildTree);
  }
  
  // Panel organization helpers
  getPanelsByPosition(position: 'left' | 'right' | 'bottom'): PluginPanel[] {
    return Array.from(this.panels.values()).filter(panel => panel.position === position);
  }
  
  // Command execution
  async executeCommand(id: string, args: string[] = []): Promise<any> {
    const command = this.commands.get(id);
    if (!command) {
      throw new Error(`Command ${id} not found`);
    }
    
    // Emit command execution event
    globalEventBus.emit('ui:command-execute', { id, args });
    
    // In a real implementation, this would call the plugin's command handler
    // For now, we'll just emit an event
    return { success: true, command: id, args };
  }
  
  // Cleanup
  clear(): void {
    this.menus.clear();
    this.panels.clear();
    this.commands.clear();
    this.modals.clear();
  }
  
  // Event listeners for React components
  onMenuAdded(callback: (menu: PluginMenu) => void): () => void {
    globalEventBus.on('ui:menu-added', callback);
    return () => globalEventBus.off('ui:menu-added', callback);
  }
  
  onMenuRemoved(callback: (data: { id: string }) => void): () => void {
    globalEventBus.on('ui:menu-removed', callback);
    return () => globalEventBus.off('ui:menu-removed', callback);
  }
  
  onPanelAdded(callback: (panel: PluginPanel) => void): () => void {
    globalEventBus.on('ui:panel-added', callback);
    return () => globalEventBus.off('ui:panel-added', callback);
  }
  
  onPanelRemoved(callback: (data: { id: string }) => void): () => void {
    globalEventBus.on('ui:panel-removed', callback);
    return () => globalEventBus.off('ui:panel-removed', callback);
  }
  
  onCommandAdded(callback: (command: PluginCommand) => void): () => void {
    globalEventBus.on('ui:command-added', callback);
    return () => globalEventBus.off('ui:command-added', callback);
  }
  
  onCommandRemoved(callback: (data: { id: string }) => void): () => void {
    globalEventBus.on('ui:command-removed', callback);
    return () => globalEventBus.off('ui:command-removed', callback);
  }
  
  onModalShow(callback: (data: { id: string; component: React.ComponentType; props?: any }) => void): () => void {
    globalEventBus.on('ui:modal-show', callback);
    return () => globalEventBus.off('ui:modal-show', callback);
  }
  
  onModalHide(callback: (data: { id: string }) => void): () => void {
    globalEventBus.on('ui:modal-hide', callback);
    return () => globalEventBus.off('ui:modal-hide', callback);
  }
  
  onNotificationShow(callback: (data: { message: string; type: string }) => void): () => void {
    globalEventBus.on('ui:notification-show', callback);
    return () => globalEventBus.off('ui:notification-show', callback);
  }
  
  onCommandExecute(callback: (data: { id: string; args: string[] }) => void): () => void {
    globalEventBus.on('ui:command-execute', callback);
    return () => globalEventBus.off('ui:command-execute', callback);
  }
}

// Global UI manager instance
export const globalUIManager = new UIManager();
