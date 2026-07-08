import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

let DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (DATABASE_URL) DATABASE_URL = DATABASE_URL.trim().replace(/^["']|["']$/g, '');
const sql = neon(DATABASE_URL);

async function run() {
    console.log("Tournaments named like pippo:");
    const tours = await sql`SELECT id, name, type, workspace_id FROM tournaments WHERE name ILIKE '%pippo%'`;
    console.log(tours);
    
    if (tours.length > 0) {
        const t = tours[0];
        console.log("Teams for this tournament:");
        const teams = await sql`SELECT id, name, players, players_linked FROM team_tournament_teams WHERE tournament_id = ${t.id}`;
        console.log(JSON.stringify(teams, null, 2));
        
        console.log("Checking if players linked exist in players table...");
        for (const team of teams) {
            const linked = team.players_linked || [];
            for (const p of linked) {
                if (p.id) {
                    const pl = await sql`SELECT id, name, surname, workspace_id FROM players WHERE id = ${p.id}`;
                    console.log("Found player:", pl);
                }
            }
        }
    }
    process.exit(0);
}
run();
