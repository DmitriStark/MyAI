// import models from '../models';

// // Define the interface for the context object
// interface ConversationContext {
//   messageCount: number;
//   conversationDuration: number;
//   recentMessages: any[];
//   userSentiment: string;
//   topics: string[];
//   contextType: string;
//   userId: number | null;
//   userPreferences?: any;  // Optional property
// }

// class ContextBuilder {
//   /**
//    * Build context from conversation history
//    * @param messages Array of messages in the conversation
//    * @param userId User ID
//    * @returns Context object
//    */
//   async buildContext(messages: any[], userId?: number): Promise<ConversationContext> {
//     // Default context
//     const context: ConversationContext = {
//       messageCount: messages.length,
//       conversationDuration: this.calculateConversationDuration(messages),
//       recentMessages: this.extractRecentMessages(messages),
//       userSentiment: this.analyzeUserSentiment(messages),
//       topics: this.detectTopics(messages),
//       contextType: this.determineContextType(messages),
//       userId: userId || null
//     };
    
//     // Add user details if userId is provided
//     if (userId) {
//       const userPreferences = await this.getUserPreferences(userId);
//       if (userPreferences) {
//         context.userPreferences = userPreferences;
//       }
//     }
    
//     return context;
//   }
  
//   /**
//    * Calculate the duration of a conversation
//    * @param messages Array of messages
//    * @returns Duration in minutes
//    */
//   private calculateConversationDuration(messages: any[]): number {
//     if (messages.length < 2) {
//       return 0;
//     }
    
//     const firstTimestamp = new Date(messages[0].createdAt).getTime();
//     const lastTimestamp = new Date(messages[messages.length - 1].createdAt).getTime();
    
//     // Return duration in minutes
//     return Math.round((lastTimestamp - firstTimestamp) / (1000 * 60));
//   }
  
//   /**
//    * Extract recent messages for context
//    * @param messages Array of messages
//    * @returns Array of recent messages (excluding current)
//    */
//   private extractRecentMessages(messages: any[]): any[] {
//     // Get last 3 messages (excluding current)
//     return messages
//       .slice(-4, -1)
//       .map(message => ({
//         sender: message.sender,
//         content: message.content
//       }));
//   }
  
//   /**
//    * Determine the current context type
//    * @param messages Array of messages
//    * @returns Context type string
//    */
//   private determineContextType(messages: any[]): string {
//     // If no messages or only 1-2, it's a new conversation
//     if (messages.length <= 2) {
//       return 'new_conversation';
//     }
    
//     // Check for greetings in the first message
//     const greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon'];
//     const firstUserMessage = messages.find(m => m.sender === 'user');
    
//     if (firstUserMessage && greetings.some(g => firstUserMessage.content.toLowerCase().includes(g))) {
//       // First message contains greeting, but are we past that now?
//       if (messages.length <= 3) {
//         return 'greeting';
//       }
//     }
    
//     // Check for questions
//     const questionCount = messages.filter(m => 
//       m.sender === 'user' && m.content.includes('?')
//     ).length;
    
//     if (questionCount / messages.filter(m => m.sender === 'user').length > 0.5) {
//       return 'question_answering';
//     }
    
//     // Check if it's a discussion (back and forth)
//     const userMessageCount = messages.filter(m => m.sender === 'user').length;
//     const assistantMessageCount = messages.filter(m => m.sender === 'assistant').length;
    
//     if (userMessageCount > 2 && assistantMessageCount > 2) {
//       return 'discussion';
//     }
    
//     // Default
//     return 'general';
//   }
  
//   /**
//    * Analyze user sentiment from messages
//    * @param messages Array of messages
//    * @returns Sentiment string (positive, negative, neutral)
//    */
//   private analyzeUserSentiment(messages: any[]): string {
//     // Very basic sentiment analysis
//     const userMessages = messages.filter(m => m.sender === 'user');
    
//     if (userMessages.length === 0) {
//       return 'neutral';
//     }
    
//     // Simple word-based sentiment
//     const positiveWords = [
//       'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
//       'happy', 'glad', 'pleased', 'thanks', 'thank', 'love', 'like'
//     ];
    
