
// HTTP Status codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER: 500
  };
  
  // User related constants
  const USER = {
    ROLES: {
      ADMIN: 'admin',
      USER: 'user',
      DOCTOR: 'doctor'
    },
    GENDERS: ['male', 'female', 'other'],
    STATUS: {
      ACTIVE: 'active',
      INACTIVE: 'inactive',
      SUSPENDED: 'suspended'
    },
    PASSWORD: {
      MIN_LENGTH: 8,
      MAX_LENGTH: 100,
      SALT_ROUNDS: 10
    }
  };
  
  // Chat related constants
  const CHAT = {
    CATEGORIES: {
      GENERAL: 'general',
      SYMPTOM_CHECK: 'symptom_check',
      MEDICATION_ADVICE: 'medication_advice',
      DIET_RECOMMENDATION: 'diet_recommendation',
      DOCTOR_RECOMMENDATION: 'doctor_recommendation',
      MYTH_BUSTING: 'myth_busting'
    },
    MAX_MESSAGE_LENGTH: 1000,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  };
  
  // Notification related constants
  const NOTIFICATION = {
    TYPES: {
      MEDICATION_REMINDER: 'medication_reminder',
      EXERCISE_TIP: 'exercise_tip',
      SEASONAL_ADVICE: 'seasonal_advice',
      APPOINTMENT_REMINDER: 'appointment_reminder',
      PROFILE_UPDATE: 'profile_update',
      HEALTH_TIP: 'health_tip'
    },
    STATUS: {
      UNREAD: 'unread',
      READ: 'read',
      ARCHIVED: 'archived'
    }
  };
  
  // Logging related constants
  const LOGGING = {
    LEVELS: {
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug'
    },
    TYPES: {
      USER: 'user',
      CHAT: 'chat',
      NOTIFICATION: 'notification',
      SYSTEM: 'system',
      SECURITY: 'security'
    }
  };
  
  // Time related constants
  const TIME = {
    MINUTE: 60,
    HOUR: 60 * 60,
    DAY: 24 * 60 * 60,
    WEEK: 7 * 24 * 60 * 60,
    TOKEN_EXPIRY: '24h',
    REFRESH_TOKEN_EXPIRY: '7d',
    PASSWORD_RESET_EXPIRY: '1h'
  };
  
  // Regex patterns
  const REGEX = {
    EMAIL: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
    PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
    PHONE: /^\+?[\d\s-]{10,}$/,
    USERNAME: /^[a-zA-Z0-9_]{3,30}$/
  };

  const NOTIFICATION_TYPES = {
    MEDICATION_REMINDER: 'medication_reminder',
    EXERCISE_TIP: 'exercise_tip',
    SEASONAL_ADVICE: 'seasonal_advice',
    APPOINTMENT_REMINDER: 'appointment_reminder',
    PROFILE_UPDATE: 'profile_update',
    HEALTH_TIP: 'health_tip'
  };
  
  const CHAT_CATEGORIES = {
    GENERAL: 'general',
    SYMPTOM_CHECK: 'symptom_check',
    MEDICATION_ADVICE: 'medication_advice',
    DIET_RECOMMENDATION: 'diet_recommendation',
    DOCTOR_RECOMMENDATION: 'doctor_recommendation',
    MYTH_BUSTING: 'myth_busting'
  };
  
  
  // Export all constants
  module.exports = {
    HTTP_STATUS,
    USER,
    CHAT,
    NOTIFICATION,
    LOGGING,
    TIME,
    REGEX,
    NOTIFICATION_TYPES,
    CHAT_CATEGORIES
  };