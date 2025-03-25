import axios from 'axios';
import dotenv from 'dotenv';
import models from '../models';

dotenv.config();

// Define service URLs
const learningServiceUrl = process.env.LEARNING_SYSTEM_URL || 'http://learning-system:3002';
const responseServiceUrl = process.env.RESPONSE_GENERATOR_URL || 'http://localhost:3003';
const egoServiceUrl = process.env.EGO_SERVICE_URL || 'http://localhost:3004';

class MessageProcessor {
  /**
   * Process a user message through the AI assistant pipeline
   * @param message The message to process
   * @param task The processing task
   * @param userId The user ID
   * @param conversationId The conversation ID
   */
  async processMessage(message: any, task: any, userId: number, conversationId: number): Promise<void> {
    try {
      // Update task status
      await task.update({ status: 'processing' });
      
      // Process through learning system
      await this.processWithLearningSystem(message, task, userId, conversationId);
      
      // Generate response
      await this.generateResponse(message, task, userId, conversationId);
      
      // Mark message as processed
      await models.Message.update(
        { processed: true },
        { where: { id: message.id } }
      );
      
      // Update task status to completed
      await task.update({
        status: 'completed',
        completedAt: new Date()
      });
      
      // Trigger background ego service processing
      this.triggerEgoProcessing(message, userId, conversationId)
        .catch(err => console.error('Error triggering ego processing:', err));
      
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Update task status to failed
      await task.update({
        status: 'failed',
        completedAt: new Date()
      });
    }
  }
  
  /**
   * Process the message with the learning system
   */
  private async processWithLearningSystem(message: any, task: any, userId: number, conversationId: number): Promise<void> {
    try {
      // Update status to show learning system is processing
      const services = { ...task.services, learning: 'processing' };
      await task.update({ services });
      
      // Send to learning system
      await axios.post(`${learningServiceUrl}/api/learn`, {
        content: message.content,
        source: `user:${userId}`,
        type: 'user_input',
        userId,
        conversationId,
        messageId: message.id
      });
      
      // Update status to show learning system is done
      const updatedServices = { ...task.services, learning: 'completed' };
      await task.update({ services: updatedServices });
      
    } catch (error) {
      console.error('Error processing with learning system:', error);
      
      // Update status to show learning system failed
      const updatedServices = { ...task.services, learning: 'failed' };
      await task.update({ services: updatedServices });
      
      // Re-throw error for the caller to handle
      throw error;
    }
  }
  
  /**
   * Generate a response to the message
   */
  private async generateResponse(message: any, task: any, userId: number, conversationId: number): Promise<void> {
    try {
      // Update status to show response generator is processing
      const services = { ...task.services, response: 'processing' };
      await task.update({ services });
      
      // Send to response generator
      const response = await axios.post(`${responseServiceUrl}/api/generate`, {
        messageId: message.id,
        conversationId,
        userId
      });
      
      // Update status to show response generator is done
      const updatedServices = { ...task.services, response: 'completed' };
      await task.update({ services: updatedServices });
      
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Update status to show response generator failed
      const updatedServices = { ...task.services, response: 'failed' };
      await task.update({ services: updatedServices });
      
      // Create a fallback response message
      try {
        await models.Message.create({
          conversationId: message.conversationId,
          sender: 'assistant',
          content: "I'm sorry, I'm having trouble processing your message right now. Please try again later.",
          processed: true
        });
      } catch (fallbackError) {
        console.error('Error creating fallback response:', fallbackError);
      }
      
      // Re-throw error for the caller to handle
      throw error;
    }
  }
  
  /**
   * Trigger background processing in the ego service
   */
  private async triggerEgoProcessing(message: any, userId: number, conversationId: number): Promise<void> {
    try {
      // Send to ego service for background processing
      await axios.post(`${egoServiceUrl}/api/ego/learn`, {
        messageId: message.id,
        userId,
        conversationId
      });
    } catch (error) {
      // Log but don't fail if ego processing fails
      console.error('Error triggering ego processing (non-critical):', error);
    }
  }
}

export default new MessageProcessor();