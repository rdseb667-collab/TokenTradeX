'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // No schema changes needed - we're just adding data
    // This migration is for tracking purposes
    console.log('Migration for adding forex pairs - no schema changes required');
  },

  down: async (queryInterface, Sequelize) => {
    // No rollback needed for data-only migration
    console.log('Rollback for forex pairs migration - no schema changes to revert');
  }
};