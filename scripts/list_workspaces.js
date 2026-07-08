import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

async function run() {
  const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);
  const workspaces = await sql`SELECT * FROM workspaces`;
  console.log(workspaces);
}

run().catch(console.error);
