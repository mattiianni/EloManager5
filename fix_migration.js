import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

let DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (DATABASE_URL) DATABASE_URL = DATABASE_URL.trim().replace(/^["']|["']$/g, '');
const sql = neon(DATABASE_URL);

async function run() {
    console.log('Fixing fake IDs...');
    const teams = await sql`
        SELECT ttt.id, ttt.players, ttt.players_linked, t.workspace_id 
        FROM team_tournament_teams ttt
        JOIN tournaments t ON ttt.tournament_id = t.id
    `;
    
    for (const team of teams) {
        let updatedPlayersLinked = [...(team.players_linked || [])];
        let needsUpdate = false;
        
        for (let i = 0; i < updatedPlayersLinked.length; i++) {
            const p = updatedPlayersLinked[i];
            if (p.id) {
                // Check if it exists
                const existing = await sql`SELECT id FROM players WHERE id = ${p.id}`;
                if (existing.length === 0) {
                    console.log(`ID ${p.id} per ${p.name} ${p.surname} NON esiste in players! Lo creo...`);
                    const insertRes = await sql`
                        INSERT INTO players (id, workspace_id, name, surname, position, current_elo, initial_elo)
                        VALUES (${p.id}, ${team.workspace_id}, ${p.name}, ${p.surname}, 'Indifferente', 1500, 1500)
                        RETURNING id
                    `;
                    console.log(`Creato player con ID ${p.id}`);
                }
            }
        }
    }
    console.log("Fatto.");
}
run();
