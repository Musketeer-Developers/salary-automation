"use strict";

/**
 * month-data controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::month-data.month-data",
  ({ strapi }) => ({
    async initializeMonthData(ctx) {
      try {
        const req = ctx.request.body;
        //CREATE NEW MONTH DATA
        const monthData = await strapi.entityService.create(
          "api::month-data.month-data",
          {
            data: {
              month: req.month,
              year: req.year,
              monthIdentifier: req.month + req.year,
              totalDays: req.totalDays,
              workingDays: req.workingDays,
              publishedAt: Date.now(),
            },
          }
        );
        //GET ALL EMPLOYEES
        console.log("Month Data", monthData.id);
        const employeeIDs = await strapi.entityService.findMany(
          "api::employee.employee",
          {
            fields: ["id", "grossSalary", "leavesRemaining"],
          }
        );
        //CREATE MONTHLY SALARY FOR EACH EMPLOYEE
        for (let i = 0; i < employeeIDs.length; i++) {
          const employeeSalaryEntity = await strapi.entityService.create(
            "api::monthly-salary.monthly-salary",
            {
              data: {
                employee: employeeIDs[i].id,

                basicSalary: employeeIDs[i].grossSalary,
                grossSalaryEarned: 0,
                medicalAllowance: 0,
                paidSalary: 0,
                //SET MONTHLY RATE BASED ON GROSS SALARY AND WORKING DAYS
                monthlyRate: employeeIDs[i].grossSalary / req.workingDays,
                TotalHoursMonth: req.workingDays * 8,
                hoursLogged: 0,
                //WTH PENDING MAKING IT 0 FOR NOW
                WTH: 0,
                miscAdjustments: 0,
                loanDeduction: 0,
                month_data: monthData.id,
                publishedAt: Date.now(),
              },
            }
          );
        }
        //ADD 2 LEAVES FOR EACH EMPLOYEE
        for (let i = 0; i < employeeIDs.length; i++) {
          await strapi.entityService.update(
            "api::employee.employee",
            employeeIDs[i].id,
            {
              data: {
                leavesRemaining: employeeIDs[i].leavesRemaining + 2,
              },
            }
          );
        }

        ctx.body = employeeIDs;
      } catch (error) {
        console.log("error", error);
        ctx.body = "Error222";
      }
    },
  })
);
