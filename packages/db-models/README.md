AI Assistant Database Models
This package contains shared Sequelize models for the AI Assistant microservices architecture. By using this shared package, all services can access the same database models with consistent schema definitions.
Installation
In each service that needs access to the database models:
bashCopynpm install --save @ai-assistant/db-models
Usage
typescriptCopyimport Database from '@ai-assistant/db-models';

// Get the singleton database instance
const db = Database.getInstance(process.env.DATABASE_URL);

async function main() {
  try {
    // Connect to the database
    await db.sequelize.authenticate();
    console.log('Connected to database');

    // Only the main server should sync the database
    if (process.env.SERVICE_NAME === 'main-server') {
      await db.syncDatabase({ alter: true });
    }

    // Use the models
    const responses = await db.DefaultResponse.findAll();
    console.log(`Found ${responses.length} default responses`);
  } catch (error) {
    console.error('Database error:', error);
  }
}

main();
Available Models

User: User accounts for the application
Conversation: Chat conversations between users and the assistant
Message: Individual messages within conversations
Feedback: User feedback on assistant responses
Knowledge: Knowledge base entries for the assistant
LearningSource: External sources of knowledge for learning
LearningTask: Tasks for processing and learning new information
DefaultResponse: Fallback responses when the assistant doesn't know an answer

Development
To build the package locally:
bashCopynpm install
npm run build
Integration with Docker
When using this package in a Docker-based microservices architecture, make sure to:

Add the package to each service's package.json
Include the package in your Docker build process
Ensure the database is initialized before services start

Troubleshooting
If you encounter database schema mismatches or missing columns, make sure all services are using the same version of this package.