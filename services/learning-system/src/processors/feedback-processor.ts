import models from '../models';
import nlpService from '../services/nlp-service';
import { Op } from "sequelize";

export class FeedbackProcessor {
  /**
   * Process feedback to improve knowledge base
   * @param feedbackId Feedback ID to process
   * @param taskId Optional task ID to update
   */
  async process(feedbackId: number, taskId?: number): Promise<void> {
    try {
      // Update task status if provided
      if (taskId) {
        await models.LearningTask.update(
          { progress: 0.1 },
          { where: { id: taskId } }
        );
      }
      
      // Get feedback details
      const feedback = await models.Feedback.findByPk(feedbackId, {
        include: [{
          model: models.Message,
          attributes: ['id', 'content', 'conversationId', 'sender']
        }]
      });
      
      if (!feedback) {
        throw new Error(`Feedback ${feedbackId} not found`);
      }
      
      // Update task progress
      if (taskId) {
        await models.LearningTask.update(
          { progress: 0.2 },
          { where: { id: taskId } }
        );
      }
      
      // Process rating to adjust knowledge confidence
      if (feedback.rating !== null) {
        await this.processRating(feedback);
      }
      
      // Update task progress
      if (taskId) {
        await models.LearningTask.update(
          { progress: 0.6 },
          { where: { id: taskId } }
        );
      }
      
      // Process feedback text to extract additional knowledge
      if (feedback.feedbackText) {
        await this.processFeedbackText(feedback);
      }
      
      // Update task status to completed
      if (taskId) {
        await models.LearningTask.update(
          { 
            status: 'completed',
            progress: 1.0,
            completedAt: new Date()
          },
          { where: { id: taskId } }
        );
      }
    } catch (error) {
      console.error('[LEARNING] Error processing feedback:', error);
      
      // Update task status to failed if provided
      if (taskId) {
        await models.LearningTask.update(
          { 
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            completedAt: new Date()
          },
          { where: { id: taskId } }
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Process rating to adjust knowledge confidence
   * @param feedback Feedback object
   */
  private async processRating(feedback: any): Promise<void> {
    try {
      if (feedback.rating === null || !feedback.Message) {
        return;
      }
      
      // Only process rating for assistant messages
      if (feedback.Message.sender !== 'assistant') {
        return;
      }
      
      // Calculate confidence adjustment based on rating
      const confidenceAdjustment = this.calculateConfidenceAdjustment(feedback.rating);
      
      // Find knowledge used to generate this message
      // In a real implementation, we'd track which knowledge was used
      // For now, we'll use a simple text matching approach
      const messageContent = feedback.Message.content;
      
      // Find knowledge that contains parts of this message content
      const relatedKnowledge = await models.Knowledge.findAll({
        where: {
          content: {
            [Op.iLike]: `%${messageContent.substring(0, 100)}%`
        }
        },
        limit: 5
      });
      
      // Adjust confidence of related knowledge
      for (const knowledge of relatedKnowledge) {
        const newConfidence = Math.max(0, Math.min(1, knowledge.confidence + confidenceAdjustment));
        
        await knowledge.update({
          confidence: newConfidence,
          lastAccessed: new Date()
        });
        
        console.log(`[LEARNING] Adjusted confidence of knowledge ${knowledge.id} from ${knowledge.confidence} to ${newConfidence} based on feedback rating ${feedback.rating}`);
      }
    } catch (error) {
      console.error('[LEARNING] Error processing rating:', error);
      throw error;
    }
  }
  
  /**
   * Process feedback text to extract additional knowledge
   * @param feedback Feedback object
   */
  private async processFeedbackText(feedback: any): Promise<void> {
    try {
      if (!feedback.feedbackText) {
        return;
      }
      
      // Process the feedback text with NLP
      const nlpResults = await nlpService.analyze(feedback.feedbackText);
      
      // Store the feedback text as a knowledge entry
      const feedbackKnowledge = await models.Knowledge.create({
        content: feedback.feedbackText,
        source: `feedback:${feedback.id}`,
        type: 'feedback',
        confidence: 0.6, // Base confidence for feedback
        tags: [
          'feedback',
          'user_correction',
          feedback.Message ? `message:${feedback.Message.id}` : '',
          feedback.Message ? `conversation:${feedback.Message.conversationId}` : ''
        ]
      });
      
      // Extract entities and store them as knowledge
      if (nlpResults.entities && nlpResults.entities.length > 0) {
        for (const entity of nlpResults.entities) {
          await models.Knowledge.create({
            content: JSON.stringify(entity),
            source: `feedback:${feedback.id}`,
            type: 'entity',
            confidence: 0.55, // Slightly lower confidence for extracted entities from feedback
            tags: [
              'entity',
              'from_feedback',
              entity.type,
              feedback.Message ? `conversation:${feedback.Message.conversationId}` : ''
            ]
          });
        }
      }
      
      // Extract facts and store them as knowledge
      if (nlpResults.facts && nlpResults.facts.length > 0) {
        for (const fact of nlpResults.facts) {
          await models.Knowledge.create({
            content: fact.text,
            source: `feedback:${feedback.id}`,
            type: 'fact',
            confidence: 0.5, // Lower confidence for facts from feedback
            tags: [
              'fact',
              'from_feedback',
              feedback.Message ? `conversation:${feedback.Message.conversationId}` : ''
            ]
          });
        }
      }
    } catch (error) {
      console.error('[LEARNING] Error processing feedback text:', error);
      throw error;
    }
  }
  
  /**
   * Calculate confidence adjustment based on rating
   * @param rating Feedback rating (typically 1-5)
   * @returns Confidence adjustment value
   */
  private calculateConfidenceAdjustment(rating: number): number {
    // Convert rating (typically 1-5) to confidence adjustment
    // 1-2: negative adjustment, 3: neutral, 4-5: positive adjustment
    if (rating <= 2) {
      return -0.1; // Decrease confidence for negative feedback
    } else if (rating >= 4) {
      return 0.05; // Increase confidence for positive feedback
    }
    return 0; // Neutral for middle ratings
  }
}