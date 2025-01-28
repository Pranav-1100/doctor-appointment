
// Custom error classes
class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
      super(message);
      this.statusCode = statusCode;
      this.details = details;
      this.name = this.constructor.name;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  // Specific error types
  class ValidationError extends AppError {
    constructor(message, details = null) {
      super(message, 400, details);
    }
  }
  
  class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
      super(message, 401);
    }
  }
  
  class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
      super(message, 403);
    }
  }
  
  class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
      super(`${resource} not found`, 404);
    }
  }
  
  // Error handler functions
  const handleSequelizeError = (error) => {
    if (error.name === 'SequelizeValidationError') {
      return new ValidationError('Validation error', 
        error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      );
    }
  
    if (error.name === 'SequelizeUniqueConstraintError') {
      return new ValidationError('Duplicate entry', 
        error.errors.map(err => ({
          field: err.path,
          message: 'Already exists'
        }))
      );
    }
  
    return new AppError('Database error', 500);
  };
  
  // Async handler wrapper
  const asyncHandler = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
  
  // Error response formatter
  const formatErrorResponse = (error) => {
    return {
      error: error.message,
      details: error.details,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };
  };
  
  module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    handleSequelizeError,
    asyncHandler,
    formatErrorResponse
  };