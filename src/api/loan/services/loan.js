'use strict';

/**
 * loan service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::loan.loan');
