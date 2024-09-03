const Constants = {
  SUPPORTED_URL: 'https://public.txdpsscheduler.com/',
  XPATH: {
    ENGLISH_BUTTON: "/html/body/div[1]/div[2]/div/div/div[2]/button[1]",
    FORM_FIELDS: {
      FIRST_NAME: "/html/body/div[1]/div/main/div/div/section/div/main/div/section/div[2]/div/div/form/div[2]/div[3]/div[2]/div/div[1]/div/input",
      LAST_NAME: "/html/body/div[1]/div/main/div/div/section/div/main/div/section/div[2]/div/div/form/div[2]/div[3]/div[3]/div/div[1]/div/input",
      DOB: "/html/body/div[1]/div/main/div/div/section/div/main/div/section/div[2]/div/div/form/div[2]/div[3]/div[4]/div/div[1]/div[1]/input",
      SSN: "/html/body/div[1]/div/main/div/div/section/div/main/div/section/div[2]/div/div/form/div[2]/div[3]/div[5]/div/div[1]/div[1]/input"
    },
    ADDITIONAL_FIELDS: {
      CELL_PHONE: "/html/body/div[1]/div/main/div/div/section/div/main/div/section/div[2]/div/form/div/div[1]/div/div[4]/div[2]/div/div/div[1]/div/input",
      EMAIL: "/html/body/div[1]/div/main/div/div/section/div/main/div/section/div[2]/div/form/div/div[1]/div/div[5]/div/div/div/div[1]/div/input",
      VERIFY_EMAIL: "/html/body/div[1]/div/main/div/div/section/div/main/div/section/div[2]/div/form/div/div[1]/div/div[6]/div/div/div/div[1]/div/input"
    },
    LOG_ON_BUTTON: "/html/body/div[1]/div/main/div/div/section/div/main/div/section/div[2]/div/div/form/div[2]/div[4]/button",
    NEW_APPOINTMENT_BUTTON: "/html/body/div[1]/div/main/div/div/section/div/main/div/section/div[2]/div/div/div[3]/div/button",
    PROGRESS_BAR: "//*[@id='app']/section/div/main/div/div/div[1]/div[4]/div",
    APPLY_FIRST_TIME_BUTTON: "/html/body/div[1]/div/main/div/div/section/div/main/div/section/div[2]/div/main/div/div/div[1]/div[1]/button",
    PREVIOUS_BUTTON: "/html/body/div[1]/div/main/div/div/section/div/main/div/section/div[2]/div/div[5]/div/div[1]/button",
    ZIPCODE_INPUT: "/html/body/div[1]/div/main/div/div/section/div/main/div/section/div[2]/div/form/div/div[2]/div[1]/div[4]/div[1]/div/div/div[1]/div[1]/input",
    NEXT_BUTTON: "/html/body/div[1]/div/main/div/div/section/div/main/div/section/div[2]/div/form/div/div[2]/div[2]/div/div[2]/button",
    DIALOG: "/html/body/div[1]/div[1]/div",
    DIALOG_OK_BUTTON: "/html/body/div[1]/div[1]/div/div/div[2]/button"
  }
};