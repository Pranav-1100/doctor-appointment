const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Log = sequelize.define('Log', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [Object.values(require('../services/logging.service').LOG_TYPES)]
    }
  },
  level: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [Object.values(require('../services/logging.service').LOG_LEVELS)]
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id'
    },
    allowNull: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  metadata: {
    type: DataTypes.TEXT,
    get() {
      const value = this.getDataValue('metadata');
      return value ? JSON.parse(value) : {};
    },
    set(value) {
      this.setDataValue('metadata', JSON.stringify(value));
    }
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['level']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['timestamp']
    }
  ]
});

module.exports = Log;
