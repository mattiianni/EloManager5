import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

async function run() {
  const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);
  
  const history = await sql`SELECT DISTINCT player_id FROM elo_history`;
  const activeIds = history.map(h => h.player_id);
  
  if (activeIds.length === 0) {
      console.log("No active players.");
      return;
  }
  
  const players = await sql`
      SELECT current_elo FROM players 
      WHERE id = ANY(${activeIds})
  `;
  
  let sum = 0;
  for(let p of players) sum += parseFloat(p.current_elo);
  
  console.log(`Total Active Players (played at least 1 match): ${players.length}`);
  console.log(`Sum of Active ELOs: ${sum}`);
  console.log(`Average ELO of Active players: ${sum / players.length}`);
}

run().catch(console.error);
