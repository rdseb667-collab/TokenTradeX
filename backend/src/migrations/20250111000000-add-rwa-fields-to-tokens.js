'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tokens', 'assetCategory', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'EQUITY, COMMODITY, REAL_ESTATE, FIXED_INCOME, ART_COLLECTIBLE, etc.'
    });

    await queryInterface.addColumn('tokens', 'requiresKYC', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Whether trading this token requires KYC approval'
    });

    await queryInterface.addColumn('tokens', 'dividendsEnabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Whether token distributes dividends/yields'
    });

    await queryInterface.addColumn('tokens', 'underlyingAsset', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Details about the underlying real-world asset'
    });

    await queryInterface.addColumn('tokens', 'oracleAddress', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Price oracle contract address for automatic valuation'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tokens', 'assetCategory');
    await queryInterface.removeColumn('tokens', 'requiresKYC');
    await queryInterface.removeColumn('tokens', 'dividendsEnabled');
    await queryInterface.removeColumn('tokens', 'underlyingAsset');
    await queryInterface.removeColumn('tokens', 'oracleAddress');
  }
};
