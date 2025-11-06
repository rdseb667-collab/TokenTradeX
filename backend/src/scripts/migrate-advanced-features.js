const { sequelize } = require('../config/database');

/**
 * Clean up and recreate new tables for dividend mining features
 */
async function migrate() {
  try {
    console.log('🔧 Running migration: Drop and recreate advanced feature tables...\n');

    // Drop existing tables to avoid conflicts
    await sequelize.query('DROP TABLE IF EXISTS "dividend_lotteries" CASCADE;');
    await sequelize.query('DROP TABLE IF EXISTS "synthetic_positions" CASCADE;');
    await sequelize.query('DROP TABLE IF EXISTS "staking_positions" CASCADE;');
    
    // Drop enums
    await sequelize.query('DROP TYPE IF EXISTS "enum_staking_positions_lock_period" CASCADE;');
    await sequelize.query('DROP TYPE IF EXISTS "enum_staking_positions_status" CASCADE;');
    await sequelize.query('DROP TYPE IF EXISTS "enum_synthetic_positions_status" CASCADE;');
    await sequelize.query('DROP TYPE IF EXISTS "enum_dividend_lotteries_status" CASCADE;');

    console.log('✅ Old tables dropped successfully\n');
    console.log('🔨 Creating new tables...\n');

    // Now sync the models
    await sequelize.sync({ alter: true });

    console.log('✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
