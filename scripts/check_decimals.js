import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

async function run() {
  const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);
  
  const history = await sql`SELECT * FROM elo_history ORDER BY date DESC LIMIT 5`;
  console.log("Recent History:");
  console.table(history.map(h => ({
    player: h.player_id.substring(0,6),
    before: h.elo_before,
    after: h.elo_after,
    delta: h.delta
  })));

  const players = await sql`SELECT name, surname, current_elo FROM players WHERE current_elo != 1500 LIMIT 5`;
  console.log("Players ELO:");
  console.table(players);
}

run().catch(console.error);
