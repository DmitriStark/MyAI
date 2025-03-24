import axios from 'axios';
import dotenv from 'dotenv';
import { Op } from 'sequelize';
import models from '../models';

dotenv.config();

// Define service URLs
const egoServiceUrl = process.env.EGO_SERVICE_URL || 'http://localhost:3004';

class OrchestratorService {
  private intervals: NodeJS.Timeout[] = [];
  
  /**
   * Initialize the orchestrator with periodic tasks
   */
  initialize(): void {
    console.log('Initializing orchestrator service');
    
    // Clean up stalled tasks every 5 minutes
    this.intervals.push(
      setInterval(() => this.cleanupStalledTasks(), 5 * 60 * 1000)
    );
    
    // Trigger ego introspection every 30 minutes
    this.intervals.push(
      setInterval(() => this.triggerEgoIntrospection(), 30 * 60 * 1000)
    );
  }
  
  /**
   * Clean up tasks that have been stuck in 'processing' state for too long
   */
  private async cleanupStalledTasks(): Promise<void> {
    try {
      const stalledTaskTimeLimit = new Date();
      stalledTaskTimeLimit.setMinutes(stalledTaskTimeLimit.getMinutes() - 10);
      
      const stalledTasks = await models.ProcessingTask.findAll({
        where: {
          status: 'processing',
          updatedAt: {
            [Op.lt]: stalledTaskTimeLimit
          }
        }
      });
      
      if (stalledTasks.length > 0) {
        console.log(`Found ${stalledTasks.length} stalled tasks. Cleaning up...`);
        
        for (const task of stalledTasks) {
          await task.update({
            status: 'failed',
            completedAt: new Date()
          });
          
          // Log the stalled task
          console.log(`Marked stalled task ${task.id} for message ${task.messageId} as failed`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up stalled tasks:', error);
    }
  }
  
  /**
   * Trigger the ego service to perform introspection on recent conversations
   */
  private async triggerEgoIntrospection(): Promise<void> {
    try {
      // Get recent conversations (last 24 hours)
      const recentTimeLimit = new Date();
      recentTimeLimit.setHours(recentTimeLimit.getHours() - 24);
      
      const recentConversations = await models.Conversation.findAll({
        where: {
          lastMessageAt: {
            [Op.gt]: recentTimeLimit
          }
        },
        limit: 10,
        order: [['lastMessageAt', 'DESC']]
      });
      
      if (recentConversations.length > 0) {
        console.log(`Triggering ego introspection for ${recentConversations.length} recent conversations`);
        
        // Send to ego service for introspection
        await axios.post(`${egoServiceUrl}/api/ego/introspect`, {
          conversationIds: recentConversations.map(c => c.id)
        });
      }
    } catch (error) {
      console.error('Error triggering ego introspection:', error);
    }
  }
  
  /**
   * Stop all periodic tasks
   */
  stop(): void {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
  }
}

export default new OrchestratorService();