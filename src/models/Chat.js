const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chat = sequelize.define('Chat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  response: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  messageType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'general',
    validate: {
      isIn: [['general', 'symptom_check', 'medication_advice', 'diet_recommendation', 'doctor_recommendation', 'myth_busting']]
    }
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
  }
});

module.exports = Chat;