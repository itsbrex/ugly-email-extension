// Create and inject the main script
const u = document.createElement('script');
u.src = chrome.runtime.getURL('uglyemail.js');

// Add error handling for script loading
u.onerror = (error) => {
  console.error('Failed to load uglyemail.js:', error);
};

(document.head || document.documentElement).appendChild(u);

// Establish connection with retry logic
let connection: chrome.runtime.Port | null = null;
let connectionRetries = 0;
const MAX_RETRIES = 3;

function connectToBackground(): void {
  try {
    connection = chrome.runtime.connect({ name: 'ugly-email' });
    setupConnectionListeners();
  } catch (error) {
    console.error('Failed to establish connection:', error);
    retryConnection();
  }
}

function setupConnectionListeners(): void {
  if (!connection) return;

  connection.onMessage.addListener((message: { id: string; pixel: string; error?: string }) => {
    window.postMessage(
      { ...message, from: 'ugly-email-response' },
      window.location.origin
    );
  });

  connection.onDisconnect.addListener(() => {
    const error = chrome.runtime.lastError;
    if (error) {
      console.error('Connection disconnected:', error);
    }
    connection = null;
    retryConnection();
  });
}

function retryConnection(): void {
  if (connectionRetries < MAX_RETRIES) {
    connectionRetries++;
    setTimeout(connectToBackground, 1000 * connectionRetries);
  } else {
    console.error('Failed to establish connection after maximum retries');
  }
}

// Initialize connection
connectToBackground();

// Set up message listener with type safety
window.addEventListener('message', ({ data, origin }: MessageEvent) => {
  // Only accept messages from the same origin
  if (origin !== window.location.origin) return;

  if (data?.from === 'ugly-email-check' && connection) {
    try {
      connection.postMessage(data);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Attempt to reconnect on message failure
      connection = null;
      retryConnection();
    }
  }
});

// Inject styles
const s = document.createElement('style');
s.appendChild(document.createTextNode(`
.J-J5-Ji .ugly-email-track-icon {
  height: 18px;
  width: 18px;
  margin-top: 4px;
  margin-right: 8px;
}

.ugly-email-track-icon {
  text-align: center;
  line-height: 22px;
  background: white;
  padding: 0 1px;
  border-radius: 100%;
  height: 16px;
  width: 16px;
  float: left;
  margin-right: 5px;
  position: relative;
}
`));

(document.head || document.documentElement).appendChild(s);
