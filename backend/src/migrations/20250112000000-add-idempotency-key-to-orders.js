'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'idempotency_key', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Client-provided key for idempotent order creation'
    });

    // Add unique index on (user_id, idempotency_key)
    await queryInterface.addIndex('orders', ['user_id', 'idempotency_key'], {
      unique: true,
      name: 'orders_user_idempotency_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('orders', 'orders_user_idempotency_unique');
    await queryInterface.removeColumn('orders', 'idempotency_key');
  }
};
