'use strict';

/**
 * daily-work service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::daily-work.daily-work');