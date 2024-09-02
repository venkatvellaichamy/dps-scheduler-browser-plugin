const APIManager = {
  sendMessageToActiveTab: (message) => {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length === 0) {
          console.error('No active tab found');
          reject(new Error('No active tab found'));
          return;
        }
        chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
          if (chrome.runtime.lastError) {
            console.warn('Error in sendMessageToActiveTab:', chrome.runtime.lastError.message);
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            console.log('Message sent successfully:', message);
            resolve(response);
          }
        });
      });
    });
  },

  getCurrentTabUrl: () => {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length > 0) {
          console.log('Current tab URL:', tabs[0].url);
          resolve(tabs[0].url);
        } else {
          console.error('No active tab found');
          reject(new Error('No active tab found'));
        }
      });
    });
  }
};