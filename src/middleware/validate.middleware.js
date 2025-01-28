const { body, param, query, validationResult } = require('express-validator');
const { NOTIFICATION_TYPES, CHAT_CATEGORIES } = require('../utils/constants');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Export all validations
module.exports = {
  validateRegistration: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required'),
    
    handleValidationErrors
  ],

  validateLogin: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    
    handleValidationErrors
  ],

  validateUserUpdate: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters long'),

    body('age')
      .optional()
      .isInt({ min: 0, max: 120 })
      .withMessage('Age must be between 0 and 120'),

    body('gender')
      .optional()
      .isIn(['male', 'female', 'other'])
      .withMessage('Invalid gender value'),

    body('height')
      .optional()
      .isFloat({ min: 0, max: 300 })
      .withMessage('Height must be between 0 and 300 cm'),

    body('weight')
      .optional()
      .isFloat({ min: 0, max: 500 })
      .withMessage('Weight must be between 0 and 500 kg'),

    body('location')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Location must be between 2 and 100 characters'),

    body('medical_conditions')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Medical conditions text is too long'),

    body('allergies')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Allergies text is too long'),

    handleValidationErrors
  ],

  validatePasswordChange: [
    body('oldPassword')
      .notEmpty()
      .withMessage('Current password is required')
      .isLength({ min: 6 })
      .withMessage('Current password must be at least 6 characters'),

    body('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters')
      .custom((value, { req }) => {
        if (value === req.body.oldPassword) {
          throw new Error('New password must be different from current password');
        }
        return true;
      }),

    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match new password');
        }
        return true;
      }),

    handleValidationErrors
  ],

  validateNotificationCreate: [
    body('type')
      .isIn(Object.values(NOTIFICATION_TYPES))
      .withMessage('Invalid notification type'),

    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 100 })
      .withMessage('Title is too long'),

    body('message')
      .trim()
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 500 })
      .withMessage('Message is too long'),

    body('scheduledFor')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format')
      .custom((value) => {
        if (new Date(value) < new Date()) {
          throw new Error('Scheduled date must be in the future');
        }
        return true;
      }),

    handleValidationErrors
  ],

  validateNotificationQuery: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

    query('type')
      .optional()
      .isIn(Object.values(NOTIFICATION_TYPES))
      .withMessage('Invalid notification type'),

    query('isRead')
      .optional()
      .isBoolean()
      .withMessage('isRead must be a boolean value'),

    handleValidationErrors
  ],

  validateChat: [
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Message cannot be empty')
      .isLength({ max: 1000 })
      .withMessage('Message too long (max 1000 characters)'),
    
    body('category')
      .optional()
      .isIn(Object.values(CHAT_CATEGORIES))
      .withMessage('Invalid chat category'),
    
    handleValidationErrors
  ],

  validateChatQuery: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),

    query('category')
      .optional()
      .isIn(Object.values(CHAT_CATEGORIES))
      .withMessage('Invalid chat category'),

    handleValidationErrors
  ],

  validateIdParam: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid ID parameter'),

    handleValidationErrors
  ]
};