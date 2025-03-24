const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Connect to local database
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aiassistant',
  {
    logging: console.log
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

    // Sync the model with the database
    await sequelize.sync({ force: true });
    console.log('Database tables created.');

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
      }
    ]);
    console.log('Default responses added to database');

    console.log('Local database setup complete.');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await sequelize.close();
  }
}

setupDatabase();