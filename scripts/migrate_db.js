import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' }); // Assuming it runs from scripts/

let DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
    dotenv.config(); // fallback to current dir
    DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
}

if (DATABASE_URL) {
    DATABASE_URL = DATABASE_URL.trim().replace(/^["']|["']$/g, '');
}

if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runMigrations() {
    console.log('Avviando migrazioni schema DB (Fase 0)...');
    try {
        console.log('1. Modifica team_tournament_teams...');
        await sql`
            ALTER TABLE team_tournament_teams
            ADD COLUMN IF NOT EXISTS players_linked JSONB NOT NULL DEFAULT '[]'::jsonb;
        `;
        
        console.log('2. Modifica team_tournament_matchday_matches...');
        await sql`
            ALTER TABLE team_tournament_matchday_matches
            ADD COLUMN IF NOT EXISTS team1_player_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS team2_player_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
        `;

        console.log('3. Modifica elo_history...');
        await sql`
            ALTER TABLE elo_history
            ADD COLUMN IF NOT EXISTS source_label VARCHAR(500);
        `;

        console.log('Migrazioni completate con successo!');
    } catch (error) {
        console.error('Errore durante le migrazioni:', error);
    }
}

runMigrations();
