import Database from '@dmitristark/dbpackage';
import nlpService from '../services/nlp-service';
import { Op } from "sequelize";

// Initialize database connection
const db = Database.getInstance();

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
        await db.LearningTask.update(
          { progress: 0.1 },
          { where: { id: taskId } }
        );
      }
      
      // Get feedback details
      const feedback = await db.Feedback.findByPk(feedbackId, {
        include: [{
          model: db.Message,
          attributes: ['id', 'content', 'conversationId', 'sender', 'metadata']
        }]
      });
      
      if (!feedback) {
        throw new Error(`Feedback ${feedbackId} not found`);
      }
      
      console.log(`[LEARNING] Processing feedback #${feedbackId} for message #${feedback.messageId}`);
      
      // Update task progress
      if (taskId) {
        await db.LearningTask.update(
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
        await db.LearningTask.update(
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
        await db.LearningTask.update(
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
        await db.LearningTask.update(
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
      
      let messageMetadata = null;
      
      // Try to extract used knowledge from message metadata
      if (feedback.Message.metadata) {
        try {
          if (typeof feedback.Message.metadata === 'string') {
            messageMetadata = JSON.parse(feedback.Message.metadata);
          } else {
            messageMetadata = feedback.Message.metadata;
          }
        } catch (e) {
          console.error('[LEARNING] Error parsing message metadata:', e);
        }
      }
      
      // Find knowledge used to generate this message
      let messageParts = feedback.Message.content.split(/[.!?]+/);
      if (messageParts.length > 3) {
        messageParts = messageParts.slice(0, 3); // Take first 3 sentences
      }
      
      // Find knowledge that contains parts of this message content
      const relatedKnowledge: any[] = [];
      
      for (const part of messageParts) {
        if (part.trim().length < 10) continue;
        
        const matches = await db.Knowledge.findAll({
          where: {
            content: {
              [Op.iLike]: `%${part.trim().substring(0, 50)}%`
            }
          },
          limit: 3
        });
        
        // Add unique matches
        for (const match of matches) {
          if (!relatedKnowledge.some(k => k.id === match.id)) {
            relatedKnowledge.push(match);
          }
        }
      }
      
      // Also try matching by keywords
      const keywords = this.extractKeywords(feedback.Message.content);
      if (keywords.length > 0) {
        const keywordConditions = keywords.map(keyword => ({
          content: { [Op.iLike]: `%${keyword}%` }
        }));
        
        const keywordMatches = await db.Knowledge.findAll({
          where: {
            [Op.or]: keywordConditions,
            id: { [Op.notIn]: relatedKnowledge.map(k => k.id) }
          },
          limit: 5
        });
        
        relatedKnowledge.push(...keywordMatches);
      }
      
      console.log(`[LEARNING] Found ${relatedKnowledge.length} related knowledge entries for feedback`);
      
      // Adjust confidence of related knowledge
      for (const knowledge of relatedKnowledge) {
        const oldConfidence = knowledge.confidence;
        const newConfidence = Math.max(0, Math.min(1, oldConfidence + confidenceAdjustment));
        
        await knowledge.update({
          confidence: newConfidence,
          lastAccessed: new Date()
        });
        
        console.log(`[LEARNING] Adjusted confidence of knowledge ${knowledge.id} from ${oldConfidence} to ${newConfidence} based on feedback rating ${feedback.rating}`);
      }
      
      // For very negative ratings (1-2), create an override entry
      if (feedback.rating <= 2) {
        // Create a negative override
        await db.Knowledge.create({
          content: JSON.stringify({
            text: `Response "${feedback.Message.content.substring(0, 100)}..." received negative feedback`,
            type: 'override',
            original_message_id: feedback.Message.id,
            feedback_id: feedback.id
          }),
          source: `feedback:${feedback.id}`,
          type: 'override',
          confidence: 0.85, // High confidence to override future matching
          tags: [
            'override',
            'negative_feedback',
            `message:${feedback.Message.id}`,
            `conversation:${feedback.Message.conversationId || 'unknown'}`
          ]
        });
        console.log(`[LEARNING] Created override entry for negatively rated message`);
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
      
      console.log(`[LEARNING] Processing feedback text: "${feedback.feedbackText.substring(0, 100)}..."`);
      
      // Process the feedback text with NLP
      const nlpResults = await nlpService.analyze(feedback.feedbackText);
      
      // Store the feedback text as a knowledge entry with higher confidence
      const feedbackKnowledge = await db.Knowledge.create({
        content: feedback.feedbackText,
        source: `feedback:${feedback.id}`,
        type: 'feedback',
        confidence: 0.8, // Higher confidence for direct feedback
        tags: [
          'feedback',
          'user_correction',
          feedback.Message ? `message:${feedback.Message.id}` : '',
          feedback.Message && feedback.Message.conversationId ? `conversation:${feedback.Message.conversationId}` : ''
        ].filter(tag => tag !== '') // Filter out empty tags
      });
      
      // Extract entities and store them as knowledge
      if (nlpResults.entities && nlpResults.entities.length > 0) {
        for (const entity of nlpResults.entities) {
          await db.Knowledge.create({
            content: JSON.stringify(entity),
            source: `feedback:${feedback.id}`,
            type: 'entity',
            confidence: 0.75, // Higher confidence for extracted entities from feedback
            tags: [
              'entity',
              'from_feedback',
              entity.type || 'unknown',
              feedback.Message && feedback.Message.conversationId ? `conversation:${feedback.Message.conversationId}` : ''
            ].filter(tag => tag !== '') // Filter out empty tags
          });
        }
      }
      
      // Extract facts and store them as knowledge
      if (nlpResults.facts && nlpResults.facts.length > 0) {
        for (const fact of nlpResults.facts) {
          await db.Knowledge.create({
            content: fact.text,
            source: `feedback:${feedback.id}`,
            type: 'fact',
            confidence: 0.7, // Higher confidence for facts from feedback
            tags: [
              'fact',
              'from_feedback',
              feedback.Message && feedback.Message.conversationId ? `conversation:${feedback.Message.conversationId}` : ''
            ].filter(tag => tag !== '') // Filter out empty tags
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
    // 1-2: significant negative adjustment, 3: slight negative, 4-5: positive adjustment
    if (rating <= 1) {
      return -0.25; // Significant decrease for very negative feedback
    } else if (rating === 2) {
      return -0.15; // Moderate decrease for negative feedback
    } else if (rating === 3) {
      return -0.05; // Slight decrease for neutral feedback
    } else if (rating === 4) {
      return 0.1; // Moderate increase for positive feedback
    } else if (rating >= 5) {
      return 0.15; // Significant increase for very positive feedback
    }
    return 0;
  }
  
  /**
   * Extract keywords from a message
   * @param message Message text
   * @returns Array of keywords
   */
  private extractKeywords(message: string): string[] {
    if (!message || typeof message !== "string") {
      return [];
    }

    const commonWords = [
      "a", "an", "the", "is", "are", "was", "were", "to", "of", "and", "in",
      "on", "at", "by", "for", "with", "about", "like", "from", "but", "or",
      "as", "what", "when", "where", "why", "how", "who", "which", "there",
      "here", "this", "that", "these", "those", "me", "you", "it", "we", "they",
      "their", "them", "i", "my", "your", "his", "her", "its", "our",
    ];

    try {
      // Tokenize and filter
      const keywords = message
        .toLowerCase()
        .replace(/[^\w\s]/g, "") // Remove punctuation
        .split(/\s+/) // Split by whitespace
        .filter(
          (word) =>
            word.length > 3 && // Filter out short words
            !commonWords.includes(word) && // Filter out common words
            !/^\d+$/.test(word) // Filter out numbers
        );

      // Get unique keywords
      const uniqueKeywords = [...new Set(keywords)];

      // Return top keywords
      return uniqueKeywords.slice(0, 8);
    } catch (error) {
      console.error('[LEARNING] Error extracting keywords:', error);
      return [];
    }
  }
}