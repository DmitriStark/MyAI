import { Sequelize, DataTypes, Model } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Sequelize with database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://aiuser:aipassword@postgres:5432/aiassistant', {
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
});

// Define User model
export class User extends Model {
  public id!: number;
  public username!: string;
  public preferences!: object;
  public createdAt!: Date;
  public updatedAt!: Date;
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false,
  },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  sequelize,
  tableName: 'users',
  timestamps: true,
  underscored: true,
});

// Define Conversation model
export class Conversation extends Model {
  public id!: number;
  public userId!: number;
  public title!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public lastMessageAt!: Date;
}

Conversation.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    field: 'user_id',
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_message_at',
  },
}, {
  sequelize,
  tableName: 'conversations',
  timestamps: true,
  underscored: true,
});

// Define Message model
export class Message extends Model {
  public id!: number;
  public conversationId!: number;
  public sender!: string;
  public content!: string;
  public processed!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Message.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'conversations',
      key: 'id',
    },
    field: 'conversation_id',
  },
  sender: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  sequelize,
  tableName: 'messages',
  timestamps: true,
  underscored: true,
});

// Define Feedback model
export class Feedback extends Model {
  public id!: number;
  public messageId!: number;
  public rating!: number | null;
  public feedbackText!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Feedback.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  messageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'messages',
      key: 'id',
    },
    field: 'message_id',
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  feedbackText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'feedback_text',
  },
}, {
  sequelize,
  tableName: 'feedback',
  timestamps: true,
  underscored: true,
});

// Define Knowledge model
export class Knowledge extends Model {
  public id!: number;
  public content!: string;
  public source!: string | null;
  public type!: string;
  public confidence!: number;
  public tags!: string[];
  public lastAccessed!: Date | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Knowledge.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  source: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  confidence: {
    type: DataTypes.FLOAT,
    defaultValue: 0.5,
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  lastAccessed: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_accessed',
  },
}, {
  sequelize,
  tableName: 'knowledge',
  timestamps: true,
  underscored: true,
});

// Define LearningSource model
export class LearningSource extends Model {
  public id!: number;
  public url!: string | null;
  public title!: string | null;
  public content!: string | null;
  public lastCrawled!: Date | null;
  public status!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

LearningSource.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  url: {
    type: DataTypes.STRING(2048),
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  lastCrawled: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_crawled',
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'learning_sources',
  timestamps: true,
  underscored: true,
});

// Define DefaultResponse model for "I don't know" answers
export class DefaultResponse extends Model {
  public id!: number;
  public responseText!: string;
  public context!: string | null;
  public priority!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

DefaultResponse.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  responseText: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'response_text',
  },
  context: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
}, {
  sequelize,
  tableName: 'default_responses',
  timestamps: true,
  underscored: true,
});

// Set up associations
User.hasMany(Conversation, { foreignKey: 'userId' });
Conversation.belongsTo(User, { foreignKey: 'userId' });

Conversation.hasMany(Message, { foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

Message.hasMany(Feedback, { foreignKey: 'messageId' });
Feedback.belongsTo(Message, { foreignKey: 'messageId' });

// Function to sync all models with the database
export const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('Database synchronized successfully');
    
    // Add default "I don't know" responses if they don't exist
    const count = await DefaultResponse.count();
    if (count === 0) {
      await DefaultResponse.bulkCreate([
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
};

export default {
  sequelize,
  User,
  Conversation,
  Message,
  Feedback,
  Knowledge,
  LearningSource,
  DefaultResponse,
  syncDatabase
};