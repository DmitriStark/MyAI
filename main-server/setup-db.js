const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();
const createDatabase = require('./db-init');

// Connect to database
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgres://aiuser:aipassword@postgres:5432/aiassistant',
  {
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    retry: {
      max: 10,
      match: [/SequelizeConnectionError/]
    }
  }
);

async function setupDatabase() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Connection to database successful.');
    
    // Define DefaultResponse model for "I don't know" answers
    const DefaultResponse = sequelize.define('default_response', {
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
      tableName: 'default_responses',
      timestamps: true,
      underscored: true,
    });
    
    // Define Knowledge model
    const Knowledge = sequelize.define('knowledge', {
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
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'general',
      },
      confidence: {
        type: DataTypes.FLOAT,
        allowNull: false,
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
      }
    }, {
      tableName: 'knowledge',
      timestamps: true,
      underscored: true,
    });
    
    // Define ResponseTemplate model
    const ResponseTemplate = sequelize.define('response_template', {
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
      }
    }, {
      tableName: 'response_templates',
      timestamps: true,
      underscored: true,
    });
    
    // Define LearningTask model
    const LearningTask = sequelize.define('learning_task', {
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
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'source_id',
      },
      sourceType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'source_type',
      },
      status: {
        type: DataTypes.STRING(20),
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
      }
    }, {
      tableName: 'learning_tasks',
      timestamps: true,
      underscored: true,
    });
    
    // Export models for use in application
    const models = {
      DefaultResponse,
      Knowledge,
      ResponseTemplate,
      LearningTask,
      sequelize
    };
    
    // Sync the models with the database
    await sequelize.sync({ alter: true }); // Using alter instead of force to preserve existing data
    console.log('Database tables synchronized.');
    
    // Check if default responses exist before adding
    const responseCount = await DefaultResponse.count();
    
    if (responseCount === 0) {
      // Add default "I don't know" responses
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
        },
        {
          responseText: "An error occurred. Please try again later.",
          context: 'error',
          priority: 10
        }
      ]);
      console.log('Default responses added to database');
    } else {
      console.log(`Default responses already exist (${responseCount} found)`);
    }
    
    // Export models
    global.models = models;
    
    console.log('Database setup complete.');
    return models;
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}

// Export for use in your application
module.exports = { 
  sequelize, 
  setupDatabase
};

// If run directly
if (require.main === module) {
  createDatabase()
    .then(() => setupDatabase())
    .then(() => {
      console.log('Database initialization complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('Database setup failed:', err);
      process.exit(1);
    });
}