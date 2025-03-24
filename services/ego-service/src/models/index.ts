import { Sequelize, DataTypes, Model } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Sequelize with database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aiassistant', {
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
});

// Define models needed for the ego service

// Define User model (reference)
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

// Define Conversation model (reference)
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

// Define Message model (reference)
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

// Define Knowledge model (reference)
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

// Define Insight model - a new model specific to the ego service
export class Insight extends Model {
  public id!: number;
  public type!: string;
  public content!: string;
  public source!: string;
  public confidence!: number;
  public applied!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Insight.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  source: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  confidence: {
    type: DataTypes.FLOAT,
    defaultValue: 0.5,
  },
  applied: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  sequelize,
  tableName: 'insights',
  timestamps: true,
  underscored: true,
});

// Define KnowledgeConsolidation model - for tracking knowledge consolidation tasks
export class KnowledgeConsolidation extends Model {
  public id!: number;
  public status!: string;
  public startedAt!: Date;
  public completedAt!: Date | null;
  public knowledgeCount!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

KnowledgeConsolidation.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending',
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'started_at',
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at',
  },
  knowledgeCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'knowledge_count',
  },
}, {
  sequelize,
  tableName: 'knowledge_consolidations',
  timestamps: true,
  underscored: true,
});


export class DefaultResponse extends Model {
    public id!: number;
    public responseText!: string;
    public category?: string;
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
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  }, {
    sequelize,
    tableName: 'default_responses',
    timestamps: true,
    underscored: true,
  });

// Function to sync all models with the database
export const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ alter: true }); // Use alter:true instead of force to preserve data
    console.log('Ego service: Database synchronized successfully');
  } catch (error) {
    console.error('Ego service: Error synchronizing database:', error);
    throw error;
  }
};

export default {
    sequelize,
    User,
    Conversation,
    Message,
    Knowledge,
    Insight,
    KnowledgeConsolidation,
    DefaultResponse,
    syncDatabase
  };