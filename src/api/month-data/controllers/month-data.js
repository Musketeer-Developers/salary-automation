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
        const year = req.year;
        const month = req.month;
        const totalDaysInMonth = new Date(
          req.year,
          monthEnum[req.month],
          0
        ).getDate();

        // Check if month data already exists
        const existingMonthData = await strapi.entityService.findMany(
          "api::month-data.month-data",
          {
            filters: {
              monthIdentifier: req.month + req.year,
            },
          }
        );

        let monthData;
        if (existingMonthData.length > 0) {
          monthData = existingMonthData[0];
        } else {
          // Create new month data if it doesn't exist
          monthData = await strapi.entityService.create(
            "api::month-data.month-data",
            {
              data: {
                month: req.month,
                year: req.year,
                monthIdentifier: req.month + req.year,
                totalDays: totalDaysInMonth,
                workingDays: workingDates.count,
                publishedAt: Date.now(),
              },
            }
          );
        }

        // Get all employees
        const employees = await strapi.entityService.findMany(
          "api::employee.employee",
          {
            fields: [
              "id",
              "grossSalary",
              "leavesRemaining",
              "employementStatus",
            ],
            populate: ["wht"],
          }
        );

        for (const employee of employees) {
          // Check if monthly salary entry already exists for the employee
          const existingMonthlySalary = await strapi.entityService.findMany(
            "api::monthly-salary.monthly-salary",
            {
              filters: {
                employee: employee.id,
                month_data: monthData.id,
              },
            }
          );

          if (existingMonthlySalary.length === 0) {
            // Get healthAllowance from with-holding-tax relation
            //const healthAllowance = employee.wht ? employee.wht.healthAllowance : 0;

            // Create monthly salary for employee if it doesn't exist
            const employeeSalaryEntity = await strapi.entityService.create(
              "api::monthly-salary.monthly-salary",
              {
                data: {
                  employee: employee.id,
                  basicSalary: employee.grossSalary,
                  grossSalaryEarned: 0,
                  medicalAllowance: 0, // Set medicalAllowance to healthAllowance
                  paidSalary: 0,
                  monthlyRate: employee.grossSalary / (workingDates.count * 8),
                  TotalHoursMonth: workingDates.count * 8,
                  hoursLogged: 0,
                  WTH: 0,
                  miscAdjustments: 0,
                  loanDeduction: 0,
                  month_data: monthData.id,
                  publishedAt: Date.now(),
                },
              }
            );

            // Create daily work entries for the employee
            for (let j = 1; j <= totalDaysInMonth; j++) {
              await strapi.entityService.create("api::daily-work.daily-work", {
                data: {
                  empNo: employee.id,
                  workDate: new Date(req.year, monthEnum[req.month] - 1, j),
                  hubstaffHours: 0,
                  manualHours: 0,
                  isHoliday: false,
                  isLate: false,
                  isLeave: false,
                  salaryMonth: employeeSalaryEntity.id,
                  publishedAt: Date.now(),
                },
              });
            }

            // Add 2 leaves for each employee
            if (employee.employementStatus === "Permanent") {
              await strapi.entityService.update(
                "api::employee.employee",
                employee.id,
                {
                  data: {
                    leavesRemaining: employee.leavesRemaining + 2,
                  },
                }
              );
            }
          }
        }
        ctx.body = { message: "Month data initialized" };
      } catch (error) {
        console.log("error", error);
        ctx.body = { message: "Error in making new month data" };
      }
    },

    async addHoliday(ctx) {
      try {
        const req = ctx.request.body;
        const dateArray = req.date.split("-");
        const day = parseInt(dateArray[0]);
        const month = parseInt(dateArray[1]);
        const year = parseInt(dateArray[2]);
        const dateObj = new Date(year, month - 1, day);
    
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
    
        const monthData = await strapi.entityService.findMany(
          "api::month-data.month-data",
          {
            filters: {
              monthIdentifier: monthName + year,
            },
            populate: {
              monthly_salaries: true,  // This is to ensure we can count holiday updates later
            },
          }
        );
    
        if (!monthData || monthData.length === 0) {
          ctx.body = { message: "Month data not found" };
          return;
        }
    
        let holidayAdded = false;
    
        // Loop through each employee entry in the request
        for (const employee of req.employees) {
          // Find the monthly salary entry for the employee in the given month
          const monthlySalary = await strapi.entityService.findMany(
            "api::monthly-salary.monthly-salary",
            {
              filters: {
                employee: employee.empID,
                month_data: monthData[0].id,
              },
            }
          );
    
          if (!monthlySalary || monthlySalary.length === 0) {
            continue; // Skip if no monthly salary found
          }
    
          // Find the daily work entry for the specific date
          const dailyWork = await strapi.entityService.findMany(
            "api::daily-work.daily-work",
            {
              filters: {
                salaryMonth: monthlySalary[0].id,
                workDate: dateObj,
              },
            }
          );
    
          if (dailyWork.length > 0) {
            // Update the isHoliday and holidayName fields
            await strapi.entityService.update(
              "api::daily-work.daily-work",
              dailyWork[0].id,
              {
                data: {
                  isHoliday: employee.isHoliday,
                  holidayName: req.holidayName,
                },
              }
            );
    
            // Check if holiday is added for this date
            if (employee.isHoliday && !holidayAdded) {
              holidayAdded = true;
            }
          }
        }
    
        // Increment holidayCount if a holiday was added
        if (holidayAdded) {
          await strapi.entityService.update(
            "api::month-data.month-data",
            monthData[0].id,
            {
              data: {
                holidayCount: monthData[0].holidayCount + 1,
              },
            }
          );
        }
    
        ctx.body = { message: "Holiday information updated" };
      } catch (error) {
        console.log("error", error);
        ctx.body = { message: "Error updating holiday information" };
      }
    },

    async getHolidayInfo(ctx) {
      try {
        const { date } = ctx.query;
        const [day, month, year] = date.split("-").map(Number);
    
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
    
        // Find the relevant month data
        const monthData = await strapi.entityService.findMany(
          "api::month-data.month-data",
          {
            filters: {
              monthIdentifier: monthName + year,
            },
            populate: {
              monthly_salaries: {
                populate: {
                  employee: {
                    fields: ["id", "Name"],
                  },
                  dailyWorks: {
                    filters: {
                      workDate: new Date(year, month - 1, day),
                    },
                    fields: ["isHoliday", "holidayName"],
                  },
                },
              },
            },
          }
        );
    
        if (!monthData || monthData.length === 0) {
          ctx.body = { message: "Month data not found" };
          return;
        }
    
        const employees = [];
        let holidayName = "";
    
        // Iterate through the monthly salaries to get holiday info
        for (const salary of monthData[0].monthly_salaries) {
          const employee = {
            empID: salary.employee.id,
            empName: salary.employee.Name,
            isHoliday: false,
          };
    
          for (const work of salary.dailyWorks) {
            if (work.isHoliday) {
              employee.isHoliday = true;
              if (!holidayName && work.holidayName) {
                holidayName = work.holidayName;
              }
            }
          }
    
          employees.push(employee);
        }
    
        ctx.body = {
          date,
          holidayName: holidayName || "No holiday name provided",
          employees,
        };
      } catch (error) {
        console.log("error", error);
        ctx.body = { message: "Error retrieving holiday information" };
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
  return { dates: dateCollection, count: workingDays };
}
