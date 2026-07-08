import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

async function run() {
  const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);
  
  // Find a tournament matching "torneotto"
  const tourneys = await sql`
      SELECT id, name, type, date 
      FROM tournaments 
      WHERE name ILIKE '%torneotto%' 
      LIMIT 1
  `;
  
  if (tourneys.length === 0) {
      console.log("No tournament found matching 'torneotto'.");
      const allTourneys = await sql`SELECT id, name FROM tournaments LIMIT 10`;
      console.log("Available tournaments:", allTourneys);
      return;
  }
  
  const tourney = tourneys[0];
  console.log(`Found tournament: ${tourney.name} (ID: ${tourney.id})`);
  
  // Fetch matches
  const matches = await sql`
      SELECT m.*, 
             p1.name as t1_p1_n, p1.surname as t1_p1_s,
             p2.name as t1_p2_n, p2.surname as t1_p2_s,
             p3.name as t2_p1_n, p3.surname as t2_p1_s,
             p4.name as t2_p2_n, p4.surname as t2_p2_s
      FROM matches m
      JOIN players p1 ON m.team1_p1_id = p1.id
      JOIN players p2 ON m.team1_p2_id = p2.id
      JOIN players p3 ON m.team2_p1_id = p3.id
      JOIN players p4 ON m.team2_p2_id = p4.id
      WHERE m.tournament_id = ${tourney.id} AND m.winner IS NOT NULL
      ORDER BY m.created_at ASC
  `;
  
  console.log(`Found ${matches.length} matches.`);
  
  // Fetch ELO history for this tournament
  const history = await sql`
      SELECT h.*, p.name, p.surname
      FROM elo_history h
      JOIN players p ON h.player_id = p.id
      WHERE h.event_id = ${tourney.id}
  `;
  
  console.log("ELO History entries:", history.length);
  
  // Dump some matches
  console.log(JSON.stringify(matches.slice(0, 5), null, 2));
  console.log(JSON.stringify(history.slice(0, 8), null, 2));
}

run().catch(console.error);
