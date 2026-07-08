import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

async function run() {
  const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);
  const players = await sql`SELECT current_elo FROM players`;
  
  let sum = 0;
  for(let p of players) sum += parseFloat(p.current_elo);
  
  console.log(`Total Players: ${players.length}`);
  console.log(`Sum of all ELOs: ${sum}`);
  console.log(`Average ELO of ALL players: ${sum / players.length}`);
}

run().catch(console.error);
