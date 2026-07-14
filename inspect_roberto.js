import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);

async function run() {
    try {
        const tournaments = await sql`SELECT id, name, type, date, giornata_name, parent_tournament_name, day_label FROM tournaments LIMIT 30`;
        console.log('All Tournaments in DB:');
        console.log(JSON.stringify(tournaments, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
