const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Prescription = sequelize.define('Prescription', {
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
  documentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'HealthDocuments',
      key: 'id'
    }
  },
  doctorName: {
    type: DataTypes.STRING
  },
  doctorSpecialty: {
    type: DataTypes.STRING
  },
  clinicName: {
    type: DataTypes.STRING
  },
  prescriptionDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  diagnosis: {
    type: DataTypes.TEXT // The condition diagnosed
  },
  symptoms: {
    type: DataTypes.TEXT, // JSON array of symptoms
    get() {
      const value = this.getDataValue('symptoms');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('symptoms', JSON.stringify(value));
    }
  },
  notes: {
    type: DataTypes.TEXT // Doctor's notes or user notes
  },
  followUpDate: {
    type: DataTypes.DATE
  },
  isFollowUpCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  totalCost: {
    type: DataTypes.FLOAT // Total cost of medications
  }
});

module.exports = Prescription;
