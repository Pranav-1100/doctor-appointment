const { body, param, query } = require('express-validator');

// Common validation chains
const commonValidations = {
  // User related validations
  email: () => 
    body('email')
      .trim()
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),

  password: () =>
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/\d/)
      .withMessage('Password must contain at least one number')
      .matches(/[!@#$%^&*]/)
      .withMessage('Password must contain at least one special character'),

  name: () =>
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),

  age: () =>
    body('age')
      .optional()
      .isInt({ min: 0, max: 120 })
      .withMessage('Age must be between 0 and 120'),

  // Health related validations
  height: () =>
    body('height')
      .optional()
      .isFloat({ min: 0, max: 300 })
      .withMessage('Height must be between 0 and 300 cm'),

  weight: () =>
    body('weight')
      .optional()
      .isFloat({ min: 0, max: 500 })
      .withMessage('Weight must be between 0 and 500 kg'),

  // Chat related validations
  message: () =>
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Message cannot be empty')
      .isLength({ max: 1000 })
      .withMessage('Message too long (max 1000 characters)'),

  category: (categories) =>
    body('category')
      .optional()
      .isIn(categories)
      .withMessage('Invalid category'),

  // Pagination validations
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  // ID parameter validation
  idParam: () =>
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid ID parameter')
};

// Common validation rules for health data
const healthValidations = {
  medicalConditions: () =>
    body('medical_conditions')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Medical conditions text is too long'),

  allergies: () =>
    body('allergies')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Allergies text is too long'),

  symptoms: () =>
    body('symptoms')
      .optional()
      .isArray()
      .withMessage('Symptoms must be an array')
      .custom((value) => {
        if (value.some(v => typeof v !== 'string')) {
          throw new Error('All symptoms must be strings');
        }
        return true;
      })
};

// Validation helper functions
const validation = {
  // Sanitize and validate dates
  isValidDate: (date) => {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
  },

  // Validate phone numbers
  isValidPhone: (phone) => {
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    return phoneRegex.test(phone);
  },

  // Sanitize text input
  sanitizeText: (text) => {
    return text
      .trim()
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/\s+/g, ' '); // Replace multiple spaces with single space
  },

  // Check if string contains only alphanumeric characters
  isAlphanumeric: (str) => {
    return /^[a-zA-Z0-9]+$/.test(str);
  },

  // Validate password strength
  isStrongPassword: (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar
    );
  },

  // Custom validators
  validators: {
    // Check if value exists in database
    isUnique: (model, field) => {
      return async (value) => {
        const record = await model.findOne({ where: { [field]: value } });
        if (record) {
          throw new Error(`${field} already exists`);
        }
      };
    },

    // Check if value exists in array
    isInArray: (array, message) => {
      return (value) => {
        if (!array.includes(value)) {
          throw new Error(message || 'Invalid value');
        }
        return true;
      };
    },

    // Check if date is in the future
    isFutureDate: () => {
      return (value) => {
        const date = new Date(value);
        if (date <= new Date()) {
          throw new Error('Date must be in the future');
        }
        return true;
      };
    }
  }
};

module.exports = {
  commonValidations,
  healthValidations,
  validation
};