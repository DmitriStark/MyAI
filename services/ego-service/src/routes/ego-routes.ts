import express from 'express';
import models from '../models';
import knowledgeProcessor from '../services/knowledge-processor';
import introspectionService from '../services/introspection-service';
import insightService from '../services/insight-service';
import { ApiError } from '../middleware/error-handler';

const router = express.Router();

// Trigger background learning process
router.post('/learn', async (req, res, next) => {
  try {
    const { messageId, userId, conversationId } = req.body;
    
    if (!messageId) {
      throw new ApiError(400, 'Message ID is required');
    }
    
    // Queue the message for background processing
    knowledgeProcessor.processMessageBackground(messageId, userId, conversationId);
    
    res.status(202).json({
      status: 'Accepted',
      message: 'Background learning process initiated'
    });
  } catch (error) {
    next(error);
  }
});

// Trigger introspection on conversations
router.post('/introspect', async (req, res, next) => {
  try {
    const { conversationIds } = req.body;
    
    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      throw new ApiError(400, 'Array of conversation IDs is required');
    }
    
    // Queue conversations for introspection
    introspectionService.introspectConversations(conversationIds);
    
    res.status(202).json({
      status: 'Accepted',
      message: 'Conversation introspection initiated'
    });
  } catch (error) {
    next(error);
  }
});

// Get insights
router.get('/insights', async (req, res, next) => {
  try {
    const { type, limit = 10, applied } = req.query;
    
    const whereClause: any = {};
    
    if (type) {
      whereClause.type = type;
    }
    
    if (applied !== undefined) {
      whereClause.applied = applied === 'true';
    }
    
    const insights = await models.Insight.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string) || 10
    });
    
    res.status(200).json(insights);
  } catch (error) {
    next(error);
  }
});

// Apply an insight
router.post('/insights/:id/apply', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const insight = await models.Insight.findByPk(id);
    
    if (!insight) {
      throw new ApiError(404, 'Insight not found');
    }
    
    if (insight.applied) {
      return res.status(400).json({
        status: 'Error',
        message: 'Insight has already been applied'
      });
    }
    
    // Apply the insight
    await insightService.applyInsight(insight);
    
    res.status(200).json({
      status: 'Success',
      message: 'Insight applied successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Trigger knowledge consolidation
router.post('/consolidate', async (req, res, next) => {
  try {
    // Create a consolidation task
    const task = await models.KnowledgeConsolidation.create({
      status: 'pending',
      startedAt: new Date(),
      knowledgeCount: 0
    });
    
    // Queue for background processing
    knowledgeProcessor.consolidateKnowledgeBackground(task.id);
    
    res.status(202).json({
      status: 'Accepted',
      taskId: task.id,
      message: 'Knowledge consolidation initiated'
    });
  } catch (error) {
    next(error);
  }
});

// Get consolidation task status
router.get('/consolidate/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    
    const task = await models.KnowledgeConsolidation.findByPk(taskId);
    
    if (!task) {
      throw new ApiError(404, 'Consolidation task not found');
    }
    
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
});

export default router;