import express from 'express';
import models from '../models';
import responseService from '../services/response-service';
import contextBuilder from '../services/context-builder';
import { ApiError } from '../middleware/error-handler';

const router = express.Router();

// Generate a response to a message
router.post('/', async (req, res, next) => {
  try {
    const { messageId, conversationId, userId } = req.body;
    
    if (!messageId || !conversationId) {
      throw new ApiError(400, 'Message ID and conversation ID are required');
    }
    
    // Get user message
    const userMessage = await models.Message.findByPk(messageId);
    
    if (!userMessage) {
      throw new ApiError(404, 'Message not found');
    }
    
    // Get conversation history
    const conversationMessages = await models.Message.findAll({
      where: { conversationId },
      order: [['createdAt', 'ASC']],
      limit: 10 // Limit to recent messages for context
    });
    
    // Build context from conversation history
    const context = await contextBuilder.buildContext(conversationMessages, userId);
    
    // Generate a response
    const { responseText, usedKnowledge, usedDefaultResponse, usedTemplate, templateId, confidence } = 
      await responseService.generateResponse(userMessage.content, context);
    
    // Create a response message
    const responseMessage = await models.Message.create({
      conversationId,
      sender: 'assistant',
      content: responseText,
      processed: true
    });
    
    // Log the response generation
    await models.ResponseLog.create({
      messageId: responseMessage.id,
      conversationId,
      usedKnowledgeIds: usedKnowledge.map(k => k.id),
      usedDefaultResponse,
      usedTemplate,
      templateId,
      confidence
    });
    
    // If we used a template, increment its usage count
    if (usedTemplate && templateId) {
      await models.ResponseTemplate.increment('usage', { where: { id: templateId } });
    }
    
    // If we used knowledge entries, update their lastAccessed timestamps
    if (usedKnowledge.length > 0) {
      await models.Knowledge.update(
        { lastAccessed: new Date() },
        { 
          where: { 
            id: usedKnowledge.map(k => k.id)
          } 
        }
      );
    }
    
    res.status(200).json({
      messageId: responseMessage.id,
      response: responseText,
      meta: {
        confidence,
        usedDefaultResponse,
        usedTemplate,
        knowledgeCount: usedKnowledge.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get response templates
router.get('/templates', async (req, res, next) => {
  try {
    const { context } = req.query;
    
    const whereClause: any = {};
    
    if (context) {
      whereClause.context = context;
    }
    
    const templates = await models.ResponseTemplate.findAll({
      where: whereClause,
      order: [['usage', 'DESC']]
    });
    
    res.status(200).json(templates);
  } catch (error) {
    next(error);
  }
});

// Create a response template
router.post('/templates', async (req, res, next) => {
  try {
    const { template, context } = req.body;
    
    if (!template) {
      throw new ApiError(400, 'Template text is required');
    }
    
    const newTemplate = await models.ResponseTemplate.create({
      template,
      context: context || null,
      usage: 0
    });
    
    res.status(201).json(newTemplate);
  } catch (error) {
    next(error);
  }
});

// Get default responses
router.get('/defaults', async (req, res, next) => {
  try {
    const defaults = await models.DefaultResponse.findAll({
      order: [['priority', 'DESC']]
    });
    
    res.status(200).json(defaults);
  } catch (error) {
    next(error);
  }
});

// Create a default response
router.post('/defaults', async (req, res, next) => {
  try {
    const { responseText, context, priority } = req.body;
    
    if (!responseText) {
      throw new ApiError(400, 'Response text is required');
    }
    
    const newDefault = await models.DefaultResponse.create({
      responseText,
      context: context || null,
      priority: priority || 1
    });
    
    res.status(201).json(newDefault);
  } catch (error) {
    next(error);
  }
});

// Get response logs
router.get('/logs', async (req, res, next) => {
  try {
    const { conversationId, limit = 50 } = req.query;
    
    const whereClause: any = {};
    
    if (conversationId) {
      whereClause.conversationId = conversationId;
    }
    
    const logs = await models.ResponseLog.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string) || 50
    });
    
    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
});

export default router;