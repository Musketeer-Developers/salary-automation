"use strict";

/**
 * monthly-salary controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::monthly-salary.monthly-salary",
  ({ strapi }) => ({
    async calculateSalary(ctx) {
      try {
        const req = ctx.request.body;
        console.log("Request received:", req);

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

        let fiscalYearCalculator;
        if (req.month < 7) {
          fiscalYearCalculator = req.year - 1;
        } else {
          fiscalYearCalculator = req.year;
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

        const identifier = `${req.month}${req.year}`;
        console.log("Searching for identifier:", identifier);

        const monthlySalaries = await strapi.entityService.findMany(
          "api::monthly-salary.monthly-salary",
          {
            filters: {
              month_data: {
                monthIdentifier: identifier,
              },
            },
            populate: "*",
          }
        );
        console.log("Monthly salaries found:", monthlySalaries.length);

        if (monthlySalaries.length === 0) {
          ctx.body = { message: "No monthly salaries found for the given month and year." };
          return;
        }

        for (let i = 0; i < monthlySalaries.length; i++) {
          console.log("Processing salary for employee:", monthlySalaries[i].employee.id);
          
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
                console.log(`Leave applied for employee ${monthlySalaries[i].employee.id}`);
              }
            }

            if (monthlySalaries[i].dailyWorks[j].isHoliday) {
              totalHours += 8;
            }
          }
          console.log("Total hours calculated:", totalHours);

          let totalEarnedSalary = totalHours * monthlySalaries[i].monthlyRate;
          let NetSalary = totalEarnedSalary;
          let medicalAllowance = parseInt((totalEarnedSalary / 1.1) * 0.1);
          NetSalary = NetSalary - medicalAllowance;

          const updatedMonthlySalary = await strapi.entityService.update(
            "api::monthly-salary.monthly-salary",
            monthlySalaries[i].id,
            {
              data: {
                grossSalaryEarned: parseInt(totalEarnedSalary - medicalAllowance),
                medicalAllowance: medicalAllowance,
                netSalary: parseInt(NetSalary),
                hoursLogged: totalHours,
              },
            }
          );
          console.log("Updated monthly salary:", updatedMonthlySalary);

          const allSalariesForEmployee = await strapi.entityService.findMany(
            "api::monthly-salary.monthly-salary",
            {
              filters: {
                employee: {
                  id: monthlySalaries[i].employee.id,
                },
                month_data: {
                  monthIdentifier: {
                    $in: fiscalYear,
                  },
                },
              },
              populate: "*",
            }
          );
          console.log("All salaries for employee:", allSalariesForEmployee.length);

          allSalariesForEmployee.sort((a, b) => {
            return (
              fiscalYearEnum[a.month_data.month] -
              fiscalYearEnum[b.month_data.month]
            );
          });

          let totalTaxPaid = 0;
          let totalEarnedSalaryForEmployeeUntilCurrentMonth = [];
          for (let k = 0; k < allSalariesForEmployee.length; k++) {
            console.log("Previous month: ", allSalariesForEmployee[k].month_data.month)

            if (
              allSalariesForEmployee[k].month_data.month === req.month
            ) {
              break;
            }
            totalEarnedSalaryForEmployeeUntilCurrentMonth.push(
              allSalariesForEmployee[k]
            );
          }
          console.log("Salaries until current month:", totalEarnedSalaryForEmployeeUntilCurrentMonth.length);

          let totalEarnedSalaryForEmployee = 0;
          for (let k = 0; k < totalEarnedSalaryForEmployeeUntilCurrentMonth.length; k++) {
            totalEarnedSalaryForEmployee += parseInt(
              totalEarnedSalaryForEmployeeUntilCurrentMonth[k].grossSalaryEarned
            );
            totalTaxPaid += parseInt(
              totalEarnedSalaryForEmployeeUntilCurrentMonth[k].WTH
            );
          }
          console.log("Total earned salary for employee before this month:", totalEarnedSalaryForEmployee);
          console.log("Total Tax paid before this month: ", totalTaxPaid);

          let averageSalary = parseInt((totalEarnedSalaryForEmployee + (totalEarnedSalary - medicalAllowance)) / (totalEarnedSalaryForEmployeeUntilCurrentMonth.length + 1));
          let annualSalary = averageSalary * 12;

          console.log("averageSalary: ", averageSalary);

          const taxSlab = await strapi.entityService.findMany(
            "api::tax-slab.tax-slab",
            {
              filters: {
                lowerCap: { $lte: annualSalary },
                upperCap: { $gte: annualSalary },
              },
            }
          );
          console.log("Tax slab found:", taxSlab);

          const totalTaxToBePaid = (annualSalary - taxSlab[0].lowerCap) * (taxSlab[0].rate / 100) + parseInt(taxSlab[0].fixedAmount);
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
          console.log("Updated monthly salary with tax:", updatedMonthlySalaryWithTax);

          // Update Withholding Tax Collection
          await updateWithHoldingTax(
            strapi,
            monthlySalaries[i].employee.id,
            annualSalary,
            totalTaxToBePaid,
            monthlyTax,
            totalTaxPaid,
            taxSlab[0].id
          );
        }

        ctx.body = { message: "Salary Calculated" };
      } catch (error) {
        console.error("Error calculating salary:", error);
        ctx.status = 500;
        ctx.body = { message: "Internal Server Error", error: error.message };
      }
    },
  })
);

async function updateWithHoldingTax(
  strapi,
  employeeId,
  annualSalary,
  totalTaxToBePaid,
  monthlyTax,
  totalTaxPaid,
  taxSlabId
) {
  const withHoldingTax = await strapi.entityService.findMany(
    "api::with-holding-tax.with-holding-tax",
    {
      filters: {
        emp_no: {
          id: employeeId,
        },
      },
    }
  );

  if (withHoldingTax.length > 0) {
    const totalPaidBeforeCurrentMonth = totalTaxPaid;
    const newTotalPaid = totalPaidBeforeCurrentMonth + monthlyTax;

    const updatedWithHoldingTax = await strapi.entityService.update(
      "api::with-holding-tax.with-holding-tax",
      withHoldingTax[0].id,
      {
        data: {
          projectedYearlySalary: parseInt(annualSalary),
          totalTaxToBePaid: parseInt(totalTaxToBePaid),
          monthlyAmountToBePaid: parseInt(monthlyTax),
          totalPaid: parseInt(newTotalPaid),
          tax_slab: taxSlabId,
        },
      }
    );
    console.log("Updated withholding tax:", updatedWithHoldingTax);
  } else {
    console.log(`Withholding tax record not found for employee ${employeeId}`);
  }
}
