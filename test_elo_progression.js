import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

async function check() {
  const workspaceIdResult = await sql`SELECT id FROM workspaces WHERE name ILIKE '%padel academy%'`;
  const workspaceId = workspaceIdResult[0].id;

  const history = await sql`
    SELECT eh.player_id, eh.delta, eh.elo_before, eh.elo_after, eh.event_id, eh.date, p.name, p.surname 
    FROM elo_history eh
    JOIN players p ON eh.player_id = p.id
    WHERE eh.workspace_id = ${workspaceId}
      AND (p.surname ILIKE '%spinelli%' OR p.surname ILIKE '%coscetti%' OR p.name ILIKE '%paola%' OR p.name ILIKE '%francesca%')
    ORDER BY eh.date ASC, eh.id ASC
  `;
  
  history.forEach(h => {
    console.log(`[${h.date.toISOString().split('T')[0]}] ${h.name} ${h.surname} | Delta: ${h.delta} | Before: ${h.elo_before} | After: ${h.elo_after}`);
  });
}
check();