//     const negativeWords = [
//       'bad', 'terrible', 'awful', 'horrible', 'poor', 'disappointing',
//       'sad', 'unhappy', 'sorry', 'hate', 'dislike', 'problem', 'issue'
//     ];
    
//     let positiveCount = 0;
//     let negativeCount = 0;
    
//     // Count positive and negative words in user messages
//     userMessages.forEach(message => {
//       const content = message.content.toLowerCase();
      
//       positiveWords.forEach(word => {
//         if (content.includes(word)) {
//           positiveCount++;
//         }
//       });
      
//       negativeWords.forEach(word => {
//         if (content.includes(word)) {
//           negativeCount++;
//         }
//       });
//     });
    
//     // Determine overall sentiment
//     if (positiveCount > negativeCount * 2) {
//       return 'positive';
//     } else if (negativeCount > positiveCount * 2) {
//       return 'negative';
//     } else {
//       return 'neutral';
//     }
//   }
  
//   /**
//    * Detect topics from messages
//    * @param messages Array of messages
//    * @returns Array of detected topics
//    */
//   private detectTopics(messages: any[]): string[] {
//     // Simple topic detection based on keywords
//     const topicKeywords: { [key: string]: string[] } = {
//       'tech': ['computer', 'software', 'hardware', 'technology', 'app', 'code', 'programming'],
//       'health': ['health', 'doctor', 'medical', 'exercise', 'diet', 'wellness'],
//       'education': ['learn', 'study', 'school', 'college', 'university', 'education'],
//       'finance': ['money', 'finance', 'bank', 'invest', 'budget', 'savings'],
//       'travel': ['travel', 'vacation', 'trip', 'journey', 'flight', 'hotel']
//     };
    
//     const topicCounts: { [key: string]: number } = {};
    
//     // Count occurrences of topic keywords in messages
//     messages.forEach(message => {
//       const content = message.content.toLowerCase();
      
//       Object.entries(topicKeywords).forEach(([topic, keywords]) => {
//         keywords.forEach(keyword => {
//           if (content.includes(keyword)) {
//             topicCounts[topic] = (topicCounts[topic] || 0) + 1;
//           }
//         });
//       });
//     });
    
//     // Return topics with counts above threshold (at least 2 mentions)
//     return Object.entries(topicCounts)
//       .filter(([_, count]) => (count as number) >= 2)
//       .map(([topic]) => topic);
//   }
  
//   /**
//    * Get user preferences from the database
//    * @param userId User ID
//    * @returns User preferences or null
//    */
//   private async getUserPreferences(userId: number): Promise<any | null> {
//     try {
//       // This would be implemented with a User model
//       // For now, return null
//       return null;
//     } catch (error) {
//       console.error('[RESPONSE] Error getting user preferences:', error);
//       return null;
//     }
//   }
// }

// export default new ContextBuilder();




import models from '../models';

// Define the interface for the context object
interface ConversationContext {
  messageCount: number;
  conversationDuration: number;
  recentMessages: any[];
  userSentiment: string;
  topics: string[];
  contextType: string;
  userId: number | null;
  userPreferences?: any;  // Optional property
}

