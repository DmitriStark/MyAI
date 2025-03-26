// File: packages/db-models/src/index.ts
import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';
import dotenv from 'dotenv';

// Import individual models
import { User, initUserModel } from './models/User';
import { Conversation, initConversationModel } from './models/Conversation';
import { Message, initMessageModel } from './models/Message';
import { Feedback, initFeedbackModel } from './models/Feedback';
import { Knowledge, initKnowledgeModel } from './models/Knowledge';
import { LearningSource, initLearningSourceModel } from './models/LearningSource';
import { LearningTask, initLearningTaskModel } from './models/LearningTask';
import { DefaultResponse, initDefaultResponseModel } from './models/DefaultResponse';
import { ProcessingTask, initProcessingTaskModel } from './models/ProcessingTask';

// Export all model classes
export {
  User,
  Conversation,
  Message,
  Feedback,
  Knowledge,
  LearningSource,
  LearningTask,
  DefaultResponse,
  ProcessingTask  

};

dotenv.config();

class Database {
  private static instance: Database;
  public sequelize: Sequelize;
  
  public User: typeof User;
  public Conversation: typeof Conversation;
  public Message: typeof Message;
  public Feedback: typeof Feedback;
  public Knowledge: typeof Knowledge;
  public LearningSource: typeof LearningSource;
  public LearningTask: typeof LearningTask;
  public DefaultResponse: typeof DefaultResponse;
  public ProcessingTask: typeof ProcessingTask;

  private constructor(connectionString?: string, options: any = {}) {
    // Initialize Sequelize with database connection
    this.sequelize = connectionString 
      ? new Sequelize(connectionString, {
          dialect: 'postgres',
          logging: options.logging !== undefined ? options.logging : false,
          ...options
        })
      : new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aiassistant', {
          dialect: 'postgres',
          logging: options.logging !== undefined ? options.logging : false,
          ...options
        });

    // Initialize models
    this.User = initUserModel(this.sequelize);
    this.Conversation = initConversationModel(this.sequelize);
    this.Message = initMessageModel(this.sequelize);
    this.Feedback = initFeedbackModel(this.sequelize);
    this.Knowledge = initKnowledgeModel(this.sequelize);
    this.LearningSource = initLearningSourceModel(this.sequelize);
    this.LearningTask = initLearningTaskModel(this.sequelize);
    this.DefaultResponse = initDefaultResponseModel(this.sequelize);
    this.ProcessingTask = initProcessingTaskModel(this.sequelize);

    // Set up associations
    this.setupAssociations();
  }

  public static getInstance(connectionString?: string, options: any = {}): Database {
    if (!Database.instance) {
      Database.instance = new Database(connectionString, options);
    }
    return Database.instance;
  }

  private setupAssociations(): void {
    // User <-> Conversations
    this.User.hasMany(this.Conversation, { foreignKey: 'userId' });
    this.Conversation.belongsTo(this.User, { foreignKey: 'userId' });

    // Conversation <-> Messages
    this.Conversation.hasMany(this.Message, { foreignKey: 'conversationId' });
    this.Message.belongsTo(this.Conversation, { foreignKey: 'conversationId' });

    // Message <-> Feedback
    this.Message.hasMany(this.Feedback, { foreignKey: 'messageId' });
    this.Feedback.belongsTo(this.Message, { foreignKey: 'messageId' });
    //processTask
    this.Message.hasOne(this.ProcessingTask, { foreignKey: 'messageId' });
    this.ProcessingTask.belongsTo(this.Message, { foreignKey: 'messageId' });
  }

  public async syncDatabase(options: { force?: boolean; alter?: boolean } = {}): Promise<void> {
    try {
      await this.sequelize.sync(options);
      console.log('Database synchronized successfully');
      
      // Add default "I don't know" responses if they don't exist
      const count = await this.DefaultResponse.count();
      if (count === 0) {
        await this.DefaultResponse.bulkCreate([
          {
            responseText: "I don't know this yet. Could you explain more?",
            context: 'general',
            priority: 5
          },
          {
            responseText: "I'm not familiar with that. Would you mind providing more details?",
            context: 'general',
            priority: 4
          },
          {
            responseText: "I'm still learning about this topic. Can you share more information?",
            context: 'general',
            priority: 3
          },
          {
            responseText: "I don't have that information yet. Would you like to teach me about it?",
            context: 'general',
            priority: 2
          },
          {
            responseText: "That's new to me. Can you tell me more so I can learn?",
            context: 'general',
            priority: 1
          }
        ]);
        console.log('Default responses added to database');
      }
    } catch (error) {
      console.error('Error synchronizing database:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    await this.sequelize.close();
  }
}

export default Database;