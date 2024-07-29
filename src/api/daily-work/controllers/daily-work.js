"use strict";
"use strict";

/**
 * daily-work custom controller
 * daily-work custom controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::daily-work.daily-work",
  ({ strapi }) => ({
    async bulkCreateDailyWork(ctx) {
      try {
        const data = ctx.request.body;
        const errors = [];

        // Loop through each employee data object
        for (const employeeData of data) {
          const employeeName = employeeData.employeeName;

          // Find the employee by name
          const employee = await strapi.entityService.findMany('api::employee.employee', {
            filters: { Name: employeeName },
            fields: ['id', 'empNo']
          });

          if (!employee || employee.length === 0) {
            errors.push(`Employee ${employeeName} not found`);
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
              errors.push(`Monthly salary entry not found for ${employeeName} in ${month} ${year}`);
              continue; // Skip if monthly-salary entry not found
            }

            const salaryMonthId = monthlySalary[0].id;

            // Find the existing daily-work entry
            const existingDailyWork = await strapi.entityService.findMany('api::daily-work.daily-work', {
              filters: {
                empNo: employeeId,
                workDate: date,
                salaryMonth: salaryMonthId
              },
              fields: ['id']
            });

            if (existingDailyWork && existingDailyWork.length > 0) {
              // Update the existing daily-work entry
              const dailyWorkId = existingDailyWork[0].id;
              await strapi.entityService.update('api::daily-work.daily-work', dailyWorkId, {
                data: {
                  hubstaffHours: dailyWork.hubstaffHours,
                  manualHours: dailyWork.manualHours || 0,
                  isHoliday: dailyWork.isHoliday || false,
                  isLeave: dailyWork.isLeave || false,
                  isLate: dailyWork.isLate || false,
                  updatedAt: Date.now(),
                },
              });
            } else {
              // If no entry is found, add to errors
              errors.push(`Daily work entry not found for ${employeeName} on ${date}`);
            }
          }
        }

        if (errors.length > 0) {
          ctx.body = { message: "Some errors occurred", errors };
        } else {
          ctx.body = { message: "Daily work entries updated successfully" };
        }
      } catch (error) {
        console.log("Error:", error);
        ctx.body = { error: "An error occurred while updating daily work entries" };
      }
    },
  })
);
