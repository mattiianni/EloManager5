import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
    try {
        console.log('Adding source_label column to elo_history...');
        await sql`
            ALTER TABLE elo_history 
            ADD COLUMN IF NOT EXISTS source_label VARCHAR(255);
        `;
        console.log('Column source_label added successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        process.exit(0);
    }
}

migrate();
