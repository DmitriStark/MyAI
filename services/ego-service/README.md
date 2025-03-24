AI Assistant
An AI assistant built from scratch with learning capabilities and no hardcoded answers.
Overview
This AI assistant is designed to learn from user interactions, feedback, and content. It utilizes a microservices architecture to separate concerns:

Main Server: API gateway and central coordinator
Core Service: Orchestrates message processing
Learning System: Acquires and processes knowledge
Response Generator: Creates human-like responses
Ego Service: Background processing to improve the AI

Features

Built from scratch without hardcoded answers
Learning from user input and conversations
Feedback processing to improve responses
In-depth conversation analysis via the ego service
Knowledge consolidation and contradiction resolution
Default "I don't know" responses when knowledge is missing

Project Structure
Copyai-assistant/
├── setup-local-db.ts       # Database setup script
├── dev-start.ts            # Development starter script
├── main-server/            # Main API server
│   ├── src/
│   │   ├── index.ts        # Entry point
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   └── middleware/     # Middleware functions
│
├── services/               # Microservices
│   ├── core/               # Core processing service
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── middleware/
│   │
│   ├── learning-system/    # Learning and knowledge acquisition
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── models/
│   │   │   ├── processors/
│   │   │   ├── services/
│   │   │   └── middleware/
│   │
│   ├── response-generator/ # Response generation
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── models/
│   │   │   ├── services/
│   │   │   └── middleware/
│   │
│   └── ego-service/        # Background processing
│       ├── src/
│       │   ├── index.ts
│       │   ├── models/
│       │   ├── routes/
│       │   ├── services/
│       │   └── middleware/
Technology Stack

Language: TypeScript
Runtime: Node.js
Framework: Express
Database: PostgreSQL
ORM: Sequelize
NLP: Natural language processing libraries

Getting Started
Prerequisites

Node.js (v16+)
PostgreSQL
TypeScript

Installation

Clone the repository:
bashCopygit clone <repository-url>
cd ai-assistant

Install dependencies:
bashCopynpm run install-all

Set up the database:
bashCopynpm run setup-db

Start the development environment:
bashCopynpm run dev-start


Alternatively, you can start each service individually:
bashCopynpm run start-main
npm run start-core
npm run start-learning
npm run start-response
npm run start-ego
How It Works
Message Processing Flow

User sends a message to the main server
Main server forwards the message to the core service
Core service orchestrates processing:

Sends the message to the learning system
Requests a response from the response generator
Triggers background processing in the ego service


Response is sent back to the user
Ego service continues analyzing in the background

Learning System
The learning system processes information from three main sources:

User inputs during conversations
Feedback on AI responses
Web content (when implemented)

It extracts entities, concepts, and facts from text using NLP techniques and stores them in the knowledge base.
Response Generator
The response generator creates responses by:

Searching the knowledge base for relevant information
Building a context from the conversation history
Crafting a response based on available knowledge
Using default "I don't know" responses when knowledge is insufficient

Ego Service
The ego service works in the background to improve the AI:

Analyzes conversations to identify patterns
Detects knowledge gaps
Synthesizes new knowledge from existing knowledge
Resolves contradictions in the knowledge base
Consolidates similar knowledge entries

Database Schema
The database consists of several key tables:

users: User information
conversations: Conversation sessions
messages: Individual messages
knowledge: Learned information
feedback: User feedback on responses
learning_sources: External learning sources
insights: AI self-improvement insights
default_responses: "I don't know" responses

Configuration
Each service has its own .env file for configuration. Example:
Copy# Server Configuration
PORT=3000
NODE_ENV=development

# Database Connection
DATABASE_URL=postgres://postgres:postgres@localhost:5432/aiassistant

# Service URLs
CORE_SERVICE_URL=http://localhost:3001
LEARNING_SYSTEM_URL=http://localhost:3002
RESPONSE_GENERATOR_URL=http://localhost:3003
EGO_SERVICE_URL=http://localhost:3004
Development
Adding New Knowledge Sources
To add new knowledge sources to the learning system:

Create a new processor in services/learning-system/src/processors/
Implement the extraction and storage logic
Register the processor in the learning system

Improving Response Generation
To enhance response generation:

Modify services/response-generator/src/services/response-generator.ts
Implement more sophisticated NLP techniques
Add response templates or generation methods

Extending the Ego Service
To extend the ego service's capabilities:

Add new insight types in services/ego-service/src/services/insight-service.ts
Implement processors for the new insight types
Create routes to access the new functionality

License
[Your license information]
Acknowledgments
[Any acknowledgments or credits]