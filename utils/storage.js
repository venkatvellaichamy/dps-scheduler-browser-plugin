const StorageManager = {
  getUserData: () => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['userData'], function(result) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.userData);
        }
      });
    });
  },

  setUserData: (userData) => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({userData: userData}, function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          console.log('User data saved');
          resolve();
        }
      });
    });
  },

  clearUserData: () => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove('userData', function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          console.log('User data cleared');
          resolve();
        }
      });
    });
  },

  clearSavedHeaders: () => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove('lastWorkedHeader', function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          console.log('Saved headers cleared');
          resolve();
        }
      });
    });
  }
};