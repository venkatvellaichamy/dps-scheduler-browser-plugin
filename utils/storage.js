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
  },

  getHeaders: () => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['headers'], function(result) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.headers);
        }
      });
    });
  },

  setHeaders: (headers) => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ headers: headers }, function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          console.log('Headers saved');
          resolve();
        }
      });
    });
  },

  clearLocationsMap: () => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove('locationsMap', function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          console.log('Locations map cleared');
          resolve();
        }
      });
    });
  },

  getLocationsMap: () => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['locationsMap'], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          if (result.locationsMap) {
            const parsedData = JSON.parse(result.locationsMap);
            const locationsMap = new Map(parsedData.data);
            resolve({
              map: locationsMap,
              lastUpdated: parsedData.lastUpdated
            });
          } else {
            resolve(null);
          }
        }
      });
    });
  },

  clearHeaders: () => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove('headers', function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          console.log('Headers cleared');
          resolve();
        }
      });
    });
  }
};