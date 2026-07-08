import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

async function run() {
  const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);
  const history = await sql`SELECT * FROM elo_history WHERE workspace_id = 'a2664ea3-42bf-447e-b76a-3987380900e2' ORDER BY created_at DESC LIMIT 10`;
  console.log(history);
}

run().catch(console.error);
