import models from '../models';

class ContextBuilder {
  /**
   * Build context from conversation history
   * @param messages Array of messages in the conversation
   * @param userId User ID
   * @returns Context object
   */
  async buildContext(messages: any[], userId?: number): Promise<any> {
    // Default context
    const context = {
      messageCount: messages.length,
      conversationDuration: this.calculateConversationDuration(messages),
      recentMessages: this.extractRecentMessages(messages),
      userSentiment: this.analyzeUserSentiment(messages),
      topics: this.detectTopics(messages),
      contextType: this.determineContextType(messages),
      userId: userId || null
    };
    
    // Add user details if userId is provided
    if (userId) {
      const userPreferences = await this.getUserPreferences(userId);
      if (userPreferences) {
        context.userPreferences = userPreferences;
      }
    }
    
    return context;
  }
  
  /**
   * Calculate the duration of a conversation
   * @param messages Array of messages
   * @returns Duration in minutes
   */
  private calculateConversationDuration(messages: any[]): number {
    if (messages.length < 2) {
      return 0;
    }
    
    const firstTimestamp = new Date(messages[0].createdAt).getTime();
    const lastTimestamp = new Date(messages[messages.length - 1].createdAt).getTime();
    
    // Return duration in minutes
    return Math.round((lastTimestamp - firstTimestamp) / (1000 * 60));
  }
  
  /**
   * Extract recent messages for context
   * @param messages Array of messages
   * @returns Array of recent messages (excluding current)
   */
  private extractRecentMessages(messages: any[]): any[] {
    // Get last 3 messages (excluding current)
    return messages
      .slice(-4, -1)
      .map(message => ({
        sender: message.sender,
        content: message.content
      }));
  }
  
  /**
   * Determine the current context type
   * @param messages Array of messages
   * @returns Context type string
   */
  private determineContextType(messages: any[]): string {
    // If no messages or only 1-2, it's a new conversation
    if (messages.length <= 2) {
      return 'new_conversation';
    }
    
    // Check for greetings in the first message
    const greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon'];
    const firstUserMessage = messages.find(m => m.sender === 'user');
    
    if (firstUserMessage && greetings.some(g => firstUserMessage.content.toLowerCase().includes(g))) {
      // First message contains greeting, but are we past that now?
      if (messages.length <= 3) {
        return 'greeting';
      }
    }
    
    // Check for questions
    const questionCount = messages.filter(m => 
      m.sender === 'user' && m.content.includes('?')
    ).length;
    
    if (questionCount / messages.filter(m => m.sender === 'user').length > 0.5) {
      return 'question_answering';
    }
    
    // Check if it's a discussion (back and forth)
    const userMessageCount = messages.filter(m => m.sender === 'user').length;
    const assistantMessageCount = messages.filter(m => m.sender === 'assistant').length;
    
    if (userMessageCount > 2 && assistantMessageCount > 2) {
      return 'discussion';
    }
    
    // Default
    return 'general';
  }
  
  /**
   * Analyze user sentiment from messages
   * @param messages Array of messages
   * @returns Sentiment string (positive, negative, neutral)
   */
  private analyzeUserSentiment(messages: any[]): string {
    // Very basic sentiment analysis
    const userMessages = messages.filter(m => m.sender === 'user');
    
    if (userMessages.length === 0) {
      return 'neutral';
    }
    
    // Simple word-based sentiment
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'happy', 'glad', 'pleased', 'thanks', 'thank', 'love', 'like'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'poor', 'disappointing',
      'sad', 'unhappy', 'sorry', 'hate', 'dislike', 'problem', 'issue'
    ];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    // Count positive and negative words in user messages
    userMessages.forEach(message => {
      const content = message.content.toLowerCase();
      
      positiveWords.forEach(word => {
        if (content.includes(word)) {
          positiveCount++;
        }
      });
      
      negativeWords.forEach(word => {
        if (content.includes(word)) {
          negativeCount++;
        }
      });
    });
    
    // Determine overall sentiment
    if (positiveCount > negativeCount * 2) {
      return 'positive';
    } else if (negativeCount > positiveCount * 2) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }
  
  /**
   * Detect topics from messages
   * @param messages Array of messages
   * @returns Array of detected topics
   */
  private detectTopics(messages: any[]): string[] {
    // Simple topic detection based on keywords
    const topicKeywords: { [key: string]: string[] } = {
      'tech': ['computer', 'software', 'hardware', 'technology', 'app', 'code', 'programming'],
      'health': ['health', 'doctor', 'medical', 'exercise', 'diet', 'wellness'],
      'education': ['learn', 'study', 'school', 'college', 'university', 'education'],
      'finance': ['money', 'finance', 'bank', 'invest', 'budget', 'savings'],
      'travel': ['travel', 'vacation', 'trip', 'journey', 'flight', 'hotel']
    };
    
    const topicCounts: { [key: string]: number } = {};
    
    // Count occurrences of topic keywords in messages
    messages.forEach(message => {
      const content = message.content.toLowerCase();
      
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        keywords.forEach(keyword => {
          if (content.includes(keyword)) {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          }
        });
      });
    });
    
    // Return topics with counts above threshold (at least 2 mentions)
    return Object.entries(topicCounts)
      .filter(([_, count]) => (count as number) >= 2)
      .map(([topic]) => topic);
  }
  
  /**
   * Get user preferences from the database
   * @param userId User ID
   * @returns User preferences or null
   */
  private async getUserPreferences(userId: number): Promise<any | null> {
    try {
      // This would be implemented with a User model
      // For now, return null
      return null;
    } catch (error) {
      console.error('[RESPONSE] Error getting user preferences:', error);
      return null;
    }
  }
}

export default new ContextBuilder();