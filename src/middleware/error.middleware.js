const { LoggingService } = require('../services');

const errorMiddleware = (err, req, res, next) => {
  // Log the error
  console.error('Error:', err);

  // Log to our logging service
  LoggingService.log({
    type: 'ERROR',
    level: 'error',
    userId: req.user?.id,
    message: err.message,
    metadata: {
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params
    }
  }).catch(console.error); // Don't wait for logging to complete

  // Handle Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      error: 'Duplicate entry',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Handle custom errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details
    });
  }

  // Default error
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
};