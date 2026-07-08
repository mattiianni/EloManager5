import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

let DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (DATABASE_URL) DATABASE_URL = DATABASE_URL.trim().replace(/^["']|["']$/g, '');
const sql = neon(DATABASE_URL);

async function run() {
    const p = await sql`SELECT id, name, surname, workspace_id FROM players WHERE name = 'Daniil'`;
    console.log("Daniil Medvedev in players:", p);
    
    const team = await sql`SELECT id, workspace_id FROM team_tournament_teams WHERE players::text LIKE '%Daniil%' LIMIT 1`;
    console.log("Team workspace:", team);
    
    process.exit(0);
}
run();
