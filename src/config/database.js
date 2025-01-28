const { Sequelize } = require('sequelize');
const config = require('./config');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.DB_PATH,
  logging: false
});

module.exports = sequelize;

