import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const count = await sql`SELECT count(*) FROM elo_history`;
  console.log('Elo history count:', count[0].count);
  process.exit(0);
}
run();
