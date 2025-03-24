import { Op } from 'sequelize';
import models from '../models';
import insightService from './insight-service';

class IntrospectionService {
  /**
   * Perform introspection on a set of conversations
   * @param conversationIds Array of conversation IDs to analyze
   */
  async introspectConversations(conversationIds: number[]): Promise<void> {
    // Process in the next tick to avoid blocking the response
    setImmediate(async () => {
      try {
        console.log(`[EGO] Introspecting ${conversationIds.length} conversations`);
        
        // Process each conversation
        for (const conversationId of conversationIds) {
          try {
            // Get all messages for the conversation
            const messages = await models.Message.findAll({
              where: { conversationId },
              order: [['createdAt', 'ASC']]
            });
            
            if (messages.length < 2) {
              console.log(`[EGO] Not enough messages in conversation ${conversationId} to introspect`);
              continue;
            }
            
            // Get conversation metadata
            const conversation = await models.Conversation.findByPk(conversationId);
            
            if (!conversation) {
              console.log(`[EGO] Conversation ${conversationId} not found`);
              continue;
            }
            
            // Analyze conversation flow
            await this.analyzeConversationFlow(messages, conversation);
            
            // Analyze response quality
            await this.analyzeResponseQuality(messages, conversation);
            
            // Analyze user engagement
            await this.analyzeUserEngagement(messages, conversation);
            
            console.log(`[EGO] Completed introspection for conversation ${conversationId}`);
          } catch (error) {
            console.error(`[EGO] Error introspecting conversation ${conversationId}:`, error);
          }
        }
      } catch (error) {
        console.error('[EGO] Error in conversation introspection:', error);
      }
    });
  }
  
