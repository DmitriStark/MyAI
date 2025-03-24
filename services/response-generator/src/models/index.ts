import { Sequelize, DataTypes, Model } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Sequelize with database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aiassistant', {
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
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

// Define DefaultResponse model (reference)
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

// Define ResponseTemplate model
export class ResponseTemplate extends Model {
  public id!: number;
  public template!: string;
  public context!: string | null;
  public usage!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

ResponseTemplate.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  template: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  context: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  usage: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  sequelize,
  tableName: 'response_templates',
  timestamps: true,
  underscored: true,
});

// Define ResponseLog model to track generated responses
export class ResponseLog extends Model {
  public id!: number;
  public messageId!: number;
  public conversationId!: number;
  public usedKnowledgeIds!: number[];
  public usedDefaultResponse!: boolean;
  public usedTemplate!: boolean;
  public templateId!: number | null;
  public confidence!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

ResponseLog.init({
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
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'conversation_id',
  },
  usedKnowledgeIds: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    allowNull: false,
    defaultValue: [],
    field: 'used_knowledge_ids',
  },
  usedDefaultResponse: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'used_default_response',
  },
  usedTemplate: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'used_template',
  },
  templateId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'template_id',
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  sequelize,
  tableName: 'response_logs',
  timestamps: true,
  underscored: true,
});

// Function to sync all models with the database
export const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ alter: true }); // Use alter:true instead of force to preserve data
    console.log('Response generator: Database synchronized successfully');
  } catch (error) {
    console.error('Response generator: Error synchronizing database:', error);
    throw error;
  }
};

export default {
  sequelize,
  Knowledge,
  Message,
  DefaultResponse,
  ResponseTemplate,
  ResponseLog,
  syncDatabase
};