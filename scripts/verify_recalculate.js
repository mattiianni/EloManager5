import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

async function run() {
  const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);
  const rows = await sql`SELECT count(*) FROM elo_history WHERE type = 'match'`;
  console.log(`Rows with type 'match':`, rows[0].count);

  const tRows = await sql`SELECT count(*) FROM elo_history WHERE type = 'tournament'`;
  console.log(`Rows with type 'tournament':`, tRows[0].count);
}

run().catch(console.error);
