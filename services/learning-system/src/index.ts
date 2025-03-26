import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import Database from '@dmitristark/dbpackage';
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

// Initialize database connection
const db = Database.getInstance(process.env.DATABASE_URL, {
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// Just authenticate with the database
db.sequelize.authenticate()
  .then(() => {
    console.log('Learning system: Connection to database successful');
  })
  .catch((err: unknown) => {
    console.error('Learning system: Error connecting to database:', err);
    process.exit(1);
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// Make db models available in routes
app.use((req: any, res, next) => {
  req.db = db;
  next();
});

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

// Start background processors (pass the db instance)
processingManager.initialize(db);

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
  await db.sequelize.close();
  process.exit(0);
});