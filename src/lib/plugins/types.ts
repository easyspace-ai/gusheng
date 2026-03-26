// Plugin system types
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  tags: string[];
  main_file: string;
  asset_files: string[];
  manifest: string;
  installed: boolean;
  enabled: boolean;
  install_path?: string;
  created_at: string;
  updated_at: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  tags?: string[];
  main: string;
  assets?: string[];
  minAppVersion?: string;
  dependencies?: Record<string, string>;
  permissions?: string[];
  config?: Record<string, any>;
  hooks?: Record<string, any>;
  commands?: PluginCommand[];
  menus?: PluginMenu[];
}

export interface PluginCommand {
  id: string;
  name: string;
  callback: string;
  hotkey?: string;
}

export interface PluginMenu {
  id: string;
  label: string;
  icon?: string;
  parent?: string;
  position?: string;
  action: string;
  children?: PluginMenu[];
}

export interface PluginRegistry {
  id: string;
  name: string;
  url: string;
  description: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PluginEvent {
  type: string;
  plugin_id: string;
  timestamp: string;
  data?: any;
}

// Plugin context and runtime types
export interface PluginContext {
  pluginId: string;
  pluginPath: string;
  app: AppContext;
  eventBus: EventBus;
  logger: Logger;
  storage: Storage;
  ui: UIManager;
  workspace: WorkspaceManager;
}

export interface AppContext {
  version: string;
  workspace: {
    path: string;
    files: any[];
  };
  currentFile?: {
    path: string;
    content: string;
  };
  selection?: {
    start: number;
    end: number;
  };
}

export interface EventBus {
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;
  emit(event: string, data?: any): void;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
}

export interface Storage {
  get(key: string): any;
  set(key: string, value: any): void;
  remove(key: string): void;
  clear(): void;
}

export interface UIManager {
  addMenuItem(item: PluginMenu): void;
  removeMenuItem(id: string): void;
  showModal(content: React.ComponentType, props?: any): void;
  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
  addPanel(panel: PluginPanel): void;
  removePanel(id: string): void;
  addCommand(command: PluginCommand): void;
  removeCommand(id: string): void;
}

export interface WorkspaceManager {
  getActiveFile(): { path: string; content: string } | null;
  openFile(path: string): Promise<void>;
  createFile(path: string, content?: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  getFiles(): Promise<any[]>;
  getCurrentSelection(): { start: number; end: number } | null;
  insertText(text: string): void;
  replaceSelection(text: string): void;
}

export interface PluginPanel {
  id: string;
  title: string;
  icon?: string;
  position: 'left' | 'right' | 'bottom';
  content?: string; // HTML content or component reference
  component?: React.ComponentType<{ context: PluginContext }>;
}

// Plugin lifecycle hooks
export interface PluginHooks {
  onLoad?: (context: PluginContext) => void | Promise<void>;
  onUnload?: (context: PluginContext) => void | Promise<void>;
  onFileOpen?: (context: PluginContext, file: any) => void | Promise<void>;
  onFileCreate?: (context: PluginContext, file: any) => void | Promise<void>;
  onFileDelete?: (context: PluginContext, file: any) => void | Promise<void>;
  onFileModify?: (context: PluginContext, file: any) => void | Promise<void>;
  onSelectionChange?: (context: PluginContext, selection: any) => void | Promise<void>;
  onEditorChange?: (context: PluginContext, content: string) => void | Promise<void>;
}

// Plugin class interface
export interface PluginClass {
  id: string;
  manifest: PluginManifest;
  hooks?: PluginHooks;
  onLoad(context: PluginContext): void | Promise<void>;
  onUnload(context: PluginContext): void | Promise<void>;
}

// Plugin API response types
export interface PluginListResponse {
  plugins: Plugin[];
}

export interface PluginResponse {
  plugin: Plugin;
}

export interface PluginConfigResponse {
  config: Record<string, any>;
}

export interface RegistryListResponse {
  registries: PluginRegistry[];
}

export interface MenuListResponse {
  menus: PluginMenu[];
}

export interface PanelListResponse {
  panels: PluginPanel[];
}

export interface CommandExecuteResponse {
  result: any;
}

export interface HookExecuteResponse {
  results: any[];
}
