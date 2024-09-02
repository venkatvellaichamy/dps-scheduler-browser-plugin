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
    const cityProcessingButton = document.getElementById('startCityProcessing');
    if (cityProcessingButton) {
      console.log('Found city processing button, attaching listener');
      cityProcessingButton.addEventListener('click', () => {
        console.log('City processing button clicked');
        PopupManager.startCityProcessing();
      });
    } else {
      console.warn('City processing button not found');
    }
    document.getElementById('userForm').addEventListener('submit', PopupManager.handleFormSubmit);
    document.getElementById('clearButton').addEventListener('click', PopupManager.clearSavedData);
    document.getElementById('startCityProcessing').addEventListener('click', PopupManager.startCityProcessing);
    document.getElementById('clearHeadersButton').addEventListener('click', PopupManager.clearSavedHeaders);
    document.getElementById('cellPhone').addEventListener('input', DOMUtils.formatPhoneNumber);
    document.getElementById('dob').addEventListener('input', DOMUtils.formatDateOfBirth);
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

  startCityProcessing: () => {
    console.log('startCityProcessing function called');
    APIManager.sendMessageToActiveTab({ action: "startCityProcessing" })
      .then(response => {
        console.log('Received response from content script:', response);
        if (response && response.status === "City processing started") {
          DOMUtils.showGeneralError("City processing has started. This may take a while.");
        } else {
          throw new Error(response ? response.message || JSON.stringify(response) : "Unexpected response from content script");
        }
      })
      .catch(error => {
        console.error('Error in startCityProcessing:', error);
        DOMUtils.showGeneralError(`Error starting city processing: ${error.message}`);
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
        DOMUtils.showClearButton();
      } else {
        console.log('No user data found');
        DOMUtils.enableInputs();
        DOMUtils.hideClearButton();
      }
      PopupManager.checkProgressBar();
    }).catch(error => console.error('Error loading saved data:', error.message));
  }
};

// Export PopupManager if using ES6 modules
// export { PopupManager };