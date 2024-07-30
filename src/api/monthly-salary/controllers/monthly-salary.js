"use strict";

/**
 * monthly-salary controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::monthly-salary.monthly-salary",

  ({ strapi }) => ({
    async calculateSalary(ctx) {
      ctx.body = "calculateSalary";
    },
  })
);
