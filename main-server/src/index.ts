import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import errorHandler from './middleware/error-handler';
import models from './models';

// Import routes
import messageRoutes from './routes/message-routes';
import userRoutes from './routes/user-routes';
import conversationRoutes from './routes/conversation-routes';

const app = express();
const port = process.env.PORT || 3000;

// Apply middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Make models available in requests
app.use((req: any, res, next) => {
  req.models = models;
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

// Start the server
app.listen(port, () => {
  console.log(`Main Server listening on port ${port}`);
});

export default app;