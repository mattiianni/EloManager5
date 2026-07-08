import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

let DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (DATABASE_URL) DATABASE_URL = DATABASE_URL.trim().replace(/^["']|["']$/g, '');
const sql = neon(DATABASE_URL);

async function run() {
    console.log("Restoring players to their correct workspace...");
    
    // We get all teams and their players
    const teams = await sql`
        SELECT ttt.players_linked, t.workspace_id 
        FROM team_tournament_teams ttt
        JOIN tournaments t ON ttt.tournament_id = t.id
    `;
    
    let count = 0;
    for (const team of teams) {
        const linked = team.players_linked || [];
        for (const p of linked) {
            if (p.id) {
                // Set the player's workspace_id to the team's tournament workspace_id
                await sql`
                    UPDATE players 
                    SET workspace_id = ${team.workspace_id}
                    WHERE id = ${p.id} AND workspace_id != ${team.workspace_id}
                `;
                count++;
            }
        }
    }
    console.log(`Finito. Aggiornati / controllati ${count} collegamenti.`);
    process.exit(0);
}
run();
