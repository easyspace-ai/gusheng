import { EventBus as IEventBus } from './types';

export class EventBus implements IEventBus {
  private events: Map<string, Set<(data: any) => void>> = new Map();
  
  on(event: string, callback: (data: any) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }
  
  off(event: string, callback: (data: any) => void): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }
  }
  
  emit(event: string, data?: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
  
  // Remove all listeners for an event
  removeAllListeners(event: string): void {
    this.events.delete(event);
  }
  
  // Remove all listeners for all events
  removeAllListenersForAllEvents(): void {
    this.events.clear();
  }
  
  // Get list of events with listeners
  getEvents(): string[] {
    return Array.from(this.events.keys());
  }
  
  // Get number of listeners for an event
  getListenerCount(event: string): number {
    const callbacks = this.events.get(event);
    return callbacks ? callbacks.size : 0;
  }
}

// Global event bus instance
export const globalEventBus = new EventBus();
