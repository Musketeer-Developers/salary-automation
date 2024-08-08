module.exports = {
  routes: [
    {
      method: "POST",
      path: "/month-data/initializeMonthData",
      handler: "month-data.initializeMonthData",
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/month-data/add-holiday",
      handler: "month-data.addHoliday",
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/month-data/get-holiday-info",
      handler: "month-data.getHolidayInfo",
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
};