  /**
   * Analyze the flow of a conversation
   * @param messages Array of messages in the conversation
   * @param conversation Conversation metadata
   */
  private async analyzeConversationFlow(messages: any[], conversation: any): Promise<void> {
    try {
      // Extract user and assistant messages
      const userMessages = messages.filter(m => m.sender === 'user');
      const assistantMessages = messages.filter(m => m.sender === 'assistant');
      
      // Check for long response times
      const responseTimes = [];
      
      for (let i = 0; i < userMessages.length; i++) {
        // Find the next assistant message after this user message
        const userTime = new Date(userMessages[i].createdAt).getTime();
        
        // Find the first assistant message that came after this user message
        const nextAssistantMessage = assistantMessages.find(m => 
          new Date(m.createdAt).getTime() > userTime
        );
        
        if (nextAssistantMessage) {
          const responseTime = new Date(nextAssistantMessage.createdAt).getTime() - userTime;
          responseTimes.push(responseTime);
        }
      }
      
      // Calculate average response time
      if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        
        // Convert to seconds
        const avgResponseTimeSeconds = avgResponseTime / 1000;
        
        // If average response time is above threshold, create an insight
        if (avgResponseTimeSeconds > 3) {
          await insightService.createInsight({
            type: 'response_time',
            content: JSON.stringify({
              conversationId: conversation.id,
              userId: conversation.userId,
              avgResponseTimeSeconds,
              messageCount: userMessages.length
            }),
            source: `introspection:${conversation.id}`,
            confidence: 0.8
          });
        }
      }
      
      // Detect conversation topic shifts
      const topicShifts = this.detectTopicShifts(userMessages);
      
      if (topicShifts > 2) {
        await insightService.createInsight({
          type: 'topic_shift',
          content: JSON.stringify({
            conversationId: conversation.id,
            userId: conversation.userId,
            topicShifts,
            messageCount: userMessages.length
          }),
          source: `introspection:${conversation.id}`,
          confidence: 0.7
        });
      }
    } catch (error) {
      console.error('[EGO] Error analyzing conversation flow:', error);
    }
  }
  
  /**
   * Detect topic shifts in a conversation
   * @param messages Array of messages
   * @returns Number of detected topic shifts
   */
  private detectTopicShifts(messages: any[]): number {
    let topicShifts = 0;
    
    // Simple approach: look for significant changes in message content
    for (let i = 1; i < messages.length; i++) {
      const prevMessage = messages[i - 1].content.toLowerCase();
      const currentMessage = messages[i].content.toLowerCase();
      
      // Calculate Jaccard similarity
      const prevWords = new Set(prevMessage.split(/\s+/));
      const currentWords = new Set(currentMessage.split(/\s+/));
      
      const intersection = new Set([...prevWords].filter(word => currentWords.has(word)));
      const union = new Set([...prevWords, ...currentWords]);
      
      const similarity = intersection.size / union.size;
      
      // If similarity is below threshold, consider it a topic shift
      if (similarity < 0.2) {
        topicShifts++;
      }
    }
    
    return topicShifts;
  }
  
  /**
   * Analyze the quality of responses in a conversation
   * @param messages Array of messages in the conversation
   * @param conversation Conversation metadata
   */
  private async analyzeResponseQuality(messages: any[], conversation: any): Promise<void> {
    try {
      // Extract assistant messages
      const assistantMessages = messages.filter(m => m.sender === 'assistant');
      
      if (assistantMessages.length === 0) {
        return;
      }
      
      // Check for repetitive or template-like responses
      const uniqueResponses = new Set(assistantMessages.map(m => m.content));
      
      if (uniqueResponses.size < assistantMessages.length * 0.7) {
        // More than 30% of responses are duplicates
        await insightService.createInsight({
          type: 'repetitive_responses',
          content: JSON.stringify({
            conversationId: conversation.id,
            userId: conversation.userId,
            uniqueResponsesCount: uniqueResponses.size,
            totalResponsesCount: assistantMessages.length
          }),
          source: `introspection:${conversation.id}`,
          confidence: 0.9
        });
      }
      
      // Check for very short responses
      const shortResponses = assistantMessages.filter(m => m.content.length < 50);
      
      if (shortResponses.length > assistantMessages.length * 0.5) {
        // More than 50% of responses are short
        await insightService.createInsight({
          type: 'short_responses',
          content: JSON.stringify({
            conversationId: conversation.id,
            userId: conversation.userId,
            shortResponsesCount: shortResponses.length,
            totalResponsesCount: assistantMessages.length
          }),
          source: `introspection:${conversation.id}`,
          confidence: 0.8
        });
      }
      
      // Check for default "I don't know" responses
      const defaultResponses = [];
      
      // Get default response templates
      const templates = await models.DefaultResponse.findAll();
      const templateTexts = templates.map(t => t.responseText.toLowerCase());
      
      for (const message of assistantMessages) {
        const content = message.content.toLowerCase();
        
        // Check if this message matches any default response template
        if (templateTexts.some(template => content.includes(template.substring(0, 20)))) {
          defaultResponses.push(message);
        }
      }
      
      if (defaultResponses.length > 1) {
        // Multiple default responses used in the conversation
        await insightService.createInsight({
          type: 'default_responses',
          content: JSON.stringify({
            conversationId: conversation.id,
            userId: conversation.userId,
            defaultResponsesCount: defaultResponses.length,
            totalResponsesCount: assistantMessages.length
          }),
          source: `introspection:${conversation.id}`,
          confidence: 0.9
        });
      }
    } catch (error) {
      console.error('[EGO] Error analyzing response quality:', error);
    }
  }
  
  /**
   * Analyze user engagement in a conversation
   * @param messages Array of messages in the conversation
   * @param conversation Conversation metadata
   */
  private async analyzeUserEngagement(messages: any[], conversation: any): Promise<void> {
    try {
      // Extract user messages
      const userMessages = messages.filter(m => m.sender === 'user');
      
      if (userMessages.length < 2) {
        return;
      }
      
      // Calculate average message length
      const totalLength = userMessages.reduce((sum, m) => sum + m.content.length, 0);
      const avgLength = totalLength / userMessages.length;
      
      // Track length trend (increasing or decreasing engagement)
      const firstHalf = userMessages.slice(0, Math.floor(userMessages.length / 2));
      const secondHalf = userMessages.slice(Math.floor(userMessages.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.content.length, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.content.length, 0) / secondHalf.length;
      
      // If there's a significant drop in message length, it might indicate decreasing engagement
      if (secondHalfAvg < firstHalfAvg * 0.7 && userMessages.length >= 4) {
        await insightService.createInsight({
          type: 'decreasing_engagement',
          content: JSON.stringify({
            conversationId: conversation.id,
            userId: conversation.userId,
            firstHalfAvgLength: firstHalfAvg,
            secondHalfAvgLength: secondHalfAvg,
            messageCount: userMessages.length
          }),
          source: `introspection:${conversation.id}`,
          confidence: 0.7
        });
      }
      
      // Calculate time between user messages (response time)
      const userResponseTimes = [];
      
      for (let i = 1; i < userMessages.length; i++) {
        const prevTime = new Date(userMessages[i - 1].createdAt).getTime();
        const currentTime = new Date(userMessages[i].createdAt).getTime();
        
        userResponseTimes.push(currentTime - prevTime);
      }
      
      if (userResponseTimes.length > 0) {
        const avgUserResponseTime = userResponseTimes.reduce((sum, time) => sum + time, 0) / userResponseTimes.length;
        
        // Convert to minutes
        const avgUserResponseTimeMinutes = avgUserResponseTime / (1000 * 60);
        
        // If user response time is very long, it might indicate low engagement
        if (avgUserResponseTimeMinutes > 10 && userMessages.length >= 3) {
          await insightService.createInsight({
            type: 'slow_user_responses',
            content: JSON.stringify({
              conversationId: conversation.id,
              userId: conversation.userId,
              avgUserResponseTimeMinutes,
              messageCount: userMessages.length
            }),
            source: `introspection:${conversation.id}`,
            confidence: 0.6
          });
        }
      }
    } catch (error) {
      console.error('[EGO] Error analyzing user engagement:', error);
    }
  }
}

export default new IntrospectionService();