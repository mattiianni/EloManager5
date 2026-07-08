import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function check() {
  await sql`
    DELETE FROM players
    WHERE id = '427d56d1-4203-4094-a4f8-29a40d504cc3'
  `;
  console.log("Deleted");
}
check();
