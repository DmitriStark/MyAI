FROM node:20-alpine

WORKDIR /app

# Install global tools
RUN npm install -g nodemon ts-node

# Copy package files and npmrc
COPY package*.json .npmrc ./

# Install dependencies (including your published package)
RUN npm install

# Copy database setup scripts
COPY db-init.js ./
COPY setup-db.js ./

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Run the application
CMD ["sh", "-c", "node db-init.js && node setup-db.js && nodemon --legacy-watch --polling --watch src -e ts,json --exec 'ts-node src/index.ts' || node dist/index.js"]