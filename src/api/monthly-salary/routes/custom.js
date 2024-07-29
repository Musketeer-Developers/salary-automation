module.exports = {
  routes: [
    {
      method: "POST",
      path: "/monthly-salary/calculate-salary",
      handler: "monthly-salary.calculateSalary",
      config: {
        policies: [],
      },
    },
  ],
};
