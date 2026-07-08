import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

let DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (DATABASE_URL) DATABASE_URL = DATABASE_URL.trim().replace(/^["']|["']$/g, '');
const sql = neon(DATABASE_URL);

async function run() {
    console.log('Fixing workspace_id for players...');
    
    // Get a valid workspace ID from tournaments
    const ws = await sql`SELECT workspace_id FROM tournaments WHERE workspace_id IS NOT NULL LIMIT 1`;
    if (ws.length === 0) {
        console.log("Nessun workspace_id trovato!");
        process.exit(1);
    }
    const validWorkspaceId = ws[0].workspace_id;
    console.log("Uso workspace_id:", validWorkspaceId);
    
    const res = await sql`
        UPDATE players 
        SET workspace_id = ${validWorkspaceId} 
        WHERE workspace_id IS NULL
    `;
    console.log(`Aggiornati ${res.count} giocatori con workspace_id nullo.`);
    process.exit(0);
}
run();
