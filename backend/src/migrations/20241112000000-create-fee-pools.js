/**
 * Migration: Create fee pools and fee pool transactions tables
 * Implements proper 40/30/20/10 platform fee distribution
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create fee_pools table
    await queryInterface.createTable('fee_pools', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        comment: 'Pool ID: 0=Staking, 1=Liquidity, 2=Treasury, 3=Development'
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      total_collected: {
        type: Sequelize.DECIMAL(30, 8),
        defaultValue: 0,
        allowNull: false,
        comment: 'Total fees collected in USD'
      },
      total_distributed: {
        type: Sequelize.DECIMAL(30, 8),
        defaultValue: 0,
        allowNull: false,
        comment: 'Total distributed/spent from pool in USD'
      },
      available_balance: {
        type: Sequelize.DECIMAL(30, 8),
        defaultValue: 0,
        allowNull: false,
        comment: 'Current available balance in USD'
      },
      allocation_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Percentage of platform fees (e.g., 40.00 for 40%)'
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

    // Add indexes
    await queryInterface.addIndex('fee_pools', ['is_active']);
    await queryInterface.addIndex('fee_pools', ['name'], { unique: true });

    // 2. Create fee_pool_transactions table
    await queryInterface.createTable('fee_pool_transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      pool_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fee_pools',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      transaction_type: {
        type: Sequelize.ENUM('collection', 'distribution', 'adjustment'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(30, 8),
        allowNull: false
      },
      balance_before: {
        type: Sequelize.DECIMAL(30, 8),
        allowNull: false
      },
      balance_after: {
        type: Sequelize.DECIMAL(30, 8),
        allowNull: false
      },
      source_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'e.g., trade, staking, liquidity'
      },
      source_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Trade ID or other source identifier'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
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

    // Add indexes for fee_pool_transactions
    await queryInterface.addIndex('fee_pool_transactions', ['pool_id', 'created_at']);
    await queryInterface.addIndex('fee_pool_transactions', ['source_type', 'source_id']);
    await queryInterface.addIndex('fee_pool_transactions', ['transaction_type']);

    // 3. Initialize the 4 fee pools with proper allocations
    await queryInterface.bulkInsert('fee_pools', [
      {
        id: 0,
        name: 'Staking Rewards',
        description: 'Pool for TTX staking rewards distribution',
        allocation_percentage: 40.0,
        total_collected: 0,
        total_distributed: 0,
        available_balance: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 1,
        name: 'Liquidity Mining',
        description: 'Pool for liquidity provider incentives',
        allocation_percentage: 30.0,
        total_collected: 0,
        total_distributed: 0,
        available_balance: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        name: 'Treasury Reserve',
        description: 'Pool for protocol treasury and reserves',
        allocation_percentage: 20.0,
        total_collected: 0,
        total_distributed: 0,
        available_balance: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 3,
        name: 'Development Fund',
        description: 'Pool for platform development and maintenance',
        allocation_percentage: 10.0,
        total_collected: 0,
        total_distributed: 0,
        available_balance: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('✅ Fee pools created and initialized with 40/30/20/10 split');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('fee_pool_transactions');
    await queryInterface.dropTable('fee_pools');
  }
};
