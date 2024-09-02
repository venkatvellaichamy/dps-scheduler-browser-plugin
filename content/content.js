// Add this at the beginning of your content.js file
chrome.runtime.sendMessage({ action: "contentScriptReady" });

class ContentManager {
    constructor() {
        this.cities = [];
        this.currentCityIndex = 0;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async loadSupportedCities() {
        try {
            const response = await fetch(chrome.runtime.getURL('data/supported_cities.json'));
            const data = await response.json();
            this.cities = data.Cities;
            console.log(`Loaded ${this.cities.length} cities`);
        } catch (error) {
            console.error('Error loading supported cities:', error);
        }
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

    checkProgressBar() {
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

    async startCityProcessing() {
        console.log("Starting city processing");
        try {
            await this.loadSupportedCities();
            this.currentCityIndex = 0;
            await this.fillZipcodeAndClickNext();
            return { status: "City processing started" };
        } catch (error) {
            console.error("Error in startCityProcessing:", error);
            return { status: "Error", message: error.message };
        }
    }

    async fillZipcodeAndClickNext() {
        if (this.currentCityIndex >= this.cities.length) {
            console.log("All cities processed");
            chrome.runtime.sendMessage({ action: "cityProcessingStopped", reason: "All cities processed" });
            return;
        }

        const city = this.cities[this.currentCityIndex];
        console.log(`Processing city: ${city.Name} (${city.Zip})`);

        try {
            const zipcodeInput = await this.waitForElement(Constants.XPATH.ZIPCODE_INPUT);
            const nextButton = await this.waitForElement(Constants.XPATH.NEXT_BUTTON);

            if (zipcodeInput && nextButton) {
                zipcodeInput.value = city.Zip;
                zipcodeInput.dispatchEvent(new Event('input', { bubbles: true }));
                zipcodeInput.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`Filled zipcode for ${city.Name}: ${city.Zip}`);

                await this.delay(1000);
                nextButton.click();
                console.log("Clicked Next button");
                this.currentCityIndex++;

                await this.delay(3000);

                const screenData = await this.grabDataFromScreen();

                if (await this.clickButton(Constants.XPATH.PREVIOUS_BUTTON, "Previous button")) {
                    setTimeout(() => this.fillZipcodeAndClickNext(), 2000);
                } else {
                    throw new Error("Previous button not found");
                }
            } else {
                throw new Error("Zipcode input or Next button not found");
            }
        } catch (error) {
            console.error(`Error processing city ${city.Name}:`, error);
            chrome.runtime.sendMessage({
                action: "cityProcessingStopped",
                reason: `Error processing ${city.Name}: ${error.message}`
            });
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
            this.checkProgressBar();

            if (!await this.fillForm(userData)) {
                return { status: "Error", message: "Failed to fill form" };
            }
            await this.delay(1500);
            this.checkProgressBar();

            if (!await this.clickButton(Constants.XPATH.LOG_ON_BUTTON, "Log On button")) {
                return { status: "Error", message: "Failed to click Log On button" };
            }
            await this.delay(2000);
            this.checkProgressBar();

            if (!await this.clickButton(Constants.XPATH.NEW_APPOINTMENT_BUTTON, "New Appointment button")) {
                return { status: "Error", message: "Failed to click New Appointment button" };
            }
            await this.delay(1500);
            this.checkProgressBar();

            if (!await this.clickButton(Constants.XPATH.APPLY_FIRST_TIME_BUTTON, "Apply First Time button")) {
                return { status: "Error", message: "Failed to click Apply First Time button" };
            }
            await this.delay(2000);
            this.checkProgressBar();

            if (!await this.fillAdditionalDetails(userData)) {
                return { status: "Error", message: "Failed to fill additional details" };
            }
            this.checkProgressBar();

            chrome.runtime.sendMessage({ action: "processCompleted" });
            return { status: "Process completed successfully" };
        } catch (error) {
            console.error("Unexpected error in process sequence:", error.message);
            return { status: "Error", message: error.message };
        }
    }
}

const contentManager = new ContentManager();
console.log('Content script initialized');
chrome.runtime.sendMessage({ action: "contentScriptReady" });
contentManager.checkProgressBar();


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received in content script:", request);

    switch (request.action) {
        case "startProcess":
            console.log("Starting process...");
            contentManager.startProcessSequence(request.data)
                .then(sendResponse)
                .catch(error => sendResponse({ status: "Error", message: error.message }));
            return true;
        case "checkProgressBar":
            sendResponse({ progressBarFound: contentManager.checkProgressBar() });
            break;
        case "startCityProcessing":
            console.log("Received startCityProcessing action");
            contentManager.startCityProcessing()
                .then(sendResponse)
                .catch(error => sendResponse({ status: "Error", message: error.message }));
            return true;
        case "ping":
            sendResponse({ status: "Content script is ready" });
            break;
    }
    return true;
});