import express from 'express';
import models from '../models';
import messageProcessor from '../services/message-processor';
import { ApiError } from '../middleware/error-handler';

const router = express.Router();

// Process a new message
router.post('/', async (req, res, next) => {
  try {
    const { messageId, userId, conversationId } = req.body;
    
    if (!messageId) {
      throw new ApiError(400, 'Message ID is required');
    }
    
    // Check if message exists
    const message = await models.Message.findByPk(messageId);
    
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }
    
    // Check if message is already being processed
    const existingTask = await models.ProcessingTask.findOne({
      where: { messageId }
    });
    
    if (existingTask) {
      return res.status(200).json({
        status: 'Already processing',
        taskId: existingTask.id,
        message: 'Message is already being processed'
      });
    }
    
    // Create a new processing task
    const task = await models.ProcessingTask.create({
      messageId,
      status: 'pending',
      services: {
        learning: 'pending',
        response: 'pending'
      }
    });
    
    // Begin processing the message (asynchronously)
    messageProcessor.processMessage(message, task, userId, conversationId)
      .catch(err => console.error('Error processing message:', err));
    
    res.status(202).json({
      status: 'Processing started',
      taskId: task.id,
      message: 'Message is being processed'
    });
  } catch (error) {
    next(error);
  }
});

// Get processing status for a message
router.get('/:messageId/status', async (req, res, next) => {
  try {
    const { messageId } = req.params;
    
    const task = await models.ProcessingTask.findOne({
      where: { messageId },
      include: [{
        model: models.Message,
        attributes: ['id', 'sender', 'processed']
      }]
    });
    
    if (!task) {
      throw new ApiError(404, 'No processing task found for this message');
    }
    
    res.status(200).json({
      taskId: task.id,
      messageId: parseInt(messageId),
      status: task.status,
      services: task.services,
      createdAt: task.createdAt,
      completedAt: task.completedAt
    });
  } catch (error) {
    next(error);
  }
});

// Cancel message processing (useful for long-running tasks)
router.post('/:messageId/cancel', async (req, res, next) => {
  try {
    const { messageId } = req.params;
    
    const task = await models.ProcessingTask.findOne({
      where: { messageId }
    });
    
    if (!task) {
      throw new ApiError(404, 'No processing task found for this message');
    }
    
    // Only pending or in-progress tasks can be canceled
    if (task.status === 'completed' || task.status === 'failed' || task.status === 'canceled') {
      return res.status(400).json({
        status: 'Error',
        message: `Task is already in ${task.status} state and cannot be canceled`
      });
    }
    
    // Update task status
    await task.update({
      status: 'canceled',
      completedAt: new Date()
    });
    
    res.status(200).json({
      status: 'Success',
      message: 'Processing task canceled'
    });
  } catch (error) {
    next(error);
  }
});

export default router;