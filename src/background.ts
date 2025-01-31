import trackers from './services/trackers';

// Listen for service worker activation
chrome.runtime.onStartup.addListener(async () => {
  try {
    await trackers.init();
  } catch (error) {
    console.error('Failed to initialize trackers on startup:', error);
  }
});

// Listen for service worker installation
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await trackers.init();

    // Create rule for blocking tracking pixels
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],  // Remove existing rule if any
      addRules: [{
        id: 1,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.BLOCK
        },
        condition: {
          urlFilter: '*://*.googleusercontent.com/*',
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.IMAGE]
        }
      }]
    });
  } catch (error) {
    console.error('Failed to initialize service worker:', error);
  }
});

// Handle messages with proper cleanup
chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
  const messageListener = async (data: { id: string, body: string }) => {
    try {
      await trackers.init(); // Ensure trackers are initialized
      const pixel = trackers.match(data.body);
      port.postMessage({ pixel, id: data.id });
    } catch (error) {
      console.error('Failed to process message:', error);
      port.postMessage({ error: 'Failed to process message', id: data.id });
    }
  };

  port.onMessage.addListener(messageListener);

  // Cleanup when port disconnects
  port.onDisconnect.addListener(() => {
    const error = chrome.runtime.lastError;
    if (error) {
      console.error('Port disconnected due to error:', error);
    }
    port.onMessage.removeListener(messageListener);
  });
});
