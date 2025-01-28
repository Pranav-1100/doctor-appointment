const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User } = require('../models');
const config = require('../config/config');

class AuthService {
  constructor() {
    this.jwtSecret = config.JWT_SECRET;
    this.jwtExpiresIn = config.JWT_EXPIRES_IN;
  }

  async generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        name: user.name
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
  }

  async register(userData) {
    try {
      // Create user
      const user = await User.create({
        email: userData.email,
        password: userData.password, // Will be hashed by model hooks
        name: userData.name,
        age: userData.age,
        gender: userData.gender,
        height: userData.height,
        weight: userData.weight,
        location: userData.location,
        medical_conditions: userData.medical_conditions,
        allergies: userData.allergies
      });

      // Generate token
      const token = await this.generateToken(user);

      // Return user data (without password) and token
      const { password, ...userWithoutPassword } = user.toJSON();
      
      return {
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  async login(email, password) {
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    // Generate token
    const token = await this.generateToken(user);

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    return {
      user: userWithoutPassword,
      token
    };
  }

  async refreshToken(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.generateToken(user);
  }

  async forgotPassword(email) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.id, type: 'reset' },
      this.jwtSecret,
      { expiresIn: '1h' }
    );

    // In a real application, you would send this token via email
    // For demo purposes, we'll just return it
    return resetToken;
  }

  async resetPassword(resetToken, newPassword) {
    try {
      // Verify reset token
      const decoded = jwt.verify(resetToken, this.jwtSecret);
      if (decoded.type !== 'reset') {
        throw new Error('Invalid reset token');
      }

      // Find user
      const user = await User.findByPk(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      // Update password
      await user.update({ password: newPassword });

      return true;
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid reset token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new Error('Reset token has expired');
      }
      throw error;
    }
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid current password');
    }

    // Update password
    await user.update({ password: newPassword });

    return true;
  }

  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const user = await User.findByPk(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }
      return decoded;
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      throw error;
    }
  }
}

// Export as singleton
module.exports = new AuthService();