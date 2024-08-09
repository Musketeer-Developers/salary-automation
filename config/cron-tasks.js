const axios = require('axios');

module.exports = {
  /**
   * Initialize month data.
   * Runs at the start of every month
   */

  initializeMonth: {
    task: async ({ strapi }) => {
      try {
        const currentDate = new Date();
        const month = currentDate.toLocaleString('default', { month: 'long' }).toLowerCase();
        const year = currentDate.getFullYear();

        const requestBody = {
          month: month,
          year: year,
        };

        console.log('Cron Job called: Initializing Month Data for:', requestBody);

        // Make the POST request to the API
        const response = await axios.post('http://localhost:1337/api/month-data/initializeMonthData', requestBody);

        console.log('API Response:', response.data);
      } catch (err) {
        console.error('Error calling API:', err);
      }
    },
    options: {
        rule: "0 0 1 * *", // Runs at the start of every month
    },
  },
};
