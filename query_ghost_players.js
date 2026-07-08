import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function check() {
  const players = await sql`
    SELECT id, name, surname, workspace_id
    FROM players 
    WHERE LENGTH(TRIM(name)) < 2 OR LENGTH(TRIM(surname)) < 2
  `;
  console.log("Ghost players:", players);
}
check();
