import Gmailjs from '../vendor/gmail-js';
import * as gmail from './utils/dom';
import * as database from './utils/database';
import indexedDB from './services/indexeddb';
import trackers from './services/trackers';
import messenger from './services/messenger';

class UglyEmail {
  private timer: number | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    try {
      await Promise.all([
        indexedDB.init(),
        trackers.init(),
      ]);

      const currentVersion = await database.getCurrentVersion();

      if (!currentVersion) { // first time setup
        await database.setup(trackers.version);
      } else if (currentVersion !== trackers.version) {
        await database.upgrade(trackers.version);
        await database.flushUntracked();
      }

      this.isInitialized = true;
      this.startObserver();
    } catch (error) {
      console.error('Failed to initialize UglyEmail:', error);
      // Retry initialization after delay
      setTimeout(() => this.init(), 5000);
    }
  }

  private startObserver(): void {
    if (!this.isInitialized) {
      return;
    }

    const observe = async (): Promise<void> => {
      try {
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = null;
        }

        if (Gmailjs.check.is_inside_email()) {
          await gmail.checkThread();
        } else {
          await gmail.checkList();
        }

        this.timer = window.setTimeout(observe, 2500);
      } catch (error) {
        console.error('Observer error:', error);
        // Retry on error after a short delay
        this.timer = window.setTimeout(observe, 5000);
      }
    };

    Gmailjs.observe.on('load', observe);

    // Start initial observation
    observe();
  }

  cleanup(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isInitialized = false;
    
    // Clean up messenger service
    messenger.cleanup();
    
    // Remove Gmail.js observers
    Gmailjs.observe.off('load');
  }
}

// Initialize the extension
const uglyEmail = new UglyEmail();
uglyEmail.init().catch(error => {
  console.error('Failed to start UglyEmail:', error);
});

// Handle cleanup on window unload
window.addEventListener('unload', () => {
  uglyEmail.cleanup();
});
