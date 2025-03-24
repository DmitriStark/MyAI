import { ErrorRequestHandler } from 'express';

export class ApiError extends Error {
  statusCode: number;
  
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Type the error handler as ErrorRequestHandler and make sure it returns void
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // If it's an ApiError with a specific status code
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: err.message
    });
    return; // Don't return the response object
  }
  
  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    res.status(400).json({
      error: 'Validation error',
      details: (err as any).errors?.map((e: any) => e.message)
    });
    return; // Don't return the response object
  }
  
  // Handle database connection errors
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    res.status(503).json({
      error: 'Database connection error',
      details: 'The service is temporarily unavailable. Please try again later.'
    });
    return; // Don't return the response object
  }
  
  // Default server error
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
  // No return statement here either
};

export default errorHandler;