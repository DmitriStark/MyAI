import { Request, Response, NextFunction } from 'express';

/**
 * Middleware for logging HTTP requests in the response generator
 */
const logger = (req: Request, res: Response, next: NextFunction) => {
  // Get the current timestamp
  const timestamp = new Date().toISOString();
  
  // Log the request method, path, and timestamp
  console.log(`[RESPONSE] [${timestamp}] ${req.method} ${req.path}`);
  
  // Calculate request processing time
  const start = Date.now();
  
  // Listen for the response finish event
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log the response status code and processing time
    console.log(`[RESPONSE] [${timestamp}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

export default logger;