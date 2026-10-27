type Listener = (data: { event: string; payload: any }) => void;

class AppEventBus {
  private listeners: Set<Listener> = new Set();

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public emit(event: string, payload: any) {
    for (const listener of this.listeners) {
      try {
        listener({ event, payload });
      } catch (err) {
        console.error('Error broadcasting event to listener:', err);
      }
    }
  }

  public getSubscriberCount(): number {
    return this.listeners.size;
  }
}

// Global singleton instance
declare global {
  // eslint-disable-next-line no-var
  var __roonjha_event_bus: AppEventBus | undefined;
}

export const eventBus: AppEventBus = globalThis.__roonjha_event_bus || (globalThis.__roonjha_event_bus = new AppEventBus());
