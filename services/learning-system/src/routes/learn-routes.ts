import express from 'express';
import models from '../models';
import { Op } from 'sequelize'; // Add this import
import { UserInputProcessor } from '../processors/user-input-processor';
import { ApiError } from '../middleware/error-handler';

const router = express.Router();
const userInputProcessor = new UserInputProcessor();

// Learn from user input
router.post('/', async (req, res, next) => {
  try {
    const { content, source, type, userId, conversationId, messageId } = req.body;
    
    if (!content) {
      throw new ApiError(400, 'Content is required');
    }
    
    // Create a learning task
    const task = await models.LearningTask.create({
      type: 'user_input',
      sourceId: messageId,
      sourceType: 'message',
      status: 'processing',
      progress: 0
    });
    
    // Process the input and learn from it (async)
    userInputProcessor.process(content, {
      source,
      type: type || 'user_input',
      userId,
      conversationId,
      taskId: task.id
    }).then(() => {
      console.log(`Learning task ${task.id} completed`);
    }).catch(error => {
      console.error(`Error processing learning task ${task.id}:`, error);
    });
    
    res.status(202).json({ 
      status: 'Accepted',
      taskId: task.id,
      message: 'Processing started'
    });
  } catch (error) {
    next(error);
  }
});

// Get all knowledge entries
router.get('/knowledge', async (req, res, next) => {
  try {
    const { type, source, tag, limit = 100, confidence } = req.query;
    
    const whereClause: any = {};
    
    if (type) {
      whereClause.type = type;
    }
    
    if (source) {
      whereClause.source = source;
    }
    
    if (tag) {
      whereClause.tags = {
        [Op.contains]: [tag] // Use Op directly
      };
    }
    
    if (confidence) {
      whereClause.confidence = {
        [Op.gte]: parseFloat(confidence as string) // Use Op directly
      };
    }
    
    const knowledge = await models.Knowledge.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string) || 100
    });
    
    res.status(200).json(knowledge);
  } catch (error) {
    next(error);
  }
});

// Get knowledge by ID
router.get('/knowledge/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const knowledge = await models.Knowledge.findByPk(id);
    
    if (!knowledge) {
      throw new ApiError(404, 'Knowledge not found');
    }
    
    // Update last accessed timestamp
    await knowledge.update({
      lastAccessed: new Date()
    });
    
    res.status(200).json(knowledge);
  } catch (error) {
    next(error);
  }
});

// Search knowledge
router.get('/knowledge/search/:query', async (req, res, next) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;
    
    const knowledge = await models.Knowledge.findAll({
      where: {
        content: {
            [Op.iLike]: `%${query}%` // Use Op directly
        }
      },
      order: [['confidence', 'DESC']],
      limit: parseInt(limit as string) || 10
    });
    
    res.status(200).json(knowledge);
  } catch (error) {
    next(error);
  }
});

// Get learning task status
router.get('/tasks/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    
    const task = await models.LearningTask.findByPk(taskId);
    
    if (!task) {
      throw new ApiError(404, 'Learning task not found');
    }
    
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
});

// Get all learning tasks
router.get('/tasks', async (req, res, next) => {
  try {
    const { status, type, limit = 20 } = req.query;
    
    const whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    const tasks = await models.LearningTask.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string) || 20
    });
    
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
});

export default router;