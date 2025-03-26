FROM node:20-alpine


WORKDIR /app

# Install nodemon globally and a specific npm version
RUN npm install -g nodemon ts-node
RUN npm install -g npm@9.6.7

# Copy .npmrc for GitHub Packages authentication
COPY .npmrc ./

# Copy main app package files and install dependencies
COPY package*.json ./
RUN npm cache clean --force && npm install --no-package-lock

# Copy source code
COPY . .

# Create dist directory

# Create dist directory
RUN mkdir -p dist

# Build TypeScript for initial build

# Build TypeScript for initial build
RUN npm run build

# Use nodemon to watch for changes
CMD ["sh", "-c", "nodemon --watch src --polling -e ts,json --exec 'ts-node src/index.ts || npm run build && node dist/index.js'"]