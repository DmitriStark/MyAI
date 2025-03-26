import express from 'express';
import Database from '@ai-assistant/db-models';
import { FeedbackProcessor } from '../processors/feedback-processor';
import { ApiError } from '../middleware/error-handler';

// Initialize database connection
const db = Database.getInstance();
const router = express.Router();
const feedbackProcessor = new FeedbackProcessor();

// Process feedback
router.post('/', async (req, res, next) => {
  try {
    const { messageId, feedbackId, rating, feedbackText } = req.body;
    
    if (!messageId) {
      throw new ApiError(400, 'Message ID is required');
    }
    
    // Check if message exists
    const message = await db.Message.findByPk(messageId);
    
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }
    
    // Check if feedback exists or create it
    let feedback;
    
    if (feedbackId) {
      feedback = await db.Feedback.findByPk(feedbackId);
      if (!feedback) {
        throw new ApiError(404, 'Feedback not found');
      }
    } else {
      feedback = await db.Feedback.create({
        messageId,
        rating: rating || null,
        feedbackText: feedbackText || null
      });
    }
    
    // Create a learning task
    const task = await db.LearningTask.create({
      type: 'feedback',
      sourceId: feedback.id,
      sourceType: 'feedback',
      status: 'processing',
      progress: 0
    });
    
    // Process the feedback (async)
    feedbackProcessor.process(feedback.id, task.id)
      .then(() => {
        console.log(`Feedback processing task ${task.id} completed for feedback ID: ${feedback.id}`);
      })
      .catch(error => {
        console.error(`Error processing feedback task ${task.id} for feedback ID: ${feedback.id}:`, error);
      });
    
    res.status(202).json({ 
      status: 'Accepted',
      feedbackId: feedback.id,
      taskId: task.id,
      message: 'Feedback processing started'
    });
  } catch (error) {
    next(error);
  }
});

// Get all feedback
router.get('/', async (req, res, next) => {
  try {
    const { messageId, limit = 50 } = req.query;
    
    const whereClause: any = {};
    
    if (messageId) {
      whereClause.messageId = messageId;
    }
    
    const feedback = await db.Feedback.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string) || 50,
      include: [{
        model: db.Message,
        attributes: ['id', 'content', 'sender', 'conversationId']
      }]
    });
    
    res.status(200).json(feedback);
  } catch (error) {
    next(error);
  }
});

// Get specific feedback
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const feedback = await db.Feedback.findByPk(id, {
      include: [{
        model: db.Message,
        attributes: ['id', 'content', 'sender', 'conversationId']
      }]
    });
    
    if (!feedback) {
      throw new ApiError(404, 'Feedback not found');
    }
    
    res.status(200).json(feedback);
  } catch (error) {
    next(error);
  }
});

// Update feedback rating or text
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, feedbackText } = req.body;
    
    const feedback = await db.Feedback.findByPk(id);
    
    if (!feedback) {
      throw new ApiError(404, 'Feedback not found');
    }
    
    // Update feedback
    await feedback.update({
      rating: rating !== undefined ? rating : feedback.rating,
      feedbackText: feedbackText !== undefined ? feedbackText : feedback.feedbackText
    });
    
    // Create a learning task to process the updated feedback
    const task = await db.LearningTask.create({
      type: 'feedback_update',
      sourceId: feedback.id,
      sourceType: 'feedback',
      status: 'processing',
      progress: 0
    });
    
    // Process the updated feedback (async)
    feedbackProcessor.process(feedback.id, task.id)
      .then(() => {
        console.log(`Feedback update task ${task.id} completed for feedback ID: ${feedback.id}`);
      })
      .catch(error => {
        console.error(`Error processing feedback update task ${task.id} for feedback ID: ${feedback.id}:`, error);
      });
    
    res.status(200).json({
      status: 'Success',
      feedbackId: feedback.id,
      taskId: task.id,
      message: 'Feedback updated and processing started'
    });
  } catch (error) {
    next(error);
  }
});

export default router;