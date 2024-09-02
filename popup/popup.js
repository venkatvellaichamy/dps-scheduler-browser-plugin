console.log('Popup script loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM content loaded');
  PopupManager.checkCurrentPage();
});

function checkContentScriptReady(callback, maxRetries = 5, currentRetry = 0) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length === 0) {
      console.error('No active tab found');
      return;
    }
    chrome.tabs.sendMessage(tabs[0].id, { action: "ping" }, function(response) {
      if (chrome.runtime.lastError) {
        if (currentRetry < maxRetries) {
          console.log(`Content script not ready, retrying in 1 second (attempt ${currentRetry + 1}/${maxRetries})`);
          setTimeout(() => checkContentScriptReady(callback, maxRetries, currentRetry + 1), 1000);
        } else {
          console.error("Max retries reached. Content script might not be loaded.");
          DOMUtils.showError("general", "Extension not ready. Please refresh the page and try again.");
        }
      } else {
        console.log("Content script is ready");
        callback();
      }
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "cityProcessingStopped":
      console.log(`City processing stopped: ${request.reason}`);
      break;
    case "processError":
      console.error(`Process error: ${request.error}`);
      DOMUtils.enableAllInputs();
      break;
    case "disableFields":
      console.log("Received message to disable fields");
      DOMUtils.disableAllInputs();
      break;
    case "processCompleted":
      console.log("Filling data is completed. Start city processing by clicking the start city processing button.");
      break;
    default:
      console.log("Unknown action:", request.action);
  }
});
