// src/controllers/message-controller.ts
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import models from '../models';

// Define interfaces for request bodies
interface MessageCreateRequest {
  userId: number;
  conversationId: number;
  content: string;
}

interface FeedbackCreateRequest {
  rating?: number;
  feedbackText?: string;
}

export class MessageController {
  /**
   * Get all messages for a conversation
   */
  public async getConversationMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId } = req.params;
      
      const messages = await models.Message.findAll({
        where: { conversationId },
        order: [['createdAt', 'ASC']]
      });
      
      res.status(200).json(messages);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new message
   */
  public async createMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, conversationId, content } = req.body as MessageCreateRequest;
      
      // Validate conversation exists
      const conversation = await models.Conversation.findByPk(conversationId);
      if (!conversation) {
        res.status(404).json({ message: 'Conversation not found' });
        return;
      }
      
      // Insert user message
      const message = await models.Message.create({
        conversationId,
        sender: 'user',
        content,
        processed: false
      });
      console.log("@@@@",message)

      

      // Update conversation last_message_at
      await models.Conversation.update(
        { lastMessageAt: new Date() },
        { where: { id: conversationId } }
      );
      
      // Send to Core Service for processing
      try {
        await axios.post(process.env.CORE_SERVICE_URL || 'http://core-service:3001/api/process', {
          messageId: message.dataValues.id,
          userId,
          conversationId
        });
        
        // Also send directly to learning system
        await axios.post(process.env.LEARNING_SYSTEM_URL || 'http://learning-system:3002/api/learn', {
          content,
          source: `user:${userId}`,
          type: 'user_input',
          userId,
          conversationId
        });
        
        res.status(201).json({ 
          id: message.id, 
          status: 'Message received and processing started' 
        });
      } catch (error) {
        console.error('Error forwarding message:', error instanceof Error ? error.message : 'Unknown error');
        console.log(error)
        res.status(201).json({ 
          id: message.id, 
          status: 'Message received but error in processing' 
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific message
   */
  public async getMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const message = await models.Message.findByPk(id);
      
      if (!message) {
        res.status(404).json({ message: 'Message not found' });
        return;
      }
      
      res.status(200).json(message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add feedback to a message
   */
  public async addFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { rating, feedbackText } = req.body as FeedbackCreateRequest;
      
      // Validate message exists
      const message = await models.Message.findByPk(id);
      if (!message) {
        res.status(404).json({ message: 'Message not found' });
        return;
      }
      
      // Insert feedback
      const feedback = await models.Feedback.create({
        messageId: id,
        rating,
        feedbackText
      });
      
      // Forward to learning system
      try {
        await axios.post(process.env.LEARNING_SYSTEM_URL || 'http://learning-system:3002/api/learn/feedback', {
          messageId: id,
          feedbackId: feedback.id,
          rating,
          feedbackText
        });
        
        res.status(201).json({ 
          id: feedback.id, 
          status: 'Feedback received and processing started' 
        });
      } catch (error) {
        console.error('Error forwarding feedback:', error instanceof Error ? error.message : 'Unknown error');
        res.status(201).json({ 
          id: feedback.id, 
          status: 'Feedback received but error in processing' 
        });
      }
    } catch (error) {
      next(error);
    }
  }
}

// Export a single instance
export const messageController = new MessageController();