module.exports = {
    routes: [
      {
        method: 'POST',
        path: '/daily-works/bulk-create',
        handler: 'daily-work.bulkCreateDailyWork',
        config: {
          auth: false, // Change to true if authentication is required
        },
      },
    ],
  };
  