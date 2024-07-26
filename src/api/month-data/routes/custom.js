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
  ],
};
