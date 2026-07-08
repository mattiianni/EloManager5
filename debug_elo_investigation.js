import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function investigate() {
  const workspaceIdResult = await sql`SELECT id FROM workspaces WHERE name ILIKE '%padel academy%'`;
  if (workspaceIdResult.length === 0) return console.log("Workspace not found");
  const workspaceId = workspaceIdResult[0].id;

  const players = await sql`
    SELECT id, name, surname, initial_elo, current_elo 
    FROM players 
    WHERE workspace_id = ${workspaceId}
  `;
  
  const getPlayer = (id) => players.find(p => p.id === id);

  const history = await sql`
    SELECT * FROM elo_history
    WHERE workspace_id = ${workspaceId}
    ORDER BY id ASC
  `;

  // Filter for Spinelli, Coscetti, Paola, Francesca
  const spinelli = players.find(p => p.surname.toLowerCase().includes('spinelli'));
  const coscetti = players.find(p => p.surname.toLowerCase().includes('coscetti'));
  const paola = players.find(p => p.name.toLowerCase().includes('paola') && p.surname.toLowerCase().includes('bonica'));
  const francesca = players.find(p => p.name.toLowerCase().includes('francesca') && p.surname.toLowerCase().includes('pennesi'));
  // Wait, I don't know their surnames. Let me just find them.
  const paola2 = players.find(p => p.name.toLowerCase().includes('paola'));
  const francesca2 = players.find(p => p.name.toLowerCase().includes('francesca'));

  console.log("Spinelli:", spinelli);
  console.log("Coscetti:", coscetti);
  console.log("Paola:", paola2);
  console.log("Francesca:", francesca2);

  const targetIds = [spinelli?.id, coscetti?.id, paola2?.id, francesca2?.id].filter(Boolean);

  history.forEach(h => {
    if (targetIds.includes(h.player_id)) {
      const p = getPlayer(h.player_id);
      console.log(`[${h.date.toISOString().split('T')[0]}] ${p.name} ${p.surname} | Delta: ${h.delta} | New ELO: ${h.elo} | Event: ${h.event_id}`);
    }
  });
}
investigate().catch(console.error);
