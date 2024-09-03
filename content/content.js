// Add this at the beginning of your content.js file
chrome.runtime.sendMessage({ action: "contentScriptReady" });

class ContentManager {
    constructor() {
        this.cities = [];
        this.headers = {};
        this.currentCity = null;
        this.initMessageBus();
        this.fetchInProgress = false;  // Add this line
    }

    initMessageBus() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (this[request.action]) {
                // Wrap the async function call in a try-catch block
                try {
                    if (this.fetchInProgress && request.action === 'fetchAvailableLocations') {
                        console.log('Fetch already in progress, ignoring duplicate request');
                        sendResponse({ status: "error", message: "Fetch already in progress" });
                        return true;
                    }
                    
                    this.fetchInProgress = true;  // Set flag before starting the action
                    const responsePromise = this[request.action](request);
                    responsePromise.then(response => {
                        this.fetchInProgress = false;  // Reset flag after action completes
                        sendResponse(response);
                    }).catch(error => {
                        this.fetchInProgress = false;  // Reset flag if there's an error
                        sendResponse({ status: "error", message: error.message });
                    });
                } catch (error) {
                    this.fetchInProgress = false;  // Reset flag if there's an exception
                    sendResponse({ status: "error", message: error.message });
                }
                return true; // Keep the message channel open for asynchronous response
            }
            return false; // No handler found for this action
        });
    }

    async getHeaders() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['capturedHeaders'], (result) => {
                this.headers = result.capturedHeaders || {};
                resolve(this.headers);
            });
        });
    }

    async fetchAvailableLocations(request) {
        console.log("Starting fetchAvailableLocations for zipcode:", request.zipcode);
        try {
            await this.loadSupportedCities();
            this.sortCitiesByProximity(request.zipcode);

            const topCities = this.cities.slice(0, 30);
            const payloads = this.createPayloads(topCities);

            await this.getHeaders();

            const results = await this.fetchLocationsInBatches(payloads);
            console.log("Fetched results:", results);
            const { successfulResults, errorResults } = this.processResults(results);
            const locationsMap = await this.getLocationsMap();

            console.log("Final locations map:", locationsMap);
            console.log("Completed fetchAvailableLocations");
            return this.prepareResponse(locationsMap, errorResults);
        } catch (error) {
            console.error("Error in fetchAvailableLocations:", error);
            return { status: "error", message: error.message, stack: error.stack };
        } finally {
            this.fetchInProgress = false;
        }
    }

    createPayloads(cities) {
        return cities.map(city => ({
            TypeId: 71,
            ZipCode: city.Zip,
            CityName: city.Name,
            PreferredDay: 0
        }));
    }

    async fetchLocationsInBatches(payloads) {
        const results = [];
        const batchSize = 5;
        console.log(`Fetching locations in batches. Total payloads: ${payloads.length}`);

        for (let i = 0; i < payloads.length; i += batchSize) {
            console.log(`Processing batch starting at index ${i}`);
            const batch = payloads.slice(i, i + batchSize);
            const batchPromises = batch.map(payload => this.fetchSingleLocation(payload));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Update locations map after each batch
            await this.updateLocationsMap(batchResults);

            if (i + batchSize < payloads.length) {
                console.log(`Waiting for 40 seconds before next batch...`);
                await this.delay(40000);
            }
        }

        console.log(`Total results fetched: ${results.length}`);
        return results;
    }

    async updateLocationsMap(batchResults) {
        const currentMap = await this.getLocationsMap();
        console.log("Current map before update:", currentMap);
        
        let updatedCount = 0;
        batchResults.forEach(result => {
            console.log("Processing result:", result);
            if (result.status === "success" && Array.isArray(result.data)) {
                result.data.forEach(location => {
                    if (location && location.Id) {
                        const { Id, ...rest } = location;
                        currentMap.set(Id, { ...rest, fetchTimestamp: new Date().toISOString() });
                        updatedCount++;
                        console.log(`Added location with Id: ${Id}`);
                    } else {
                        console.log("Location not added to map:", location);
                    }
                });
            } else {
                console.log("Result not added to map:", result);
            }
        });

        console.log(`Updated ${updatedCount} locations`);
        console.log("Updated map before storing:", currentMap);

        await this.storeLocationsMap(currentMap);
    }

    processResults(results) {
        const successfulResults = results.filter(result => result.status === "success");
        const errorResults = results.filter(result => result.status === "error");

        console.log(`Fetched ${successfulResults.length} locations successfully`);
        if (errorResults.length > 0) {
            console.warn(`Failed to fetch ${errorResults.length} locations`);
        }

        return { successfulResults, errorResults };
    }

    createLocationsMap(successfulResults) {
        return new Map(successfulResults
            .filter(result => result.data && result.data.Id)
            .map(result => {
                const { Id, ...rest } = result.data;
                return [Id, { ...rest, fetchTimestamp: new Date().toISOString() }];
            }));
    }

    prepareResponse(locationsMap, errorResults) {
        return {
            status: "success",
            data: Array.from(locationsMap.entries()),
            errors: errorResults.map(r => r.message)
        };
    }

    async storeLocationsMap(locationsMap) {
        const locationsMapWithTimestamp = {
            data: [...locationsMap],
            lastUpdated: new Date().toISOString()
        };
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ locationsMap: JSON.stringify(locationsMapWithTimestamp) }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    console.log('Locations map stored successfully:', locationsMapWithTimestamp);
                    resolve();
                }
            });
        });
    }

    async getLocationsMap() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['locationsMap'], (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    const locationsMap = new Map(JSON.parse(result.locationsMap || '[]').data);
                    console.log("Retrieved locations map:", locationsMap);
                    resolve(locationsMap);
                }
            });
        });
    }

    async fetchSingleLocation(payload) {
        console.log(`Fetching location for ${payload.CityName}`);
        try {
            const response = await fetch('https://apptapi.txdpsscheduler.com/api/AvailableLocation', {
                method: 'POST',
                headers: {
                    ...this.headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Successfully fetched data for ${payload.CityName}:`, data);
            return { status: "success", data: data }; // data is already an array
        } catch (error) {
            console.error(`Error fetching location for ${payload.CityName}:`, error);
            return { status: "error", message: `Error for ${payload.CityName}: ${error.message}` };
        }
    }

    async startProcess(request) {
        console.log("Starting process...");
        try {
            const result = await this.startProcessSequence(request.data);
            return result;
        } catch (error) {
            return { status: "Error", message: error.message };
        }
    }

    async checkProgressBar(request) {
        return { progressBarFound: this.checkProgressBarInternal() };
    }

    ping(request) {
        return { status: "Content script is ready" };
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async loadSupportedCities() {
        if (this.cities.length === 0) {
            try {
                const response = await fetch(chrome.runtime.getURL('data/supported_cities.json'));
                const data = await response.json();
                this.cities = data.Cities;
                console.log(`Loaded ${this.cities.length} cities`);
            } catch (error) {
                console.error('Error loading supported cities:', error);
                throw error;
            }
        }
    }

    sortCitiesByProximity(userZipcode) {
        this.cities.sort((a, b) => {
            const diffA = Math.abs(parseInt(a.Zip) - parseInt(userZipcode));
            const diffB = Math.abs(parseInt(b.Zip) - parseInt(userZipcode));
            return diffA - diffB;
        });
    }

    async clickEnglishButton() {
        try {
            const englishButton = document.evaluate(Constants.XPATH.ENGLISH_BUTTON, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (englishButton) {
                englishButton.click();
                console.log("English button clicked successfully");
                return true;
            } else {
                console.log("English button not found");
                return false;
            }
        } catch (error) {
            console.error("Error in clickEnglishButton:", error.message);
            return false;
        }
    }

    async fillField(input, value) {
        return new Promise(resolve => {
            input.focus();
            setTimeout(() => {
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                resolve();
            }, 200);
        });
    }

    async fillForm(userData) {
        const formFields = {
            firstName: { xpath: Constants.XPATH.FORM_FIELDS.FIRST_NAME, value: userData.firstName },
            lastName: { xpath: Constants.XPATH.FORM_FIELDS.LAST_NAME, value: userData.lastName },
            dob: { xpath: Constants.XPATH.FORM_FIELDS.DOB, value: userData.dob },
            ssn: { xpath: Constants.XPATH.FORM_FIELDS.SSN, value: userData.ssn }
        };

        for (const [field, data] of Object.entries(formFields)) {
            const input = document.evaluate(data.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (input) {
                try {
                    await this.fillField(input, data.value);
                    console.log(`${field} focused and filled with user data`);
                } catch (error) {
                    console.error(`Error filling ${field}:`, error);
                    return false;
                }
            } else {
                console.log(`${field} input not found`);
                return false;
            }
        }
        return true;
    }

    async fillAdditionalDetails(userData) {
        const additionalFields = {
            cellPhone: { xpath: Constants.XPATH.ADDITIONAL_FIELDS.CELL_PHONE, value: userData.cellPhone },
            email: { xpath: Constants.XPATH.ADDITIONAL_FIELDS.EMAIL, value: userData.email },
            verifyEmail: { xpath: Constants.XPATH.ADDITIONAL_FIELDS.VERIFY_EMAIL, value: userData.email }
        };

        for (const [field, data] of Object.entries(additionalFields)) {
            const input = document.evaluate(data.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (input) {
                try {
                    await this.fillField(input, data.value);
                    console.log(`${field} focused and filled with user data`);
                } catch (error) {
                    console.error(`Error filling ${field}:`, error);
                    return false;
                }
            } else {
                console.log(`${field} input not found`);
                return false;
            }
        }
        return true;
    }

    async clickButton(buttonXPath, buttonName) {
        try {
            const button = document.evaluate(buttonXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (button) {
                button.click();
                console.log(`${buttonName} clicked successfully`);
                return true;
            } else {
                console.log(`${buttonName} not found`);
                return false;
            }
        } catch (error) {
            console.error(`Error in clicking ${buttonName}:`, error.message);
            return false;
        }
    }

    checkProgressBarInternal() {
        const progressBar = document.evaluate(Constants.XPATH.PROGRESS_BAR, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (progressBar) {
            console.log("Progress bar found, disabling fields in popup");
            chrome.runtime.sendMessage({ action: "disableFields" });
            return true;
        }
        return false;
    }

    async grabDataFromScreen() {
        console.log("Grabbing data from the screen");
        return new Promise(resolve => {
            setTimeout(() => {
                const data = { /* grabbed data */ };
                console.log("Data grabbed:", data);
                resolve(data);
            }, 2000);
        });
    }

    async handleDialog() {
        const dialog = document.evaluate(Constants.XPATH.DIALOG, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        if (dialog) {
            console.log("Dialog detected. Attempting to click OK button.");
            const okButton = document.evaluate(Constants.XPATH.DIALOG_OK_BUTTON, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

            if (okButton) {
                okButton.click();
                console.log("OK button clicked.");
                await this.delay(1000); // Wait for dialog to close
                return true;
            } else {
                console.log("OK button not found in dialog.");
                return false;
            }
        }

        return false; // No dialog found
    }

    async fillZipcodeAndClickNext() {
        if (!this.currentCity) {
            console.error("No city selected");
            return false;
        }

        try {
            // Check for and handle dialog before proceeding
            await this.handleDialog();

            const zipcodeInput = await this.waitForElement(Constants.XPATH.ZIPCODE_INPUT);
            const nextButton = await this.waitForElement(Constants.XPATH.NEXT_BUTTON);

            if (zipcodeInput && nextButton) {
                zipcodeInput.value = this.currentCity.Zip;
                zipcodeInput.dispatchEvent(new Event('input', { bubbles: true }));
                zipcodeInput.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`Filled zipcode for ${this.currentCity.Name}: ${this.currentCity.Zip}`);

                await this.delay(1000);
                nextButton.click();
                console.log("Clicked Next button");

                return true;
            } else {
                throw new Error("Zipcode input or Next button not found");
            }
        } catch (error) {
            console.error(`Error filling zipcode and clicking next:`, error);
            return false;
        }
    }

    waitForElement(xpath, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkElement = () => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for element: ${xpath}`));
                } else {
                    setTimeout(checkElement, 100);
                }
            };
            checkElement();
        });
    }

    async startProcessSequence(userData) {
        console.log("Starting process sequence...");
        try {
            if (!await this.clickEnglishButton()) {
                return { status: "Error", message: "Failed to click English button" };
            }
            await this.delay(1500);
            this.checkProgressBarInternal();

            if (!await this.fillForm(userData)) {
                return { status: "Error", message: "Failed to fill form" };
            }
            await this.delay(1500);
            this.checkProgressBarInternal();

            if (!await this.clickButton(Constants.XPATH.LOG_ON_BUTTON, "Log On button")) {
                return { status: "Error", message: "Failed to click Log On button" };
            }
            await this.delay(2000);
            this.checkProgressBarInternal();

            if (!await this.clickButton(Constants.XPATH.NEW_APPOINTMENT_BUTTON, "New Appointment button")) {
                return { status: "Error", message: "Failed to click New Appointment button" };
            }
            await this.delay(1500);
            this.checkProgressBarInternal();

            if (!await this.clickButton(Constants.XPATH.APPLY_FIRST_TIME_BUTTON, "Apply First Time button")) {
                return { status: "Error", message: "Failed to click Apply First Time button" };
            }
            await this.delay(2000);
            this.checkProgressBarInternal();

            if (!await this.fillAdditionalDetails(userData)) {
                return { status: "Error", message: "Failed to fill additional details" };
            }
            this.checkProgressBarInternal();

            // Load and sort cities
            await this.loadSupportedCities();
            this.sortCitiesByProximity(userData.zipcode);
            this.currentCity = this.cities[0]; // Select the first (closest) city

            if (!await this.fillZipcodeAndClickNext()) {
                return { status: "Error", message: "Failed to fill zipcode and click next" };
            }
            await this.delay(2000);
            this.checkProgressBarInternal();

            chrome.runtime.sendMessage({ action: "processCompleted" });
            
            // Add this line to hide the divs after process completion
            this.hideFirstFourChildDivs();

            return { status: "Process completed successfully" };
        } catch (error) {
            console.error("Unexpected error in process sequence:", error.message);
            return { status: "Error", message: error.message };
        }
    }

    // Add this new method
    hideFirstFourChildDivs() {
        const parentDiv = document.querySelector("#app > section > div > main > div > section > div.px-3 > div");

        if (parentDiv) {
            const childDivs = parentDiv.children;
            for (let i = 0; i < 4 && i < childDivs.length; i++) {
                childDivs[i].style.display = 'none';
            }
            console.log("First 4 child divs have been hidden");
        } else {
            console.log("Parent div not found");
        }
    }
}

const contentManager = new ContentManager();
console.log('Content script initialized');
chrome.runtime.sendMessage({ action: "contentScriptReady" });
contentManager.checkProgressBarInternal();