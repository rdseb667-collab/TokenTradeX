const { sequelize } = require('./src/config/database');

async function createTables() {
  try {
    console.log('Creating revenue ledger and fee exemption tables...');
    
    // Create revenue_ledger table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS revenue_ledger (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stream VARCHAR(50) NOT NULL,
        period DATE NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        gross DECIMAL(38, 18) NOT NULL DEFAULT 0,
        net DECIMAL(38, 18) NOT NULL DEFAULT 0,
        last_event_id UUID,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, stream, period, currency)
      );
    `);
    console.log('✅ revenue_ledger table created');

    // Create indexes
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_revenue_ledger_user_stream ON revenue_ledger(user_id, stream);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_revenue_ledger_period ON revenue_ledger(period);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_revenue_ledger_stream ON revenue_ledger(stream);');
    console.log('✅ revenue_ledger indexes created');

    // Create fee_exempt_allowlist table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS fee_exempt_allowlist (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ fee_exempt_allowlist table created');

    // Create indexes
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_fee_exempt_expires ON fee_exempt_allowlist(expires_at);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_fee_exempt_user_expires ON fee_exempt_allowlist(user_id, expires_at);');
    console.log('✅ fee_exempt_allowlist indexes created');

    console.log('\n✅ All tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    process.exit(1);
  }
}

createTables();
