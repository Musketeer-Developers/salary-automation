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
        if (monthlySalaries[i].WTH === 0) {
          //find all the salary records of the employee for the year
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
            }
          );

          let totalTaxPaid = 0;
          //take average of all the salaries of the employee
          let totalEarnedSalaryForEmployee = 0;
          for (let k = 0; k < allSalariesForEmployee.length; k++) {
            totalEarnedSalaryForEmployee += parseInt(
              allSalariesForEmployee[k].grossSalaryEarned
            );
            totalTaxPaid += parseInt(allSalariesForEmployee[k].WTH);
          }
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
      }

      ctx.body = { message: "Salary Calculated" };
    },
  })
);
