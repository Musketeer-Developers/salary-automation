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

          for (let j = 0; j < workingDates.dates.length; j++) {
            const dailyWork = await strapi.entityService.create(
              "api::daily-work.daily-work",
              {
                data: {
                  empNo: employeeIDs[i].id,
                  workDate: new Date(
                    req.year,
                    monthEnum[req.month] - 1,
                    workingDates.dates[j]
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
      } catch (error) {
        console.log("error", error);
        ctx.body = "Error222";
      }
    },
    async addHoliday(ctx) {
      const req = ctx.request.body;
      //separate 2010-08-05
      const dateArray = req.date.split("-");
      const day = parseInt(dateArray[2]);
      const month = parseInt(dateArray[1]);
      const year = parseInt(dateArray[0]);
      const dateObj = new Date(year, month - 1, day);
      //get month name in lowercase
      const monthEnum = {
        1: "january",
        2: "february",
        3: "march",
        4: "april",
        5: "may",
        6: "june",
        7: "july",
        8: "august",
        9: "september",
        10: "october",
        11: "november",
        12: "december",
      };
      const monthName = monthEnum[month];
      //find month data
      const monthData = await strapi.entityService.findMany(
        "api::month-data.month-data",
        {
          filters: {
            monthIdentifier: monthName + year,
          },
        }
      ); //returns array with one object
      //add in holiday count
      const updatedMonthData = await strapi.entityService.update(
        "api::month-data.month-data",
        monthData[0].id,
        {
          data: {
            holidayCount: monthData[0].holidayCount + 1,
          },
        }
      );
      //find all monthly salary ids for the month
      const monthlySalaries = await strapi.entityService.findMany(
        "api::monthly-salary.monthly-salary",
        {
          filters: {
            month_data: {
              id: monthData[0].id,
            },
          },
        }
      );

      for (const salary of monthlySalaries) {
        const dailyWork = await strapi.entityService.findMany(
          "api::daily-work.daily-work",
          {
            filters: {
              salaryMonth: {
                id: salary.id,
              },
              workDate: dateObj,
            },
          }
        );
        if (dailyWork.length > 0) {
          await strapi.entityService.update(
            "api::daily-work.daily-work",
            dailyWork[0].id,
            {
              data: {
                isHoliday: true,
              },
            }
          );
        }
      }
      ctx.body = { data: "Holiday added for " + req.date };
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
  return { dates: dateCollection, count: workingDays };
}
