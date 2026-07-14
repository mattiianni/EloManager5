import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);

async function run() {
    try {
        const tourn = (await sql`SELECT * FROM tournaments WHERE id = '879ff5c2-514c-4f7d-9d76-6665651fa238'`)[0];
        console.log('Tournament Day:', tourn);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
