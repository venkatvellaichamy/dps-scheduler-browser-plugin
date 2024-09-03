chrome.runtime.onInstalled.addListener(() => {
  console.log("Service worker installed");
});

// Capture headers for specific API calls
chrome.webRequest.onSendHeaders.addListener(
  function(details) {
    if (details.method === "POST") {
      console.log(`Intercepted POST request to: ${details.url}`);
      const headers = {};
      details.requestHeaders.forEach(header => {
        headers[header.name] = header.value;
      });
      
      // Store headers in chrome.storage.local
      chrome.storage.local.set({ capturedHeaders: headers }, () => {
        console.log('Headers saved successfully:', headers);
      });
    }
  },
  { urls: ["https://apptapi.txdpsscheduler.com/api/*"] },
  ["requestHeaders"]
);

console.error = function(...args) {
  console.log('Error:', ...args);
};

console.log('Unhandled promise rejection logging is not available in service workers');