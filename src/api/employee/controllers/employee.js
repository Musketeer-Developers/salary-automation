"use strict";

/**
 * employee controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::employee.employee",

  ({ strapi }) => ({
    async calculateTax(ctx) {
      const data = ctx.request.body.data;
      console.log("data", data);
      const employee = await strapi.entityService.findOne(
        "api::employee.employee",
        data.id
      );
      const workingDays = getWorkingDaysFromDate(
        data.startyear,
        data.startmonth
      );
      const monthlyRate = employee.grossSalary / workingDays;
      const workingDaysInMonth = getWorkingDaysFromDate(
        data.startyear,
        data.startmonth,
        data.startday
      );
      const salaryForTheMonth = monthlyRate * workingDaysInMonth;

      const annualSalary = Math.round(
        employee.grossSalary * data.monthRemaining + salaryForTheMonth
      );

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

      const monthEnum = {
        january: 0,
        february: 1,
        march: 2,
        april: 3,
        may: 4,
        june: 5,
        july: 6,
        august: 7,
        september: 8,
        october: 9,
        november: 10,
        december: 11,
      };

      const fiscalYearEnum = {
        july: 0,
        august: 1,
        september: 2,
        october: 3,
        november: 4,
        december: 5,
        january: 6,
        february: 7,
        march: 8,
        april: 9,
        may: 10,
        june: 11,
      };

      const currentDate = new Date();
      const month = monthEnum[currentDate.getMonth()];
      const year = currentDate.getFullYear();

      let fiscalYearCalculator;
      if (monthEnum[month] < 6) {
        fiscalYearCalculator = year - 1;
      } else {
        fiscalYearCalculator = year;
      }
      console.log("Fiscal year calculator:", fiscalYearCalculator);

      const fiscalYear = [
        `${"july"}${fiscalYearCalculator}`,
        `${"august"}${fiscalYearCalculator}`,
        `${"september"}${fiscalYearCalculator}`,
        `${"october"}${fiscalYearCalculator}`,
        `${"november"}${fiscalYearCalculator}`,
        `${"december"}${fiscalYearCalculator}`,
        `${"january"}${fiscalYearCalculator + 1}`,
        `${"february"}${fiscalYearCalculator + 1}`,
        `${"march"}${fiscalYearCalculator + 1}`,
        `${"april"}${fiscalYearCalculator + 1}`,
        `${"may"}${fiscalYearCalculator + 1}`,
        `${"june"}${fiscalYearCalculator + 1}`,
      ];
      console.log("Fiscal year:", fiscalYear);

      const fiscalYearString = `${fiscalYearCalculator}-${fiscalYearCalculator + 1}`;


      const whtData = await strapi.entityService.create(
        "api::with-holding-tax.with-holding-tax",
        {
          data: {
            emp_no: result.data.id,
            healthAllowance: monthlyHealthAllowance,
            projectedYearlySalary: projectedAnnualSalary,
            totalPaid: 0,
            fiscalYear: fiscalYearString,
            publishedAt: Date.now(),
          },
        }
      );

      ctx.body = { data: result.data, wht: whtData };
    },
    
    async unpublishEmployee(ctx) {
      const { id } = ctx.params;
      try {
        // Find all monthly salaries for the employee
        const monthlySalaries = await strapi.entityService.findMany(
          "api::monthly-salary.monthly-salary",
          {
            filters: { employee: id },
          }
        );

        // Unpublish all daily works associated with each monthly salary
        for (const salary of monthlySalaries) {
          await strapi.entityService.updateMany(
            "api::daily-work.daily-work",
            {
              data: { publishedAt: null },
              filters: { salaryMonth: salary.id },
            }
          );

          // Unpublish the monthly salary
          await strapi.entityService.update(
            "api::monthly-salary.monthly-salary",
            salary.id,
            { data: { publishedAt: null } }
          );
        }

        // Unpublish the employee
        const result = await strapi.entityService.update(
          "api::employee.employee",
          id,
          {
            data: {
              publishedAt: null,
            },
          }
        );

        ctx.body = result;
      } catch (error) {
        ctx.throw(500, `Failed to unpublish employee with id ${id}`);
      }
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
