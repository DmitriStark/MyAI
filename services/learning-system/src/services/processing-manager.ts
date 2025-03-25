import { Op } from 'sequelize';
import models from '../models';
import { UserInputProcessor } from '../processors/user-input-processor';
import { FeedbackProcessor } from '../processors/feedback-processor';
import { WebContentProcessor } from '../processors/web-content-processor';

class ProcessingManager {
  private userInputProcessor = new UserInputProcessor();
  private feedbackProcessor = new FeedbackProcessor();
  private webContentProcessor = new WebContentProcessor();
  
  private intervals: NodeJS.Timeout[] = [];
  
  /**
   * Start background processors
   */
  startBackgroundProcessors(): void {
    console.log('[LEARNING] Starting background processors');
    
    // Process stalled tasks every minute
    this.intervals.push(
      setInterval(() => this.processFailedTasks(), 60 * 1000)
    );
    
    // Process queued web sources every 5 minutes
    this.intervals.push(
      setInterval(() => this.processQueuedWebSources(), 5 * 60 * 1000)
    );
    
    // Run these immediately as well
    this.processFailedTasks().catch(err => 
      console.error('[LEARNING] Error processing failed tasks:', err)
    );
    
    this.processQueuedWebSources().catch(err => 
      console.error('[LEARNING] Error processing queued web sources:', err)
    );
  }
  
  /**
   * Stop background processors
   */
  stopBackgroundProcessors(): void {
    console.log('[LEARNING] Stopping background processors');
    
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    
    this.intervals = [];
  }
  
  /**
   * Process tasks that have failed and need retry
   */
  private async processFailedTasks(): Promise<void> {
    try {
      // Find tasks that have been in 'processing' state for too long
      const stalledTimeLimit = new Date();
      stalledTimeLimit.setMinutes(stalledTimeLimit.getMinutes() - 10);
      
      const stalledTasks = await models.LearningTask.findAll({
        where: {
          status: 'processing',
          updatedAt: {
            [Op.lt]: stalledTimeLimit
          }
        }
      });
      
      if (stalledTasks.length > 0) {
        console.log(`[LEARNING] Found ${stalledTasks.length} stalled tasks. Marking as failed...`);
        
        for (const task of stalledTasks) {
          await task.update({
            status: 'failed',
            error: 'Task stalled - processing timeout',
            completedAt: new Date()
          });
        }
      }
      
      // Find recently failed tasks to retry
      const failedTimeLimit = new Date();
      failedTimeLimit.setHours(failedTimeLimit.getHours() - 1);
      
      const failedTasks = await models.LearningTask.findAll({
        where: {
          status: 'failed',
          updatedAt: {
            [Op.gt]: failedTimeLimit
          }
        },
        order: [['updatedAt', 'DESC']],
        limit: 5
      });
      
      if (failedTasks.length > 0) {
        console.log(`[LEARNING] Retrying ${failedTasks.length} failed tasks...`);
        
        for (const task of failedTasks) {
          try {
            // Reset task status
            await task.update({
              status: 'pending',
              error: null,
              progress: 0
            });
            
            // Process based on task type
            switch (task.type) {
              case 'user_input':
                await this.retryUserInputTask(task);
                break;
              case 'feedback':
              case 'feedback_update':
                await this.retryFeedbackTask(task);
                break;
              case 'web_content':
                await this.retryWebContentTask(task);
                break;
              default:
                console.log(`[LEARNING] Unknown task type: ${task.type}`);
            }
          } catch (error) {
            console.error(`[LEARNING] Error retrying task ${task.id}:`, error);
            
            // Mark as failed again
            await task.update({
              status: 'failed',
              error: `Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              completedAt: new Date()
            });
          }
        }
      }
    } catch (error) {
      console.error('[LEARNING] Error processing failed tasks:', error);
    }
  }
  
  /**
   * Retry a user input processing task
   * @param task The task to retry
   */
  private async retryUserInputTask(task: any): Promise<void> {
    // Get the message
    const message = await models.Message.findByPk(task.sourceId);
    
    if (!message) {
      throw new Error(`Message ${task.sourceId} not found`);
    }
    
    // Process the message again
    await this.userInputProcessor.process(message.content, {
      source: `message:${message.id}`,
      type: 'user_input',
      taskId: task.id
    });
  }
  
  /**
   * Retry a feedback processing task
   * @param task The task to retry
   */
  private async retryFeedbackTask(task: any): Promise<void> {
    // Process the feedback again
    await this.feedbackProcessor.process(task.sourceId, task.id);
  }
  
  /**
   * Retry a web content processing task
   * @param task The task to retry
   */
  private async retryWebContentTask(task: any): Promise<void> {
    // Process the URL again
    await this.webContentProcessor.processUrl(task.sourceId, task.id);
  }
  
  /**
   * Process queued web sources
   */
  private async processQueuedWebSources(): Promise<void> {
    try {
      // Find queued web sources
      const queuedSources = await models.LearningSource.findAll({
        where: {
          status: 'queued'
        },
        order: [['updatedAt', 'ASC']],
        limit: 5
      });
      
      if (queuedSources.length > 0) {
        console.log(`[LEARNING] Processing ${queuedSources.length} queued web sources...`);
        
        for (const source of queuedSources) {
          try {
            // Create a task for this source
            const task = await models.LearningTask.create({
              type: 'web_content',
              sourceId: source.id,
              sourceType: 'learning_source',
              status: 'pending',
              progress: 0
            });
            
            // Process the URL
            this.webContentProcessor.processUrl(source.id, task.id)
              .then(() => {
                console.log(`[LEARNING] Successfully processed web source ${source.id}`);
              })
              .catch(error => {
                console.error(`[LEARNING] Error processing web source ${source.id}:`, error);
              });
          } catch (error) {
            console.error(`[LEARNING] Error creating task for web source ${source.id}:`, error);
            
            // Mark source as failed
            await source.update({
              status: 'failed'
            });
          }
        }
      }
    } catch (error) {
      console.error('[LEARNING] Error processing queued web sources:', error);
    }
  }
}

export default new ProcessingManager();