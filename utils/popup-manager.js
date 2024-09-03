const PopupManager = {
  checkCurrentPage: () => {
    console.log('Checking current page');
    APIManager.getCurrentTabUrl().then(url => {
      console.log('Current URL:', url);
      if (url && url.includes('public.txdpsscheduler.com')) {
        checkContentScriptReady(() => {
          DOMUtils.showForm();
          DOMUtils.hideNotAllowedMessage();
          PopupManager.initializeForSupportedSite();
        });
      } else {
        DOMUtils.hideForm();
        DOMUtils.showNotAllowedMessage();
      }
    }).catch(error => {
      console.error('Error checking current page:', error.message);
      DOMUtils.hideForm();
      DOMUtils.showNotAllowedMessage();
    });
  },

  initializeForSupportedSite: () => {
    const { loadSavedData, setupEventListeners } = PopupManager;
    loadSavedData();
    setupEventListeners();
    PopupManager.checkProgressBar();
  },

  checkProgressBar: () => {
    console.log('Checking progress bar');
    APIManager.sendMessageToActiveTab({ action: "checkProgressBar" })
      .then(response => {
        console.log('Progress bar check response:', response);
        if (response && response.progressBarFound) {
          DOMUtils.disableAllInputs();
        }
      })
      .catch(error => console.error('Error checking progress bar:', error.message));
  },

  setupEventListeners: () => {
    console.log('Setting up event listeners');
    document.getElementById('userForm').addEventListener('submit', PopupManager.handleFormSubmit);
    document.getElementById('resetButton').addEventListener('click', PopupManager.resetAllData);
    document.getElementById('cellPhone').addEventListener('input', DOMUtils.formatPhoneNumber);
    document.getElementById('dob').addEventListener('input', DOMUtils.formatDateOfBirth);
    document.getElementById('city').addEventListener('input', PopupManager.handleCityInput);
    document.getElementById('city').addEventListener('blur', PopupManager.hideAutocomplete);
    document.getElementById('fetchLocationsButton').addEventListener('click', PopupManager.fetchAvailableLocations);
    document.getElementById('showStoredLocationsButton').addEventListener('click', PopupManager.showStoredLocations);
  },

  handleCityInput: (e) => {
    const input = e.target.value.toLowerCase();
    const matchingCities = PopupManager.cities.filter(city => 
      city.Name.toLowerCase().startsWith(input)
    ).slice(0, 5); // Limit to 5 suggestions

    PopupManager.showAutocomplete('cityAutocomplete', matchingCities, (city) => {
      document.getElementById('city').value = city.Name;
      document.getElementById('zipcode').value = city.Zip;
      PopupManager.hideAutocomplete();
    });
  },

  showAutocomplete: (containerId, items, onSelect) => {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    items.forEach(item => {
      const div = document.createElement('div');
      div.innerHTML = `${item.Name} (${item.Zip})`;
      div.addEventListener('click', () => {
        onSelect(item);
      });
      div.addEventListener('mousedown', (e) => {
        // Prevent the blur event from firing on the input
        e.preventDefault();
      });
      container.appendChild(div);
    });
    container.style.display = 'block';
  },

  hideAutocomplete: () => {
    const container = document.getElementById('cityAutocomplete');
    setTimeout(() => {
      container.style.display = 'none';
    }, 200); // Small delay to allow click events on autocomplete items
  },

  loadSupportedCities: () => {
    return fetch(chrome.runtime.getURL('data/supported_cities.json'))
      .then(response => response.json())
      .then(data => {
        PopupManager.cities = data.Cities;
        console.log(`Loaded ${PopupManager.cities.length} cities`);
      })
      .catch(error => console.error('Error loading supported cities:', error));
  },

  init: () => {
    PopupManager.loadSupportedCities().then(() => {
      PopupManager.checkCurrentPage();
    });
  },

  handleFormSubmit: (e) => {
    e.preventDefault();
    const userData = DOMUtils.getUserDataFromForm();
    if (DOMUtils.validateForm(userData)) {
      StorageManager.setUserData(userData);
      StorageManager.clearSavedHeaders();
      APIManager.sendMessageToActiveTab({
        action: "startProcess",
        data: userData
      }).then(response => {
        if (response && response.status === "Process completed successfully") {
          console.log("Process completed successfully");
          DOMUtils.disableAllInputs();
          DOMUtils.showGeneralError("Process completed successfully");
        } else if (response && response.status === "Error") {
          console.error("Error during process:", response.message);
          DOMUtils.showGeneralError(`Error during process: ${response.message || 'Unknown error'}`);
        } else {
          console.error("Unexpected response:", response);
          DOMUtils.showGeneralError("Unexpected response from the process. Please try again.");
        }
      }).catch(error => {
        console.error("Error sending message to content script:", error);
        DOMUtils.showGeneralError("Error communicating with the page. Please refresh and try again.");
      });
    }
  },

  clearSavedData: () => {
    StorageManager.clearUserData().then(() => {
      DOMUtils.resetForm();
      DOMUtils.enableInputs();
      DOMUtils.hideClearButton();
    });
  },

  sortCitiesByProximity: (userZipcode) => {
    return PopupManager.cities.sort((a, b) => {
      const diffA = Math.abs(parseInt(a.Zip) - parseInt(userZipcode));
      const diffB = Math.abs(parseInt(b.Zip) - parseInt(userZipcode));
      return diffA - diffB;
    });
  },

  clearSavedHeaders: () => {
    StorageManager.clearSavedHeaders().then(() => {
      console.log('Saved headers have been cleared');
      DOMUtils.showGeneralError('Saved headers have been cleared');
    });
  },

  loadSavedData: () => {
    console.log('Loading saved data');
    StorageManager.getUserData().then(userData => {
      if (userData) {
        console.log('User data found:', userData);
        DOMUtils.fillFormWithUserData(userData);
        DOMUtils.enableStartProcess();
        DOMUtils.enableInputs();
      } else {
        console.log('No user data found');
        DOMUtils.enableInputs();
      }
      PopupManager.checkProgressBar();
    }).catch(error => console.error('Error loading saved data:', error.message));
  },

  fetchAvailableLocations: () => {
    const zipcode = document.getElementById('zipcode').value;
    if (!zipcode) {
      DOMUtils.showGeneralError('Please enter a zipcode before fetching locations.');
      return;
    }
    
    console.log(`Fetching available locations for zipcode: ${zipcode}`);
    APIManager.sendMessageToActiveTab({ 
      action: "fetchAvailableLocations",
      zipcode: zipcode
    })
      .then(response => {
        console.log('Available locations response:', response);
        if (response.status === "success") {
          console.log(`Successful locations: ${response.data.length}`);
          DOMUtils.displayLocations(response.data);
        } else {
          console.error('Error in fetchAvailableLocations:', response.message, response.stack);
          DOMUtils.showGeneralError(`Error fetching available locations: ${response.message}. Please try again.`);
        }
      })
      .catch(error => {
        console.error('Error fetching available locations:', error);
        DOMUtils.showGeneralError(`Error fetching available locations: ${error.message}. Please try again.`);
      });
  },

  showStoredLocations: () => {
    console.log('Fetching stored locations map');
    StorageManager.getLocationsMap()
        .then(result => {
            console.log('Raw result from getLocationsMap:', result);
            if (result) {
                const { map: locationsMap, lastUpdated } = result;
                console.log('Stored locations map:', locationsMap);
                console.log('Last updated:', lastUpdated);
                if (locationsMap.size > 0) {
                    console.log(`Found ${locationsMap.size} stored locations:`);
                    locationsMap.forEach((value, key) => {
                        console.log(`ID: ${key}, Data:`, value);
                    });
                    const locationsList = Array.from(locationsMap.entries())
                        .map(([id, data]) => `ID: ${id}, Fetched: ${new Date(data.fetchTimestamp).toLocaleString()}`)
                        .join('\n');
                    DOMUtils.showGeneralError(`Found ${locationsMap.size} locations. Last updated: ${new Date(lastUpdated).toLocaleString()}\n\n${locationsList}`);
                } else {
                    console.log('No stored locations found (empty map).');
                    DOMUtils.showGeneralError('No stored locations found (empty map).');
                }
            } else {
                console.log('No stored locations data found (null result).');
                DOMUtils.showGeneralError('No stored locations data found (null result).');
            }
        })
        .catch(error => {
            console.error('Error fetching stored locations map:', error);
            DOMUtils.showGeneralError('Error fetching stored locations. Please try again.');
        });
  },

  resetAllData: () => {
    console.log('Resetting all data');
    Promise.all([
      StorageManager.clearUserData(),
      StorageManager.clearSavedHeaders(),
      StorageManager.clearLocationsMap(),
      StorageManager.clearHeaders()
    ])
      .then(() => {
        DOMUtils.resetForm();
        DOMUtils.enableInputs();
        DOMUtils.showGeneralError('All data has been reset');
        console.log('All data has been reset successfully');
      })
      .catch(error => {
        console.error('Error resetting data:', error);
        DOMUtils.showGeneralError('Error resetting data. Please try again.');
      });
  }
};

// Export PopupManager if using ES6 modules
// export { PopupManager };

// Initialize PopupManager when the script loads
PopupManager.init();