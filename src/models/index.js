const sequelize = require('../config/database');
const User = require('./User');
const Chat = require('./Chat');
const Notification = require('./Notification');
const HealthDocument = require('./HealthDocument');
const Prescription = require('./Prescription');
const Medication = require('./Medication');

// User associations
User.hasMany(Chat, {
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});
Chat.belongsTo(User, {
  foreignKey: 'userId'
});

User.hasMany(Notification, {
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});
Notification.belongsTo(User, {
  foreignKey: 'userId'
});

User.hasMany(HealthDocument, {
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});
HealthDocument.belongsTo(User, {
  foreignKey: 'userId'
});

User.hasMany(Prescription, {
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});
Prescription.belongsTo(User, {
  foreignKey: 'userId'
});

User.hasMany(Medication, {
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});
Medication.belongsTo(User, {
  foreignKey: 'userId'
});

// Prescription associations
Prescription.belongsTo(HealthDocument, {
  foreignKey: 'documentId'
});
HealthDocument.hasOne(Prescription, {
  foreignKey: 'documentId'
});

Prescription.hasMany(Medication, {
  foreignKey: 'prescriptionId',
  onDelete: 'CASCADE'
});
Medication.belongsTo(Prescription, {
  foreignKey: 'prescriptionId'
});

module.exports = {
  sequelize,
  User,
  Chat,
  Notification,
  HealthDocument,
  Prescription,
  Medication
};