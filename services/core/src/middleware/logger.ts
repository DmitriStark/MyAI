import { Request, Response, NextFunction } from 'express';

/**
 * Middleware for logging HTTP requests in the core service
 */
const logger = (req: Request, res: Response, next: NextFunction) => {
  // Get the current timestamp
  const timestamp = new Date().toISOString();
  
  // Log the request method, path, and timestamp
  console.log(`[CORE] [${timestamp}] ${req.method} ${req.path}`);
  
  // Calculate request processing time
  const start = Date.now();
  
  // Listen for the response finish event
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log the response status code and processing time
    console.log(`[CORE] [${timestamp}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

export default logger;