const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  age: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0,
      max: 120
    }
  },
  gender: {
    type: DataTypes.STRING,
    validate: {
      isIn: [['male', 'female', 'other']]
    }
  },
  height: {
    type: DataTypes.FLOAT,
    validate: {
      min: 0
    }
  },
  weight: {
    type: DataTypes.FLOAT,
    validate: {
      min: 0
    }
  },
  location: DataTypes.STRING,
  medical_conditions: DataTypes.TEXT,
  allergies: DataTypes.TEXT
}, {
  hooks: {
    beforeCreate: async (user) => {
      user.password = await bcrypt.hash(user.password, 10);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

module.exports = User;