import { Op } from 'sequelize';
import models from '../models';

// Interface for insight creation
interface InsightData {
  type: string;
  content: string;
  source: string;
  confidence?: number;
}

class InsightService {
  private backgroundIntervals: NodeJS.Timeout[] = [];
  
  /**
   * Start background processing for the insight service
   */
  startBackgroundProcessing(): void {
    console.log('[EGO] Starting background processing for insights');
    
    // Apply high-confidence insights automatically every hour
    this.backgroundIntervals.push(
      setInterval(() => this.autoApplyInsights(), 60 * 60 * 1000)
    );
    
    // Clean up low-quality insights every day
    this.backgroundIntervals.push(
      setInterval(() => this.cleanupLowQualityInsights(), 24 * 60 * 60 * 1000)
    );
  }
  
  /**
   * Stop background processing
   */
  stopBackgroundProcessing(): void {
    for (const interval of this.backgroundIntervals) {
      clearInterval(interval);
    }
    this.backgroundIntervals = [];
  }
  
  /**
   * Create a new insight
   * @param data Insight data
   * @returns Created insight
   */
  async createInsight(data: InsightData): Promise<any> {
    try {
      // Check for duplicate insights
      const existingInsight = await models.Insight.findOne({
        where: {
          type: data.type,
          content: data.content
        }
      });
      
      if (existingInsight) {
        // If identical insight exists, don't create a duplicate
        return existingInsight;
      }
      
      // Create the insight
      const insight = await models.Insight.create({
        type: data.type,
        content: data.content,
        source: data.source,
        confidence: data.confidence || 0.5,
        applied: false
      });
      
      // If confidence is very high, apply immediately
      if (data.confidence && data.confidence > 0.9) {
        await this.applyInsight(insight);
      }
      
      return insight;
    } catch (error) {
      console.error('[EGO] Error creating insight:', error);
      throw error;
    }
  }
  
