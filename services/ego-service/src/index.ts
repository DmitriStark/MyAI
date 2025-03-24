import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import models from './models';
import egoRoutes from './routes/ego-routes';
import insightService from './services/insight-service';
import errorHandler from './middleware/error-handler';
import logger from './middleware/logger';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 3004;

// Initialize database and sync models
models.syncDatabase()
  .then(() => console.log('Ego service: Database models synchronized'))
  .catch(err => console.error('Ego service: Error syncing database models:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// Routes
app.use('/api/ego', egoRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'ego-service', 
    timestamp: new Date().toISOString() 
  });
});

// Error handler
app.use(errorHandler);

// Start background services
insightService.startBackgroundProcessing();

// Start the server
app.listen(port, () => {
  console.log(`Ego service running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  // Stop background tasks
  insightService.stopBackgroundProcessing();
  // Close database connection
  await models.sequelize.close();
  process.exit(0);
});