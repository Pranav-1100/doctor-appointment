const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Medication = sequelize.define('Medication', {
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
  prescriptionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Prescriptions',
      key: 'id'
    }
  },
  medicationName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dosage: {
    type: DataTypes.STRING // e.g., "500mg", "1 tablet"
  },
  frequency: {
    type: DataTypes.STRING // e.g., "twice daily", "morning and night"
  },
  duration: {
    type: DataTypes.STRING // e.g., "5 days", "2 weeks"
  },
  instructions: {
    type: DataTypes.TEXT // e.g., "Take after meals"
  },
  startDate: {
    type: DataTypes.DATE
  },
  endDate: {
    type: DataTypes.DATE
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  reminderEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reminderTimes: {
    type: DataTypes.TEXT, // JSON array of times ["09:00", "21:00"]
    get() {
      const value = this.getDataValue('reminderTimes');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('reminderTimes', JSON.stringify(value));
    }
  },
  condition: {
    type: DataTypes.STRING // What condition this medication treats (e.g., "Cold", "Headache")
  },
  wasEffective: {
    type: DataTypes.BOOLEAN, // Did this medication work for the user?
    allowNull: true
  },
  sideEffects: {
    type: DataTypes.TEXT // Any side effects experienced
  },
  notes: {
    type: DataTypes.TEXT // User notes about this medication
  }
});

module.exports = Medication;
