// src/controllers/conversation-controller.ts
import { Request, Response, NextFunction } from 'express';
import models from '../models';

// Define interfaces for request bodies
interface ConversationCreateRequest {
  userId: number;
  title?: string;
}

interface ConversationUpdateRequest {
  title: string;
}

export class ConversationController {
  /**
   * Get all conversations for a user
   */
  public async getUserConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      
      const conversations = await models.Conversation.findAll({
        where: { userId },
        order: [['lastMessageAt', 'DESC']]
      });
      
      res.status(200).json(conversations);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new conversation
   */
  public async createConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, title } = req.body as ConversationCreateRequest;
      
      // Validate user exists
      const user = await models.User.findByPk(userId);
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      // Create conversation
      const conversation = await models.Conversation.create({
        userId,
        title: title || 'New Conversation',
        lastMessageAt: new Date()
      });
      
      res.status(201).json(conversation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific conversation with its messages
   */
  public async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      
      const conversation = await models.Conversation.findByPk(id);
      
      if (!conversation) {
        res.status(404).json({ message: 'Conversation not found' });
        return;
      }
      
      // Get messages for this conversation
      const messages = await models.Message.findAll({
        where: { conversationId: id },
        order: [['createdAt', 'ASC']]
      });
      
      res.status(200).json({
        conversation,
        messages
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a conversation
   */
  public async updateConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const { title } = req.body as ConversationUpdateRequest;
      
      // Check if conversation exists
      const conversation = await models.Conversation.findByPk(id);
      
      if (!conversation) {
        res.status(404).json({ message: 'Conversation not found' });
        return;
      }
      
      // Update conversation
      await conversation.update({ title });
      
      res.status(200).json(conversation);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a conversation
   */
  public async deleteConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      
      // Check if conversation exists
      const conversation = await models.Conversation.findByPk(id);
      
      if (!conversation) {
        res.status(404).json({ message: 'Conversation not found' });
        return;
      }
      
      // Delete associated messages first (Sequelize doesn't handle cascading deletes well)
      await models.Message.destroy({
        where: { conversationId: id }
      });
      
      // Delete conversation
      await conversation.destroy();
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
}

// Export a single instance
export const conversationController = new ConversationController();