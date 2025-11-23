'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create revenue_ledger table
    await queryInterface.createTable('revenue_ledger', {
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      stream: {
        type: Sequelize.STRING(50),
        allowNull: false,
        primaryKey: true,
        comment: 'Revenue stream type'
      },
      period: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        primaryKey: true,
        comment: 'Aggregation period (daily)'
      },
      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        primaryKey: true,
        defaultValue: 'USD'
      },
      gross: {
        type: Sequelize.DECIMAL(38, 18),
        allowNull: false,
        defaultValue: 0,
        comment: 'Gross revenue before platform split'
      },
      net: {
        type: Sequelize.DECIMAL(38, 18),
        allowNull: false,
        defaultValue: 0,
        comment: 'Net revenue after platform split (user earnings)'
      },
      last_event_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Last processed event ID for idempotency'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Add indexes for revenue_ledger
    await queryInterface.addIndex('revenue_ledger', ['user_id', 'stream'], {
      name: 'idx_revenue_ledger_user_stream'
    });
    await queryInterface.addIndex('revenue_ledger', ['period'], {
      name: 'idx_revenue_ledger_period'
    });
    await queryInterface.addIndex('revenue_ledger', ['stream'], {
      name: 'idx_revenue_ledger_stream'
    });

    // 2. Create fee_exempt_allowlist table
    await queryInterface.createTable('fee_exempt_allowlist', {
      user_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for exemption (e.g., VIP partner, promotion)'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Exemption expiry date'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Add indexes for fee_exempt_allowlist
    await queryInterface.addIndex('fee_exempt_allowlist', ['expires_at'], {
      name: 'idx_fee_exempt_expires'
    });
    await queryInterface.addIndex('fee_exempt_allowlist', ['user_id', 'expires_at'], {
      name: 'idx_fee_exempt_user_expires'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order
    await queryInterface.dropTable('fee_exempt_allowlist');
    await queryInterface.dropTable('revenue_ledger');
  }
};
