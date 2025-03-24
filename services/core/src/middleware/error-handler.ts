import { Request, Response, NextFunction } from 'express';

// Custom Error class with status code
export class ApiError extends Error {
  statusCode: number;
  
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handling middleware
const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Core service error:', err);
  
  // If it's an ApiError with a specific status code
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }
  
  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      error: 'Validation error',
      details: (err as any).errors?.map((e: any) => e.message)
    });
  }
  
  // Handle database connection errors
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    return res.status(503).json({
      error: 'Database connection error',
      details: 'The service is temporarily unavailable. Please try again later.'
    });
  }
  
  // Handle axios errors (communication with other services)
  if (err.name === 'AxiosError') {
    const axiosError = err as any;
    return res.status(502).json({
      error: 'Service communication error',
      details: axiosError.response?.data?.error || axiosError.message,
      service: axiosError.config?.url || 'unknown'
    });
  }
  
  // Default server error
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

export default errorHandler;
