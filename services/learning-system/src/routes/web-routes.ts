import express from 'express';
import Database from '@dmitristark/dbpackage';
import { WebContentProcessor } from '../processors/web-content-processor';
import { ApiError } from '../middleware/error-handler';

// Initialize database connection
const db = Database.getInstance();
const router = express.Router();
const webContentProcessor = new WebContentProcessor();

// Process a web URL for learning
router.post('/', async (req, res, next) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      throw new ApiError(400, 'URL is required');
    }
    
    // Check if URL is already in learning sources
    const existingSource = await db.LearningSource.findOne({
      where: { url }
    });
    
    let source;
    
    if (existingSource) {
      // Update existing source
      source = await existingSource.update({
        status: 'queued',
        lastCrawled: null
      });
    } else {
      // Create new source
      source = await db.LearningSource.create({
        url,
        status: 'queued'
      });
    }
    
    // Create a learning task
    const task = await db.LearningTask.create({
      type: 'web_content',
      sourceId: source.id,
      sourceType: 'learning_source',
      status: 'pending',
      progress: 0
    });
    
    // Process the URL (async)
    webContentProcessor.processUrl(source.id, task.id)
      .then(() => {
        console.log(`Web content processing task ${task.id} completed for URL: ${url}`);
      })
      .catch(error => {
        console.error(`Error processing web content task ${task.id} for URL: ${url}:`, error);
      });
    
    res.status(202).json({
      status: 'Accepted',
      sourceId: source.id,
      taskId: task.id,
      message: 'URL queued for processing'
    });
  } catch (error) {
    next(error);
  }
});

// Get all learning sources
router.get('/sources', async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;
    
    const whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    const sources = await db.LearningSource.findAll({
      where: whereClause,
      order: [['lastCrawled', 'DESC']],
      limit: parseInt(limit as string) || 50
    });
    
    res.status(200).json(sources);
  } catch (error) {
    next(error);
  }
});

// Get a specific learning source
router.get('/sources/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const source = await db.LearningSource.findByPk(id);
    
    if (!source) {
      throw new ApiError(404, 'Learning source not found');
    }
    
    res.status(200).json(source);
  } catch (error) {
    next(error);
  }
});

// Manually refresh a learning source
router.post('/sources/:id/refresh', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const source = await db.LearningSource.findByPk(id);
    
    if (!source) {
      throw new ApiError(404, 'Learning source not found');
    }
    
    // Update source status
    await source.update({
      status: 'queued',
      lastCrawled: null
    });
    
    // Create a learning task
    const task = await db.LearningTask.create({
      type: 'web_content',
      sourceId: source.id,
      sourceType: 'learning_source',
      status: 'pending',
      progress: 0
    });
    
    // Process the URL (async)
    webContentProcessor.processUrl(source.id, task.id)
      .then(() => {
        console.log(`Web content refresh task ${task.id} completed for source ID: ${id}`);
      })
      .catch(error => {
        console.error(`Error processing web content refresh task ${task.id} for source ID: ${id}:`, error);
      });
    
    res.status(202).json({
      status: 'Accepted',
      sourceId: source.id,
      taskId: task.id,
      message: 'Source refresh queued'
    });
  } catch (error) {
    next(error);
  }
});

export default router;