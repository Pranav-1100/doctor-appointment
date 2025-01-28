const { LoggingService } = require('../services');

const loggingMiddleware = async (req, res, next) => {
  // Store original timestamp
  req.timestamp = new Date();

  // Store original end function
  const originalEnd = res.end;
  
  // Override end function
  res.end = function (chunk, encoding) {
    // Restore original end function
    res.end = originalEnd;
    
    // Calculate response time
    const responseTime = new Date() - req.timestamp;

    // Log the request/response
    LoggingService.log({
      type: 'REQUEST',
      level: 'info',
      userId: req.user?.id,
      message: `${req.method} ${req.originalUrl}`,
      metadata: {
        method: req.method,
        path: req.originalUrl,
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
        statusCode: res.statusCode,
        responseTime,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    }).catch(console.error); // Don't wait for logging to complete

    // Call original end function
    res.end(chunk, encoding);
  };

  next();
};