// Interface for Sequelize message objects
interface SequelizeMessage {
  dataValues?: {
    id: number;
    conversationId: number;
    sender: string;
    content: string;
    processed: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  id?: number;
  conversationId?: number;
  sender?: string;
  content?: string;
  processed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class ContextBuilder {
  /**
   * Build context from conversation history
   * @param messages Array of messages in the conversation
   * @param userId User ID
   * @returns Context object
   */
  async buildContext(messages: any[], userId?: number): Promise<ConversationContext> {
    // Default context
    const context: ConversationContext = {
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
   * Get the content from a Sequelize message object
   * @param message Sequelize message object
   * @returns message content or empty string if not found
   */
  private getMessageContent(message: SequelizeMessage): string {
    // Try to get content from dataValues first (Sequelize model instance)
    if (message && message.dataValues && message.dataValues.content) {
      return message.dataValues.content;
    }
    
    // If not in dataValues, try direct property
    if (message && message.content) {
      return message.content;
    }
    
    // If neither exists, return empty string
    return '';
  }
  
  /**
   * Get the sender from a Sequelize message object
   * @param message Sequelize message object
   * @returns message sender or empty string if not found
   */
  private getMessageSender(message: SequelizeMessage): string {
    // Try to get sender from dataValues first (Sequelize model instance)
    if (message && message.dataValues && message.dataValues.sender) {
      return message.dataValues.sender;
    }
    
    // If not in dataValues, try direct property
    if (message && message.sender) {
      return message.sender;
    }
    
    // If neither exists, return empty string
    return '';
  }
  
  /**
   * Get the createdAt timestamp from a Sequelize message object
   * @param message Sequelize message object
   * @returns message timestamp or current date if not found
   */
  private getMessageTimestamp(message: SequelizeMessage): Date {
    // Try to get createdAt from dataValues first (Sequelize model instance)
    if (message && message.dataValues && message.dataValues.createdAt) {
      return new Date(message.dataValues.createdAt);
    }
    
    // If not in dataValues, try direct property
    if (message && message.createdAt) {
      return new Date(message.createdAt);
    }
    
    // If neither exists, return current date
    return new Date();
  }
  
  /**
   * Calculate the duration of a conversation
   * @param messages Array of messages
   * @returns Duration in minutes
   */
  private calculateConversationDuration(messages: any[]): number {
    if (!messages || messages.length < 2) {
      return 0;
    }
    
    const firstTimestamp = this.getMessageTimestamp(messages[0]).getTime();
    const lastTimestamp = this.getMessageTimestamp(messages[messages.length - 1]).getTime();
    
    // Return duration in minutes
    return Math.round((lastTimestamp - firstTimestamp) / (1000 * 60));
  }
  
  /**
   * Extract recent messages for context
   * @param messages Array of messages
   * @returns Array of recent messages (excluding current)
   */
  private extractRecentMessages(messages: any[]): any[] {
    if (!messages || messages.length <= 1) {
      return [];
    }
    
    // Get last 3 messages (excluding current)
    return messages
      .slice(-4, -1)
      .map(message => ({
        sender: this.getMessageSender(message),
        content: this.getMessageContent(message)
      }))
      .filter(m => m.content); // Filter out messages with empty content
  }
  
  /**
   * Determine the current context type
   * @param messages Array of messages
   * @returns Context type string
   */
  private determineContextType(messages: any[]): string {
    // If no messages or only 1-2, it's a new conversation
    if (!messages || messages.length <= 2) {
      return 'new_conversation';
    }
    
    // Check for greetings in the first message
    const greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon'];
    const firstUserMessage = messages.find(m => this.getMessageSender(m) === 'user');
    
    if (firstUserMessage) {
      const content = this.getMessageContent(firstUserMessage).toLowerCase();
      if (greetings.some(g => content.includes(g))) {
        // First message contains greeting, but are we past that now?
        if (messages.length <= 3) {
          return 'greeting';
        }
      }
    }
    
    // Check for questions
    const userMessages = messages.filter(m => this.getMessageSender(m) === 'user');
    const questionCount = userMessages.filter(m => 
      this.getMessageContent(m).includes('?')
    ).length;
    
    if (userMessages.length > 0 && questionCount / userMessages.length > 0.5) {
      return 'question_answering';
    }
    
    // Check if it's a discussion (back and forth)
    const userMessageCount = userMessages.length;
    const assistantMessageCount = messages.filter(m => this.getMessageSender(m) === 'assistant').length;
    
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
    if (!messages || messages.length === 0) {
      return 'neutral';
    }
    
    const userMessages = messages.filter(m => this.getMessageSender(m) === 'user');
    
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
      const content = this.getMessageContent(message).toLowerCase();
      
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
    if (!messages || messages.length === 0) {
      return [];
    }
    
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
    for (const message of messages) {
      if (!message) continue;
      
      const content = this.getMessageContent(message).toLowerCase();
      if (!content) continue;
      
      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        for (const keyword of keywords) {
          if (content.includes(keyword)) {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            break; // Count only once per topic per message
          }
        }
      }
    }
    
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