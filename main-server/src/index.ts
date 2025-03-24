import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

// Custom API Error type
export interface ApiError extends Error {
  statusCode: number;
}

// Type declaration for error handling middleware
export type ErrorHandlingMiddleware = (
  err: Error | ApiError, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => void;

// Detailed error handler with explicit typing
export const errorHandler: ErrorHandlingMiddleware = (
  err: Error | ApiError, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  console.error('Error:', err);
  
  // If it's an ApiError with a specific status code
  if ('statusCode' in err) {
    return res.status((err as ApiError).statusCode).json({
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
  
  // Default server error
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Function to apply error handler to an Express app
export function applyErrorHandler(app: express.Application) {
  app.use((
    err: Error | ApiError, 
    req: Request, 
    res: Response, 
    next: NextFunction
  ) => errorHandler(err, req, res, next));
}

export default errorHandler;