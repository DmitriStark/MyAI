import { Sequelize, DataTypes, Model } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Sequelize with database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aiassistant', {
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
});

// Define models using the same structure as the main server
// This ensures compatibility across services

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

// Define ProcessingTask model for tracking message processing
export class ProcessingTask extends Model {
  public id!: number;
  public messageId!: number;
  public status!: string;
  public services!: { [key: string]: string };
  public createdAt!: Date;
  public updatedAt!: Date;
  public completedAt!: Date | null;
}

ProcessingTask.init({
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
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending',
  },
  services: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at',
  },
}, {
  sequelize,
  tableName: 'processing_tasks',
  timestamps: true,
  underscored: true,
});

// Set up associations
User.hasMany(Conversation, { foreignKey: 'userId' });
Conversation.belongsTo(User, { foreignKey: 'userId' });

Conversation.hasMany(Message, { foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

Message.hasOne(ProcessingTask, { foreignKey: 'messageId' });
ProcessingTask.belongsTo(Message, { foreignKey: 'messageId' });

// Function to sync all models with the database
export const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ alter: true }); // Use alter:true instead of force to preserve data
    console.log('Core service: Database synchronized successfully');
  } catch (error) {
    console.error('Core service: Error synchronizing database:', error);
    throw error;
  }
};

export default {
  sequelize,
  User,
  Conversation,
  Message,
  ProcessingTask,
  syncDatabase
};