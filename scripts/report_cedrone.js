import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config();

async function run() {
  const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);
  
  const tourneyId = 'a9efb588-ed2d-4242-8e6a-1a6c00b9608e';
  const pId = '07fd9c9f-53af-42f7-b02e-19a83967aabd'; // Cedrone
  
  const matches = await sql`
      SELECT m.*
      FROM matches m
      WHERE m.tournament_id = ${tourneyId} 
      AND (m.team1_p1_id = ${pId} OR m.team1_p2_id = ${pId} OR m.team2_p1_id = ${pId} OR m.team2_p2_id = ${pId})
      AND m.winner IS NOT NULL
      ORDER BY m.created_at ASC
  `;
  
  console.log(`Cedrone played ${matches.length} matches.`);
}

run().catch(console.error);
