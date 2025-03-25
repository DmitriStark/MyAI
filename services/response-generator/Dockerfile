FROM node:20-alpine

WORKDIR /app

# Install nodemon globally
RUN npm install -g nodemon ts-node

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Create dist directory
RUN mkdir -p dist

# Build TypeScript for initial build
RUN npm run build

# Use nodemon to watch for changes
CMD ["sh", "-c", "nodemon --watch src --polling -e ts,json --exec 'ts-node src/index.ts || npm run build && node dist/index.js'"]

