import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Define service configurations
interface ServiceConfig {
  name: string;
  path: string;
  script: string;
  color: string;
}

// Define colors for different services
const colors = {
  main: 'blue.bold',
  core: 'green.bold',
  learning: 'magenta.bold',
  response: 'cyan.bold',
  ego: 'yellow.bold'
};

// Check if PostgreSQL is available
function checkPostgresConnection(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const pgCheck = spawn('psql', ['-U', 'postgres', '-c', '\\l']);
    
    pgCheck.on('close', (code) => {
      if (code === 0) {
        console.log('✅ PostgreSQL connection verified');
        resolve(true);
      } else {
        console.error('❌ Cannot connect to PostgreSQL. Make sure it is running.');
        reject(new Error('PostgreSQL connection failed'));
      }
    });
    
    pgCheck.on('error', (err) => {
      console.error('❌ PostgreSQL check failed:', err.message);
      reject(err);
    });
  });
}

// Check if a database exists
function checkDbExists(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const pgCheck = spawn('psql', ['-U', 'postgres', '-c', '\\l | grep aiassistant']);
    
    let output = '';
    pgCheck.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pgCheck.on('close', (code) => {
      if (output.includes('aiassistant')) {
        console.log('✅ Database "aiassistant" exists');
        resolve(true);
      } else {
        console.log('⚠️ Database "aiassistant" not found, will create it');
        resolve(false);
      }
    });
    
    pgCheck.on('error', (err) => {
      console.error('❌ Database check failed:', err.message);
      reject(err);
    });
  });
}

// Create the database if it doesn't exist
function createDb(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const createDbProcess = spawn('psql', ['-U', 'postgres', '-c', 'CREATE DATABASE aiassistant;']);
    
    createDbProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Database "aiassistant" created');
        resolve(true);
      } else {
        console.error('❌ Failed to create database');
        reject(new Error('Database creation failed'));
      }
    });
    
    createDbProcess.on('error', (err) => {
      console.error('❌ Database creation failed:', err.message);
      reject(err);
    });
  });
}

// Run the database setup script
function setupDb(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    console.log('🔄 Setting up database tables and initial data...');
    const setupProcess = spawn('ts-node', ['setup-local-db.ts']);
    
    setupProcess.stdout.on('data', (data) => {
      console.log(`📊 DB Setup: ${data.toString().trim()}`);
    });
    
    setupProcess.stderr.on('data', (data) => {
      console.error(`❌ DB Setup Error: ${data.toString().trim()}`);
    });
    
    setupProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Database setup completed');
        resolve(true);
      } else {
        console.error('❌ Database setup failed');
        reject(new Error('Database setup failed'));
      }
    });
  });
}

// Start all services in development mode
function startServices(): void {
  console.log('🚀 Starting all services in development mode...');
  
  const services: ServiceConfig[] = [
    { name: 'main-server', path: './main-server', script: 'npm run dev', color: colors.main },
    { name: 'core-service', path: './services/core', script: 'npm run dev', color: colors.core },
    { name: 'learning-system', path: './services/learning-system', script: 'npm run dev', color: colors.learning },
    { name: 'response-generator', path: './services/response-generator', script: 'npm run dev', color: colors.response },
    { name: 'ego-service', path: './services/ego-service', script: 'npm run dev', color: colors.ego }
  ];
  
  services.forEach(service => {
    const proc = spawn('npm', ['run', 'dev'], { cwd: service.path, shell: true });
    
    proc.stdout.on('data', (data) => {
      console.log(`[${service.name}] ${data.toString().trim()}`);
    });
    
    proc.stderr.on('data', (data) => {
      console.error(`[${service.name}] ERROR: ${data.toString().trim()}`);
    });
    
    proc.on('close', (code) => {
      console.log(`[${service.name}] exited with code ${code}`);
    });
    
    console.log(`✅ Started ${service.name}`);
  });
}

// Main function
async function main(): Promise<void> {
  try {
    console.log('🔍 Checking development environment...');
    
    // Check PostgreSQL connection
    await checkPostgresConnection();
    
    // Check if database exists, create if not
    const dbExists = await checkDbExists();
    if (!dbExists) {
      await createDb();
    }
    
    // Run database setup
    await setupDb();
    
    // Start all services
    startServices();
    
    console.log('\n✅ All services started. AI Assistant is running in development mode.');
    console.log('📝 Access the API at http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Setup failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run the main function
main();