const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('Testing DATABASE_URL connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env file');
    return;
  }

  // Mask password in URL for logging
  const maskedUrl = process.env.DATABASE_URL.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
  console.log('Connection string:', maskedUrl);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    // Force IPv4
    host: process.env.DATABASE_URL.match(/@([^:]+):/)[1],
    port: 5432,
    user: 'postgres',
    password: process.env.DATABASE_URL.match(/:\/\/[^:]+:([^@]+)@/)[1],
    database: 'postgres'
  });

  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Successfully connected to database!');

    // Test a simple query
    const result = await client.query('SELECT version()');
    console.log('📊 Database version:', result.rows[0].version);

    // Test if our tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📋 Tables found:', tablesResult.rows.map(row => row.table_name));

    // Test vector extension
    const vectorResult = await client.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) as vector_extension_exists
    `);
    console.log('🔧 Vector extension:', vectorResult.rows[0].vector_extension_exists ? '✅ Enabled' : '❌ Not enabled');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await client.end();
    console.log('🔌 Connection closed');
  }
}

testConnection();
