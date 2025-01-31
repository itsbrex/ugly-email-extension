interface MessageData {
  id: string;
  body?: string;
  pixel?: string;
  from: string;
  error?: string;
}

type Resolver = {
  [id: string]: (val: string | null) => void;
};

export class UglyMessenger {
  private resolvers: Resolver = {};
  private readonly TIMEOUT = 5000; // 5 second timeout for responses

  constructor() {
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  private handleMessage(event: MessageEvent<MessageData>): void {
    // Only accept messages from the same origin
    if (event.origin !== window.location.origin) return;

    const { data } = event;
    
    if (data?.from === 'ugly-email-response' && data.id && this.resolvers[data.id]) {
      try {
        this.resolvers[data.id]?.call(this, data.pixel || null);
      } catch (error) {
        console.error('Error handling message response:', error);
      } finally {
        // Cleanup resolver
        delete this.resolvers[data.id];
      }
    }
  }

  postMessage(id: string, body: string): Promise<string|null> {
    return new Promise((resolve, reject) => {
      // Set timeout to prevent hanging promises
      const timeoutId = setTimeout(() => {
        delete this.resolvers[id];
        reject(new Error('Message response timeout'));
      }, this.TIMEOUT);

      // Store resolver with cleanup
      this.resolvers[id] = (val: string | null) => {
        clearTimeout(timeoutId);
        resolve(val);
      };

      try {
        window.postMessage({
          id,
          body,
          from: 'ugly-email-check'
        } as MessageData, window.location.origin);
      } catch (error) {
        clearTimeout(timeoutId);
        delete this.resolvers[id];
        reject(error);
      }
    });
  }

  // Cleanup method for proper resource management
  cleanup(): void {
    window.removeEventListener('message', this.handleMessage.bind(this));
    this.resolvers = {};
  }
}

export default new UglyMessenger();
