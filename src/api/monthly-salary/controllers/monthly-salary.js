"use strict";

/**
 * monthly-salary controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::monthly-salary.monthly-salary",

  ({ strapi }) => ({
    async calculateSalary(ctx) {
      const req = ctx.request.body;
      //Request format will be
      // {
      //
      //     month:8,
      //   year: 2024,
      // }
      console.log("req", req);
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
      if (req.month < 7) {
        var fiscalYearCalculator = req.year - 1;
      } else {
        var fiscalYearCalculator = req.year;
      }
      const fiscalYear = [
        monthEnum[1] + (fiscalYearCalculator + 1),
        monthEnum[2] + (fiscalYearCalculator + 1),
        monthEnum[3] + (fiscalYearCalculator + 1),
        monthEnum[4] + (fiscalYearCalculator + 1),
        monthEnum[5] + (fiscalYearCalculator + 1),
        monthEnum[6] + (fiscalYearCalculator + 1),
        monthEnum[7] + fiscalYearCalculator,
        monthEnum[8] + fiscalYearCalculator,
        monthEnum[9] + fiscalYearCalculator,
        monthEnum[10] + fiscalYearCalculator,
        monthEnum[11] + fiscalYearCalculator,
        monthEnum[12] + fiscalYearCalculator,
      ];
      const monthlySalaries = await strapi.entityService.findMany(
        "api::monthly-salary.monthly-salary",
        {
          filters: {
            month_data: {
              month: monthEnum[req.month],
              year: req.year,
            },
          },
          populate: "*",
        }
      );

      for (let i = 0; i < monthlySalaries.length; i++) {
        //iterate over the dailyWorks to calculate total hours
        let totalHours = 0;
        for (let j = 0; j < monthlySalaries[i].dailyWorks.length; j++) {
          totalHours +=
            monthlySalaries[i].dailyWorks[j].hubstaffHours +
            monthlySalaries[i].dailyWorks[j].manualHours;
          if (monthlySalaries[i].dailyWorks[j].isLeave) {
            if (monthlySalaries[i].employee.leavesRemaining > 0) {
              totalHours += 8;
              await strapi.entityService.update(
                "api::employee.employee",
                monthlySalaries[i].employee.id,
                {
                  data: {
                    leavesRemaining:
                      monthlySalaries[i].employee.leavesRemaining - 1,
                  },
                }
              );
            }
          }
          if (monthlySalaries[i].dailyWorks[j].isHoliday) {
            totalHours += 8;
          }
        }

        //calculate total salary and separate it from medical allowance
        let totalEarnedSalary = totalHours * monthlySalaries[i].monthlyRate;
        let NetSalary = totalEarnedSalary;

        //calculate medical allowance
        let medicalAllowance = parseInt((totalEarnedSalary / 1.1) * 0.1);

        //update it in the database
        const updatedMonthlySalary = await strapi.entityService.update(
          "api::monthly-salary.monthly-salary",
          monthlySalaries[i].id,
          {
            data: {
              grossSalaryEarned: parseInt(totalEarnedSalary),
              medicalAllowance: medicalAllowance,
              netSalary: parseInt(NetSalary - medicalAllowance),
              hoursLogged: totalHours,
            },
          }
        );
        //calculate withholding tax if it is not already calculated

        const allSalariesForEmployee = await strapi.entityService.findMany(
          "api::monthly-salary.monthly-salary",
          {
            filters: {
              employee: {
                id: monthlySalaries[i].employee.id,
              },
              month_data: {
                monthIdentifier: {
                  $in: [
                    fiscalYear[0],
                    fiscalYear[1],
                    fiscalYear[2],
                    fiscalYear[3],
                    fiscalYear[4],
                    fiscalYear[5],
                    fiscalYear[6],
                    fiscalYear[7],
                    fiscalYear[8],
                    fiscalYear[9],
                    fiscalYear[10],
                    fiscalYear[11],
                  ],
                },
              },
            },
            populate: "*",
          }
        );
        //sort them by month_data.month from july to june
        allSalariesForEmployee.sort((a, b) => {
          return (
            fiscalYearEnum[a.month_data.month] -
            fiscalYearEnum[b.month_data.month]
          );
        });
        let totalTaxPaid = 0;

        //select salaries until the current month

        let totalEarnedSalaryForEmployeeUntilCurrentMonth = [];
        for (let k = 0; k < allSalariesForEmployee.length; k++) {
          totalEarnedSalaryForEmployeeUntilCurrentMonth.push(
            allSalariesForEmployee[k]
          );
          if (
            allSalariesForEmployee[k].month_data.month === monthEnum[req.month]
          ) {
            break;
          }
        }
        console.log(
          "totalEarnedSalaryForEmployeeUntilCurrentMonth",
          totalEarnedSalaryForEmployeeUntilCurrentMonth.length
        );
        //take average of all the salaries of the employee
        let totalEarnedSalaryForEmployee = 0;
        for (
          let k = 0;
          k < totalEarnedSalaryForEmployeeUntilCurrentMonth.length;
          k++
        ) {
          totalEarnedSalaryForEmployee += parseInt(
            totalEarnedSalaryForEmployeeUntilCurrentMonth[k].grossSalaryEarned
          );
          totalTaxPaid += parseInt(
            totalEarnedSalaryForEmployeeUntilCurrentMonth[k].WTH
          );
        }
        console.log(
          "totalEarnedSalaryForEmployee",
          totalEarnedSalaryForEmployee
        );
        let averageSalary =
          totalEarnedSalaryForEmployee / allSalariesForEmployee.length;

        let withholdingTax = 0;
        let annualSalary = averageSalary * 12;
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
          parseInt(taxSlab[0].fixedAmount);

        const monthlyTax = totalTaxToBePaid / 12;
        const updatedMonthlySalaryWithTax = await strapi.entityService.update(
          "api::monthly-salary.monthly-salary",
          monthlySalaries[i].id,
          {
            data: {
              WTH: parseInt(monthlyTax),
              netSalary: parseInt(NetSalary - monthlyTax),
            },
          }
        );
      }

      ctx.body = { message: "Salary Calculated" };
    },
  })
);
