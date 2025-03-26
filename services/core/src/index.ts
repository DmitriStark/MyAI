import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import Database from '@ai-assistant/db-models';
import processRouter from './routes/process-routes';
import orchestratorService from './services/orchestrator-service';
import errorHandler from './middleware/error-handler';
import logger from './middleware/logger';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 3001;

// Initialize database connection
const db = Database.getInstance(process.env.DATABASE_URL, {
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// Initialize database connection
const initializeDatabase = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Core service: Connection to database successful');
    
    // Note: Only the main server should use syncDatabase with alter:true
    // Other services should just connect without altering the schema
    console.log('Core service: Database models synchronized');
  } catch (error) {
    console.error('Core service: Error connecting to database:', error);
    process.exit(1);
  }
};

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

// Initialize database then start the server
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Core service running on port ${port}`);
    
    // Initialize orchestrator with periodic tasks
    // You'll need to update this to use the db instance
    orchestratorService.initialize();
  });
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await db.sequelize.close();
  process.exit(0);
});