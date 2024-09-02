const DOMUtils = {
  fillFormWithUserData: (userData) => {
    console.log('Filling form with user data:', userData);
    Object.keys(userData).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        element.value = userData[key];
      } else {
        console.warn(`Element with id '${key}' not found`);
      }
    });
  },

  enableStartProcess: () => {
    console.log('Enabling start process button');
    const startProcessButton = document.getElementById('startProcess');
    if (startProcessButton) {
      startProcessButton.disabled = false;
      startProcessButton.innerHTML = '<i class="fas fa-play"></i> Start Process';
    } else {
      console.warn('Start process button not found');
    }
  },

  showClearButton: () => {
    console.log('Showing clear button');
    const clearButton = document.getElementById('clearButton');
    if (clearButton) {
      clearButton.style.display = 'block';
    } else {
      console.warn('Clear button not found');
    }
  },

  enableInputs: () => {
    const inputs = document.querySelectorAll('#userForm input');
    inputs.forEach(input => input.disabled = false);
    DOMUtils.enableStartProcess();
  },

  hideClearButton: () => {
    console.log('Hiding clear button');
    const clearButton = document.getElementById('clearButton');
    if (clearButton) {
      clearButton.style.display = 'none';
    } else {
      console.warn('Clear button not found');
    }
  },

  disableAllInputs: () => {
    const inputs = document.querySelectorAll('#userForm input');
    inputs.forEach(input => {
      input.disabled = true;
    });
  },

  showForm: () => {
    console.log('Showing form');
    document.getElementById('formContainer').style.display = 'block';
  },

  hideNotAllowedMessage: () => {
    console.log('Hiding not allowed message');
    document.getElementById('notAllowedMessage').style.display = 'none';
  },

  hideForm: () => {
    console.log('Hiding form');
    document.getElementById('formContainer').style.display = 'none';
  },

  showNotAllowedMessage: () => {
    console.log('Showing not allowed message');
    document.getElementById('notAllowedMessage').style.display = 'block';
  },

  getUserDataFromForm: () => {
    const userData = {};
    ['firstName', 'lastName', 'dob', 'ssn', 'cellPhone', 'email'].forEach(field => {
      userData[field] = document.getElementById(field).value.trim();
    });
    return userData;
  },

  validateForm: (userData) => {
    let isValid = true;
    const validations = {
      firstName: {condition: Boolean, message: 'First name is required'},
      lastName: {condition: Boolean, message: 'Last name is required'},
      dob: {condition: v => /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/.test(v), message: 'Please enter a valid date in mm/dd/yyyy format'},
      ssn: {condition: v => /^\d{4}$/.test(v), message: 'Please enter the last 4 digits of your SSN'},
      cellPhone: {condition: v => /^\(\d{3}\)\s\d{3}-\d{4}$/.test(v), message: 'Please enter a valid phone number in (xxx) xxx-xxxx format'},
      email: {condition: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), message: 'Please enter a valid email address'}
    };

    Object.entries(validations).forEach(([field, {condition, message}]) => {
      if (!condition(userData[field])) {
        DOMUtils.showError(field, message);
        isValid = false;
      } else {
        DOMUtils.clearError(field);
      }
    });

    return isValid;
  },

  resetForm: () => {
    console.log('Resetting form');
    document.getElementById('userForm').reset();
  },

  formatPhoneNumber: (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0) {
      if (value.length <= 3) {
        value = `(${value}`;
      } else if (value.length <= 6) {
        value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
      } else {
        value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
      }
    }
    e.target.value = value;
  },

  formatDateOfBirth: (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
    } else if (value.length > 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    e.target.value = value;
  },

  showError: (fieldId, message) => {
    const field = document.getElementById(fieldId);
    if (!field) {
      console.warn(`Field with id '${fieldId}' not found`);
      return;
    }
    let errorDiv = field.nextElementSibling;
    if (!errorDiv || !errorDiv.classList.contains('error')) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      field.parentNode.insertBefore(errorDiv, field.nextSibling);
    }
    errorDiv.textContent = message;
  },

  clearError: (fieldId) => {
    const field = document.getElementById(fieldId);
    if (!field) {
      console.warn(`Field with id '${fieldId}' not found`);
      return;
    }
    const errorDiv = field.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('error')) {
      errorDiv.remove();
    }
  },

  showGeneralError: (message) => {
    const generalErrorDiv = document.getElementById('generalError');
    if (!generalErrorDiv) {
      console.warn('General error div not found');
      return;
    }
    generalErrorDiv.textContent = message;
    generalErrorDiv.style.display = 'block';
  },

  // Removed methods related to supported site message

  enableAllInputs: () => {
    const inputs = document.querySelectorAll('#userForm input');
    inputs.forEach(input => {
      input.disabled = false;
    });
  },

  // Remove disableButton and enableButton methods
};