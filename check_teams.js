import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

let DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (DATABASE_URL) DATABASE_URL = DATABASE_URL.trim().replace(/^["']|["']$/g, '');
const sql = neon(DATABASE_URL);

async function run() {
    const teams = await sql`
        SELECT ttt.id, ttt.name, ttt.players, ttt.players_linked
        FROM team_tournament_teams ttt
    `;
    console.log(JSON.stringify(teams, null, 2));
    process.exit(0);
}
run();
