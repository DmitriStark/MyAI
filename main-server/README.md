AI Assistant - Local Development Setup
This guide explains how to set up the AI Assistant project for local development.
Prerequisites

Node.js (v16 or higher)
PostgreSQL installed locally
TypeScript

Setup Steps
1. Setting up PostgreSQL
Make sure PostgreSQL is running on your local machine. Create a database named aiassistant:
sqlCopyCREATE DATABASE aiassistant;
Or use this command:
bashCopypsql -U postgres -c "CREATE DATABASE aiassistant;"
2. Installing Dependencies
Run the install script to set up all package dependencies:
bashCopynpm run install-all
This will install dependencies for the main project and all service subprojects.
3. Setting up the Database
Run the database setup script:
bashCopynpm run setup-db
This will:

Connect to your local PostgreSQL
Create necessary database tables
Seed the database with default "I don't know" responses

4. Running the Services Locally
You can start each service separately:
bashCopy# Start the main server (on port 3000)
npm run start-main

# Start the core service (on port 3001)
npm run start-core

# Start the learning system (on port 3002)
npm run start-learning

# Start the response generator (on port 3003)
npm run start-response

# Start the ego service (on port 3004)
npm run start-ego
For development, you'll typically want to run all services at once. You can open multiple terminal windows to do this.
Project Structure

main-server/ - The main API server
services/ - Individual microservices

core/ - Core AI orchestration
learning-system/ - Learning and knowledge acquisition
response-generator/ - Response generation
ego-service/ - Background processing and introspection



Environment Variables
Local development environment variables are stored in .env files in each service directory. The defaults are set for local development, but you can modify them as needed.
Database Structure
The database uses several key tables:

users - User information
conversations - Conversation sessions
messages - Individual messages
knowledge - Learned information
default_responses - "I don't know" responses when the AI lacks knowledge

Developing the AI Assistant
The project is designed to have no hardcoded answers. Instead, the AI learns from:

User inputs
Feedback on responses
Web content (when implemented)

The default response system ensures the AI can gracefully handle unknown topics until it learns about them.