  /**
   * Apply an insight to improve the AI
   * @param insight The insight to apply
   */
  async applyInsight(insight: any): Promise<void> {
    try {
      if (insight.applied) {
        console.log(`[EGO] Insight ${insight.id} already applied`);
        return;
      }
      
      console.log(`[EGO] Applying insight ${insight.id} of type ${insight.type}`);
      
      // Different actions based on insight type
      switch (insight.type) {
        case 'knowledge_gap':
          await this.applyKnowledgeGapInsight(insight);
          break;
        
        case 'knowledge_similarity':
          await this.applyKnowledgeSimilarityInsight(insight);
          break;
        
        case 'knowledge_contradiction':
          await this.applyKnowledgeContradictionInsight(insight);
          break;
        
        case 'synthesized_knowledge':
          await this.applySynthesizedKnowledgeInsight(insight);
          break;
        
        case 'repetitive_responses':
        case 'short_responses':
        case 'default_responses':
        case 'response_time':
        case 'decreasing_engagement':
        case 'slow_user_responses':
        case 'topic_shift':
        case 'repeated_question':
          // These insights don't have direct actions but should be logged
          console.log(`[EGO] Insight ${insight.id} of type ${insight.type} marked as applied but no direct action taken`);
          break;
        
        default:
          console.log(`[EGO] Unknown insight type ${insight.type}, no action taken`);
      }
      
      // Mark insight as applied
      await insight.update({ applied: true });
      
    } catch (error) {
      console.error(`[EGO] Error applying insight ${insight.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Apply insights with high confidence automatically
   */
  private async autoApplyInsights(): Promise<void> {
    try {
      console.log('[EGO] Auto-applying high-confidence insights');
      
      // Find high-confidence, unapplied insights
      const insights = await models.Insight.findAll({
        where: {
          confidence: { [Op.gt]: 0.8 },
          applied: false
        },
        order: [['confidence', 'DESC']],
        limit: 10
      });
      
      for (const insight of insights) {
        try {
          await this.applyInsight(insight);
        } catch (error) {
          console.error(`[EGO] Error auto-applying insight ${insight.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[EGO] Error in auto-applying insights:', error);
    }
  }
  
  /**
   * Clean up low-quality insights
   */
  private async cleanupLowQualityInsights(): Promise<void> {
    try {
      console.log('[EGO] Cleaning up low-quality insights');
      
      // Get oldest, low-confidence, unapplied insights
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30); // 30 days old
      
      const insights = await models.Insight.findAll({
        where: {
          confidence: { [Op.lt]: 0.3 },
          applied: false,
          createdAt: { [Op.lt]: oldDate }
        }
      });
      
      if (insights.length > 0) {
        console.log(`[EGO] Deleting ${insights.length} low-quality insights`);
        
        // Delete the insights
        await models.Insight.destroy({
          where: {
            id: insights.map(i => i.id)
          }
        });
      }
    } catch (error) {
      console.error('[EGO] Error cleaning up low-quality insights:', error);
    }
  }
  
  /**
   * Apply a knowledge gap insight
   * @param insight The insight to apply
   */
  private async applyKnowledgeGapInsight(insight: any): Promise<void> {
    try {
      const data = JSON.parse(insight.content);
      
      if (!data.topic) {
        console.log('[EGO] No topic found in knowledge gap insight');
        return;
      }
      
      // Create a placeholder knowledge entry to record the gap
      await models.Knowledge.create({
        content: `Knowledge gap identified: ${data.topic}`,
        source: `insight:${insight.id}`,
        type: 'knowledge_gap',
        confidence: 0.3,
        tags: ['knowledge_gap', 'needs_information', data.topic]
      });
      
      console.log(`[EGO] Created knowledge gap entry for topic: ${data.topic}`);
    } catch (error) {
      console.error('[EGO] Error applying knowledge gap insight:', error);
      throw error;
    }
  }
  
  /**
   * Apply a knowledge similarity insight
   * @param insight The insight to apply
   */
  private async applyKnowledgeSimilarityInsight(insight: any): Promise<void> {
    try {
      const data = JSON.parse(insight.content);
      
      if (!data.knowledge1 || !data.knowledge2) {
        console.log('[EGO] Missing knowledge entries in similarity insight');
        return;
      }
      
      // If similarity is very high and action is merge, combine the knowledge
      if (data.similarity > 0.9 && data.recommendedAction === 'merge') {
        // Get the actual knowledge entries
        const knowledge1 = await models.Knowledge.findByPk(data.knowledge1.id);
        const knowledge2 = await models.Knowledge.findByPk(data.knowledge2.id);
        
        if (!knowledge1 || !knowledge2) {
          console.log('[EGO] Could not find one or both knowledge entries');
          return;
        }
        
        // Combine tags
        const combinedTags = [...new Set([...(knowledge1.tags || []), ...(knowledge2.tags || [])])];
        
        // Keep the entry with higher confidence, add tags from both
        if (knowledge1.confidence >= knowledge2.confidence) {
          await knowledge1.update({
            tags: combinedTags,
            confidence: Math.max(knowledge1.confidence, knowledge2.confidence)
          });
          
          // Create a record of the merger in the lower confidence one
          await knowledge2.update({
            content: `Merged into knowledge ID ${knowledge1.id} due to similarity`,
            confidence: 0.1
          });
        } else {
          await knowledge2.update({
            tags: combinedTags,
            confidence: Math.max(knowledge1.confidence, knowledge2.confidence)
          });
          
          // Create a record of the merger in the lower confidence one
          await knowledge1.update({
            content: `Merged into knowledge ID ${knowledge2.id} due to similarity`,
            confidence: 0.1
          });
        }
        
        console.log(`[EGO] Merged similar knowledge entries ${knowledge1.id} and ${knowledge2.id}`);
      }
    } catch (error) {
      console.error('[EGO] Error applying knowledge similarity insight:', error);
      throw error;
    }
  }
  
  /**
   * Apply a knowledge contradiction insight
   * @param insight The insight to apply
   */
  private async applyKnowledgeContradictionInsight(insight: any): Promise<void> {
    try {
      const data = JSON.parse(insight.content);
      
      if (!data.knowledge1 || !data.knowledge2) {
        console.log('[EGO] Missing knowledge entries in contradiction insight');
        return;
      }
      
      // Get the actual knowledge entries
      const knowledge1 = await models.Knowledge.findByPk(data.knowledge1.id);
      const knowledge2 = await models.Knowledge.findByPk(data.knowledge2.id);
      
      if (!knowledge1 || !knowledge2) {
        console.log('[EGO] Could not find one or both knowledge entries');
        return;
      }
      
      // Add contradiction tag to both entries
      await knowledge1.update({
        tags: [...new Set([...(knowledge1.tags || []), 'contradiction', `contradicts:${knowledge2.id}`])],
        confidence: knowledge1.confidence * 0.8 // Reduce confidence due to contradiction
      });
      
      await knowledge2.update({
        tags: [...new Set([...(knowledge2.tags || []), 'contradiction', `contradicts:${knowledge1.id}`])],
        confidence: knowledge2.confidence * 0.8 // Reduce confidence due to contradiction
      });
      
      console.log(`[EGO] Marked contradiction between knowledge entries ${knowledge1.id} and ${knowledge2.id}`);
    } catch (error) {
      console.error('[EGO] Error applying knowledge contradiction insight:', error);
      throw error;
    }
  }
  
  /**
   * Apply a synthesized knowledge insight
   * @param insight The insight to apply
   */
  private async applySynthesizedKnowledgeInsight(insight: any): Promise<void> {
    try {
      const data = JSON.parse(insight.content);
      
      if (!data.knowledge1 || !data.knowledge2 || !data.synthesis) {
        console.log('[EGO] Missing data in synthesized knowledge insight');
        return;
      }
      
      // Create a new knowledge entry with the synthesis
      await models.Knowledge.create({
        content: data.synthesis,
        source: `insight:${insight.id}`,
        type: 'synthesized',
        confidence: insight.confidence,
        tags: ['synthesized', `source1:${data.knowledge1.id}`, `source2:${data.knowledge2.id}`]
      });
      
      console.log(`[EGO] Created synthesized knowledge from insights ${data.knowledge1.id} and ${data.knowledge2.id}`);
    } catch (error) {
      console.error('[EGO] Error applying synthesized knowledge insight:', error);
      throw error;
    }
  }
}

export default new InsightService();