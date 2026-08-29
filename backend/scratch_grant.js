const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  try {
    const tables = ['users', 'posts', 'likes', 'comments', 'follows'];
    for (const table of tables) {
      await client.query(`ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`);
      console.log(`Disabled RLS on ${table}.`);
    }
  } catch (err) {
    console.error('Error:', err);
  }
  
  await client.end();
}

run();
