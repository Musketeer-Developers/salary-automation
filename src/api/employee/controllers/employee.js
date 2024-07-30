"use strict";

/**
 * employee controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::employee.employee",

  ({ strapi }) => ({
    async calculateTax(ctx) {
      // data format will be
      // {
      //     id: 1,
      //     monthRemaining: 6,
      //     startyear: 2021,
      //     startmonth: 1,
      //     startday: 1,
      // }
      const data = ctx.request.body.data;
      console.log("data", data);
      const employee = await strapi.entityService.findOne(
        "api::employee.employee",
        data.id
      );
      //get total working days in the month
      const workingDays = getWorkingDaysFromDate(
        data.startyear,
        data.startmonth
      );
      //calculate monthly rate
      const monthlyRate = employee.grossSalary / workingDays;
      //calculate working days they are supposed to work
      const workingDaysInMonth = getWorkingDaysFromDate(
        data.startyear,
        data.startmonth,
        data.startday
      );
      //calculate salary for the month
      const salaryForTheMonth = monthlyRate * workingDaysInMonth;

      //ANNUAL SALARY WILL BE
      const annualSalary = Math.round(
        employee.grossSalary * data.monthRemaining + salaryForTheMonth
      );

      //GET TAX SLAB
      const taxSlab = await strapi.entityService.findMany(
        "api::tax-slab.tax-slab",
        {
          filters: {
            lowerCap: { $lte: annualSalary },
            upperCap: { $gte: annualSalary },
          },
        }
      );

      const totalTaxToBePaid =
        (annualSalary - taxSlab[0].lowerCap) * (taxSlab[0].rate / 100) +
        taxSlab[0].fixedAmount;

      ctx.body = {
        totalTaxToBePaid: parseInt(totalTaxToBePaid),
        taxSlabId: taxSlab[0].id,
        employeeId: employee.id,
        monthlyTax: parseInt(totalTaxToBePaid / data.monthRemaining),
        yearlySalary: annualSalary,
      };
    },
    async create(ctx) {
      const result = await super.create(ctx);
      const monthlySalary = parseInt(result.data.attributes.grossSalary);
      const projectedAnnualSalary = monthlySalary * 12;
      const healthAllowanceAnnual = parseInt(
        (projectedAnnualSalary / 1.1) * 0.1
      );
      const monthlyHealthAllowance = parseInt(healthAllowanceAnnual / 12);

      const whtData = await strapi.entityService.create(
        "api::with-holding-tax.with-holding-tax",
        {
          data: {
            emp_no: result.data.id,
            healthAllowance: monthlyHealthAllowance,
            projectedYearlySalary: projectedAnnualSalary,
            totalPaid: 0,
          },
        }
      );

      ctx.body = { result, wht: whtData };
    },
  })
);

function getWorkingDaysFromDate(year, month, day = 1) {
  let workingDays = 0;
  month = month - 1;

  let startDate = new Date(year, month, day);
  let lastDay = new Date(year, month + 1, 0);

  for (
    let currentDay = startDate;
    currentDay <= lastDay;
    currentDay.setDate(currentDay.getDate() + 1)
  ) {
    let dayOfWeek = currentDay.getDay();

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }
  }

  return workingDays;
}
