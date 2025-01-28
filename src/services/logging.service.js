const { sequelize } = require('../models');

class LoggingService {
  static LOG_TYPES = {
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    PROFILE_UPDATE: 'profile_update',
    CHAT_INTERACTION: 'chat_interaction',
    HEALTH_CHECK: 'health_check',
    ERROR: 'error',
    NOTIFICATION: 'notification',
    SECURITY: 'security'
  };

  static LOG_LEVELS = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
  };

  static async log(data) {
    const {
      type,
      level = this.LOG_LEVELS.INFO,
      userId,
      message,
      metadata = {}
    } = data;

    try {
      await sequelize.models.Log.create({
        type,
        level,
        userId,
        message,
        metadata: JSON.stringify(metadata),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Logging failed:', error);
    }
  }

  static async getUserLogs(userId, options = {}) {
    const { type, level, startDate, endDate, limit = 100 } = options;
    const where = { userId };

    if (type) where.type = type;
    if (level) where.level = level;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp[Op.gte] = startDate;
      if (endDate) where.timestamp[Op.lte] = endDate;
    }

    return await sequelize.models.Log.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit
    });
  }

  static async getErrorLogs(options = {}) {
    const { startDate, endDate, limit = 100 } = options;
    const where = {
      level: {
        [Op.in]: [this.LOG_LEVELS.ERROR, this.LOG_LEVELS.CRITICAL]
      }
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp[Op.gte] = startDate;
      if (endDate) where.timestamp[Op.lte] = endDate;
    }

    return await sequelize.models.Log.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit
    });
  }

  static async logSecurityEvent(userId, event, metadata = {}) {
    await this.log({
      type: this.LOG_TYPES.SECURITY,
      level: this.LOG_LEVELS.WARNING,
      userId,
      message: event,
      metadata
    });
  }

  static async logUserActivity(userId, activity, metadata = {}) {
    await this.log({
      type: this.LOG_TYPES.USER_ACTIVITY,
      level: this.LOG_LEVELS.INFO,
      userId,
      message: activity,
      metadata
    });
  }

  static async logError(error, userId = null, metadata = {}) {
    await this.log({
      type: this.LOG_TYPES.ERROR,
      level: this.LOG_LEVELS.ERROR,
      userId,
      message: error.message,
      metadata: {
        ...metadata,
        stack: error.stack,
        name: error.name
      }
    });
  }
}

module.exports = LoggingService;