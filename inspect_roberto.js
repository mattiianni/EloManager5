import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);

async function run() {
    try {
        const row = await sql`
            SELECT id, name, type, date, giornata_name, parent_tournament_name, day_label 
            FROM tournaments 
            WHERE name = 'TorneOtto Inverno 2025' OR giornata_name = 'TorneOtto Inverno 2025' OR parent_tournament_name = 'TorneOtto Inverno 2025'
            LIMIT 5
        `;
        console.log('Sample matching tournaments:');
        console.log(JSON.stringify(row, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
