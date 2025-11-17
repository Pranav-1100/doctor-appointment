const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HealthDocument = sequelize.define('HealthDocument', {
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
  documentType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['prescription', 'lab_report', 'xray', 'scan', 'medical_certificate', 'other']]
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER // in bytes
  },
  mimeType: {
    type: DataTypes.STRING
  },
  extractedText: {
    type: DataTypes.TEXT, // OCR extracted text
    get() {
      const value = this.getDataValue('extractedText');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('extractedText', JSON.stringify(value));
    }
  },
  aiSummary: {
    type: DataTypes.TEXT, // AI-generated summary of document
  },
  tags: {
    type: DataTypes.TEXT, // JSON array of tags
    get() {
      const value = this.getDataValue('tags');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('tags', JSON.stringify(value));
    }
  },
  uploadDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  documentDate: {
    type: DataTypes.DATE // actual date of the document (e.g., when prescription was written)
  }
});

module.exports = HealthDocument;
