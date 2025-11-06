const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30]
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'trader', 'super_admin'),
    defaultValue: 'user'
  },
  kycStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'not_submitted'),
    defaultValue: 'not_submitted'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  twoFactorSecret: {
    type: DataTypes.STRING,
    allowNull: true
  },
  referralCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  referredBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  totalTradingVolume: {
    type: DataTypes.DECIMAL(30, 8),
    defaultValue: 0
  },
  firstTradeCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  ethereumAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.twoFactorSecret;
  return values;
};

module.exports = User;
