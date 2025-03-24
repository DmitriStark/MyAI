import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import models from './models';
import learnRoutes from './routes/learn-routes';
import webRoutes from './routes/web-routes';
import feedbackRoutes from './routes/feedback-routes';
import processingManager from './services/processing-manager';
import errorHandler from './middleware/error-handler';
import logger from './middleware/logger';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 3002;

// Initialize database and sync models
models.syncDatabase()
  .then(() => console.log('Learning system: Database models synchronized'))
  .catch(err => console.error('Learning system: Error syncing database models:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// Routes
app.use('/api/learn', learnRoutes);
app.use('/api/learn/web', webRoutes);
app.use('/api/learn/feedback', feedbackRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'learning-system', 
    timestamp: new Date().toISOString() 
  });
});

// Error handler
app.use(errorHandler);

// Start background processors
processingManager.startBackgroundProcessors();

// Start the server
app.listen(port, () => {
  console.log(`Learning system running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  // Stop background processors
  processingManager.stopBackgroundProcessors();
  // Close database connection
  await models.sequelize.close();
  process.exit(0);
});