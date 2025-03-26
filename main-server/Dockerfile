FROM node:20-alpine

WORKDIR /app

# Install nodemon globally
RUN npm install -g nodemon ts-node

# Create a simple db-models module directly in node_modules
RUN mkdir -p /app/node_modules/@ai-assistant/db-models/dist

# Create the module files
WORKDIR /app/node_modules/@ai-assistant/db-models

# Create package.json
RUN echo '{"name":"@ai-assistant/db-models","version":"1.0.0","main":"dist/index.js","types":"dist/index.d.ts"}' > package.json

# Create the index.js file 
WORKDIR /app/node_modules/@ai-assistant/db-models/dist
RUN echo '"use strict";' > index.js
RUN echo 'Object.defineProperty(exports, "__esModule", { value: true });' >> index.js
RUN echo 'const sequelize_1 = require("sequelize");' >> index.js
RUN echo 'class Database {' >> index.js
RUN echo '    constructor() {' >> index.js
RUN echo '        this.sequelize = new sequelize_1.Sequelize(process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/aiassistant", {' >> index.js
RUN echo '            dialect: "postgres",' >> index.js
RUN echo '            logging: false' >> index.js
RUN echo '        });' >> index.js
RUN echo '    }' >> index.js
RUN echo '    static getInstance() {' >> index.js
RUN echo '        if (!Database.instance) {' >> index.js
RUN echo '            Database.instance = new Database();' >> index.js
RUN echo '        }' >> index.js
RUN echo '        return Database.instance;' >> index.js
RUN echo '    }' >> index.js
RUN echo '}' >> index.js
RUN echo 'exports.default = Database;' >> index.js

# Create the index.d.ts file
RUN echo 'import { Sequelize } from "sequelize";' > index.d.ts
RUN echo 'declare class Database {' >> index.d.ts
RUN echo '    private static instance;' >> index.d.ts
RUN echo '    sequelize: Sequelize;' >> index.d.ts
RUN echo '    private constructor();' >> index.d.ts
RUN echo '    static getInstance(): Database;' >> index.d.ts
RUN echo '}' >> index.d.ts
RUN echo 'export default Database;' >> index.d.ts

# Return to app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy database setup scripts
COPY db-init.js ./
COPY setup-db.js ./

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Command to run with legacy watch and polling
CMD ["sh", "-c", "node db-init.js && node setup-db.js && nodemon --legacy-watch --polling --watch src -e ts,json --exec 'ts-node src/index.ts' || node dist/index.js"]