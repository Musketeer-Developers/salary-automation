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
      method: "POST",
      path: "/month-data/add-holiday",
      handler: "month-data.addHoliday",
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
};
