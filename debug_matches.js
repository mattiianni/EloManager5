import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
async function check() {
  const matches = await sql`
    SELECT m.id, m.date, m.team1_p1_id, m.team1_p2_id, m.team2_p1_id, m.team2_p2_id, m.sets, m.winner
    FROM matches m
    WHERE 'aecb4abc-d139-4fd3-bcf8-984cb1d95547' IN (m.team1_p1_id, m.team1_p2_id, m.team2_p1_id, m.team2_p2_id)
       OR 'a176e2cf-d55c-4caa-9b3b-743ef73a5b27' IN (m.team1_p1_id, m.team1_p2_id, m.team2_p1_id, m.team2_p2_id)
  `;
  console.log(JSON.stringify(matches, null, 2));
}
check();
