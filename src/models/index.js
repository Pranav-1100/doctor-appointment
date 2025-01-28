const sequelize = require('../config/database');
const User = require('./User');
const Chat = require('./Chat');
const Notification = require('./Notification');

// Define associations
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

module.exports = {
  sequelize,
  User,
  Chat,
  Notification
};