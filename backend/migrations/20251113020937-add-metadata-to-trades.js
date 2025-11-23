'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('trades', 'metadata', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Fee details, rebate info, tier data, etc.'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('trades', 'metadata');
  }
};
