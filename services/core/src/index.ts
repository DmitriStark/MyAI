import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { Sequelize } from 'sequelize';
import models from './models';
import processRouter from './routes/process-routes';
import orchestratorService from './services/orchestrator-service';
import errorHandler from './middleware/error-handler';
import logger from './middleware/logger';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 3001;

// Initialize database and sync models
models.syncDatabase()
  .then(() => console.log('Core service: Database models synchronized'))
  .catch(err => console.error('Core service: Error syncing database models:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// Routes
app.use('/api/process', processRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'core-service', 
    timestamp: new Date().toISOString() 
  });
});

// Error handler
app.use(errorHandler);

// Start the server
app.listen(port, () => {
  console.log(`Core service running on port ${port}`);
  
  // Initialize orchestrator with periodic tasks
  orchestratorService.initialize();
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await models.sequelize.close();
  process.exit(0);
});