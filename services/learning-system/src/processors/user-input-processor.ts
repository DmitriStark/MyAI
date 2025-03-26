import Database from '@ai-assistant/db-models';
import nlpService from '../services/nlp-service';
import { Op } from 'sequelize';

// Initialize database connection
const db = Database.getInstance();

interface ProcessOptions {
  source?: string;
  type?: string;
  userId?: number;
  conversationId?: number;
  taskId?: number;
  confidence?: number;
}

export class UserInputProcessor {
  /**
   * Process user input and extract knowledge
   * @param input User input text
   * @param options Processing options
   * @returns Array of created knowledge entries
   */
  async process(input: string, options: ProcessOptions = {}): Promise<any[]> {
    try {
      const {
        source = 'user_input',
        type = 'user_input',
        userId,
        conversationId,
        taskId,
        confidence = 0.6
      } = options;
      
      // Update task status if provided
      if (taskId) {
        await db.LearningTask.update(
          { progress: 0.1 },
          { where: { id: taskId } }
        );
      }
      
      // Process the input with NLP
      const nlpResults = await nlpService.analyze(input);
      
      // Update task progress
      if (taskId) {
        await db.LearningTask.update(
          { progress: 0.3 },
          { where: { id: taskId } }
        );
      }
      
      const createdKnowledge = [];
      
      // Store the original input as knowledge
      const inputKnowledge = await db.Knowledge.create({
        content: input,
        source: userId ? `user:${userId}` : source,
        type,
        confidence,
        tags: ['raw_input', conversationId ? `conversation:${conversationId}` : '']
      });
      
      createdKnowledge.push(inputKnowledge);
      
      // Update task progress
      if (taskId) {
        await db.LearningTask.update(
          { progress: 0.5 },
          { where: { id: taskId } }
        );
      }
      
      // Extract entities and store them as knowledge
      if (nlpResults.entities && nlpResults.entities.length > 0) {
        for (const entity of nlpResults.entities) {
          const entityKnowledge = await db.Knowledge.create({
            content: JSON.stringify(entity),
            source: userId ? `user:${userId}` : source,
            type: 'entity',
            confidence: confidence * 0.9, // Slightly lower confidence for extracted entities
            tags: ['entity', entity.type, conversationId ? `conversation:${conversationId}` : '']
          });
          
          createdKnowledge.push(entityKnowledge);
        }
      }
      
      // Extract concepts and store them as knowledge
      if (nlpResults.concepts && nlpResults.concepts.length > 0) {
        for (const concept of nlpResults.concepts) {
          const conceptKnowledge = await db.Knowledge.create({
            content: JSON.stringify(concept),
            source: userId ? `user:${userId}` : source,
            type: 'concept',
            confidence: confidence * 0.8, // Lower confidence for concepts
            tags: ['concept', conversationId ? `conversation:${conversationId}` : '']
          });
          
          createdKnowledge.push(conceptKnowledge);
        }
      }
      
      // Update task progress
      if (taskId) {
        await db.LearningTask.update(
          { progress: 0.8 },
          { where: { id: taskId } }
        );
      }
      
      // Extract facts and store them as knowledge
      if (nlpResults.facts && nlpResults.facts.length > 0) {
        for (const fact of nlpResults.facts) {
          const factKnowledge = await db.Knowledge.create({
            content: fact.text,
            source: userId ? `user:${userId}` : source,
            type: 'fact',
            confidence: confidence * 0.7, // Even lower confidence for facts
            tags: ['fact', conversationId ? `conversation:${conversationId}` : '']
          });
          
          createdKnowledge.push(factKnowledge);
        }
      }
      
      // Look for similar existing knowledge to consolidate
      await this.consolidateKnowledge(input, createdKnowledge);
      
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
      
      return createdKnowledge;
    } catch (error) {
      console.error('[LEARNING] Error processing user input:', error);
      
      // Update task status to failed if provided
      if (options.taskId) {
        await db.LearningTask.update(
          { 
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date()
          },
          { where: { id: options.taskId } }
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Consolidate knowledge by finding and linking similar entries
   * @param input Original input text
   * @param newKnowledge Newly created knowledge entries
   */
  private async consolidateKnowledge(input: string, newKnowledge: any[]): Promise<void> {
    try {
      // Find existing knowledge that might be related to this input
      const relatedKnowledge = await db.Knowledge.findAll({
        where: {
          content: {
            [Op.iLike]: `%${input.substring(0, 100)}%`
          },
          id: {
            [Op.notIn]: newKnowledge.map(k => k.id)
          }
        },
        limit: 5
      });
      
      if (relatedKnowledge.length === 0) {
        return;
      }
      
      // Update tags to link related knowledge
      for (const knowledge of newKnowledge) {
        const tags = [...knowledge.tags];
        
        for (const related of relatedKnowledge) {
          tags.push(`related:${related.id}`);
        }
        
        await knowledge.update({ tags });
      }
    } catch (error) {
      console.error('[LEARNING] Error consolidating knowledge:', error);
    }
  }
}