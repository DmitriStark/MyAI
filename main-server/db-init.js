const { Pool } = require('pg');
require('dotenv').config();

async function createDatabase() {
  // Connect to default postgres database to create our application database
  const pool = new Pool({
    user: process.env.DB_USER || 'aiuser',
    password: process.env.DB_PASSWORD || 'aipassword',
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: 'postgres' // Connect to default postgres database
  });
  
  try {
    // Check if our database exists
    const checkResult = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'aiassistant'"
    );
    
    // If database doesn't exist, create it
    if (checkResult.rowCount === 0) {
      console.log('Database does not exist, creating...');
      await pool.query('CREATE DATABASE aiassistant');
      console.log('Database created successfully');
    } else {
      console.log('Database already exists');
    }
  } catch (error) {
    console.error('Error checking/creating database:', error);
  } finally {
    await pool.end();
  }
}

// Export for use in setup-db.js
module.exports = createDatabase;

// If run directly
if (require.main === module) {
  createDatabase()
    .then(() => console.log('Database creation check complete'))
    .catch(err => console.error('Failed to create database:', err));
}