const jwt = require('jsonwebtoken');
const config = require('../config/config');

class JWTUtils {
  static generateToken(payload, options = {}) {
    return jwt.sign(
      payload,
      config.JWT_SECRET,
      { expiresIn: options.expiresIn || config.JWT_EXPIRES_IN }
    );
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
      throw error;
    }
  }

  static generateRefreshToken(userId) {
    return this.generateToken(
      { id: userId, type: 'refresh' },
      { expiresIn: '7d' }
    );
  }

  static generateResetToken(userId) {
    return this.generateToken(
      { id: userId, type: 'reset' },
      { expiresIn: '1h' }
    );
  }

  static decodeToken(token) {
    return jwt.decode(token);
  }

  static getTokenExpiration(token) {
    const decoded = this.decodeToken(token);
    return decoded ? new Date(decoded.exp * 1000) : null;
  }

  static isTokenExpired(token) {
    const expiration = this.getTokenExpiration(token);
    return expiration ? expiration < new Date() : true;
  }

  static extractTokenFromHeader(authHeader) {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }
}