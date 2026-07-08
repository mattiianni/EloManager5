import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
async function check() {
  const matches = await sql`
    SELECT *
    FROM team_tournament_matchday_matches
    WHERE 'aecb4abc-d139-4fd3-bcf8-984cb1d95547' IN (team1_p1_id, team1_p2_id, team2_p1_id, team2_p2_id)
       OR 'a176e2cf-d55c-4caa-9b3b-743ef73a5b27' IN (team1_p1_id, team1_p2_id, team2_p1_id, team2_p2_id)
  `;
  console.log(JSON.stringify(matches, null, 2));
}
check();
