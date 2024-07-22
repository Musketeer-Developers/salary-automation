'use strict';

/**
 * monthly-salary service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::monthly-salary.monthly-salary');
