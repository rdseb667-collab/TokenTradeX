module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create enum type for job status
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_post_trade_jobs_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'dead_letter');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create post_trade_jobs table
    await queryInterface.createTable('post_trade_jobs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      trade_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      job_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      correlation_id: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'dead_letter'),
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
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes
    await queryInterface.addIndex('post_trade_jobs', ['status'], {
      name: 'post_trade_jobs_status'
    });

    await queryInterface.addIndex('post_trade_jobs', ['scheduled_for'], {
      name: 'post_trade_jobs_scheduled_for'
    });

    await queryInterface.addIndex('post_trade_jobs', ['trade_id'], {
      name: 'post_trade_jobs_trade_id'
    });

    await queryInterface.addIndex('post_trade_jobs', ['status', 'scheduled_for'], {
      name: 'post_trade_jobs_status_scheduled_for'
    });

    await queryInterface.addIndex('post_trade_jobs', ['correlation_id'], {
      name: 'post_trade_jobs_correlation_id'
    });

    await queryInterface.addIndex('post_trade_jobs', ['job_type'], {
      name: 'post_trade_jobs_job_type'
    });

    console.log('✅ post_trade_jobs table created with indexes');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('post_trade_jobs');
    
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_post_trade_jobs_status";
    `);

    console.log('✅ post_trade_jobs table dropped');
  }
};
