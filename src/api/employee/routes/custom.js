module.exports = {
  routes: [
    {
      method: "POST",
      path: "/employee/calculateTax",
      handler: "employee.calculateTax",
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
};
