'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create revenue_streams table
    await queryInterface.createTable('revenue_streams', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      collected: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
        allowNull: false
      },
      distributed: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
        allowNull: false
      },
      target_monthly: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(10),
        defaultValue: 'USD',
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create revenue_events table
    await queryInterface.createTable('revenue_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      stream_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'revenue_streams',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      source_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      source_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(10),
        defaultValue: 'USD',
        allowNull: false
      },
      gross_amount: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false
      },
      net_amount: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false
      },
      holder_share: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false
      },
      reserve_share: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create async_jobs table
    await queryInterface.createTable('async_jobs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending',
        allowNull: false
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      max_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
        allowNull: false
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      scheduled_for: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('revenue_streams', ['is_active']);
    await queryInterface.addIndex('revenue_events', ['stream_id']);
    await queryInterface.addIndex('revenue_events', ['source_type']);
    await queryInterface.addIndex('revenue_events', ['source_type', 'source_id'], {
      unique: true,
      name: 'revenue_events_source_unique'
    });
    await queryInterface.addIndex('revenue_events', ['created_at']);
    await queryInterface.addIndex('async_jobs', ['type']);
    await queryInterface.addIndex('async_jobs', ['status']);
    await queryInterface.addIndex('async_jobs', ['scheduled_for']);
    await queryInterface.addIndex('async_jobs', ['status', 'scheduled_for']);

    // Insert the 10 revenue streams
    await queryInterface.bulkInsert('revenue_streams', [
      { id: 0, name: 'Trading Fees', description: '0.15% fee on every trade', target_monthly: 50000 },
      { id: 1, name: 'Withdrawal Fees', description: 'Small fee when users cash out', target_monthly: 10000 },
      { id: 2, name: 'Premium Subscriptions', description: '$10-50/month for pro features', target_monthly: 25000 },
      { id: 3, name: 'API Licensing', description: 'Other platforms pay to use our engine', target_monthly: 100000 },
      { id: 4, name: 'Market Making', description: 'Earn spread from liquidity provision', target_monthly: 75000 },
      { id: 5, name: 'Lending Interest', description: 'Users borrow, platform earns interest', target_monthly: 40000 },
      { id: 6, name: 'Staking Commissions', description: 'Small % of staking rewards', target_monthly: 30000 },
      { id: 7, name: 'Copy Trading Fees', description: 'Fee when copying successful traders', target_monthly: 20000 },
      { id: 8, name: 'White Label Licensing', description: 'Monthly fees from other exchanges using our tech', target_monthly: 150000 },
      { id: 9, name: 'NFT Position Trading', description: 'Fees from tokenized position marketplace', target_monthly: 35000 }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('async_jobs');
    await queryInterface.dropTable('revenue_events');
    await queryInterface.dropTable('revenue_streams');
  }
};
