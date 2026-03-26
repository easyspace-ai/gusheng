import { WorkspaceManager as IWorkspaceManager } from './types';
import { globalEventBus } from './eventBus';

export class WorkspaceManager implements IWorkspaceManager {
  private currentFile: { path: string; content: string } | null = null;
  private currentSelection: { start: number; end: number } | null = null;
  private files: any[] = [];
  
  constructor() {
    // Listen for workspace events
    this.initializeEventListeners();
  }
  
  private initializeEventListeners(): void {
    // Listen for file changes from the main app
    globalEventBus.on('workspace:file-opened', (data) => {
      this.currentFile = data;
      globalEventBus.emit('file:opened', data);
    });
    
    globalEventBus.on('workspace:file-created', (data) => {
      this.files.push(data);
      globalEventBus.emit('file:created', data);
    });
    
    globalEventBus.on('workspace:file-deleted', (data) => {
      this.files = this.files.filter(f => f.path !== data.path);
      if (this.currentFile?.path === data.path) {
        this.currentFile = null;
      }
      globalEventBus.emit('file:deleted', data);
    });
    
    globalEventBus.on('workspace:file-modified', (data) => {
      if (this.currentFile?.path === data.path) {
        this.currentFile.content = data.content;
      }
      globalEventBus.emit('file:modified', data);
    });
    
    globalEventBus.on('workspace:selection-changed', (data) => {
      this.currentSelection = data;
      globalEventBus.emit('editor:selection-changed', data);
    });
    
    globalEventBus.on('workspace:content-changed', (data) => {
      if (this.currentFile) {
        this.currentFile.content = data.content;
      }
      globalEventBus.emit('editor:content-changed', data);
    });
  }
  
  getActiveFile(): { path: string; content: string } | null {
    return this.currentFile;
  }
  
  async openFile(path: string): Promise<void> {
    try {
      // In a real implementation, this would call the file system API
      const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error(`Failed to open file: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.currentFile = {
        path: data.path,
        content: data.content,
      };
      
      // Emit file opened event to main app
      globalEventBus.emit('workspace:request-file-open', { path });
      
    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    }
  }
  
  async createFile(path: string, content: string = ''): Promise<void> {
    try {
      const response = await fetch('/api/file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, content }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create file: ${response.statusText}`);
      }
      
      // Add to local files list
      const newFile = { path, content, type: 'file' };
      this.files.push(newFile);
      
      // Emit file created event
      globalEventBus.emit('workspace:file-created', newFile);
      
    } catch (error) {
      console.error('Failed to create file:', error);
      throw error;
    }
  }
  
  async deleteFile(path: string): Promise<void> {
    try {
      const response = await fetch(`/api/path?path=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }
      
      // Remove from local files list
      this.files = this.files.filter(f => f.path !== path);
      
      // Clear current file if it was deleted
      if (this.currentFile?.path === path) {
        this.currentFile = null;
      }
      
      // Emit file deleted event
      globalEventBus.emit('workspace:file-deleted', { path });
      
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }
  
  async getFiles(): Promise<any[]> {
    try {
      // In a real implementation, this would call the file tree API
      const response = await fetch('/api/tree');
      if (!response.ok) {
        throw new Error(`Failed to get files: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.files = this.flattenFileTree(data);
      return this.files;
      
    } catch (error) {
      console.error('Failed to get files:', error);
      return this.files; // Return cached files on error
    }
  }
  
  private flattenFileTree(node: any): any[] {
    const files: any[] = [];
    
    if (node.type === 'file') {
      files.push(node);
    } else if (node.children) {
      for (const child of node.children) {
        files.push(...this.flattenFileTree(child));
      }
    }
    
    return files;
  }
  
  getCurrentSelection(): { start: number; end: number } | null {
    return this.currentSelection;
  }
  
  insertText(text: string): void {
    // Emit text insertion request to main app
    globalEventBus.emit('workspace:request-text-insert', { text });
  }
  
  replaceSelection(text: string): void {
    // Emit text replacement request to main app
    globalEventBus.emit('workspace:request-selection-replace', { text });
  }
  
  // Additional helper methods
  async saveCurrentFile(): Promise<void> {
    if (!this.currentFile) {
      throw new Error('No active file to save');
    }
    
    try {
      const response = await fetch('/api/file', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: this.currentFile.path,
          content: this.currentFile.content,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save file: ${response.statusText}`);
      }
      
      // Emit file saved event
      globalEventBus.emit('workspace:file-saved', this.currentFile);
      
    } catch (error) {
      console.error('Failed to save file:', error);
      throw error;
    }
  }
  
  setCurrentFile(file: { path: string; content: string }): void {
    this.currentFile = file;
  }
  
  updateCurrentFileContent(content: string): void {
    if (this.currentFile) {
      this.currentFile.content = content;
    }
  }
  
  setCurrentSelection(selection: { start: number; end: number } | null): void {
    this.currentSelection = selection;
  }
  
  // File filtering and searching
  findFilesByPattern(pattern: RegExp): any[] {
    return this.files.filter(file => pattern.test(file.path));
  }
  
  findFileByPath(path: string): any | null {
    return this.files.find(file => file.path === path) || null;
  }
  
  getFilesByExtension(extension: string): any[] {
    return this.files.filter(file => file.path.endsWith(extension));
  }
  
  // Workspace state
  getWorkspaceState() {
    return {
      currentFile: this.currentFile,
      currentSelection: this.currentSelection,
      fileCount: this.files.length,
    };
  }
}

// Global workspace manager instance
export const globalWorkspaceManager = new WorkspaceManager();
