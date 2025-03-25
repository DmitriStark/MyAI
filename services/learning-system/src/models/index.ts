// import { Sequelize, DataTypes, Model } from 'sequelize';
// import dotenv from 'dotenv';

// dotenv.config();

// // Initialize Sequelize with database connection
// const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aiassistant', {
//   dialect: 'postgres',
//   logging: false, // Set to console.log to see SQL queries
// });

// // Define models needed for the learning system

// // Define Knowledge model
// export class Knowledge extends Model {
//   public id!: number;
//   public content!: string;
//   public source!: string | null;
//   public type!: string;
//   public confidence!: number;
//   public tags!: string[];
//   public lastAccessed!: Date | null;
//   public createdAt!: Date;
//   public updatedAt!: Date;
// }

// Knowledge.init({
//   id: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     primaryKey: true,
//   },
//   content: {
//     type: DataTypes.TEXT,
//     allowNull: false,
//   },
//   source: {
//     type: DataTypes.STRING(255),
//     allowNull: true,
//   },
//   type: {
//     type: DataTypes.STRING(50),
//     allowNull: false,
//   },
//   confidence: {
//     type: DataTypes.FLOAT,
//     defaultValue: 0.5,
//   },
//   tags: {
//     type: DataTypes.ARRAY(DataTypes.STRING),
//     defaultValue: [],
//   },
//   lastAccessed: {
//     type: DataTypes.DATE,
//     allowNull: true,
//     field: 'last_accessed',
//   },
// }, {
//   sequelize,
//   tableName: 'knowledge',
//   timestamps: true,
//   underscored: true,
// });

// // Define Message model (reference)
// export class Message extends Model {
//   public id!: number;
//   public conversationId!: number;
//   public sender!: string;
//   public content!: string;
//   public processed!: boolean;
//   public createdAt!: Date;
//   public updatedAt!: Date;
// }

// Message.init({
//   id: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     primaryKey: true,
//   },
//   conversationId: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     references: {
//       model: 'conversations',
//       key: 'id',
//     },
//     field: 'conversation_id',
//   },
//   sender: {
//     type: DataTypes.STRING(50),
//     allowNull: false,
//   },
//   content: {
//     type: DataTypes.TEXT,
//     allowNull: false,
//   },
//   processed: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false,
//   },
// }, {
//   sequelize,
//   tableName: 'messages',
//   timestamps: true,
//   underscored: true,
// });

// // Define Feedback model (reference)
// export class Feedback extends Model {
//   public id!: number;
//   public messageId!: number;
//   public rating!: number | null;
//   public feedbackText!: string | null;
//   public createdAt!: Date;
//   public updatedAt!: Date;
// }

// Feedback.init({
//   id: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     primaryKey: true,
//   },
//   messageId: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     references: {
//       model: 'messages',
//       key: 'id',
//     },
//     field: 'message_id',
//   },
//   rating: {
//     type: DataTypes.INTEGER,
//     allowNull: true,
//   },
//   feedbackText: {
//     type: DataTypes.TEXT,
//     allowNull: true,
//     field: 'feedback_text',
//   },
// }, {
//   sequelize,
//   tableName: 'feedback',
//   timestamps: true,
//   underscored: true,
// });

// // Define LearningSource model
// export class LearningSource extends Model {
//   public id!: number;
//   public url!: string | null;
//   public title!: string | null;
//   public content!: string | null;
//   public lastCrawled!: Date | null;
//   public status!: string | null;
//   public createdAt!: Date;
//   public updatedAt!: Date;
// }

// LearningSource.init({
//   id: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     primaryKey: true,
//   },
//   url: {
//     type: DataTypes.STRING(2048),
//     allowNull: true,
//   },
//   title: {
//     type: DataTypes.STRING(255),
//     allowNull: true,
//   },
//   content: {
//     type: DataTypes.TEXT,
//     allowNull: true,
//   },
//   lastCrawled: {
//     type: DataTypes.DATE,
//     allowNull: true,
//     field: 'last_crawled',
//   },
//   status: {
//     type: DataTypes.STRING(50),
//     allowNull: true,
//   },
// }, {
//   sequelize,
//   tableName: 'learning_sources',
//   timestamps: true,
//   underscored: true,
// });

// // Define LearningTask model - to track learning tasks
// export class LearningTask extends Model {
//   public id!: number;
//   public type!: string;
//   public sourceId!: string | null;
//   public sourceType!: string;
//   public status!: string;
//   public progress!: number;
//   public error!: string | null;
//   public createdAt!: Date;
//   public updatedAt!: Date;
//   public completedAt!: Date | null;
// }

// LearningTask.init({
//   id: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     primaryKey: true,
//   },
//   type: {
//     type: DataTypes.STRING(50),
//     allowNull: false,
//   },
//   sourceId: {
//     type: DataTypes.STRING,
//     allowNull: true,
//     field: 'source_id',
//   },
//   sourceType: {
//     type: DataTypes.STRING(50),
//     allowNull: false,
//     field: 'source_type',
//   },
//   status: {
//     type: DataTypes.STRING(50),
//     allowNull: false,
//     defaultValue: 'pending',
//   },
//   progress: {
//     type: DataTypes.FLOAT,
//     allowNull: false,
//     defaultValue: 0,
//   },
//   error: {
//     type: DataTypes.TEXT,
//     allowNull: true,
//   },
//   completedAt: {
//     type: DataTypes.DATE,
//     allowNull: true,
//     field: 'completed_at',
//   },
// }, {
//   sequelize,
//   tableName: 'learning_tasks',
//   timestamps: true,
//   underscored: true,
// });

// // Set up associations
// Message.hasMany(Feedback, { foreignKey: 'messageId' });
// Feedback.belongsTo(Message, { foreignKey: 'messageId' });

// // Function to sync all models with the database
// export const syncDatabase = async (force = false) => {
//   try {
//     await sequelize.sync({ alter: true }); // Use alter:true instead of force to preserve data
//     console.log('Learning system: Database synchronized successfully');
//   } catch (error) {
//     console.error('Learning system: Error synchronizing database:', error);
//     throw error;
//   }
// };

// export default {
//   sequelize,
//   Knowledge,
//   Message,
//   Feedback,
//   LearningSource,
//   LearningTask,
//   syncDatabase
// };




import { Sequelize, DataTypes, Model } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Sequelize with database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aiassistant', {
  dialect: 'postgres',
  logging: false, // Set to console.log to see SQL queries
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

// Define Feedback model (reference)
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

// Define LearningTask model - to track learning tasks
export class LearningTask extends Model {
  public id!: number;
  public type!: string;
  public sourceId!: string | null;
  public sourceType!: string;
  public status!: string;
  public progress!: number;
  public error!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
  public completedAt!: Date | null;
}

LearningTask.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  sourceId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'source_id',
  },
  sourceType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'source_type',
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending',
  },
  progress: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at',
  },
}, {
  sequelize,
  tableName: 'learning_tasks',
  timestamps: true,
  underscored: true,
});

// Set up associations
Message.hasMany(Feedback, { foreignKey: 'messageId' });
Feedback.belongsTo(Message, { foreignKey: 'messageId' });

// Function to sync all models with the database
export const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ alter: true }); // Use alter:true instead of force to preserve data
    console.log('Learning system: Database synchronized successfully');
  } catch (error) {
    console.error('Learning system: Error synchronizing database:', error);
    throw error;
  }
};

export default {
  sequelize,
  Knowledge,
  Message,
  Feedback,
  LearningSource,
  LearningTask,
  syncDatabase
};