import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import errorHandler from './middleware/error-handler';
import Database from '@ai-assistant/db-models';

// Import routes
import messageRoutes from './routes/message-routes';
import userRoutes from './routes/user-routes';
import conversationRoutes from './routes/conversation-routes';

const app = express();
const port = process.env.PORT || 3000;

// Initialize database connection
const db = Database.getInstance(process.env.DATABASE_URL, {
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// Apply middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize database before starting the server
const initializeDatabase = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Connection to database successful.');
    
    // This is the main server, so it should sync the database
    await db.syncDatabase({ alter: true });
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

// Make models available in requests
app.use((req: any, res, next) => {
  req.models = db;
  next();
});

// Register API routes
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversation', conversationRoutes);

// Apply error handling middleware
app.use(errorHandler);

// Catch-all route for undefined routes
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    method: req.method,
    path: req.path
  });
});

// Initialize database first, then start the server
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Main Server listening on port ${port}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});

export default app;