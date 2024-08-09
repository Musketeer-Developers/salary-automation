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
        // @ts-ignore
        const req = ctx.request.body;
        console.log("Request received:", req);

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
        if (monthEnum[req.month] < 7) {
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

        const fiscalYearString = `${fiscalYearCalculator}-${fiscalYearCalculator + 1}`;

        console.log("Fiscal year string:", fiscalYearString);

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

          // Fetch employee details including joining date
          const employee = await strapi.entityService.findOne(
            "api::employee.employee",
            monthlySalaries[i].employee.id,
            {
              fields: ["joinDate"],
            }
          );
          console.log("Employee details:", employee);

          function getMonthName(monthNumber) {
            const date = new Date();
            date.setMonth(monthNumber); // JavaScript months are 0-11, so we subtract 1
            return date.toLocaleString('default', { month: 'long' });
          }
 
          let joiningDate = new Date(employee.joinDate);
          let joiningMonth = joiningDate.getMonth(); // JavaScript months are zero-based
          let joiningMonthName = getMonthName(joiningMonth)
          joiningMonthName = joiningMonthName.toLowerCase(); 
          let joiningYear = joiningDate.getFullYear();
          
          let totalHours = 0;
          let paidLeavesUsed = 0; // Initialize counter for paid leaves used

          for (let j = 0; j < monthlySalaries[i].dailyWorks.length; j++) {
            totalHours +=
              monthlySalaries[i].dailyWorks[j].hubstaffHours +
              monthlySalaries[i].dailyWorks[j].manualHours;

            if (monthlySalaries[i].dailyWorks[j].isLeave) {
              if (monthlySalaries[i].employee.leavesRemaining > 0) {
                totalHours += 8;
                paidLeavesUsed += 1; // Increment the counter for each paid leave used

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
                paidLeavesUsed: paidLeavesUsed,
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
          console.log("Joining Month in fiscal year: ", fiscalYearEnum[joiningMonthName]);
          console.log("req.year, joiningYear", req.year, ", ",joiningYear)
          let monthsWorkedInThisYear = 12;
          if (joiningYear === fiscalYearCalculator) {
            monthsWorkedInThisYear = 12 - fiscalYearEnum[joiningMonthName];
          }


          console.log("Expected months worked this year: ", monthsWorkedInThisYear);

                                        // Previous months              // Current month                          // Number of months including this one
          let averageSalary = parseInt((totalEarnedSalaryForEmployee + (totalEarnedSalary - medicalAllowance)) / (totalEarnedSalaryForEmployeeUntilCurrentMonth.length + 1));
          let annualSalary = averageSalary * monthsWorkedInThisYear;
          if(req.month === "june")
          {
            console.log("\nJUNE INVOKED\n");
            annualSalary = parseInt(totalEarnedSalaryForEmployee + (totalEarnedSalary - medicalAllowance))
          }

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
          let monthlyTax = totalTaxToBePaid / monthsWorkedInThisYear;
          if(req.month === "june")
            {
              monthlyTax = totalTaxToBePaid - totalTaxPaid;

            }

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
            fiscalYearString,
            totalTaxPaid,
            taxSlab[0].id,
            monthlyTax,
            monthsWorkedInThisYear
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
  year,
  totalTaxPaid,
  taxSlabId,
  monthlyTax,
  monthsWorkedInThisYear
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

  let existingRecord = withHoldingTax.find(
    (record) => record.fiscalYear === String(year)
  );

  if (existingRecord) {
    const totalPaidBeforeCurrentMonth = totalTaxPaid;
    const newTotalPaid = totalPaidBeforeCurrentMonth + monthlyTax; // Monthly tax calculated

    const updatedWithHoldingTax = await strapi.entityService.update(
      "api::with-holding-tax.with-holding-tax",
      existingRecord.id,
      {
        data: {
          projectedYearlySalary: parseInt(annualSalary),
          totalTaxToBePaid: parseInt(totalTaxToBePaid),
          monthlyAmountToBePaid: String(year), // Storing the year
          totalPaid: parseInt(newTotalPaid),
          tax_slab: taxSlabId,
        },
      }
    );
    console.log("Updated withholding tax:", updatedWithHoldingTax);
  } else {
    const newWithHoldingTax = await strapi.entityService.create(
      "api::with-holding-tax.with-holding-tax",
      {
        data: {
          emp_no: employeeId,
          projectedYearlySalary: parseInt(annualSalary),
          totalTaxToBePaid: parseInt(totalTaxToBePaid),
          fiscalYear: String(year), // Storing the year
          totalPaid: parseInt(totalTaxToBePaid / monthsWorkedInThisYear), // Initial tax for the first month
          tax_slab: taxSlabId,
          publishedAt: new Date(), // Setting the publishedAt field to the current date
        },
      }
    );
    console.log("Created new withholding tax entry:", newWithHoldingTax);
  }
}
