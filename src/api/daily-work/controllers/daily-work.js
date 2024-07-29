"use strict";

/**
 * daily-work custom controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::daily-work.daily-work",
  ({ strapi }) => ({
    async bulkCreateDailyWork(ctx) {
      try {
        const data = ctx.request.body;

        // Loop through each employee data object
        for (const employeeData of data) {
          const employeeName = employeeData.employeeName;

          // Find the employee by name
          const employee = await strapi.entityService.findMany('api::employee.employee', {
            filters: { Name: employeeName },
            fields: ['id', 'empNo']
          });

          if (!employee || employee.length === 0) {
            continue; // Skip if employee not found
          }

          const employeeId = employee[0].id;

          // Loop through each daily work entry for the employee
          for (const dailyWork of employeeData.dailyWorkEntries) {
            const date = dailyWork.date;

            // Extract month and year from date
            const dateObj = new Date(date);
            const month = dateObj.toLocaleString('default', { month: 'long' }).toLowerCase();
            const year = dateObj.getFullYear();

            // Find the corresponding monthly-salary entry for the employee
            const monthlySalary = await strapi.entityService.findMany('api::monthly-salary.monthly-salary', {
              filters: {
                employee: employeeId,
                month_data: {
                  month: month,
                  year: year
                }
              },
              fields: ['id']
            });

            if (!monthlySalary || monthlySalary.length === 0) {
              continue; // Skip if monthly-salary entry not found
            }

            const salaryMonthId = monthlySalary[0].id;

            // Create the daily-work entry
            await strapi.entityService.create('api::daily-work.daily-work', {
              data: {
                empNo: employeeId,
                workDate: date,
                hubstaffHours: dailyWork.hubstaffHours,
                manualHours: dailyWork.manualHours || 0,
                isHoliday: dailyWork.isHoliday || false,
                isLeave: dailyWork.isLeave || false,
                isLate: dailyWork.isLate || false,
                salaryMonth: salaryMonthId,
                publishedAt: Date.now(),
              },
            });
          }
        }

        ctx.body = { message: "Daily work entries created successfully" };
      } catch (error) {
        console.log("Error:", error);
        ctx.body = { error: "An error occurred while creating daily work entries" };
      }
    },
  })
);
