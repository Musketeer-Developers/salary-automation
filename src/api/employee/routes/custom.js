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
    {
      method: 'PUT',
      path: '/employees/:id/unpublish',
      handler: 'employee.unpublishEmployee',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
