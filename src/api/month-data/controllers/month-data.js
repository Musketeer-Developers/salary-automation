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
        const monthEnum = {
          january: 1,
          february: 2,
          march: 3,
          april: 4,
          may: 5,
          june: 6,
          july: 7,
          august: 8,
          september: 9,
          october: 10,
          november: 11,
          december: 12,
        };
        const workingDates = getWorkingDaysDatesForMonth(
          req.year,
          monthEnum[req.month],
          1
        );
        //CREATE NEW MONTH DATA
        const monthData = await strapi.entityService.create(
          "api::month-data.month-data",
          {
            data: {
              month: req.month,
              year: req.year,
              monthIdentifier: req.month + req.year,
              totalDays: req.totalDays,
              workingDays: workingDates.count,
              publishedAt: Date.now(),
            },
          }
        );
        //GET ALL EMPLOYEES
        const employeeIDs = await strapi.entityService.findMany(
          "api::employee.employee",
          {
            fields: ["id", "grossSalary", "leavesRemaining"],
          }
        );
        //CREATE MONTHLY SALARY FOR EACH EMPLOYEE
        const monthEnum = {
          january: 1,
          february: 2,
          march: 3,
          april: 4,
          may: 5,
          june: 6,
          july: 7,
          august: 8,
          september: 9,
          october: 10,
          november: 11,
          december: 12,
        };
        const workingDates = getWorkingDaysDatesForMonth(
          req.year,
          monthEnum[req.month],
          1
        );
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
                monthlyRate: employeeIDs[i].grossSalary / workingDates.count,
                TotalHoursMonth: workingDates.count * 8,
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
          //CREATE ATTENDANCE FOR EACH EMPLOYEE
          for (let j = 0; j < workingDates.length; j++) {
            const dailyWork = await strapi.entityService.create(
              "api::daily-work.daily-work",
              {
                data: {
                  empNo: employeeIDs[i].id,
                  workDate: new Date(
                    req.year,
                    monthEnum[req.month] - 1,
                    workingDates[j]
                  ),
                  hubstaffHours: 0,
                  manualHours: 0,
                  isHoliday: false,
                  isLate: false,
                  isLeave: false,
                  salaryMonth: employeeSalaryEntity.id,
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
        }
          ctx.body = employeeIDs;
        }
      } catch (error) {
        console.log("error", error);
        ctx.body = "Error222";
      }
    },
  })
);

function getWorkingDaysDatesForMonth(year, month, day = 1, workingDays = 0) {
  month = month - 1;
  let startDate = new Date(year, month, day);
  let endDate = new Date(year, month + 1, 0);
  let currentDate = startDate;
  let dateCollection = [];
  let currentDatecount = 1;
  while (currentDate <= endDate) {
    let weekDay = currentDate.getDay();

    if (weekDay !== 0 && weekDay !== 6) {
      workingDays++;
      dateCollection.push(currentDatecount);
    }
    currentDatecount++;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dateCollection;
}
